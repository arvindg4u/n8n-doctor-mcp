#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';

const N8N_API_URL = process.env.N8N_API_URL || 'https://arvindkumar888-n8n-automation.hf.space/api/v1';
const N8N_API_KEY = process.env.N8N_API_KEY || '';
const axiosConfig = { headers: { 'X-N8N-API-KEY': N8N_API_KEY } };

const server = new Server(
  { name: 'n8n-doctor', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'list_workflows',
      description: 'Get all n8n workflows',
      inputSchema: {
        type: 'object',
        properties: {},
        required: []
      }
    },
    {
      name: 'health_check',
      description: 'Check n8n server health',
      inputSchema: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  ]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name } = request.params;

  try {
    if (name === 'list_workflows') {
      const response = await axios.get(`${N8N_API_URL}/workflows`, axiosConfig);
      const workflows = response.data.data || [];
      const summary = workflows.map((w: any) => ({
        id: w.id,
        name: w.name,
        active: w.active
      }));
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(summary, null, 2)
        }]
      };
    }

    if (name === 'health_check') {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ status: 'healthy', server: 'n8n-doctor' }, null, 2)
        }]
      };
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: `Error: ${error.message}`
      }],
      isError: true
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('n8n-doctor MCP server running on stdio');
}

main().catch(console.error);
