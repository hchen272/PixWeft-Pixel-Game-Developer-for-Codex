import test from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { PLUGIN_ROOT } from '../lib/project.mjs';
import path from 'node:path';

test('MCP stdio lifecycle, tool discovery, prompt execution, and error signaling', { timeout: 15000 }, async t => {
  const client = new Client({ name: 'pixweft-integration', version: '1.0.0' });
  const transport = new StdioClientTransport({ command: process.execPath, args: [path.join(PLUGIN_ROOT, 'mcp/server.mjs')], cwd: PLUGIN_ROOT, stderr: 'pipe' });
  let stderr = '';
  transport.stderr?.on('data', chunk => { stderr += chunk; });
  await client.connect(transport);
  t.after(() => client.close());
  const listed = await client.listTools();
  assert.equal(listed.tools.length, 8);
  const prompt = await client.callTool({ name: 'image_prompt', arguments: { asset_type: 'prop', spec: { subject: 'wall clock' } } });
  assert.equal(prompt.isError, false);
  assert.equal(JSON.parse(prompt.content[0].text).generation_performed, false);
  const failure = await client.callTool({ name: 'image_prompt', arguments: { mode: 'patch', spec: { subject: 'clock' } } });
  assert.equal(failure.isError, true);
  assert.match(failure.content[0].text, /INVALID_ARGUMENT/);
  assert.equal(stderr, '');
});
