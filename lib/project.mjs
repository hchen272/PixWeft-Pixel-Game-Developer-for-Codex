import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

export const execute = promisify(execFile);
export const VERSION = '0.1.0';
export const BASELINE = Object.freeze({ godot: '4.6.3', pixelorama: '1.1.10-stable', pixelorama_api: 8 });
export const PLUGIN_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export class ToolError extends Error {
  constructor(code, message, details = undefined) { super(message); this.code = code; this.details = details; }
}
export function object(value, name = 'value') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ToolError('INVALID_ARGUMENT', `${name} must be an object.`);
  return value;
}
export function required(value, name) {
  if (typeof value !== 'string' || !value.trim()) throw new ToolError('INVALID_ARGUMENT', `${name} must be a non-empty string.`);
  return value;
}
export async function exists(file) { try { await fs.access(file); return true; } catch { return false; } }
export async function json(file) { return JSON.parse(await fs.readFile(file, 'utf8')); }
export async function writeJson(file, value, exclusive = false) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`, { flag: exclusive ? 'wx' : 'w' });
}
export async function projectRoot(value) {
  const root = await fs.realpath(path.resolve(required(value ?? process.env.PIXEL_GAME_PROJECT_ROOT, 'project_root')));
  if (!(await fs.stat(root)).isDirectory()) throw new ToolError('INVALID_PROJECT', 'project_root must be an existing directory.');
  return root;
}
function contained(root, target) {
  const relative = path.relative(root, target);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}
export async function projectPath(root, input) {
  required(input, 'path');
  if (input.includes('\0') || input.startsWith('user://')) throw new ToolError('INVALID_PATH', 'Use a project-relative path, res:// path, or a path inside project_root.');
  const target = path.resolve(root, input.startsWith('res://') ? input.slice(6) : input);
  if (!contained(root, target)) throw new ToolError('PATH_OUTSIDE_PROJECT', 'The requested path is outside project_root.');
  let ancestor = target;
  while (!(await exists(ancestor))) {
    const parent = path.dirname(ancestor);
    if (parent === ancestor) throw new ToolError('INVALID_PATH', 'No existing parent directory.');
    ancestor = parent;
  }
  if (!contained(root, await fs.realpath(ancestor))) throw new ToolError('PATH_OUTSIDE_PROJECT', 'The path resolves through a link outside project_root.');
  return target;
}
const TOOL_KEYS = new Set(['godot_path', 'pixelorama_path', 'pixelorama_url', 'pixelorama_token']);
function validateTools(tools) {
  for (const [key, value] of Object.entries(tools)) {
    if (!TOOL_KEYS.has(key)) throw new ToolError('INVALID_CONFIG', `Unknown tool setting: ${key}`);
    if (value !== null && typeof value !== 'string') throw new ToolError('INVALID_CONFIG', `Tool setting ${key} must be a string or null.`);
  }
}
export async function loadProject(value) {
  const root = await projectRoot(value);
  const file = await projectPath(root, '.pixel-game/project.json');
  const localFile = await projectPath(root, '.pixel-game/project.local.json');
  const base = await exists(file) ? await json(file) : { schema_version: 1, tools: {} };
  const local = await exists(localFile) ? await json(localFile) : {};
  if (base.schema_version !== 1) throw new ToolError('CONFIG_VERSION', 'Supported project schema_version is 1.');
  const tools = { ...object(base.tools ?? {}, 'tools'), ...object(local.tools ?? {}, 'local tools') };
  validateTools(tools);
  if (base.visual !== undefined) object(base.visual, 'visual');
  if (base.scene !== undefined) object(base.scene, 'scene');
  tools.godot_path = process.env.GODOT_PATH || tools.godot_path || null;
  tools.pixelorama_path = process.env.PIXELORAMA_PATH || tools.pixelorama_path || null;
  tools.pixelorama_url = process.env.PIXEL_GAME_PIXELORAMA_URL || tools.pixelorama_url || null;
  tools.pixelorama_token = process.env.PIXEL_GAME_PIXELORAMA_TOKEN || tools.pixelorama_token || null;
  return { root, file, configured: await exists(file), config: { ...base, tools } };
}
export function publicProject(project) {
  const { pixelorama_token, ...tools } = project.config.tools;
  return { project_root: project.root, configured: project.configured, config: { ...project.config, tools: { ...tools, pixelorama_token_configured: Boolean(pixelorama_token) } } };
}
export async function initProject(args) {
  const root = await projectRoot(args.project_root);
  const file = await projectPath(root, '.pixel-game/project.json');
  const tools = object(args.tools ?? {}, 'tools');
  validateTools(tools);
  const config = { schema_version: 1, project_id: randomUUID(), project_root: '.', tools: {}, visual: object(args.visual ?? {}, 'visual'), scene: object(args.scene ?? {}, 'scene') };
  if (await exists(file)) throw new ToolError('ALREADY_CONFIGURED', 'Project configuration already exists; edit it explicitly instead of overwriting it.');
  const localFile = await projectPath(root, '.pixel-game/project.local.json');
  if (Object.keys(tools).length && await exists(localFile)) throw new ToolError('ALREADY_CONFIGURED', 'Local tool configuration already exists.');
  const ignore = await projectPath(root, '.pixel-game/.gitignore');
  await fs.mkdir(path.dirname(ignore), { recursive: true });
  const ignoreRules = '\n# Pixel Game machine-local configuration and operation evidence\n/project.local.json\n/runs/\n';
  const existingIgnore = await exists(ignore) ? await fs.readFile(ignore, 'utf8') : '';
  if (!existingIgnore.endsWith(ignoreRules)) await fs.appendFile(ignore, ignoreRules);
  await writeJson(file, config, true);
  if (Object.keys(tools).length) await writeJson(localFile, { tools }, true);
  return publicProject(await loadProject(root));
}
export async function versionOf(binary) {
  required(binary, 'executable path');
  const { stdout, stderr } = await execute(binary, ['--version'], { windowsHide: true, timeout: 10000, maxBuffer: 65536 });
  return (stdout || stderr).trim();
}
export async function fingerprint(file) {
  if (!(await exists(file))) return null;
  return createHash('sha256').update(await fs.readFile(file)).digest('hex');
}
export async function newRun(project, operation, args) {
  const id = randomUUID();
  const directory = await projectPath(project.root, `.pixel-game/runs/${id}`);
  await fs.mkdir(directory, { recursive: true });
  const receipt = { schema_version: 1, run_id: id, operation, status: 'running', started_at: new Date().toISOString(), plugin_version: VERSION, project_root: project.root, args, project_file_sha256: await fingerprint(path.join(project.root, 'project.godot')) };
  await writeJson(path.join(directory, 'receipt.json'), receipt);
  return { id, directory, receipt };
}
export async function finishRun(run, status, result) {
  const receipt = { ...run.receipt, status, completed_at: new Date().toISOString(), result };
  await writeJson(path.join(run.directory, 'receipt.json'), receipt);
  return receipt;
}
export async function runStatus(args) {
  const root = await projectRoot(args.project_root);
  if (!/^[a-f0-9-]{36}$/i.test(args.run_id ?? '')) throw new ToolError('INVALID_ARGUMENT', 'run_id must be a run UUID.');
  return json(await projectPath(root, `.pixel-game/runs/${args.run_id}/receipt.json`));
}
