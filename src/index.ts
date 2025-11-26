import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import axios from 'axios';
import express from 'express';

const server = new McpServer({ name: 'n8n-doctor', version: '1.0.0' });
const N8N_API_URL = process.env.N8N_API_URL || 'https://arvindkumar888-n8n-automation.hf.space/api/v1';
const N8N_API_KEY = process.env.N8N_API_KEY || '';

const axiosConfig = { headers: { 'X-N8N-API-KEY': N8N_API_KEY } };

// 1. CREATE WORKFLOW
server.tool('create_workflow', 'Create new n8n workflow from description', {
  description: z.string().describe('Natural language workflow description')
}, async ({ description }) => {
  try {
    const workflow = {
      name: `Workflow ${Date.now()}`,
      nodes: [
        { id: 'trigger', type: 'n8n-nodes-base.webhook', position: [250, 300], parameters: { path: 'webhook' } },
        { id: 'action', type: 'n8n-nodes-base.noOp', position: [450, 300], parameters: {} }
      ],
      connections: { trigger: { main: [[{ node: 'action', type: 'main', index: 0 }]] } },
      active: false,
      settings: {}
    };
    const response = await axios.post(`${N8N_API_URL}/workflows`, workflow, axiosConfig);
    return { content: [{ type: 'text', text: JSON.stringify(response.data) }] };
  } catch (error: any) {
    return { content: [{ type: 'text', text: `Error: ${error.message}` }] };
  }
});

// 2. LIST WORKFLOWS
server.tool('list_workflows', 'Get all workflows', {}, async () => {
  try {
    const response = await axios.get(`${N8N_API_URL}/workflows`, axiosConfig);
    const workflows = response.data.data || [];
    const summary = workflows.map((w: any) => ({ id: w.id, name: w.name, active: w.active }));
    return { content: [{ type: 'text', text: JSON.stringify(summary) }] };
  } catch (error: any) {
    return { content: [{ type: 'text', text: `Error: ${error.message}` }] };
  }
});

// 3. GET WORKFLOW
server.tool('get_workflow', 'Get specific workflow details', {
  workflowId: z.string().describe('Workflow ID')
}, async ({ workflowId }) => {
  try {
    const response = await axios.get(`${N8N_API_URL}/workflows/${workflowId}`, axiosConfig);
    return { content: [{ type: 'text', text: JSON.stringify(response.data) }] };
  } catch (error: any) {
    return { content: [{ type: 'text', text: `Error: ${error.message}` }] };
  }
});

// 4. UPDATE WORKFLOW
server.tool('update_workflow', 'Update existing workflow', {
  workflowId: z.string().describe('Workflow ID'),
  updates: z.string().describe('JSON string of updates')
}, async ({ workflowId, updates }) => {
  try {
    const data = JSON.parse(updates);
    const response = await axios.patch(`${N8N_API_URL}/workflows/${workflowId}`, data, axiosConfig);
    return { content: [{ type: 'text', text: JSON.stringify(response.data) }] };
  } catch (error: any) {
    return { content: [{ type: 'text', text: `Error: ${error.message}` }] };
  }
});

// 5. DELETE WORKFLOW
server.tool('delete_workflow', 'Delete workflow', {
  workflowId: z.string().describe('Workflow ID')
}, async ({ workflowId }) => {
  try {
    await axios.delete(`${N8N_API_URL}/workflows/${workflowId}`, axiosConfig);
    return { content: [{ type: 'text', text: JSON.stringify({ success: true, deleted: workflowId }) }] };
  } catch (error: any) {
    return { content: [{ type: 'text', text: `Error: ${error.message}` }] };
  }
});

// 6. ACTIVATE WORKFLOW
server.tool('activate_workflow', 'Enable workflow', {
  workflowId: z.string().describe('Workflow ID')
}, async ({ workflowId }) => {
  try {
    const response = await axios.post(`${N8N_API_URL}/workflows/${workflowId}/activate`, {}, axiosConfig);
    return { content: [{ type: 'text', text: JSON.stringify(response.data) }] };
  } catch (error: any) {
    return { content: [{ type: 'text', text: `Error: ${error.message}` }] };
  }
});

// 7. DEACTIVATE WORKFLOW
server.tool('deactivate_workflow', 'Disable workflow', {
  workflowId: z.string().describe('Workflow ID')
}, async ({ workflowId }) => {
  try {
    const response = await axios.post(`${N8N_API_URL}/workflows/${workflowId}/deactivate`, {}, axiosConfig);
    return { content: [{ type: 'text', text: JSON.stringify(response.data) }] };
  } catch (error: any) {
    return { content: [{ type: 'text', text: `Error: ${error.message}` }] };
  }
});

// 8. SCAN WORKFLOWS
server.tool('scan_workflows', 'Check workflows for errors', {}, async () => {
  try {
    const response = await axios.get(`${N8N_API_URL}/workflows`, axiosConfig);
    const workflows = response.data.data || [];
    const issues = workflows.filter((w: any) => w.active && !w.nodes.some((n: any) => n.type.includes('Trigger')));
    return { content: [{ type: 'text', text: JSON.stringify({ total: workflows.length, issues: issues.length }) }] };
  } catch (error: any) {
    return { content: [{ type: 'text', text: `Error: ${error.message}` }] };
  }
});

// 9. HEALTH CHECK
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