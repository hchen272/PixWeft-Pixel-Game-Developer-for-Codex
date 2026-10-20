import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { PLUGIN_ROOT } from '../lib/project.mjs';
import { callTool, mcpResult } from '../mcp/tools.mjs';

const binary = process.env.GODOT_BIN || process.env.GODOT_PATH;
test('Node adapter integrates real Godot scene errors, receipts, image observations, input, and capture', { skip: !binary, timeout: 90000 }, async () => {
  const parent = process.env.PIXEL_GAME_TEST_ROOT || tmpdir();
  await fs.mkdir(parent, { recursive: true });
  const root = await fs.mkdtemp(path.join(parent, 'pixel-game-wrapper-'));
  console.log(`Wrapper integration project: ${root}`);
  await fs.cp(path.join(PLUGIN_ROOT, 'examples/neutral-lab'), root, { recursive: true, filter: file => !file.includes(`${path.sep}.godot`) && !file.includes(`${path.sep}.pixel-game`) });
  await callTool('project_init', { project_root: root, tools: { godot_path: binary } });
  const inspected = await callTool('godot_operation', { project_root: root, operation: 'project_inspect' });
  assert.equal(inspected.ok, true);
  const failed = await callTool('godot_operation', { project_root: root, operation: 'scene_inspect', args: { scene_path: 'res://missing.tscn' } });
  assert.equal(failed.ok, false);
  assert.equal((await callTool('run_status', { project_root: root, run_id: failed.run_id })).status, 'failed');
  const runArgs = { project_root: root, args: { scene_path: 'res://main.tscn', steps: [{ type: 'wait', frames: 2 }, { type: 'inspect', node_path: '.', properties: [] }, ...(process.env.GODOT_RENDER_TEST ? [{ type: 'capture', output_path: '.pixel-game/runs/capture.png' }] : [])] } };
  const runtime = await callTool('godot_runtime', runArgs);
  assert.equal(runtime.ok, true, JSON.stringify(runtime));
  assert.equal((await callTool('run_status', { project_root: root, run_id: runtime.run_id })).status, 'completed');
  if (process.env.GODOT_RENDER_TEST) {
    const result = await mcpResult(runtime, 'godot_runtime', runArgs);
    assert.equal(result.content[1].type, 'image');
    assert.equal(result.content[1].mimeType, 'image/png');
  }
});
