#!/usr/bin/env node

/**
 * SRE Platform MCP Server
 * 
 * Provides tools for incident analysis, recommendations, and ServiceNow integration.
 * Designed to be used by AI agents through the Model Context Protocol.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import fetch from 'node-fetch';

// Backend API configuration
const BACKEND_URL = process.env.BACKEND_URL || 'http://backend:3001';

/**
 * Utility: Fetch from backend API
 */
async function backendFetch(endpoint, options = {}) {
  const url = `${BACKEND_URL}${endpoint}`;
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Backend API error (${response.status}): ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    throw new Error(`Failed to fetch ${endpoint}: ${error.message}`);
  }
}

/**
 * Tool Definitions
 */
const TOOLS = [
  {
    name: 'get_servicenow_incident',
    description: 'Fetch a ServiceNow incident by INC number (e.g., INC0001990). Returns incident details including status, priority, description, and resolution information.',
    inputSchema: {
      type: 'object',
      properties: {
        incidentNumber: {
          type: 'string',
          description: 'ServiceNow incident number (e.g., INC0001990)',
          pattern: '^INC\\d{7}$',
        },
      },
      required: ['incidentNumber'],
    },
  },
  {
    name: 'get_incident_recommendations',
    description: 'Get AI-powered knowledge graph recommendations for a local incident. Analyzes similar past incidents and provides actionable insights. Only works for incidents synced to local database.',
    inputSchema: {
      type: 'object',
      properties: {
        incidentId: {
          type: 'string',
          description: 'Local incident UUID',
        },
        refresh: {
          type: 'boolean',
          description: 'Force refresh cache (bypasses 15-minute cache)',
          default: false,
        },
      },
      required: ['incidentId'],
    },
  },
  {
    name: 'get_incident_analytics',
    description: 'Get incident health metrics and trends. Returns statistics on incident volume, severity distribution, active incidents, and resolution trends.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'list_active_incidents',
    description: 'List all currently active or mitigated incidents from local database. Useful for triage and prioritization.',
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          description: 'Filter by status (active, mitigated, resolved, closed)',
          enum: ['active', 'mitigated', 'resolved', 'closed'],
        },
      },
    },
  },
  {
    name: 'get_incident_details',
    description: 'Get full details for a local incident including timeline, services affected, and postmortem status.',
    inputSchema: {
      type: 'object',
      properties: {
        incidentId: {
          type: 'string',
          description: 'Local incident UUID',
        },
      },
      required: ['incidentId'],
    },
  },
  {
    name: 'list_servicenow_incidents',
    description: 'List ServiceNow incidents with optional filtering by state and priority. Returns up to specified limit.',
    inputSchema: {
      type: 'object',
      properties: {
        state: {
          type: 'string',
          description: 'Filter by state value (1=New, 2=In Progress, 3=On Hold, 6=Resolved, 7=Closed)',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of incidents to return',
          default: 50,
          minimum: 1,
          maximum: 100,
        },
      },
    },
  },
  {
    name: 'search_incidents',
    description: 'Search local incidents by keywords in title or description. Returns matching incidents with rank.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query string',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results',
          default: 10,
          minimum: 1,
          maximum: 50,
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_postmortem_analytics',
    description: 'Get postmortem completion metrics including draft/published counts, completion rates, and trends.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_servicenow_incident_recommendations',
    description: 'Get AI-powered recommendations for a ServiceNow incident by INC number. Fetches incident details from ServiceNow and generates actionable recommendations using LLM analysis. Works without local database.',
    inputSchema: {
      type: 'object',
      properties: {
        incidentNumber: {
          type: 'string',
          description: 'ServiceNow incident number (e.g., INC0001990)',
          pattern: '^INC\\d{7}$',
        },
      },
      required: ['incidentNumber'],
    },
  },
];

/**
 * Tool Handlers
 */
const toolHandlers = {
  async get_servicenow_incident({ incidentNumber }) {
    const data = await backendFetch(`/api/servicenow/incident-by-number/${incidentNumber}`);
    
    if (!data.sys_id) {
      throw new Error(`Incident ${incidentNumber} not found in ServiceNow`);
    }

    // Fetch full details
    const fullDetails = await backendFetch(`/api/servicenow/incidents/${data.sys_id}`);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            number: fullDetails.number?.value || incidentNumber,
            sys_id: fullDetails.sys_id?.value,
            state: fullDetails.state?.display_value,
            priority: fullDetails.priority?.display_value,
            impact: fullDetails.impact?.display_value,
            urgency: fullDetails.urgency?.display_value,
            short_description: fullDetails.short_description?.value,
            description: fullDetails.description?.value,
            opened_at: fullDetails.opened_at?.display_value,
            resolved_at: fullDetails.resolved_at?.display_value,
            closed_at: fullDetails.closed_at?.display_value,
            assignment_group: fullDetails.assignment_group?.display_value,
            assigned_to: fullDetails.assigned_to?.display_value,
            close_notes: fullDetails.close_notes?.value,
            hold_reason: fullDetails.hold_reason?.display_value,
          }, null, 2),
        },
      ],
    };
  },

  async get_incident_recommendations({ incidentId, refresh = false }) {
    const endpoint = `/api/incidents/${incidentId}/recommendations${refresh ? '?refresh=true' : ''}`;
    const data = await backendFetch(endpoint);
    
    if (!data.available) {
      throw new Error(data.message || 'Knowledge graph service unavailable');
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            incidentId: data.incidentId,
            incidentDescription: data.incidentDescription,
            similarIncidents: data.similarIncidents,
            recommendations: data.contextualizedRecommendations,
            cached: data.wasCached,
            generatedAt: data.generatedAt,
          }, null, 2),
        },
      ],
    };
  },

  async get_incident_analytics() {
    const data = await backendFetch('/api/analytics/incidents');
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  },

  async list_active_incidents({ status }) {
    const endpoint = status 
      ? `/api/incidents?status=${status}`
      : '/api/incidents?status=active,mitigated';
    
    const incidents = await backendFetch(endpoint);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            count: incidents.length,
            incidents: incidents.map(inc => ({
              id: inc.id,
              incidentNumber: inc.incident_number,
              title: inc.title,
              severity: inc.severity,
              status: inc.status,
              createdAt: inc.created_at,
              detectedAt: inc.detected_at,
              affectedServices: inc.affected_services,
            })),
          }, null, 2),
        },
      ],
    };
  },

  async get_incident_details({ incidentId }) {
    const data = await backendFetch(`/api/incidents/${incidentId}`);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  },

  async list_servicenow_incidents({ state, limit = 50 }) {
    const params = new URLSearchParams();
    if (state) params.append('state', state);
    params.append('limit', limit.toString());
    
    const endpoint = `/api/servicenow/incidents?${params.toString()}`;
    const incidents = await backendFetch(endpoint);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            count: incidents.length,
            incidents: incidents.map(inc => ({
              number: inc.number?.value,
              sys_id: inc.sys_id?.value,
              state: inc.state?.display_value,
              priority: inc.priority?.display_value,
              short_description: inc.short_description?.value,
              opened_at: inc.opened_at?.display_value,
            })),
          }, null, 2),
        },
      ],
    };
  },

  async search_incidents({ query, limit = 10 }) {
    const data = await backendFetch(`/api/incidents/search?q=${encodeURIComponent(query)}&limit=${limit}`);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  },

  async get_postmortem_analytics() {
    const data = await backendFetch('/api/analytics/postmortems');
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  },

  async get_servicenow_incident_recommendations({ incidentNumber }) {
    // First, fetch the ServiceNow incident details
    const incidentData = await backendFetch(`/api/servicenow/incident-by-number/${incidentNumber}`);
    
    if (!incidentData.sys_id) {
      throw new Error(`Incident ${incidentNumber} not found in ServiceNow`);
    }

    // Fetch full details
    const fullDetails = await backendFetch(`/api/servicenow/incidents/${incidentData.sys_id}`);
    
    // Prepare incident context for AI analysis
    const incidentContext = {
      number: fullDetails.number?.value || incidentNumber,
      state: fullDetails.state?.display_value,
      priority: fullDetails.priority?.display_value,
      impact: fullDetails.impact?.display_value,
      urgency: fullDetails.urgency?.display_value,
      short_description: fullDetails.short_description?.value,
      description: fullDetails.description?.value,
      opened_at: fullDetails.opened_at?.display_value,
      resolved_at: fullDetails.resolved_at?.display_value,
      closed_at: fullDetails.closed_at?.display_value,
      assignment_group: fullDetails.assignment_group?.display_value,
      assigned_to: fullDetails.assigned_to?.display_value,
      close_notes: fullDetails.close_notes?.value,
      hold_reason: fullDetails.hold_reason?.display_value,
    };

    // Request AI-powered recommendations from backend
    try {
      const recommendations = await backendFetch('/api/servicenow/generate-recommendations', {
        method: 'POST',
        body: JSON.stringify({ incident: incidentContext }),
      });
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              incident: incidentContext,
              recommendations: recommendations,
              generatedAt: new Date().toISOString(),
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      // If backend doesn't have the endpoint yet, return incident details with a message
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              incident: incidentContext,
              recommendations: {
                note: 'AI recommendation endpoint not yet available. Incident details provided for manual analysis.',
                suggestions: [
                  'Review incident priority and impact assessment',
                  'Check if assignment group is appropriate',
                  'Verify incident state progression is timely',
                  'Consider if similar incidents have occurred recently',
                ],
              },
              generatedAt: new Date().toISOString(),
            }, null, 2),
          },
        ],
      };
    }
  },
};

/**
 * MCP Server Setup
 */
const server = new Server(
  {
    name: 'sre-platform',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: TOOLS,
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (!toolHandlers[name]) {
    throw new Error(`Unknown tool: ${name}`);
  }

  try {
    return await toolHandlers[name](args || {});
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

/**
 * Start Server
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('SRE Platform MCP Server running on stdio');
  console.error(`Backend URL: ${BACKEND_URL}`);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
