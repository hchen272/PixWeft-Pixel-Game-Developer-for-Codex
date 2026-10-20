/** Opt-in native integration test. Copies binaries, never the installed preferences. */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import { randomBytes, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { inflateSync } from 'node:zlib';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { callTool } from '../mcp/tools.mjs';

const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const flags = Object.fromEntries(process.argv.slice(2).reduce((pairs, item, index, list) => item.startsWith('--') ? [...pairs, [item.slice(2), list[index + 1]]] : pairs, []));
if (!flags.godot || !flags['pixelorama-dir']) {
  console.error('Usage: node tests/pixelorama-native.mjs --godot PATH --pixelorama-dir PATH [--workdir PATH]');
  process.exit(2);
}
const work = path.resolve(flags.workdir ?? path.join(repository, '.local', 'pixelorama-native'));
assert(work.startsWith(path.join(repository, '.local') + path.sep), 'Native test workdir must be inside this repository .local directory.');
const nativeDir = path.join(work, 'application');
const roaming = path.join(work, 'roaming');
const user = path.join(roaming, 'pixelorama');
const runId = randomUUID();
const startedAt = new Date().toISOString();
const fixture = path.join(work, 'fixtures', runId);
await Promise.all([fs.mkdir(nativeDir, { recursive: true }), fs.mkdir(path.join(user, 'extensions'), { recursive: true }), fs.mkdir(fixture, { recursive: true })]);
await fs.writeFile(path.join(work, 'verification.json'), JSON.stringify({ ok: false, status: 'running', run_id: runId, started_at: startedAt }));
await Promise.all(['Pixelorama.exe', 'Pixelorama.pck'].map(name => fs.copyFile(path.join(flags['pixelorama-dir'], name), path.join(nativeDir, name))));
const env = { ...process.env, APPDATA: roaming, LOCALAPPDATA: path.join(work, 'local'), XDG_DATA_HOME: roaming };
const bind = net.createServer();
bind.listen(0, '127.0.0.1');
await once(bind, 'listening');
const port = bind.address().port;
await new Promise(resolve => bind.close(resolve));
const token = randomBytes(32).toString('hex');
const bridgeConfig = path.join(user, 'pixel-game-bridge.json');
await fs.writeFile(bridgeConfig, JSON.stringify({ port, token, allowed_roots: [fixture] }));
await fs.writeFile(path.join(user, 'config.ini'), '[extensions]\nPixelGameBridge=true\n[preferences]\nlocale="en_US"\nquit_confirmation=false\nopen_last_project=false\n');
env.PIXEL_GAME_PIXELORAMA_CONFIG = bridgeConfig;
const bridge = path.join(repository, 'bridges', 'pixelorama');
const packPath = path.join(user, 'extensions', 'PixelGameBridge.pck');
const pack = spawn(flags.godot, ['--headless', '--script', path.join(bridge, 'pack.gd'), '--', bridge, packPath], { env, windowsHide: true });
let packLog = '';
pack.stdout.on('data', value => packLog += value);
pack.stderr.on('data', value => packLog += value);
assert.equal((await once(pack, 'exit'))[0], 0, packLog);
const application = spawn(path.join(nativeDir, 'Pixelorama.exe'), ['--headless', '--audio-driver', 'Dummy', '--log-file', path.join(work, 'native.log')], { cwd: nativeDir, env, windowsHide: true });
let logs = '';
application.stdout.on('data', value => logs += value);
application.stderr.on('data', value => logs += value);
const base = `http://127.0.0.1:${port}`;
const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
const commands = [];
let document;
async function raw(operation, args = {}, guard = true, extra = {}) {
  const request = { request_id: randomUUID(), operation, args, project_root: fixture, ...((guard && document) ? { document_id: document.id, expected_revision: document.revision } : {}), ...extra };
  const response = await fetch(`${base}/command`, { method: 'POST', headers, body: JSON.stringify(request), signal: AbortSignal.timeout(15000) });
  const result = await response.json();
  commands.push({ operation, ok: result.ok, error: result.error?.code });
  if (result.ok && result.data?.document) document = result.data.document;
  return { request, result };
}
async function command(operation, args = {}, guard = true, extra = {}) {
  const { result } = await raw(operation, args, guard, extra);
  assert(result.ok, `${operation}: ${JSON.stringify(result.error)}\n${logs}`);
  return result;
}
try {
  let health;
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      const response = await fetch(`${base}/health`, { headers, signal: AbortSignal.timeout(1000) });
      health = await response.json();
      if (health.ok) break;
    } catch { /* Wait for the isolated application to initialize. */ }
    if (application.exitCode !== null) throw new Error(`Pixelorama exited: ${logs}`);
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  assert(health?.ok, `Bridge did not start.\n${logs}`);
  assert.equal(health.data.api_version, 8);
  assert.match(health.data.pixelorama_version, /^v?1\.1\.10/);
  assert.equal((await fetch(`${base}/health`)).status, 401);
  await command('document.create', { name: 'Alpha fixture', width: 7, height: 5 }, false);
  const firstDocument = document.id;
  const initial = document.revision;
  const patch = await raw('document.patch_pixels', { pixels: [{ x: 1, y: 2, color: '#27649b80' }, { x: 3, y: 2, color: '#fa5020ff' }] });
  assert(patch.result.ok, JSON.stringify(patch.result));
  assert(document.revision > initial);
  const duplicate = await fetch(`${base}/command`, { method: 'POST', headers, body: JSON.stringify(patch.request) });
  assert.deepEqual(await duplicate.json(), patch.result, 'A retried request must return its original result.');
  assert.equal((await raw('document.patch_pixels', { pixels: [{ x: 0, y: 0, color: '#ffffff' }] }, true, { expected_revision: initial })).result.error?.code, 'REVISION_CONFLICT');
  assert.equal((await raw('document.patch_pixels', { pixels: [{ x: 0, y: 0, color: '#ffffff' }, { x: 99, y: 0, color: '#ffffff' }] })).result.error?.code, 'OUT_OF_BOUNDS');
  const preview = await command('document.preview', { layer: 0 }, false);
  const image = png(Buffer.from(preview.data.base64, 'base64'));
  assert.equal(image.width, 7);
  assert.equal(image.height, 5);
  assert.deepEqual([...image.data.subarray((2 * 7 + 1) * 4, (2 * 7 + 1) * 4 + 4)], [39, 100, 155, 128]);
  assert.deepEqual([...image.data.subarray(0, 4)], [0, 0, 0, 0], 'A rejected batch must not partially edit the canvas.');
  const composited = png(Buffer.from((await command('document.preview', {}, false)).data.base64, 'base64'));
  assert.deepEqual(composited.data, image.data, 'Native composite must preserve one-layer RGBA.');
  await command('document.export_png', { path: 'alpha.png', layer: 0 });
  const exported = png(await fs.readFile(path.join(fixture, 'alpha.png')));
  assert.deepEqual(exported.data, image.data);
  await command('document.add_frame', {});
  await command('document.add_layer', { name: 'Detail' });
  await command('document.palette', { name: 'Fixture palette', colors: ['#27649b80', '#fa5020ff'] });
  assert(document.palettes.includes('Fixture palette'));
  await command('document.save', { path: 'source.pxo' });
  assert((await fs.stat(path.join(fixture, 'source.pxo'))).size > 0);
  await command('document.export_sheet', { path: 'sheet.png', columns: 2 });
  const sheet = png(await fs.readFile(path.join(fixture, 'sheet.png')));
  assert.equal(sheet.width, 14);
  assert.equal(sheet.height, 5);
  assert.deepEqual([...sheet.data.subarray((2 * 14 + 1) * 4, (2 * 14 + 1) * 4 + 4)], [39, 100, 155, 128]);
  await command('document.open_image', { path: 'alpha.png' }, false);
  assert.notEqual(document.id, firstDocument);
  const imported = png(Buffer.from((await command('document.preview', { layer: 0 }, false)).data.base64, 'base64'));
  assert.deepEqual(imported.data, image.data, 'PNG open and export must preserve RGBA bytes.');
  assert.equal((await raw('document.save', { path: '../escape.pxo' })).result.error?.code, 'PATH_DENIED');
  assert.equal((await raw('document.save', { path: 'wrong.pxo' }, true, { document_id: firstDocument })).result.error?.code, 'DOCUMENT_CONFLICT');
  await command('document.open_project', { path: 'source.pxo' }, false);
  assert.equal(document.frames, 2);
  assert.equal(document.layers.length, 2);
  assert(document.palettes.includes('Fixture palette'));
  const reopened = png(Buffer.from((await command('document.preview', { frame: 0, layer: 0 }, false)).data.base64, 'base64'));
  assert.deepEqual(reopened.data, image.data, 'Editable project save/reopen must preserve the original cel.');
  await callTool('project_init', { project_root: fixture, tools: { pixelorama_url: base, pixelorama_token: token } });
  const mcp = new Client({ name: 'pixel-game-native-test', version: '1.0.0' });
  const transport = new StdioClientTransport({ command: process.execPath, args: [path.join(repository, 'mcp/server.mjs')], cwd: repository, stderr: 'pipe' });
  try {
    await mcp.connect(transport);
    const current = await mcp.callTool({ name: 'pixelorama_operation', arguments: { project_root: fixture, operation: 'document.info' } });
    assert.equal(current.isError, false);
    const currentInfo = JSON.parse(current.content[0].text);
    assert.equal(currentInfo.data.document.id, document.id);
    const mcpPreview = await mcp.callTool({ name: 'pixelorama_operation', arguments: { project_root: fixture, operation: 'document.preview', args: { frame: 0, layer: 0 } } });
    assert.equal(mcpPreview.isError, false);
    assert.equal(mcpPreview.content[1].type, 'image');
    assert.deepEqual(png(Buffer.from(mcpPreview.content[1].data, 'base64')).data, image.data);
    const previewRun = JSON.parse(mcpPreview.content[0].text).run_id;
    const receipt = await mcp.callTool({ name: 'run_status', arguments: { project_root: fixture, run_id: previewRun } });
    assert.equal(JSON.parse(receipt.content[0].text).status, 'completed');
    assert(!receipt.content[0].text.includes(token));
    const conflict = await mcp.callTool({ name: 'pixelorama_operation', arguments: { project_root: fixture, operation: 'document.add_frame', document_id: document.id, expected_revision: -1 } });
    assert.equal(conflict.isError, true);
  } finally { await mcp.close(); }
  const report = { ok: true, status: 'completed', run_id: runId, started_at: startedAt, completed_at: new Date().toISOString(), platform: os.platform(), application: health.data, checks: commands, source_round_trip_rgba: true, preview_image_returned: true, preferences_isolated: true, mcp_stdio_proxy_verified: true };
  await fs.writeFile(path.join(work, 'verification.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ok: true, report: path.join(work, 'verification.json'), commands: commands.length, pixelorama: health.data.pixelorama_version }));
} catch (error) {
  await fs.writeFile(path.join(work, 'verification.json'), JSON.stringify({ ok: false, status: 'failed', run_id: runId, started_at: startedAt, completed_at: new Date().toISOString(), error: error.message, checks: commands }));
  console.error(error.stack);
  console.error(logs);
  process.exitCode = 1;
} finally {
  application.kill();
  await fs.writeFile(path.join(work, 'process-output.log'), logs);
}

/** Decode 8-bit RGBA/RGB PNG output for exact native round-trip assertions. */
function png(bytes) {
  assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
  assert.equal(bytes[24], 8);
  const channels = bytes[25] === 6 ? 4 : bytes[25] === 2 ? 3 : 0;
  assert(channels, `Unsupported PNG color type: ${bytes[25]}`);
  let offset = 8;
  const chunks = [];
  while (offset < bytes.length) {
    const length = bytes.readUInt32BE(offset);
    if (bytes.toString('ascii', offset + 4, offset + 8) === 'IDAT') chunks.push(bytes.subarray(offset + 8, offset + 8 + length));
    offset += length + 12;
  }
  const raw = inflateSync(Buffer.concat(chunks));
  const stride = width * channels;
  const decoded = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    for (let x = 0; x < stride; x++) {
      const at = y * stride + x;
      const left = x >= channels ? decoded[at - channels] : 0;
      const up = y ? decoded[at - stride] : 0;
      const diagonal = y && x >= channels ? decoded[at - stride - channels] : 0;
      const prediction = left + up - diagonal;
      const paeth = Math.abs(prediction - left) <= Math.abs(prediction - up) && Math.abs(prediction - left) <= Math.abs(prediction - diagonal) ? left : Math.abs(prediction - up) <= Math.abs(prediction - diagonal) ? up : diagonal;
      const predictor = [0, left, up, Math.floor((left + up) / 2), paeth][filter];
      assert.notEqual(predictor, undefined, `Unsupported PNG filter: ${filter}`);
      decoded[at] = (raw[y * (stride + 1) + x + 1] + predictor) & 255;
    }
  }
  if (channels === 4) return { width, height, data: decoded };
  const rgba = Buffer.alloc(width * height * 4);
  for (let pixel = 0; pixel < width * height; pixel++) {
    decoded.copy(rgba, pixel * 4, pixel * 3, pixel * 3 + 3);
    rgba[pixel * 4 + 3] = 255;
  }
  return { width, height, data: rgba };
}
