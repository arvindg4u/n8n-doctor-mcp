import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';
import { z } from 'zod';
import axios from 'axios';

// n8n API configuration
const N8N_API_URL = process.env.N8N_API_URL || 'https://arvindkumar888-n8n-automation.hf.space/api/v1';
const N8N_API_KEY = process.env.N8N_API_KEY || '';
const axiosConfig = { headers: { 'X-N8N-API-KEY': N8N_API_KEY } };

// MCP Server setup
const server = new McpServer({
  name: 'n8n-doctor',
  version: '1.0.0'
});

// Tool 1: List all workflows
server.registerTool(
  'list_workflows',
  {
    title: 'List Workflows',
    description: 'Get all n8n workflows with their status',
    inputSchema: {},
    outputSchema: {
      workflows: z.array(z.object({
        id: z.string(),
        name: z.string(),
        active: z.boolean()
      }))
    }
  },
  async () => {
    try {
      const response = await axios.get(`${N8N_API_URL}/workflows`, axiosConfig);
      const workflows = response.data.data || [];
      const summary = workflows.map((w: any) => ({
        id: w.id,
        name: w.name,
        active: w.active
      }));
      
      return {
        content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }],
        structuredContent: { workflows: summary }
      };
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
);

// Tool 2: Health check
server.registerTool(
  'health_check',
  {
    title: 'Health Check',
    description: 'Check n8n server and MCP server health',
    inputSchema: {},
    outputSchema: {
      status: z.string(),
      mcpServer: z.string(),
      n8nApi: z.string(),
      timestamp: z.string()
    }
  },
  async () => {
    try {
      await axios.get(`${N8N_API_URL}/workflows`, axiosConfig);
      
      const output = {
        status: 'healthy',
        mcpServer: 'n8n-doctor',
        n8nApi: 'connected',
        timestamp: new Date().toISOString()
      };
      
      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
        structuredContent: output
      };
    } catch (error: any) {
      const output = {
        status: 'unhealthy',
        mcpServer: 'n8n-doctor',
        n8nApi: 'disconnected',
        timestamp: new Date().toISOString()
      };
      
      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
        isError: true
      };
    }
  }
);

// Express app setup
const app = express();
app.use(express.json());

// Health endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'n8n-doctor MCP Server',
    version: '1.0.0',
    status: 'running',
    transport: 'HTTP + SSE',
    endpoint: '/mcp',
    timestamp: new Date().toISOString()
  });
});

// MCP endpoint
app.post('/mcp', async (req, res) => {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true
  });
  
  res.on('close', () => transport.close());
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

// Start server
const port = parseInt(process.env.PORT || '7860');
app.listen(port, () => {
  console.log(`🚀 n8n-doctor MCP server running on port ${port}`);
  console.log(`📡 MCP endpoint: http://localhost:${port}/mcp`);
  console.log(`🏥 Health check: http://localhost:${port}/`);
});
