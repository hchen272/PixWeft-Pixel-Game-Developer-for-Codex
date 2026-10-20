import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const root = fileURLToPath(new URL('../', import.meta.url));
const godot = process.env.GODOT_BIN;

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const label = Buffer.from(type);
  const header = Buffer.alloc(4);
  header.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([label, data])));
  return Buffer.concat([header, label, data, checksum]);
}

function measurementPng() {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(2, 0);
  header.writeUInt32BE(2, 4);
  header[8] = 8;
  header[9] = 6;
  const pixels = Buffer.from([0, 255, 0, 0, 255, 0, 0, 0, 0, 0, 0, 255, 0, 128, 255, 0, 0, 255]);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(pixels)), chunk('IEND', Buffer.alloc(0))]);
}

test('real Godot: scene edits, measurements, bounded input/state, optional rendered capture', { skip: !godot, timeout: 120000 }, async () => {
  const temporaryRoot = process.env.PIXEL_GAME_TEST_ROOT || tmpdir();
  await mkdir(temporaryRoot, { recursive: true });
  const project = await mkdtemp(path.join(temporaryRoot, 'pixel-game-godot-'));
  console.log(`Godot integration project: ${project}`);
  await cp(path.join(root, 'examples/neutral-lab'), project, { recursive: true, filter: source => !source.includes(`${path.sep}.godot`) && !source.includes(`${path.sep}.pixel-game`) });
  const runRoot = path.join(project, '.pixel-game/runs');
  await mkdir(runRoot, { recursive: true });
  let sequence = 0;

  async function run(operation, args = {}, { runtime = false, rendered = false, expectedOk = true } = {}) {
    const id = `integration-${++sequence}`;
    const request = path.join(runRoot, `${id}.request.json`);
    const response = path.join(runRoot, `${id}.response.json`);
    await writeFile(request, JSON.stringify({ operation, args, request_id: id, project_root: project }));
    const command = ['--path', project, '--log-file', path.join(runRoot, `${id}.engine.log`), '--fixed-fps', '60'];
    if (!rendered) command.push('--headless');
    else command.push('--rendering-method', 'gl_compatibility', '--position', '10000,10000');
    command.push('--script', path.join(root, 'bridges/godot', runtime ? 'runtime_runner.gd' : 'operations.gd'), '--', request, response);
    const result = spawnSync(godot, command, { encoding: 'utf8', windowsHide: true, timeout: 30000, maxBuffer: 2 * 1024 * 1024 });
    assert.ifError(result.error);
    let parsed;
    try { parsed = JSON.parse(await readFile(response, 'utf8')); }
    catch (error) { throw new Error(`No response for ${operation}: ${result.stdout}\n${result.stderr}`, { cause: error }); }
    assert.equal(parsed.ok, expectedOk, JSON.stringify(parsed));
    assert.equal(result.status, expectedOk ? 0 : 1, `${result.stdout}\n${result.stderr}`);
    assert.doesNotMatch(result.stderr, /SCRIPT ERROR|Parse Error|Invalid owner/);
    assert.equal(parsed.request_id, id);
    return parsed;
  }

  const info = await run('project_inspect');
  assert.match(info.engine_version, /^4\.6\.3/);
  assert.equal(info.data.main_scene, 'res://main.tscn');

  await run('scene_create', { scene_path: 'res://scratch/generated.tscn', root: { type: 'Node2D', name: 'Root', children: [{ type: 'Node2D', name: 'Group', children: [{ type: 'Sprite2D', name: 'Marker', properties: { position: { $type: 'Vector2', value: [17, 29] }, texture_filter: 1 } }] }] } });
  const created = await run('scene_inspect', { scene_path: 'res://scratch/generated.tscn', properties: ['position', 'texture_filter'] });
  assert.deepEqual(created.data.nodes.find(node => node.path.replace(/^\.\//, '') === 'Group/Marker')?.properties.position.value, [17, 29], JSON.stringify(created));
  await run('scene_set_properties', { scene_path: 'res://scratch/generated.tscn', node_path: 'Group/Marker', properties: { position: { $type: 'Vector2', value: [31, 43] } } });
  const modified = await run('scene_inspect', { scene_path: 'res://scratch/generated.tscn', properties: ['position'] });
  assert.deepEqual(modified.data.nodes.find(node => node.path.replace(/^\.\//, '') === 'Group/Marker')?.properties.position.value, [31, 43], JSON.stringify(modified));
  const beforeInvalid = await readFile(path.join(project, 'scratch/generated.tscn'));
  await run('scene_set_properties', { scene_path: 'res://scratch/generated.tscn', node_path: 'Group/Marker', properties: { does_not_exist: 1 } }, { expectedOk: false });
  assert.deepEqual(await readFile(path.join(project, 'scratch/generated.tscn')), beforeInvalid);
  await run('scene_create', { scene_path: 'res://scratch/generated.tscn', root: { name: 'Other' } }, { expectedOk: false });
  await run('scene_inspect', { scene_path: 'res://../outside.tscn' }, { expectedOk: false });
  await run('project_set_settings', { settings: { 'rendering/textures/canvas_textures/default_texture_filter': 0 } });

  await writeFile(path.join(project, 'measurement.png'), measurementPng());
  const measurement = await run('image_inspect', { resource_path: 'res://measurement.png', constraints: { width: 2, height: 2, max_colors: 3, max_partial_alpha_pixels: 0 }, frame_rects: [{ name: 'top', rect: [0, 0, 2, 1] }, { name: 'transparent', rect: [1, 0, 1, 1] }] });
  assert.equal(measurement.data.unique_rgba_colors, 3);
  assert.equal(measurement.data.transparent_pixels, 1);
  assert.equal(measurement.data.partial_alpha_pixels, 1);
  assert.equal(measurement.data.opaque_pixels, 2);
  assert.equal(measurement.data.checks.find(check => check.constraint === 'max_partial_alpha_pixels').passed, false);
  assert.match(measurement.data.file_sha256, /^[a-f0-9]{64}$/);
  assert.equal(measurement.data.frames[1].empty, true);
  assert.deepEqual(measurement.data.frames[0].visible_bounds_in_frame, [0, 0, 1, 1]);

  const steps = [
    { type: 'inspect', properties: ['actor_position', 'completed'] },
    { type: 'input', action: 'lab_right', pressed: true, frames: 100 },
    { type: 'input', action: 'lab_right', pressed: false },
    { type: 'inspect', properties: ['actor_position'] },
    { type: 'input', action: 'lab_up', pressed: true, frames: 50 },
    { type: 'input', action: 'lab_up', pressed: false },
    { type: 'input', action: 'lab_right', pressed: true, frames: 70 },
    { type: 'input', action: 'lab_right', pressed: false },
    { type: 'input', action: 'lab_down', pressed: true, frames: 50 },
    { type: 'input', action: 'lab_down', pressed: false },
    { type: 'input', action: 'lab_interact', pressed: true },
    { type: 'input', action: 'lab_interact', pressed: false },
    { type: 'inspect', properties: ['actor_position', 'completed', 'interaction_count', 'input_event_count'] },
    { type: 'input', action: 'lab_restart', pressed: true },
    { type: 'input', action: 'lab_restart', pressed: false },
    { type: 'inspect', properties: ['actor_position', 'completed', 'interaction_count'] },
    { type: 'key', keycode: 4194321, pressed: true, frames: 5 },
    { type: 'key', keycode: 4194321, pressed: false },
    { type: 'mouse_button', position: [40, 40], pressed: true },
    { type: 'mouse_button', position: [40, 40], pressed: false },
    { type: 'inspect', properties: ['actor_position', 'input_event_count', 'pointer_event_count'] },
  ];
  const observed = await run('runtime_sequence', { steps }, { runtime: true });
  const baseline = observed.data.steps[0].data.properties;
  assert.deepEqual(baseline.actor_position.value, [48, 120]);
  const blocked = observed.data.steps[3].data.properties.actor_position.value;
  assert(blocked[0] > 100 && blocked[0] < 138, `Collision observation ${blocked}`);
  const completed = observed.data.steps[12].data.properties;
  assert.equal(completed.completed, true, JSON.stringify(completed));
  assert.equal(completed.interaction_count, 1);
  assert(completed.input_event_count > 0);
  const restarted = observed.data.steps[15].data.properties;
  assert.deepEqual(restarted.actor_position.value, [48, 120]);
  assert.equal(restarted.completed, false);
  assert.equal(restarted.interaction_count, 0);
  const pointer = observed.data.steps[20].data.properties;
  assert.equal(pointer.pointer_event_count, 2);
  assert(pointer.input_event_count > completed.input_event_count);
  await run('runtime_sequence', { steps: [{ type: 'input', action: 'missing_action' }] }, { runtime: true, expectedOk: false });
  await run('runtime_sequence', { steps: [{ type: 'capture', output_path: 'res://.pixel-game/runs/headless.png' }] }, { runtime: true, expectedOk: false });

  if (process.env.GODOT_RENDER_TEST === '1') {
    const captured = await run('runtime_sequence', { steps: [{ type: 'capture', output_path: 'res://.pixel-game/runs/rendered.png' }] }, { runtime: true, rendered: true });
    const evidence = captured.data.steps[0].data;
    const png = await readFile(evidence.path);
    assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
    assert(evidence.width > 0 && evidence.height > 0);
    console.log(`Rendered evidence: ${evidence.path}`);
  }
  console.log(`Godot integration evidence: ${runRoot}`);
});
