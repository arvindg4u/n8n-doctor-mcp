import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import axios from 'axios';
import express from 'express';

const server = new McpServer({ name: 'n8n-doctor', version: '1.0.0' });
const N8N_API_URL = process.env.N8N_API_URL || 'https://arvindkumar888-n8n-automation.hf.space/api/v1';
const N8N_API_KEY = process.env.N8N_API_KEY || '';

server.tool('scan_workflows', 'Check workflows for errors', {}, async () => {
  try {
    const response = await axios.get(`${N8N_API_URL}/workflows`, {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    });
    const workflows = response.data.data || [];
    const issues = workflows.filter((w: any) => w.active && !w.nodes.some((n: any) => n.type.includes('Trigger')));
    return { content: [{ type: 'text', text: JSON.stringify({ total: workflows.length, issues: issues.length }) }] };
  } catch (error: any) {
    return { content: [{ type: 'text', text: `Error: ${error.message}` }] };
  }
});

server.tool('health_check', 'Health check', {}, async () => {
  return { content: [{ type: 'text', text: JSON.stringify({ status: 'healthy', uptime: process.uptime() }) }] };
});

const app = express();
app.get('/health', (req, res) => res.json({ status: 'healthy' }));
app.listen(7860, () => console.log('Server running on port 7860'));

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MCP server started');
}

main();