import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { PLUGIN_ROOT } from '../lib/project.mjs';

async function fixture(t, files = {}) {
  const parent = await fs.realpath(tmpdir());
  const root = await fs.mkdtemp(path.join(parent, 'pixweft-validation-'));
  t.after(async () => {
    assert.equal(path.dirname(root), parent);
    assert.match(path.basename(root), /^pixweft-validation-/);
    await fs.rm(root, { recursive: true, force: true });
  });
  const manifest = JSON.stringify({ name: 'validation-fixture', version: '1.0.0' });
  const sources = {
    'plugin.json': manifest,
    '.codex-plugin/plugin.json': manifest,
    'package.json': manifest,
    'mcp.json': JSON.stringify({ mcpServers: { pixweft: { type: 'stdio', args: ['${PLUGIN_ROOT}/mcp/server.mjs'] } } }),
    'skills/example/SKILL.md': '---\nname: example\ndescription: A validation fixture.\n---\n\nUse this skill.\n',
    'README.md': '# Fixture\n',
    ...files,
  };
  for (const file of ['scripts/validate-package.mjs', 'lib/project.mjs']) {
    sources[file] = await fs.readFile(path.join(PLUGIN_ROOT, file), 'utf8');
  }
  await Promise.all(Object.entries(sources).map(async ([file, text]) => {
    const destination = path.join(root, file);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, text);
  }));
  return root;
}

function validate(root) {
  const result = spawnSync(process.execPath, [path.join(root, 'scripts/validate-package.mjs')], {
    cwd: root, encoding: 'utf8', windowsHide: true, timeout: 10000,
  });
  assert.ifError(result.error);
  assert.equal(result.stderr, '');
  return { status: result.status, report: JSON.parse(result.stdout) };
}

test('package validation accepts multilingual README links and localized README files', async t => {
  const chinese = '\u7b80\u4f53\u4e2d\u6587';
  const root = await fixture(t, {
    'README.md': `# Fixture\n\n[${chinese}](README.zh-CN.md)\n`,
    'README.zh-CN.md': `# ${chinese}\n`,
    'docs/README.md': '# \u4ecb\u7ecd\n',
    'docs/README.ja-JP.md': '# \u65e5\u672c\u8a9e\n',
  });
  const { status, report } = validate(root);
  assert.equal(status, 0, JSON.stringify(report));
  assert.equal(report.ok, true);
  assert.deepEqual(report.errors, []);
});

test('package validation still rejects non-English skills and prompts', async t => {
  const root = await fixture(t, {
    'skills/example/SKILL.md': '---\nname: example\ndescription: A validation fixture.\n---\n\n\u4e2d\u6587\n',
    'shared/prompts/story.md': '\u4e2d\u6587\n',
  });
  const { status, report } = validate(root);
  assert.equal(status, 1);
  assert.equal(report.ok, false);
  assert.deepEqual(report.errors.toSorted(), [
    `Non-English source text: ${path.join('skills', 'example', 'SKILL.md')}`,
    `Non-English source text: ${path.join('shared', 'prompts', 'story.md')}`,
  ].toSorted());
});

test('multilingual README files retain link and machine-path validation', async t => {
  const machinePath = ['C:', 'Users', 'fixture', 'private'].join('/');
  const root = await fixture(t, {
    'README.md': '# Fixture\n\n[\u4e2d\u6587](missing.md)\n',
    'README.zh-CN.md': `# \u4e2d\u6587\n\n${machinePath}\n`,
  });
  const { status, report } = validate(root);
  assert.equal(status, 1);
  assert.equal(report.ok, false);
  assert.deepEqual(report.errors.toSorted(), [
    'Broken link in README.md: missing.md',
    'Machine-specific path in source: README.zh-CN.md',
  ].toSorted());
});
