import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { BASELINE, PLUGIN_ROOT, ToolError, execute, exists, finishRun, json, loadProject, newRun, object, projectPath, required, versionOf, writeJson } from './project.mjs';

export const GODOT_OPERATIONS = ['project_inspect', 'scene_inspect', 'scene_create', 'scene_set_properties', 'resource_inspect', 'project_set_settings', 'image_inspect'];
export const PIXEL_OPERATIONS = ['app.info', 'document.info', 'document.create', 'document.open_image', 'document.open_project', 'document.import_sheet', 'document.save', 'document.export_png', 'document.export_sheet', 'document.preview', 'document.patch_pixels', 'document.add_frame', 'document.add_layer', 'document.palette', 'document.set_animation_fps'];
const PIXEL_MUTATIONS = new Set(['document.save', 'document.export_png', 'document.export_sheet', 'document.patch_pixels', 'document.add_frame', 'document.add_layer', 'document.palette', 'document.set_animation_fps']);
const queues = new Map();

async function serial(key, fn) {
  const previous = queues.get(key) ?? Promise.resolve();
  const current = previous.catch(() => {}).then(fn);
  queues.set(key, current);
  try { return await current; } finally { if (queues.get(key) === current) queues.delete(key); }
}
function endpoint(base, route) {
  const url = new URL(required(base, 'tools.pixelorama_url'));
  if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) || url.username || url.password) throw new ToolError('INVALID_BRIDGE_URL', 'Pixelorama must use a loopback HTTP URL without embedded credentials.');
  return new URL(route, url);
}
async function fetchJson(url, init) {
  let response;
  try { response = await fetch(url, { ...init, redirect: 'error', signal: AbortSignal.timeout(30000) }); }
  catch (error) { throw new ToolError(error.name === 'TimeoutError' ? 'BRIDGE_TIMEOUT' : 'BRIDGE_UNAVAILABLE', 'The local bridge did not return a confirmed result.', { cause: error.message }); }
  let reader;
  const chunks = []; let size = 0;
  try {
    reader = response.body.getReader();
    while (true) {
      const part = await reader.read(); if (part.done) break;
      size += part.value.length;
      if (size > 24 * 1024 * 1024) { await reader.cancel(); throw new ToolError('RESPONSE_TOO_LARGE', 'The bridge response exceeded 24 MiB.'); }
      chunks.push(Buffer.from(part.value));
    }
  } catch (error) {
    if (error instanceof ToolError) throw error;
    throw new ToolError(['AbortError', 'TimeoutError'].includes(error.name) ? 'BRIDGE_TIMEOUT' : 'BRIDGE_UNAVAILABLE', 'The bridge response body was not received completely.');
  } finally { reader?.releaseLock(); }
  let result;
  try { result = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new ToolError('INVALID_BRIDGE_RESPONSE', `The bridge returned non-JSON content (HTTP ${response.status}).`); }
  if (!response.ok) throw new ToolError(result.error?.code ?? 'BRIDGE_HTTP_ERROR', result.error?.message ?? `HTTP ${response.status}`);
  return result;
}
function authorization(tools) {
  return { Authorization: `Bearer ${required(tools.pixelorama_token, 'tools.pixelorama_token or PIXEL_GAME_PIXELORAMA_TOKEN')}` };
}
export async function pixelHealth(project) {
  return fetchJson(endpoint(project.config.tools.pixelorama_url, '/health'), { headers: authorization(project.config.tools) });
}
export async function doctor(args) {
  const project = await loadProject(args.project_root);
  const checks = [];
  for (const [name, binary] of [['godot', project.config.tools.godot_path], ['pixelorama', project.config.tools.pixelorama_path]]) {
    if (!binary) { checks.push({ name, status: 'not_configured' }); continue; }
    try {
      const engineVersion = await versionOf(binary);
      checks.push({ name, status: 'available', engine_version: engineVersion, ...(name === 'godot' ? { baseline_match: engineVersion.startsWith(`${BASELINE.godot}.`) } : { note: '--version reports the embedded Godot engine, not the Pixelorama application version.' }) });
    } catch (error) { checks.push({ name, status: 'failed', error: error.message }); }
  }
  if (project.config.tools.pixelorama_url) {
    try {
      const health = await pixelHealth(project);
      const observed = health.data ?? health;
      checks.push({ name: 'pixelorama_bridge', status: health.ok === false ? 'failed' : 'available', baseline_match: /^v?1\.1\.10(?:-|$)/.test(observed.pixelorama_version ?? '') && observed.api_version === BASELINE.pixelorama_api, data: health });
    }
    catch (error) { checks.push({ name: 'pixelorama_bridge', status: 'failed', error: error.message }); }
  } else checks.push({ name: 'pixelorama_bridge', status: 'not_configured' });
  return { project_root: project.root, baseline: BASELINE, checks, scope: 'Connectivity and version observations only; no asset quality or gameplay claims.' };
}
async function preparePaths(project, args) {
  const copy = structuredClone(args);
  async function inspectValues(value) {
    if (typeof value === 'string' && value.startsWith('res://')) await projectPath(project.root, value);
    else if (Array.isArray(value)) for (const item of value) await inspectValues(item);
    else if (value && typeof value === 'object') for (const item of Object.values(value)) await inspectValues(item);
  }
  await inspectValues(copy);
  for (const key of ['scene_path', 'resource_path', 'path']) {
    if (typeof copy[key] === 'string') await projectPath(project.root, copy[key]);
  }
  if (Array.isArray(copy.steps)) for (const step of copy.steps) if (step.type === 'capture') step.output_path = await projectPath(project.root, required(step.output_path, 'capture.output_path'));
  return copy;
}
export async function godotCall(args, runtime = false) {
  const project = await loadProject(args.project_root);
  const operation = runtime ? 'runtime_sequence' : args.operation;
  if (!runtime && !GODOT_OPERATIONS.includes(operation)) throw new ToolError('UNKNOWN_OPERATION', 'Unsupported Godot operation.');
  const parameters = await preparePaths(project, object(args.args ?? {}, 'args'));
  if (!(await exists(path.join(project.root, 'project.godot')))) throw new ToolError('NOT_GODOT_PROJECT', 'project_root must contain project.godot.');
  const binary = required(project.config.tools.godot_path, 'tools.godot_path or GODOT_PATH');
  return serial(`godot:${project.root}`, async () => {
    const run = await newRun(project, operation, parameters);
    const request = { request_id: run.id, project_root: project.root, operation, args: parameters };
    const requestPath = path.join(run.directory, 'request.json');
    const responsePath = path.join(run.directory, 'response.json');
    await writeJson(requestPath, request);
    const rendered = runtime && parameters.steps?.some(step => step.type === 'capture');
    const script = path.join(PLUGIN_ROOT, 'bridges', 'godot', runtime ? 'runtime_runner.gd' : 'operations.gd');
    const command = [...(rendered ? ['--rendering-method', 'gl_compatibility', '--position', '10000,10000'] : ['--headless']), '--fixed-fps', '60', '--path', project.root, '--log-file', path.join(run.directory, 'engine.log'), '--script', script, '--', requestPath, responsePath];
    try {
      const result = await execute(binary, command, { cwd: project.root, windowsHide: true, timeout: 60000, maxBuffer: 4 * 1024 * 1024 });
      await fs.writeFile(path.join(run.directory, 'stdout.log'), `${result.stdout}\n${result.stderr}`);
      if (!(await exists(responsePath))) throw new ToolError('MISSING_RESPONSE', 'Godot exited without a bridge response.');
      const response = object(await json(responsePath), 'Godot response');
      if (response.request_id !== run.id || typeof response.ok !== 'boolean') throw new ToolError('INVALID_BRIDGE_RESPONSE', 'Godot returned an unmatched response.');
      await finishRun(run, response.ok ? 'completed' : 'failed', response);
      return { ...response, run_id: run.id, evidence_directory: run.directory, rendered };
    } catch (error) {
      const unknown = Boolean(error.killed || error.code === 'ETIMEDOUT');
      if (!unknown && await exists(responsePath)) {
        const response = await json(responsePath);
        if (response.request_id === run.id && response.ok === false) {
          await finishRun(run, 'failed', response);
          return { ...response, run_id: run.id, evidence_directory: run.directory, rendered };
        }
      }
      await finishRun(run, unknown ? 'unknown' : 'failed', { error: { code: error.code ?? 'GODOT_FAILED', message: error.message }, stdout: error.stdout, stderr: error.stderr });
      throw new ToolError(unknown ? 'OUTCOME_UNKNOWN' : 'GODOT_FAILED', unknown ? 'Godot timed out. Inspect this run before retrying a mutation.' : error.message, { run_id: run.id, evidence_directory: run.directory });
    }
  });
}
export async function pixelCall(args) {
  const project = await loadProject(args.project_root);
  if (!PIXEL_OPERATIONS.includes(args.operation)) throw new ToolError('UNKNOWN_OPERATION', 'Unsupported Pixelorama operation.');
  if (PIXEL_MUTATIONS.has(args.operation) && (!args.document_id || !Number.isInteger(args.expected_revision))) throw new ToolError('DOCUMENT_VERSION_REQUIRED', 'Provide document_id and expected_revision from document.info before modifying or exporting a document.');
  const parameters = await preparePaths(project, object(args.args ?? {}, 'args'));
  if (parameters.path) parameters.path = await projectPath(project.root, parameters.path);
  const url = endpoint(project.config.tools.pixelorama_url, '/command');
  return serial(`pixelorama:${url.origin}`, async () => {
    const run = await newRun(project, args.operation, { ...parameters, document_id: args.document_id, expected_revision: args.expected_revision });
    const request = { request_id: run.id, project_root: project.root, operation: args.operation, args: parameters, document_id: args.document_id, expected_revision: args.expected_revision };
    try {
      const response = object(await fetchJson(url, { method: 'POST', headers: { ...authorization(project.config.tools), 'Content-Type': 'application/json' }, body: JSON.stringify(request) }), 'Pixelorama response');
      if (response.request_id !== run.id || typeof response.ok !== 'boolean') throw new ToolError('INVALID_BRIDGE_RESPONSE', 'Pixelorama returned an unmatched response.');
      const receiptResponse = structuredClone(response);
      if (receiptResponse.data?.base64) receiptResponse.data.base64 = `[image omitted: ${receiptResponse.data.base64.length} base64 characters]`;
      await finishRun(run, response.ok ? 'completed' : 'failed', receiptResponse);
      return { ...response, run_id: run.id, evidence_directory: run.directory };
    } catch (error) {
      const uncertain = ['BRIDGE_TIMEOUT', 'BRIDGE_UNAVAILABLE', 'INVALID_BRIDGE_RESPONSE', 'RESPONSE_TOO_LARGE'].includes(error.code);
      await finishRun(run, uncertain ? 'unknown' : 'failed', { error: { code: error.code, message: error.message } });
      throw new ToolError(uncertain ? 'OUTCOME_UNKNOWN' : error.code, uncertain ? 'The bridge result is unconfirmed. Query document.info before retrying.' : error.message, { run_id: run.id, evidence_directory: run.directory });
    }
  });
}
