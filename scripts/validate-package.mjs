import { promises as fs } from 'node:fs';
import path from 'node:path';
import { PLUGIN_ROOT, json } from '../lib/project.mjs';

const errors = [];
const root = PLUGIN_ROOT;
const manifest = await json(path.join(root, 'plugin.json'));
const compatibility = await json(path.join(root, '.codex-plugin/plugin.json'));
const packageFile = await json(path.join(root, 'package.json'));
if (manifest.version !== packageFile.version || compatibility.version !== manifest.version) errors.push('Package manifest versions disagree.');
if (manifest.name !== compatibility.name) errors.push('Plugin identities disagree.');
const mcp = await json(path.join(root, 'mcp.json'));
if (mcp.mcpServers?.['pixweft']?.type !== 'stdio') errors.push('Missing portable stdio MCP entry.');
if (!mcp.mcpServers?.['pixweft']?.args?.includes('${PLUGIN_ROOT}/mcp/server.mjs')) errors.push('MCP launch must be relative to PLUGIN_ROOT.');
const directories = await fs.readdir(path.join(root, 'skills'), { withFileTypes: true });
const skills = [];
for (const directory of directories.filter(entry => entry.isDirectory())) {
  const file = path.join(root, 'skills', directory.name, 'SKILL.md');
  const text = await fs.readFile(file, 'utf8');
  const header = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!header || !header[1].match(new RegExp(`^name:\\s*["']?${directory.name}["']?\\s*$`, 'm')) || !/^description:\s*\S/m.test(header[1])) errors.push(`Invalid skill frontmatter: ${directory.name}`);
  if (!/^[a-z0-9-]{1,64}$/.test(directory.name)) errors.push(`Invalid skill name: ${directory.name}`);
  skills.push(directory.name);
}
const omitted = new Set(['node_modules', '.git', '.local', '.godot', 'test-results', 'build']);
let sourceFiles = 0;
async function walk(directory) {
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    if (omitted.has(entry.name)) continue;
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) { await walk(file); continue; }
    if (!/\.(md|json|mjs|gd|tscn|godot|yml|yaml)$/i.test(entry.name)) continue;
    const text = await fs.readFile(file, 'utf8');
    sourceFiles++;
    if (entry.name.endsWith('.json')) { try { JSON.parse(text); } catch { errors.push(`Invalid JSON: ${path.relative(root, file)}`); } }
    const isReadme = /^README(?:\.[a-z0-9_-]+)?\.md$/i.test(entry.name);
    if (!isReadme && /[\u3400-\u9fff]/.test(text)) errors.push(`Non-English source text: ${path.relative(root, file)}`);
    if (/\b[A-Za-z]:[\\/](?:Users|Game|Interest)[\\/]/.test(text)) errors.push(`Machine-specific path in source: ${path.relative(root, file)}`);
    if (entry.name.endsWith('.md')) for (const match of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
      const target = match[1].split('#')[0];
      if (!target || /^(?:https?:|mailto:)/.test(target) || target.includes(' ')) continue;
      try { await fs.access(path.resolve(path.dirname(file), target)); } catch { errors.push(`Broken link in ${path.relative(root, file)}: ${target}`); }
    }
  }
}
await walk(root);
console.log(JSON.stringify({ ok: errors.length === 0, checks: ['manifest identity and versions', 'stdio launch path', 'skill discovery metadata', 'JSON syntax', 'local Markdown links', 'English sources (excluding README files)', 'machine-path isolation'], skills, source_files: sourceFiles, errors }, null, 2));
if (errors.length) process.exitCode = 1;
