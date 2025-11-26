import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';
import express from 'express';

const N8N_API_URL = process.env.N8N_API_URL || 'https://arvindkumar888-n8n-automation.hf.space/api/v1';
const N8N_API_KEY = process.env.N8N_API_KEY || '';
const axiosConfig = { headers: { 'X-N8N-API-KEY': N8N_API_KEY } };

const app = express();
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'healthy', uptime: process.uptime() }));

app.get('/sse', async (req, res) => {
  const server = new Server({ name: 'n8n-doctor', version: '1.0.0' }, { capabilities: { tools: {} } });

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      { name: 'list_workflows', description: 'Get all workflows', inputSchema: { type: 'object', properties: {} } },
      { name: 'health_check', description: 'Health check', inputSchema: { type: 'object', properties: {} } }
    ]
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const toolName = request.params.name;

    try {
      if (toolName === 'list_workflows') {
        const response = await axios.get(`${N8N_API_URL}/workflows`, axiosConfig);
        const workflows = response.data.data || [];
        return { content: [{ type: 'text', text: JSON.stringify(workflows.map((w: any) => ({ id: w.id, name: w.name, active: w.active }))) }] };
      }
      if (toolName === 'health_check') {
        return { content: [{ type: 'text', text: JSON.stringify({ status: 'healthy', uptime: process.uptime() }) }] };
      }
      return { content: [{ type: 'text', text: 'Unknown tool' }] };
    } catch (error: any) {
      return { content: [{ type: 'text', text: `Error: ${error.message}` }] };
    }
  });

  const transport = new SSEServerTransport('/sse', res);
  await server.connect(transport);
});

app.post('/sse/message', async (req, res) => {
  res.json({ ok: true });
});

app.listen(7860, () => console.log('MCP Server running on port 7860'));
