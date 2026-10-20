import path from 'node:path';
import { promises as fs } from 'node:fs';
import { PLUGIN_ROOT, execute, exists, fingerprint, required } from '../lib/project.mjs';

try {
  const index = process.argv.indexOf('--godot');
  const binary = required(index >= 0 ? process.argv[index + 1] : process.env.GODOT_PATH, '--godot or GODOT_PATH');
  const source = path.join(PLUGIN_ROOT, 'bridges/pixelorama');
  const directory = path.join(source, 'build');
  await fs.mkdir(directory, { recursive: true });
  const output = path.join(directory, 'PixelGameBridge.pck');
  await execute(binary, ['--headless', '--log-file', path.join(directory, 'pack.log'), '--script', path.join(source, 'pack.gd'), '--', source, output], { cwd: PLUGIN_ROOT, windowsHide: true, timeout: 30000, maxBuffer: 2 * 1024 * 1024 });
  if (!(await exists(output)) || (await fs.stat(output)).size === 0) throw new Error('Godot did not produce a non-empty extension pack.');
  console.log(JSON.stringify({ ok: true, output, sha256: await fingerprint(output), installed: false }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exitCode = 1;
}
