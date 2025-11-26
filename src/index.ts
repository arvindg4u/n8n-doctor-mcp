import { Hono } from 'hono';
import { McpServer, StreamableHttpTransport } from 'mcp-lite';
import { z } from 'zod';
import axios from 'axios';

// n8n API configuration
const N8N_API_URL = process.env.N8N_API_URL || 'https://arvindkumar888-n8n-automation.hf.space/api/v1';
const N8N_API_KEY = process.env.N8N_API_KEY || '';
const axiosConfig = { headers: { 'X-N8N-API-KEY': N8N_API_KEY } };

// MCP Server setup with mcp-lite
const mcp = new McpServer({
  name: 'n8n-doctor',
  version: '1.0.0',
  schemaAdapter: (schema) => z.toJSONSchema(schema as z.ZodType),
});

// Tool 1: List all workflows
mcp.tool('list_workflows', {
  description: 'Get all n8n workflows with their status',
  inputSchema: z.object({}),
  handler: async () => {
    try {
      const response = await axios.get(`${N8N_API_URL}/workflows`, axiosConfig);
      const workflows = response.data.data || [];
      const summary = workflows.map((w: any) => ({
        id: w.id,
        name: w.name,
        active: w.active,
        createdAt: w.createdAt,
        updatedAt: w.updatedAt
      }));
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(summary, null, 2)
        }]
      };
    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: `Error fetching workflows: ${error.message}`
        }],
        isError: true
      };
    }
  }
});

// Tool 2: Health check
mcp.tool('health_check', {
  description: 'Check n8n server and MCP server health',
  inputSchema: z.object({}),
  handler: async () => {
    try {
      // Check n8n API health
      await axios.get(`${N8N_API_URL}/workflows`, axiosConfig);
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            status: 'healthy',
            mcpServer: 'n8n-doctor',
            n8nApi: 'connected',
            timestamp: new Date().toISOString()
          }, null, 2)
        }]
      };
    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            status: 'unhealthy',
            mcpServer: 'n8n-doctor',
            n8nApi: 'disconnected',
            error: error.message,
            timestamp: new Date().toISOString()
          }, null, 2)
        }],
        isError: true
      };
    }
  }
});

// HTTP Transport setup
const transport = new StreamableHttpTransport();
const httpHandler = transport.bind(mcp);

// Hono app setup
const app = new Hono();

// Health endpoint for HF Space
app.get('/', (c) => {
  return c.json({
    name: 'n8n-doctor MCP Server',
    version: '1.0.0',
    status: 'running',
    transport: 'HTTP + SSE',
    endpoint: '/mcp',
    timestamp: new Date().toISOString()
  });
});

// MCP endpoint
app.all('/mcp', async (c) => {
  const response = await httpHandler(c.req.raw);
  return response;
});

// Start server
const port = parseInt(process.env.PORT || '7860');
console.log(`🚀 n8n-doctor MCP server starting on port ${port}`);
console.log(`📡 MCP endpoint: http://localhost:${port}/mcp`);
console.log(`🏥 Health check: http://localhost:${port}/`);

export default {
  port,
  fetch: app.fetch,
};
