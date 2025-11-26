import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { z } from 'zod';
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

  server.setRequestHandler('tools/list', async () => ({
    tools: [
      { name: 'create_workflow', description: 'Create new n8n workflow', inputSchema: { type: 'object', properties: { description: { type: 'string' } } } },
      { name: 'list_workflows', description: 'Get all workflows', inputSchema: { type: 'object', properties: {} } },
      { name: 'get_workflow', description: 'Get specific workflow', inputSchema: { type: 'object', properties: { workflowId: { type: 'string' } }, required: ['workflowId'] } },
      { name: 'update_workflow', description: 'Update workflow', inputSchema: { type: 'object', properties: { workflowId: { type: 'string' }, updates: { type: 'string' } }, required: ['workflowId', 'updates'] } },
      { name: 'delete_workflow', description: 'Delete workflow', inputSchema: { type: 'object', properties: { workflowId: { type: 'string' } }, required: ['workflowId'] } },
      { name: 'activate_workflow', description: 'Enable workflow', inputSchema: { type: 'object', properties: { workflowId: { type: 'string' } }, required: ['workflowId'] } },
      { name: 'deactivate_workflow', description: 'Disable workflow', inputSchema: { type: 'object', properties: { workflowId: { type: 'string' } }, required: ['workflowId'] } },
      { name: 'scan_workflows', description: 'Scan for errors', inputSchema: { type: 'object', properties: {} } },
      { name: 'health_check', description: 'Health check', inputSchema: { type: 'object', properties: {} } }
    ]
  }));

  server.setRequestHandler('tools/call', async (request) => {
    const toolName = request.params.name;
    const args = request.params.arguments as any;

    try {
      if (toolName === 'create_workflow') {
        const workflow = { name: `Workflow ${Date.now()}`, nodes: [{ id: 'trigger', type: 'n8n-nodes-base.webhook', position: [250, 300], parameters: { path: 'webhook' } }, { id: 'action', type: 'n8n-nodes-base.noOp', position: [450, 300], parameters: {} }], connections: { trigger: { main: [[{ node: 'action', type: 'main', index: 0 }]] } }, active: false, settings: {} };
        const response = await axios.post(`${N8N_API_URL}/workflows`, workflow, axiosConfig);
        return { content: [{ type: 'text', text: JSON.stringify(response.data) }] };
      }
      if (toolName === 'list_workflows') {
        const response = await axios.get(`${N8N_API_URL}/workflows`, axiosConfig);
        const workflows = response.data.data || [];
        return { content: [{ type: 'text', text: JSON.stringify(workflows.map((w: any) => ({ id: w.id, name: w.name, active: w.active }))) }] };
      }
      if (toolName === 'get_workflow') {
        const response = await axios.get(`${N8N_API_URL}/workflows/${args.workflowId}`, axiosConfig);
        return { content: [{ type: 'text', text: JSON.stringify(response.data) }] };
      }
      if (toolName === 'update_workflow') {
        const response = await axios.patch(`${N8N_API_URL}/workflows/${args.workflowId}`, JSON.parse(args.updates), axiosConfig);
        return { content: [{ type: 'text', text: JSON.stringify(response.data) }] };
      }
      if (toolName === 'delete_workflow') {
        await axios.delete(`${N8N_API_URL}/workflows/${args.workflowId}`, axiosConfig);
        return { content: [{ type: 'text', text: JSON.stringify({ success: true, deleted: args.workflowId }) }] };
      }
      if (toolName === 'activate_workflow') {
        const response = await axios.post(`${N8N_API_URL}/workflows/${args.workflowId}/activate`, {}, axiosConfig);
        return { content: [{ type: 'text', text: JSON.stringify(response.data) }] };
      }
      if (toolName === 'deactivate_workflow') {
        const response = await axios.post(`${N8N_API_URL}/workflows/${args.workflowId}/deactivate`, {}, axiosConfig);
        return { content: [{ type: 'text', text: JSON.stringify(response.data) }] };
      }
      if (toolName === 'scan_workflows') {
        const response = await axios.get(`${N8N_API_URL}/workflows`, axiosConfig);
        const workflows = response.data.data || [];
        const issues = workflows.filter((w: any) => w.active && !w.nodes.some((n: any) => n.type.includes('Trigger')));
        return { content: [{ type: 'text', text: JSON.stringify({ total: workflows.length, issues: issues.length }) }] };
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
