# SRE Platform MCP Server

A lightweight Model Context Protocol (MCP) server that provides AI agents with structured access to SRE Platform incident management APIs.

## Overview

This MCP server exposes tools for:
- 🔍 ServiceNow incident lookup and analysis
- 📊 Knowledge graph recommendations
- 📈 Incident analytics and health metrics
- 🎯 Active incident triage
- 📝 Postmortem analytics

## Architecture

```
AI Agent (GitHub Copilot) 
    ↓ (MCP Protocol)
MCP Server (port 5000)
    ↓ (HTTP REST)
Backend API (port 3001)
    ↓
PostgreSQL / ServiceNow
```

## Available Tools

### 1. `get_servicenow_incident`
Fetch ServiceNow incident by INC number.

**Input:**
```json
{
  "incidentNumber": "INC0001990"
}
```

**Returns:** Full incident details (status, priority, description, resolution)

### 2. `get_incident_recommendations`
Get AI-powered recommendations from knowledge graph.

**Input:**
```json
{
  "incidentId": "uuid-here",
  "refresh": false
}
```

**Returns:** Similar incidents, root causes, action items

### 3. `get_incident_analytics`
Get system health metrics and trends.

**Input:** None

**Returns:** Incident volume, severity distribution, active incidents

### 4. `list_active_incidents`
List active/mitigated incidents.

**Input:**
```json
{
  "status": "active"
}
```

**Returns:** Array of active incidents

### 5. `get_incident_details`
Get full details for a local incident.

**Input:**
```json
{
  "incidentId": "uuid-here"
}
```

**Returns:** Complete incident data with timeline

### 6. `list_servicenow_incidents`
List ServiceNow incidents with filtering.

**Input:**
```json
{
  "state": "1",
  "limit": 50
}
```

**Returns:** Array of ServiceNow incidents

### 7. `search_incidents`
Search local incidents by keywords.

**Input:**
```json
{
  "query": "database timeout",
  "limit": 10
}
```

**Returns:** Matching incidents with relevance rank

### 8. `get_postmortem_analytics`
Get postmortem completion metrics.

**Input:** None

**Returns:** Draft/published counts, completion rates

## Deployment

### Docker Compose (Recommended)

The MCP server is included in the main docker-compose.yml:

```bash
# Start all services including MCP server
npm run docker:up

# View MCP server logs
docker compose logs -f mcp-server
```

### Standalone Docker

```bash
cd mcp-server
docker build -t sre-platform-mcp-server .
docker run -e BACKEND_URL=http://backend:3001 sre-platform-mcp-server
```

### Local Development

```bash
cd mcp-server
npm install
npm start
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `BACKEND_URL` | Backend API URL | `http://backend:3001` |

## Usage with GitHub Copilot

### Configure in VS Code

Add to your `settings.json` or workspace configuration:

```json
{
  "github.copilot.advanced": {
    "mcp": {
      "servers": [
        {
          "name": "sre-platform",
          "command": "docker",
          "args": ["exec", "-i", "sre-platform-mcp-server-1", "node", "server.js"]
        }
      ]
    }
  }
}
```

### Using Tools in Chat

Once configured, the agent can use tools like:

```
@workspace Analyze incident INC0001990 and provide recommendations.
```

The agent will automatically:
1. Call `get_servicenow_incident` to fetch details
2. Analyze status, age, priority
3. Provide actionable recommendations

## Error Handling

The MCP server returns structured errors:

```json
{
  "content": [
    {
      "type": "text",
      "text": "Error: Incident INC9999999 not found in ServiceNow"
    }
  ],
  "isError": true
}
```

Common errors:
- **404**: Incident not found
- **503**: Backend API unavailable
- **500**: Knowledge graph service not configured

## Testing

### Test with MCP Inspector

```bash
# Install MCP Inspector
npm install -g @modelcontextprotocol/inspector

# Run server with inspector
npx @modelcontextprotocol/inspector node server.js
```

### Manual Testing

```bash
# Test backend connectivity
docker compose exec mcp-server node -e "
import fetch from 'node-fetch';
const res = await fetch('http://backend:3001/api/incidents');
console.log(await res.json());
"
```

## Performance

- **Latency:** Typically <200ms per tool call
- **Caching:** Knowledge graph recommendations cached for 15 minutes
- **Concurrency:** Supports multiple simultaneous tool calls
- **Resource Usage:** ~50MB RAM, minimal CPU

## Security

- **No Authentication:** MCP server trusts backend API (internal network)
- **Validation:** Input validation on all tool parameters
- **Error Sanitization:** No stack traces exposed to clients
- **Network Isolation:** Runs on internal Docker network

## Troubleshooting

### MCP Server Not Starting

```bash
# Check logs
docker compose logs mcp-server

# Verify backend is reachable
docker compose exec mcp-server wget -O- http://backend:3001/api/health
```

### Tool Calls Failing

```bash
# Test backend API directly
curl http://localhost:3001/api/incidents

# Check environment variables
docker compose exec mcp-server env | grep BACKEND
```

### Agent Not Detecting Tools

1. Verify MCP server is in configuration
2. Restart VS Code
3. Check Copilot logs: `Developer: Show Logs` → `GitHub Copilot`

## Development

### Adding New Tools

1. Add tool definition to `TOOLS` array
2. Implement handler in `toolHandlers` object
3. Test with MCP Inspector
4. Update documentation

### Example Tool

```javascript
{
  name: 'my_new_tool',
  description: 'Does something useful',
  inputSchema: {
    type: 'object',
    properties: {
      param: { type: 'string', description: 'Parameter' }
    },
    required: ['param']
  }
}

// Handler
async my_new_tool({ param }) {
  const data = await backendFetch(`/api/endpoint/${param}`);
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }]
  };
}
```

## License

MIT License - Part of SRE Platform

## Maintainers

SRE Platform Team - https://github.com/bvb-org/sre-platform
