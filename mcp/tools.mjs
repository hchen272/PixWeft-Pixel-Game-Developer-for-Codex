import { promises as fs } from 'node:fs';
import { doctor, godotCall, pixelCall, GODOT_OPERATIONS, PIXEL_OPERATIONS } from '../lib/bridges.mjs';
import { assemblePrompt } from '../lib/prompts.mjs';
import { initProject, loadProject, object, projectPath, publicProject, runStatus, ToolError } from '../lib/project.mjs';

const string = { type: 'string', minLength: 1 };
const dict = { type: 'object' };
const project = { project_root: { ...string, description: 'Absolute path of the game workspace; may be supplied by PIXEL_GAME_PROJECT_ROOT.' } };
const schema = (properties, required = []) => ({ type: 'object', properties, required, additionalProperties: false });
const annotations = (readOnlyHint, destructiveHint = false) => ({ readOnlyHint, destructiveHint, idempotentHint: readOnlyHint, openWorldHint: false });
export const TOOLS = [
  { name: 'project_init', description: 'Create optional PixWeft project metadata in an existing game directory. Creative settings remain unset unless supplied. Refuses overwriting.', inputSchema: schema({ ...project, tools: dict, visual: dict, scene: dict }), annotations: annotations(false) },
  { name: 'project_inspect', description: 'Read project configuration and tool availability settings, with credentials redacted. Does not load or run game scripts.', inputSchema: schema(project), annotations: annotations(true) },
  { name: 'toolchain_doctor', description: 'Observe configured executable versions and the authenticated local Pixelorama bridge. Reports unavailable and unverified components explicitly.', inputSchema: schema(project), annotations: annotations(true) },
  { name: 'image_prompt', description: 'Assemble an English concept, production, patch, or review prompt from declared project choices and reference roles. Does not generate an image.', inputSchema: schema({ ...project, mode: { type: 'string', enum: ['concept', 'production', 'patch', 'review'] }, asset_type: { type: 'string', enum: ['character', 'animation', 'prop', 'tile', 'background', 'scene-kit', 'ui', 'icon', 'effect', 'other'] }, spec: dict, references: { type: 'array', items: schema({ source: string, role: string, preserve: {} }, ['source', 'role']) } }, ['spec']), annotations: annotations(true) },
  { name: 'godot_operation', description: 'Execute a named Godot headless project, scene, resource, settings, or image operation. Mutations require the requested task to authorize them; all operations produce scoped receipts.', inputSchema: schema({ ...project, operation: { type: 'string', enum: GODOT_OPERATIONS }, args: dict }, ['operation']), annotations: annotations(false, true) },
  { name: 'godot_runtime', description: 'Run a bounded sequence of actual Godot input, wait, inspect, and screenshot steps in a project-selected scene. Captures use a rendered subprocess; no game-specific success criteria are invented.', inputSchema: schema({ ...project, args: dict }, ['args']), annotations: annotations(false) },
  { name: 'pixelorama_operation', description: 'Call an allowlisted operation in the authenticated local Pixelorama extension. Existing-document edits/exports require document identity and expected revision. Preview returns image content.', inputSchema: schema({ ...project, operation: { type: 'string', enum: PIXEL_OPERATIONS }, args: dict, document_id: string, expected_revision: { type: 'integer', minimum: 0 } }, ['operation']), annotations: annotations(false, true) },
  { name: 'run_status', description: 'Read a tool execution receipt after completion, failure, or uncertain timeout. A receipt reports only its own operation and evidence scope.', inputSchema: schema({ ...project, run_id: string }, ['run_id']), annotations: annotations(true) }
];
export async function callTool(name, args = {}) {
  object(args, 'arguments');
  const definition = TOOLS.find(tool => tool.name === name);
  if (!definition) throw new ToolError('UNKNOWN_TOOL', `Unknown tool: ${name}`);
  for (const key of Object.keys(args)) if (!Object.hasOwn(definition.inputSchema.properties, key)) throw new ToolError('INVALID_ARGUMENT', `Unknown argument: ${key}`);
  switch (name) {
    case 'project_init': return initProject(args);
    case 'project_inspect': return publicProject(await loadProject(args.project_root));
    case 'toolchain_doctor': return doctor(args);
    case 'image_prompt': {
      const profile = args.project_root || process.env.PIXEL_GAME_PROJECT_ROOT ? (await loadProject(args.project_root)).config.visual ?? {} : {};
      return assemblePrompt(args, profile);
    }
    case 'godot_operation': return godotCall(args);
    case 'godot_runtime': return godotCall(args, true);
    case 'pixelorama_operation': return pixelCall(args);
    case 'run_status': return runStatus(args);
  }
}
const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
export async function mcpResult(value, toolName, argumentsValue = {}) {
  const data = structuredClone(value);
  const images = [];
  if (data.data?.mime_type === 'image/png' && typeof data.data.base64 === 'string') {
    const bytes = Buffer.from(data.data.base64, 'base64');
    if (!bytes.subarray(0, 8).equals(pngSignature)) throw new ToolError('INVALID_IMAGE', 'The bridge preview is not a PNG.');
    images.push({ type: 'image', data: data.data.base64, mimeType: 'image/png' });
    delete data.data.base64;
  }
  if (toolName === 'godot_runtime' && value.ok) {
    const projectInfo = await loadProject(argumentsValue.project_root);
    for (const step of argumentsValue.args?.steps ?? []) {
      if (step.type !== 'capture') continue;
      const file = await projectPath(projectInfo.root, step.output_path);
      const bytes = await fs.readFile(file);
      if (bytes.length > 16 * 1024 * 1024 || !bytes.subarray(0, 8).equals(pngSignature)) throw new ToolError('INVALID_IMAGE', 'The captured file is not a supported PNG preview.');
      images.push({ type: 'image', data: bytes.toString('base64'), mimeType: 'image/png' });
    }
  }
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }, ...images], isError: value.ok === false };
}
export function errorResult(error) {
  return { content: [{ type: 'text', text: JSON.stringify({ ok: false, error: { code: error.code ?? 'TOOL_FAILED', message: error.message, ...(error.details ? { details: error.details } : {}) } }, null, 2) }], isError: true };
}
