import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { VERSION } from '../lib/project.mjs';
import { TOOLS, callTool, errorResult, mcpResult } from './tools.mjs';

const server = new Server({ name: 'pixweft', version: VERSION }, { capabilities: { tools: {} } });
server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));
server.setRequestHandler(CallToolRequestSchema, async request => {
  try { return await mcpResult(await callTool(request.params.name, request.params.arguments ?? {}), request.params.name, request.params.arguments); }
  catch (error) { return errorResult(error); }
});
await server.connect(new StdioServerTransport());
