/** Opt-in sheet import verification using a private native application profile. */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { deflateSync, inflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const flags = Object.fromEntries(process.argv.slice(2).reduce((pairs, value, index, list) => value.startsWith('--') ? [...pairs, [value.slice(2), list[index + 1]]] : pairs, []));
if (!flags.godot) throw new Error('Usage: node tests/pixelorama-sheet-native.mjs --godot PATH [--pixelorama-dir PRIVATE_BINARY_DIRECTORY]');
const work = path.join(repository, '.local', 'pixelorama-sheet-native', randomUUID());
const user = path.join(work, 'roaming', 'pixelorama');
const fixture = path.join(work, 'fixtures');
const native = path.resolve(flags['pixelorama-dir'] ?? path.join(repository, '.local', 'pixelorama-native', 'application'));
await Promise.all([fs.mkdir(path.join(user, 'extensions'), { recursive: true }), fs.mkdir(fixture, { recursive: true })]);
const bind = net.createServer();
bind.listen(0, '127.0.0.1');
await once(bind, 'listening');
const port = bind.address().port;
await new Promise(resolve => bind.close(resolve));
const token = randomBytes(32).toString('hex');
const config = path.join(user, 'pixel-game-bridge.json');
await fs.writeFile(config, JSON.stringify({ port, token, allowed_roots: [fixture] }));
await fs.writeFile(path.join(user, 'config.ini'), '[extensions]\nPixelGameBridge=true\n[preferences]\nlocale="en_US"\nquit_confirmation=false\nopen_last_project=false\n');
const env = { ...process.env, APPDATA: path.join(work, 'roaming'), LOCALAPPDATA: path.join(work, 'local'), XDG_DATA_HOME: path.join(work, 'roaming'), PIXEL_GAME_PIXELORAMA_CONFIG: config };
const bridge = path.join(repository, 'bridges', 'pixelorama');
const pack = spawn(flags.godot, ['--headless', '--script', path.join(bridge, 'pack.gd'), '--', bridge, path.join(user, 'extensions', 'PixelGameBridge.pck')], { env, windowsHide: true });
let packLog = '';
pack.stdout.on('data', value => packLog += value);
pack.stderr.on('data', value => packLog += value);
assert.equal((await once(pack, 'exit'))[0], 0, packLog);
const application = spawn(path.join(native, 'Pixelorama.exe'), ['--headless', '--audio-driver', 'Dummy', '--log-file', path.join(work, 'native.log')], { cwd: native, env, windowsHide: true });
let logs = '';
application.stdout.on('data', value => logs += value);
application.stderr.on('data', value => logs += value);
const base = `http://127.0.0.1:${port}`;
const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
let document;
const checks = [];
async function request(operation, args = {}) {
  const response = await fetch(`${base}/command`, { method: 'POST', headers, body: JSON.stringify({ request_id: randomUUID(), operation, project_root: fixture, args, ...(document ? { document_id: document.id, expected_revision: document.revision } : {}) }), signal: AbortSignal.timeout(15000) });
  const result = await response.json();
  checks.push({ operation, ok: result.ok, error: result.error?.code });
  if (result.ok && result.data?.document) document = result.data.document;
  return result;
}
async function command(operation, args = {}) {
  const result = await request(operation, args);
  assert(result.ok, `${operation}: ${JSON.stringify(result)}\n${logs}`);
  return result.data;
}
async function preview(frame = 0) {
  return decodePng(Buffer.from((await command('document.preview', { frame, layer: 0 })).base64, 'base64'));
}
try {
  let health;
  for (let attempt = 0; attempt < 120; attempt++) {
    try { health = await (await fetch(`${base}/health`, { headers, signal: AbortSignal.timeout(1000) })).json(); if (health.ok) break; } catch { /* Isolated application initialization. */ }
    if (application.exitCode !== null) throw new Error(`Pixelorama exited: ${logs}`);
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  assert(health?.ok, logs);
  assert(health.data.operations.includes('document.import_sheet'));
  const colors = [[193, 47, 71, 255], [43, 171, 101, 128], [59, 83, 211, 64], [241, 197, 61, 255]];
  const rgba = Buffer.alloc(7 * 5 * 4);
  for (let y = 0; y < 5; y++) for (let x = 0; x < 7; x++) Buffer.from(colors[(y >= 3 ? 2 : 0) + (x >= 4 ? 1 : 0)]).copy(rgba, (y * 7 + x) * 4);
  Buffer.from([17, 31, 47, 0]).copy(rgba, 0);
  const source = encodePng(7, 5, rgba);
  await fs.writeFile(path.join(fixture, 'source.png'), source);
  const imported = await command('document.import_sheet', { path: 'source.png', columns: 2, rows: 2, frame_width: 4, frame_height: 3, name: 'Sheet fixture' });
  assert.deepEqual(imported.source_dimensions, [7, 5]);
  assert.deepEqual(imported.source_rects, [[0, 0, 4, 3], [4, 0, 3, 3], [0, 3, 4, 2], [4, 3, 3, 2]]);
  assert.equal(imported.source_sha256, createHash('sha256').update(source).digest('hex'));
  assert.equal(imported.interpolation, 'nearest');
  assert.equal(document.frames, 4);
  assert.equal(document.width, 4);
  assert.equal(document.height, 3);
  const first = await preview();
  assert.deepEqual([...first.rgba.subarray(0, 4)], [17, 31, 47, 0], 'Hidden RGB and alpha must survive native import.');
  for (let frame = 1; frame < 4; frame++) {
    const image = await preview(frame);
    assert.equal(image.width, 4);
    assert.equal(image.height, 3);
    for (let offset = 0; offset < image.rgba.length; offset += 4) assert.deepEqual([...image.rgba.subarray(offset, offset + 4)], colors[frame], 'Nearest normalization must preserve source RGBA, including partial alpha.');
  }
  await command('document.export_sheet', { path: 'normalized.png', columns: 2 });
  const sheet = decodePng(await fs.readFile(path.join(fixture, 'normalized.png')));
  assert.equal(sheet.width, 8);
  assert.equal(sheet.height, 6);
  const beforeFps = document.revision;
  assert.equal((await command('document.set_animation_fps', { fps: 8 })).fps, 8);
  assert.equal(document.fps, 8);
  assert(document.revision > beforeFps, 'Changing native FPS must advance document revision.');
  assert.equal((await request('document.set_animation_fps', { fps: 0 })).error?.code, 'INVALID_ARGS');
  assert.equal((await request('document.set_animation_fps', { fps: 121 })).error?.code, 'INVALID_ARGS');
  assert.equal((await request('document.set_animation_fps', { fps: '8' })).error?.code, 'INVALID_ARGS');
  assert.equal((await command('document.info')).document.fps, 8, 'Rejected FPS values must leave the native project unchanged.');
  await command('document.save', { path: 'normalized.pxo' });
  await command('document.create', { name: 'Empty reopen fixture', width: 1, height: 1 });
  const emptyDocumentId = document.id;
  await command('document.open_project', { path: 'normalized.pxo' });
  assert.notEqual(document.id, emptyDocumentId, 'Opening a project from an empty document must create a new tab and identity.');
  assert.equal(document.frames, 4);
  assert.equal(document.fps, 8, 'Native animation FPS must survive editable project save/reopen.');
  assert.deepEqual((await preview()).rgba, first.rgba, 'The normalized editable frame must survive save/reopen.');
  const before = document;
  assert.equal((await request('document.import_sheet', { path: 'source.png', columns: 2, rows: 1, frame_width: 4, frame_height: 3, frame_rects: [[0, 0, 4, 3], [6, 4, 2, 2]] })).error?.code, 'OUT_OF_BOUNDS');
  assert.equal((await command('document.info')).document.id, before.id, 'Invalid rectangles must not create or switch a document.');
  assert.equal(document.fingerprint, before.fingerprint);
  assert.equal((await request('document.import_sheet', { path: 'source.png', columns: 65, rows: 1, frame_width: 1, frame_height: 1 })).error?.code, 'INVALID_ARGS');
  assert.equal((await request('document.import_sheet', { path: 'source.png', columns: 1, rows: 1, frame_width: 4096, frame_height: 4097 })).error?.code, 'INVALID_ARGS');
  const reordered = await command('document.import_sheet', { path: 'source.png', columns: 2, rows: 1, frame_width: 2, frame_height: 2, frame_rects: [[4, 3, 3, 2], [4, 0, 3, 3]] });
  assert.deepEqual(reordered.source_rects, [[4, 3, 3, 2], [4, 0, 3, 3]]);
  assert.deepEqual([...(await preview()).rgba.subarray(0, 4)], colors[3]);
  assert.deepEqual([...(await preview(1)).rgba.subarray(0, 4)], colors[1]);
  await command('document.import_sheet', { path: 'source.png', columns: 1, rows: 1, frame_width: 7, frame_height: 5, name: 'Single fixture' });
  assert.deepEqual((await preview()).rgba, rgba, 'A 1x1 grid must preserve the complete source without trimming.');
  const detail = await command('document.preview', { layer: 0, region: [4, 3, 3, 2], scale: 2 });
  assert.deepEqual(detail.source_dimensions, [7, 5]);
  assert.deepEqual(detail.region, [4, 3, 3, 2]);
  const detailImage = decodePng(Buffer.from(detail.base64, 'base64'));
  assert.equal(detailImage.width, 6); assert.equal(detailImage.height, 4);
  for (let index = 0; index < detailImage.rgba.length; index += 4) assert.deepEqual([...detailImage.rgba.subarray(index, index + 4)], colors[3]);
  assert.equal((await request('document.preview', { region: [6, 4, 2, 2] })).error?.code, 'OUT_OF_BOUNDS');
  assert.deepEqual(await fs.readFile(path.join(fixture, 'source.png')), source, 'Import must not overwrite the original image.');
  const report = { ok: true, application: health.data, preferences_isolated: true, rounded_bounds: true, explicit_bounds: true, rgba_preserved: true, native_source_roundtrip: true, input_rejected_before_commit: true, checks };
  await fs.writeFile(path.join(work, 'verification.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ok: true, report: path.join(work, 'verification.json'), operations: checks.length }));
} catch (error) {
  await fs.writeFile(path.join(work, 'verification.json'), JSON.stringify({ ok: false, error: error.message, checks }, null, 2));
  console.error(error.stack);
  console.error(logs);
  process.exitCode = 1;
} finally {
  application.kill();
  await fs.writeFile(path.join(work, 'process-output.log'), logs);
}

function encodePng(width, height, rgba) {
  const raw = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 6;
  function chunk(type, data) {
    const payload = Buffer.concat([Buffer.from(type), data]);
    let crc = 0xffffffff;
    for (const value of payload) { crc ^= value; for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); }
    const length = Buffer.alloc(4), checksum = Buffer.alloc(4);
    length.writeUInt32BE(data.length); checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
    return Buffer.concat([length, payload, checksum]);
  }
  return Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
function decodePng(bytes) {
  assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
  assert.equal(bytes[24], 8);
  const channels = bytes[25] === 6 ? 4 : bytes[25] === 2 ? 3 : 0;
  assert(channels);
  const chunks = [];
  for (let offset = 8; offset < bytes.length;) { const length = bytes.readUInt32BE(offset); if (bytes.toString('ascii', offset + 4, offset + 8) === 'IDAT') chunks.push(bytes.subarray(offset + 8, offset + 8 + length)); offset += length + 12; }
  const raw = inflateSync(Buffer.concat(chunks)), stride = width * channels, decoded = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) for (let x = 0; x < stride; x++) {
    const index = y * stride + x, left = x >= channels ? decoded[index - channels] : 0, up = y ? decoded[index - stride] : 0, diagonal = y && x >= channels ? decoded[index - stride - channels] : 0;
    const prediction = left + up - diagonal;
    const paeth = Math.abs(prediction - left) <= Math.abs(prediction - up) && Math.abs(prediction - left) <= Math.abs(prediction - diagonal) ? left : Math.abs(prediction - up) <= Math.abs(prediction - diagonal) ? up : diagonal;
    decoded[index] = (raw[y * (stride + 1) + x + 1] + [0, left, up, Math.floor((left + up) / 2), paeth][raw[y * (stride + 1)]]) & 255;
  }
  const rgba = Buffer.alloc(width * height * 4);
  for (let index = 0; index < width * height; index++) { decoded.copy(rgba, index * 4, index * channels, index * channels + channels); if (channels === 3) rgba[index * 4 + 3] = 255; }
  return { width, height, rgba };
}
