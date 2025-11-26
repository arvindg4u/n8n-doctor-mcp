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

// Health check endpoint
app.get('/health', (req, res) => res.json({ status: 'healthy', uptime: process.uptime() }));

// SSE endpoint for MCP
app.get('/mcp', async (req, res) => {
  const server = new Server({ name: 'n8n-doctor', version: '1.0.0' }, { capabilities: { tools: {} } });

  // 1. CREATE WORKFLOW
  server.setRequestHandler('tools/call', async (request) => {
    if (request.params.name === 'create_workflow') {
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
    }

    // 2. LIST WORKFLOWS
    if (request.params.name === 'list_workflows') {
      try {
        const response = await axios.get(`${N8N_API_URL}/workflows`, axiosConfig);
        const workflows = response.data.data || [];
        const summary = workflows.map((w: any) => ({ id: w.id, name: w.name, active: w.active }));
        return { content: [{ type: 'text', text: JSON.stringify(summary) }] };
      } catch (error: any) {
        return { content: [{ type: 'text', text: `Error: ${error.message}` }] };
      }
    }

    // 3. GET WORKFLOW
    if (request.params.name === 'get_workflow') {
      try {
        const { workflowId } = request.params.arguments as any;
        const response = await axios.get(`${N8N_API_URL}/workflows/${workflowId}`, axiosConfig);
        return { content: [{ type: 'text', text: JSON.stringify(response.data) }] };
      } catch (error: any) {
        return { content: [{ type: 'text', text: `Error: ${error.message}` }] };
      }
    }

    // 4. UPDATE WORKFLOW
    if (request.params.name === 'update_workflow') {
      try {
        const { workflowId, updates } = request.params.arguments as any;
        const data = JSON.parse(updates);
        const response = await axios.patch(`${N8N_API_URL}/workflows/${workflowId}`, data, axiosConfig);
        return { content: [{ type: 'text', text: JSON.stringify(response.data) }] };
      } catch (error: any) {
        return { content: [{ type: 'text', text: `Error: ${error.message}` }] };
      }
    }

    // 5. DELETE WORKFLOW
    if (request.params.name === 'delete_workflow') {
      try {
        const { workflowId } = request.params.arguments as any;
        await axios.delete(`${N8N_API_URL}/workflows/${workflowId}`, axiosConfig);
        return { content: [{ type: 'text', text: JSON.stringify({ success: true, deleted: workflowId }) }] };
      } catch (error: any) {
        return { content: [{ type: 'text', text: `Error: ${error.message}` }] };
      }
    }

    // 6. ACTIVATE WORKFLOW
    if (request.params.name === 'activate_workflow') {
      try {
        const { workflowId } = request.params.arguments as any;
        const response = await axios.post(`${N8N_API_URL}/workflows/${workflowId}/activate`, {}, axiosConfig);
        return { content: [{ type: 'text', text: JSON.stringify(response.data) }] };
      } catch (error: any) {
        return { content: [{ type: 'text', text: `Error: ${error.message}` }] };
      }
    }

    // 7. DEACTIVATE WORKFLOW
    if (request.params.name === 'deactivate_workflow') {
      try {
        const { workflowId } = request.params.arguments as any;
        const response = await axios.post(`${N8N_API_URL}/workflows/${workflowId}/deactivate`, {}, axiosConfig);
        return { content: [{ type: 'text', text: JSON.stringify(response.data) }] };
      } catch (error: any) {
        return { content: [{ type: 'text', text: `Error: ${error.message}` }] };
      }
    }

    // 8. SCAN WORKFLOWS
    if (request.params.name === 'scan_workflows') {
      try {
        const response = await axios.get(`${N8N_API_URL}/workflows`, axiosConfig);
        const workflows = response.data.data || [];
        const issues = workflows.filter((w: any) => w.active && !w.nodes.some((n: any) => n.type.includes('Trigger')));
        return { content: [{ type: 'text', text: JSON.stringify({ total: workflows.length, issues: issues.length }) }] };
      } catch (error: any) {
        return { content: [{ type: 'text', text: `Error: ${error.message}` }] };
      }
    }

    // 9. HEALTH CHECK
    if (request.params.name === 'health_check') {
      return { content: [{ type: 'text', text: JSON.stringify({ status: 'healthy', uptime: process.uptime() }) }] };
    }

    return { content: [{ type: 'text', text: 'Unknown tool' }] };
  });

  // List available tools
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

  const transport = new SSEServerTransport('/mcp', res);
  await server.connect(transport);
});

app.listen(7860, () => console.log('MCP Server running on port 7860'));
