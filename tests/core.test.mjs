import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { createServer } from 'node:http';
import { assemblePrompt } from '../lib/prompts.mjs';
import { initProject, loadProject, projectPath, publicProject } from '../lib/project.mjs';
import { callTool, mcpResult } from '../mcp/tools.mjs';

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(tmpdir(), 'pixel-game-unit-'));
  t.after(async () => {
    assert.equal(path.dirname(root), await fs.realpath(tmpdir()));
    assert.match(path.basename(root), /^pixel-game-unit-/);
    await fs.rm(root, { recursive: true, force: true });
  });
  return root;
}
test('project setup preserves unset creative choices and separates local credentials', async t => {
  const root = await fixture(t);
  const result = await initProject({ project_root: root, tools: { pixelorama_token: 'local-secret' } });
  assert.deepEqual(result.config.visual, {});
  assert.deepEqual(result.config.scene, {});
  assert.equal(result.config.tools.pixelorama_token, undefined);
  assert.equal(result.config.tools.pixelorama_token_configured, true);
  assert.doesNotMatch(await fs.readFile(path.join(root, '.pixel-game/project.json'), 'utf8'), /local-secret/);
  assert.match(await fs.readFile(path.join(root, '.pixel-game/.gitignore'), 'utf8'), /project\.local\.json/);
  await assert.rejects(initProject({ project_root: root }), error => error.code === 'ALREADY_CONFIGURED');
});
test('existing ignore content is preserved and local secret rules take effect before configuration is written', async t => {
  const root = await fixture(t);
  await fs.mkdir(path.join(root, '.pixel-game'));
  await fs.writeFile(path.join(root, '.pixel-game/.gitignore'), '# Existing project rules\n!project.local.json\n');
  await initProject({ project_root: root, tools: { pixelorama_token: 'private-fixture-token' } });
  const ignore = await fs.readFile(path.join(root, '.pixel-game/.gitignore'), 'utf8');
  assert.match(ignore, /^# Existing project rules/);
  assert(ignore.lastIndexOf('/project.local.json') > ignore.indexOf('!project.local.json'));
});
test('paths reject traversal and junction/symlink escapes, including new outputs', async t => {
  const root = await fixture(t);
  const outside = await fixture(t);
  await assert.rejects(projectPath(root, '../escape.png'), error => error.code === 'PATH_OUTSIDE_PROJECT');
  await fs.symlink(outside, path.join(root, 'linked'), process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(projectPath(root, 'linked/new/output.png'), error => error.code === 'PATH_OUTSIDE_PROJECT');
  assert.equal(await projectPath(root, 'res://new/output.png'), path.join(root, 'new/output.png'));
});
test('project profiles do not leak between projects or into prompt defaults', async t => {
  const first = await fixture(t); const second = await fixture(t);
  await initProject({ project_root: first, visual: { projection: 'side view', canvas: [19, 31] }, scene: { construction: 'free placement' } });
  await initProject({ project_root: second });
  const a = await callTool('image_prompt', { project_root: first, asset_type: 'prop', spec: { subject: 'wall clock', custom_constraint: 'keep the dial readable' } });
  const b = await callTool('image_prompt', { project_root: second, asset_type: 'background', spec: { subject: 'empty workshop' } });
  assert.match(a.prompt, /side view|19/);
  assert.match(a.prompt, /keep the dial readable/);
  assert.doesNotMatch(b.prompt, /side view|19|31/);
  assert.equal(a.generation_performed, false);
  await assert.rejects(callTool('image_prompt', { spec: { subject: 'clock' }, unexpected: true }), error => error.code === 'INVALID_ARGUMENT');
});
test('all static artwork production defaults to direct import without automatic pixel edits', () => {
  for (const assetType of ['character', 'prop', 'tile', 'background', 'scene-kit', 'ui', 'icon', 'effect', 'other']) {
    const draft = assemblePrompt({ mode: 'production', asset_type: assetType, spec: { subject: 'project-owned artwork', perspective: 'front view', palette: 'unrestricted' } });
    assert.equal(draft.creation_route, 'generated-draft-refine', 'Keep the existing route identifier compatible.');
    assert.equal(draft.pixelorama_handoff, 'direct-import');
    assert.equal(draft.requires_style_reference_question, true);
    assert.equal(draft.requires_generation, true, 'Missing style images must not block generation.');
    assert.match(draft.style_reference_question, /style reference images/);
    const stages = ['Generate reference artwork', 'directly import it into Pixelorama'];
    const positions = stages.map(stage => draft.prompt.indexOf(stage));
    assert(positions.every((position, i) => position >= 0 && (i === 0 || position > positions[i - 1])), `Ordered static workflow missing for ${assetType}.`);
    assert.match(draft.prompt, /front view/);
    assert.match(draft.prompt, /unrestricted/);
    assert.match(draft.prompt, /without proactive retouching, redraw, or cleanup/);
    assert.match(draft.prompt, /An observed defect does not itself authorize a canvas edit/);
    assert.match(draft.prompt, /Inspect its details and report observed issues/);
    assert.doesNotMatch(draft.prompt, /make required adjustments on the actual Pixelorama canvas|Correct observed defects through actual/);
    assert.doesNotMatch(draft.prompt, /First generate a multi-frame reference sprite sheet/);
    assert.equal(draft.generation_performed, false);
  }
});

test('style reference questions distinguish supplied images, previous answers, and written direction', () => {
  const spec = { subject: 'wall clock', style: 'soft watercolor pixels' };
  const written = assemblePrompt({ spec }, { style: 'existing written art direction' });
  assert.equal(written.requires_style_reference_question, true, 'Written direction alone does not answer whether reference images exist.');
  const identity = assemblePrompt({ spec, references: [{ source: 'clock.png', role: 'identity' }] });
  assert.equal(identity.requires_style_reference_question, true, 'An identity reference is not necessarily a style reference.');
  for (const role of ['style', 'visual style and palette', 'art direction', 'visual direction', 'stylistic guidance']) {
    const supplied = assemblePrompt({ spec, references: [{ source: 'look.png', role }] });
    assert.equal(supplied.requires_style_reference_question, false);
    assert.equal(supplied.style_reference_question, undefined);
    assert.equal(supplied.requires_generation, true);
    assert.equal(supplied.pixelorama_handoff, 'direct-import');
    assert.match(supplied.next_step, /directly import/);
  }
  const answered = assemblePrompt({ spec: { ...spec, style_reference_answered: true } });
  assert.equal(answered.requires_style_reference_question, false, 'An earlier answer that no images are available must prevent repeat questions.');
  assert.equal(answered.style_reference_question, undefined);
  assert.equal(answered.requires_generation, true);
  const unanswered = assemblePrompt({ spec: { ...spec, style_reference_answered: false } });
  assert.equal(unanswered.requires_style_reference_question, true);
  assert.throws(() => assemblePrompt({ spec: { ...spec, style_reference_answered: 'yes' } }), error => error.code === 'INVALID_ARGUMENT');
});

test('image_prompt accepts the optional style availability answer through the existing MCP spec object', async t => {
  const root = await fixture(t);
  await initProject({ project_root: root });
  const result = await callTool('image_prompt', { project_root: root, asset_type: 'prop', spec: { subject: 'wall clock', style_reference_answered: true } });
  assert.equal(result.requires_style_reference_question, false);
  assert.equal(result.pixelorama_handoff, 'direct-import');
  assert.equal(result.generation_performed, false);
});

test('animation production imports a multi-frame sheet and leaves pixel correction opt-in', () => {
  const result = assemblePrompt({ asset_type: 'animation', spec: { subject: 'project-owned character', motion: { action: 'run', fps: 11 }, layout: { columns: 3, rows: 2 } } });
  assert.equal(result.pixelorama_handoff, 'direct-import');
  const stages = ['First generate a multi-frame reference sprite sheet', 'directly import the sheet as editable frames into Pixelorama'];
  const positions = stages.map(stage => result.prompt.indexOf(stage));
  assert(positions.every((position, i) => position >= 0 && (i === 0 || position > positions[i - 1])));
  assert.match(result.prompt, /Inspect every frame and the complete sequence, including/);
  assert.match(result.prompt, /contact and recovery poses/);
  assert.match(result.prompt, /loop boundary when a loop is requested/);
  assert.match(result.prompt, /make pixel edits only when the user has requested them/);
  assert.match(result.prompt, /do not invent a fixed frame count or view/);
  assert.match(result.prompt, /"action":"run","fps":11/);
  assert.match(result.prompt, /"columns":3,"rows":2/);
  assert.doesNotMatch(result.prompt, /make required adjustments on the actual Pixelorama canvas/);
  assert(result.unverified_requirements.some(requirement => /transitions/.test(requirement)));
  assert.equal(result.requires_generation, true);
  assert.equal(result.generation_performed, false);
});

test('production prompts preserve explicitly requested native creation routes and maintenance scope', () => {
  const reference = assemblePrompt({ mode: 'production', spec: { subject: 'wall clock', creation_route: 'reference-led-redraw' } });
  assert.equal(reference.creation_route, 'reference-led-redraw');
  assert.equal(reference.pixelorama_handoff, 'authorized-edit');
  assert.match(reference.prompt, /explicitly requested native Pixelorama authoring/);
  assert.match(reference.prompt, /resizing, quantizing, or saving this reference alone does not complete native drawing/);
  const cleanup = assemblePrompt({ mode: 'production', asset_type: 'prop', spec: { subject: 'wall clock', creation_route: 'cleanup-import' } });
  assert.equal(cleanup.creation_route, 'cleanup-import');
  assert.equal(cleanup.pixelorama_handoff, 'authorized-edit');
  assert.match(cleanup.prompt, /pixel data will be retained for explicitly requested cleanup\/import/);
  assert.match(cleanup.prompt, /within the requested scope/);
  assert.doesNotMatch(cleanup.prompt, /Generate a drawing reference for native Pixelorama authoring/);
  const edit = assemblePrompt({ mode: 'production', spec: { subject: 'wall clock', creation_route: 'existing-native-edit' } });
  assert.match(edit.prompt, /Preserve that source structure and unaffected work/);
  assert.equal(edit.requires_generation, false);
  assert.equal(edit.requires_style_reference_question, false, 'Native maintenance should not add an unrelated reference question.');
  assert.equal(edit.pixelorama_handoff, 'authorized-edit');
  assert.match(edit.next_step, /existing native source in Pixelorama/);
  assert.doesNotMatch(edit.prompt, /Generate reference artwork/);
  const animationEdit = assemblePrompt({ asset_type: 'animation', spec: { subject: 'existing walk cycle', creation_route: 'existing-native-edit' } });
  assert.equal(animationEdit.requires_generation, false);
  assert.equal(animationEdit.requires_style_reference_question, false);
  assert.equal(animationEdit.pixelorama_handoff, 'authorized-edit');
  assert.doesNotMatch(animationEdit.prompt, /First generate a multi-frame/);
  assert.throws(() => assemblePrompt({ spec: { subject: 'clock', creation_route: 'unknown' } }), /creation_route/);
});

test('concept and review prompts preserve limited scope instead of imposing a production workflow', () => {
  const concept = assemblePrompt({ mode: 'concept', spec: { subject: 'wall clock' } });
  assert.equal(concept.creation_route, undefined, 'Concept requests must not silently become full production tasks.');
  assert.equal(concept.requires_style_reference_question, true);
  assert.equal(concept.pixelorama_handoff, 'none');
  assert.doesNotMatch(concept.prompt, /actual Pixelorama canvas|Native detail inspection must/);
  const animationConcept = assemblePrompt({ mode: 'concept', asset_type: 'animation', spec: { subject: 'motion idea' } });
  assert.doesNotMatch(animationConcept.prompt, /First generate a multi-frame|actual Pixelorama canvas/);
  const review = assemblePrompt({ mode: 'review', asset_type: 'animation', spec: {} });
  assert.equal(review.requires_generation, false);
  assert.equal(review.generation_performed, false);
  assert.equal(review.requires_style_reference_question, false);
  assert.equal(review.pixelorama_handoff, 'none');
  assert.match(review.prompt, /do not generate a replacement or edit pixels/);
  assert.doesNotMatch(review.prompt, /First generate a multi-frame|actual Pixelorama canvas/);
});

test('patch prompts require explicit changes and preservation; references have roles', () => {
  assert.throws(() => assemblePrompt({ mode: 'patch', spec: { subject: 'clock', changes: 'dial' } }), error => error.code === 'INVALID_ARGUMENT');
  const result = assemblePrompt({ mode: 'patch', spec: { changes: 'repair the dial', preserve: 'silhouette and alpha', purpose: 'readable prop' }, references: [{ source: 'approved.png', role: 'identity' }] });
  assert.match(result.prompt, /repair the dial/); assert.match(result.prompt, /silhouette and alpha/); assert.match(result.prompt, /identity/);
});

test('generated patches directly import while explicit native repairs retain scoped edits', () => {
  const spec = { subject: 'existing run animation', changes: 'repair one glove', preserve: 'identity, other frames, and layers' };
  for (const creation_route of [undefined, 'generated-draft-refine']) {
    const generated = assemblePrompt({ mode: 'patch', asset_type: 'animation', spec: { ...spec, ...(creation_route ? { creation_route } : {}) } });
    assert.equal(generated.pixelorama_handoff, 'direct-import');
    const stages = ['Generate only the authorized image patch candidate', 'Import or merge that candidate into Pixelorama', 'Directly import the authorized patch pixels without proactive retouching', 'Inspect its details and report remaining issues'];
    const positions = stages.map(stage => generated.prompt.indexOf(stage));
    assert(positions.every((position, i) => position >= 0 && (i === 0 || position > positions[i - 1])));
    assert.match(generated.prompt, /Preserve unaffected regions, frames, and layers/);
    assert.match(generated.prompt, /an observed defect does not authorize extra native pixel edits/);
    assert.doesNotMatch(generated.prompt, /make required adjustments|correct only the authorized defects through the Pixelorama GUI/);
    assert.equal(generated.requires_generation, true);
    assert.equal(generated.generation_performed, false);
  }
  for (const creation_route of ['cleanup-import', 'reference-led-redraw']) {
    const explicit = assemblePrompt({ mode: 'patch', asset_type: 'animation', spec: { ...spec, creation_route } });
    assert.equal(explicit.pixelorama_handoff, 'authorized-edit');
    assert.equal(explicit.requires_generation, true);
    assert.match(explicit.prompt, /explicitly requested/);
    assert.match(explicit.prompt, /correct only the authorized defects/);
    assert.match(explicit.prompt, /Report additional findings without editing them/);
    assert.doesNotMatch(explicit.prompt, /Directly import the authorized patch pixels without proactive retouching/);
  }
  const native = assemblePrompt({ mode: 'patch', asset_type: 'animation', spec: { ...spec, creation_route: 'existing-native-edit' } });
  assert.equal(native.requires_generation, false);
  assert.equal(native.requires_style_reference_question, false);
  assert.equal(native.pixelorama_handoff, 'authorized-edit');
  assert.equal(native.generation_performed, false);
  assert.match(native.next_step, /existing native source in Pixelorama/);
  assert.match(native.prompt, /repair only the authorized image region or animation frames/);
  assert.match(native.prompt, /Report additional findings without editing them/);
  assert.doesNotMatch(native.prompt, /Generate only the authorized image patch candidate|First generate a multi-frame/);
});

test('Pixelorama proxy preserves image blocks, rejects stale document requests, and records truthful failures', async t => {
  const root = await fixture(t);
  const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j4f8AAAAASUVORK5CYII=';
  let seen = 0;
  const server = createServer(async (request, response) => {
    assert.equal(request.headers.authorization, 'Bearer test-token');
    let body = ''; for await (const chunk of request) body += chunk;
    const data = JSON.parse(body); seen++;
    response.setHeader('Content-Type', 'application/json');
    if (data.operation === 'document.preview') response.end(JSON.stringify({ ok: true, request_id: data.request_id, data: { mime_type: 'image/png', base64: png, width: 1, height: 1 } }));
    else response.end(JSON.stringify({ ok: false, request_id: data.request_id, error: { code: 'REVISION_CONFLICT', message: 'Document changed.' } }));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const address = server.address();
  await initProject({ project_root: root, tools: { pixelorama_url: `http://127.0.0.1:${address.port}`, pixelorama_token: 'test-token' } });
  await assert.rejects(callTool('pixelorama_operation', { project_root: root, operation: 'document.patch_pixels', args: { pixels: [] } }), error => error.code === 'DOCUMENT_VERSION_REQUIRED');
  assert.equal(seen, 0);
  const preview = await callTool('pixelorama_operation', { project_root: root, operation: 'document.preview' });
  const content = await mcpResult(preview, 'pixelorama_operation');
  assert.equal(content.content[1].type, 'image'); assert.equal(content.content[1].data, png);
  assert.doesNotMatch(content.content[0].text, /iVBOR/);
  const receipt = await callTool('run_status', { project_root: root, run_id: preview.run_id });
  assert.equal(receipt.status, 'completed'); assert.doesNotMatch(JSON.stringify(receipt), /test-token|iVBOR/);
  const failure = await callTool('pixelorama_operation', { project_root: root, operation: 'document.add_frame', document_id: 'doc-1', expected_revision: 0 });
  assert.equal(failure.ok, false);
  assert.equal((await mcpResult(failure)).isError, true);
  assert.equal((await callTool('run_status', { project_root: root, run_id: failure.run_id })).status, 'failed');
});
test('configuration is never silently migrated across unknown schema versions', async t => {
  const root = await fixture(t);
  await fs.mkdir(path.join(root, '.pixel-game'));
  await fs.writeFile(path.join(root, '.pixel-game/project.json'), JSON.stringify({ schema_version: 99 }));
  await assert.rejects(loadProject(root), error => error.code === 'CONFIG_VERSION');
});
test('a mutation with a lost response body has an unknown outcome', async t => {
  const root = await fixture(t);
  await initProject({ project_root: root, tools: { pixelorama_url: 'http://127.0.0.1:32124', pixelorama_token: 'test-token' } });
  t.mock.method(globalThis, 'fetch', async () => ({ ok: true, status: 200, body: { getReader: () => ({ read: async () => { throw new DOMException('The stream was interrupted.', 'AbortError'); }, releaseLock() {} }) } }));
  let run;
  await assert.rejects(callTool('pixelorama_operation', { project_root: root, operation: 'document.patch_pixels', document_id: 'doc-1', expected_revision: 0, args: { pixels: [{ x: 0, y: 0, color: '#ffffff' }] } }), error => { run = error.details?.run_id; return error.code === 'OUTCOME_UNKNOWN'; });
  assert.equal((await callTool('run_status', { project_root: root, run_id: run })).status, 'unknown');
});
