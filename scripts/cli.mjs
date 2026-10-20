import { promises as fs } from 'node:fs';
import path from 'node:path';
import { callTool } from '../mcp/tools.mjs';

const argumentsList = process.argv.slice(2);
if (!argumentsList.length || argumentsList.includes('--help')) {
  console.log('Usage: node scripts/cli.mjs <tool|doctor> [--project <directory>] [--args <json-file>] [--output <json-file>]\nTools: project_init, project_inspect, toolchain_doctor, image_prompt, godot_operation, godot_runtime, pixelorama_operation, run_status\nSoftware paths are supplied through project.local.json or environment variables.');
  process.exit(0);
}
const tool = argumentsList.shift() === 'doctor' ? 'toolchain_doctor' : process.argv[2];
const options = {};
while (argumentsList.length) {
  const key = argumentsList.shift();
  if (!['--project', '--args', '--output'].includes(key) || !argumentsList.length) throw new Error(`Invalid option: ${key}`);
  options[key] = argumentsList.shift();
}
try {
  const args = options['--args'] ? JSON.parse(await fs.readFile(options['--args'], 'utf8')) : {};
  if (options['--project']) args.project_root = path.resolve(options['--project']);
  else if (tool !== 'image_prompt' && !args.project_root && !process.env.PIXEL_GAME_PROJECT_ROOT) args.project_root = process.cwd();
  const result = await callTool(tool, args);
  const output = `${JSON.stringify(result, null, 2)}\n`;
  if (options['--output']) await fs.writeFile(options['--output'], output, { flag: 'wx' });
  else process.stdout.write(output);
  if (result.ok === false) process.exitCode = 1;
} catch (error) {
  process.stderr.write(`${JSON.stringify({ ok: false, error: { code: error.code ?? 'CLI_FAILED', message: error.message, details: error.details } }, null, 2)}\n`);
  process.exitCode = 1;
}
