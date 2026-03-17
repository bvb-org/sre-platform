# MCP Server Configuration for SRE Platform Agent

This guide explains how to enable the SRE Platform agent to use tools from the MCP server.

## Architecture

```
GitHub Copilot Agent (sre-platform.agent.md)
    ↓ (MCP Protocol via docker exec)
MCP Server (stdio interface)
    ↓ (HTTP REST)
Backend API (port 3001)
    ↓
PostgreSQL / ServiceNow
```

## Quick Start

### 1. Start the MCP Server

```bash
# Start all services including MCP server
npm run docker:up

# Or start services individually
docker compose up -d backend mcp-server
```

Verify it's running:
```bash
docker ps | grep mcp-server
```

### 2. Configure VS Code MCP Settings

**Option A: User Settings (Recommended)**

Add to your VS Code `settings.json` (File → Preferences → Settings → Edit settings.json):

```json
{
  "github.copilot.advanced": {
    "mcp": {
      "servers": [
        {
          "name": "sre-platform",
          "command": "docker",
          "args": [
            "exec",
            "-i",
            "sre-platform-mcp-server",
            "node",
            "server.js"
          ],
          "description": "SRE Platform incident management tools"
        }
      ]
    }
  }
}
```

**Option B: Workspace Settings**

Create/edit `.vscode/settings.json` in the project root:

```json
{
  "github.copilot.advanced": {
    "mcp": {
      "servers": [
        {
          "name": "sre-platform",
          "command": "docker",
          "args": [
            "exec",
            "-i",
            "sre-platform-mcp-server",
            "node",
            "server.js"
          ]
        }
      ]
    }
  }
}
```

### 3. Restart VS Code

After updating settings, restart VS Code to load the MCP configuration.

### 4. Test the Integration

Open the SRE Platform agent mode and try:

```
@workspace Get recommendations for incident INC0001990
```

The agent should automatically use the `get_servicenow_incident` tool from the MCP server.

## Available Tools

Once configured, the agent has access to these MCP tools:

### Incident Analysis
- **`get_servicenow_incident`** - Fetch ServiceNow incident by INC number
- **`get_incident_details`** - Get local incident full details
- **`get_incident_recommendations`** - Get knowledge graph recommendations
- **`search_incidents`** - Search incidents by keywords

### Analytics & Monitoring
- **`get_incident_analytics`** - System health and trends
- **`get_postmortem_analytics`** - Postmortem metrics
- **`list_active_incidents`** - Active incident triage
- **`list_servicenow_incidents`** - List SNOW incidents with filters

## Usage Examples

### Example 1: Analyze ServiceNow Incident

**User:**
```
Analyze incident INC0001990
```

**Agent workflow:**
1. Calls `get_servicenow_incident` with `incidentNumber: "INC0001990"`
2. Receives full incident details (status, priority, description)
3. Analyzes and provides:
   - Current state assessment
   - Age and priority evaluation
   - Recommended actions
   - Escalation needs

### Example 2: Get Knowledge Graph Recommendations

**User:**
```
Get recommendations for incident <uuid>
```

**Agent workflow:**
1. Calls `get_incident_recommendations` with `incidentId`
2. Receives similar incidents and AI analysis
3. Presents:
   - Similarity scores
   - Root causes from similar incidents
   - Actionable recommendations
   - Time-saving estimates

### Example 3: System Health Check

**User:**
```
How are our incidents looking?
```

**Agent workflow:**
1. Calls `get_incident_analytics`
2. Analyzes trend data
3. Provides:
   - Volume trends (↑↓)
   - Severity distribution
   - Active incident count
   - Risk assessment

### Example 4: Triage Active Incidents

**User:**
```
What should I focus on?
```

**Agent workflow:**
1. Calls `list_active_incidents`
2. Ranks by severity + age
3. Provides prioritized list with reasoning

## Troubleshooting

### Agent Not Using MCP Tools

**Symptom:** Agent responds with generic advice instead of using tools.

**Solutions:**
1. Verify MCP configuration in settings.json
2. Restart VS Code completely
3. Check Copilot logs:
   - Open Command Palette (Ctrl+Shift+P)
   - Run: `Developer: Show Logs`
   - Select: `GitHub Copilot`
   - Look for MCP connection errors

### Container Not Found

**Error:** `Error: No such container: sre-platform-mcp-server`

**Solution:**
```bash
# Check container name
docker ps | grep mcp

# Update settings.json with actual container name
docker compose ps mcp-server
```

### Permission Denied

**Error:** `docker: permission denied`

**Solution (Windows):**
- Ensure Docker Desktop is running
- Run VS Code as administrator (if needed)

**Solution (Linux):**
```bash
# Add user to docker group
sudo usermod -aG docker $USER
# Log out and back in
```

### MCP Server Connection Timeout

**Symptom:** Tools timeout or hang

**Solutions:**
```bash
# Check backend is healthy
docker compose ps backend

# Restart MCP server
docker compose restart mcp-server

# View logs
docker compose logs -f mcp-server
```

## Advanced Configuration

### Custom Backend URL

If your backend runs on a different URL:

```json
{
  "github.copilot.advanced": {
    "mcp": {
      "servers": [
        {
          "name": "sre-platform",
          "command": "docker",
          "args": [
            "exec",
            "-i",
            "-e", "BACKEND_URL=http://custom-backend:3001",
            "sre-platform-mcp-server",
            "node",
            "server.js"
          ]
        }
      ]
    }
  }
}
```

### Local Development (Without Docker)

If running backend locally:

```json
{
  "github.copilot.advanced": {
    "mcp": {
      "servers": [
        {
          "name": "sre-platform",
          "command": "node",
          "args": [
            "/absolute/path/to/sre-platform/mcp-server/server.js"
          ],
          "env": {
            "BACKEND_URL": "http://localhost:3001"
          }
        }
      ]
    }
  }
}
```

### Debug Mode

Enable detailed logging:

```bash
# Run MCP server with debug output
docker compose exec mcp-server node server.js 2>&1 | tee mcp-debug.log
```

## Security Considerations

### Network Isolation
- MCP server communicates with backend over Docker internal network
- No external ports exposed (uses stdio for MCP protocol)
- Backend API still requires authentication (if configured)

### Input Validation
- All tool inputs are validated against JSON schemas
- ServiceNow incident numbers validated with regex
- Query limits enforced (max 100 results)

### Error Handling
- No sensitive data in error messages
- Stack traces only logged server-side
- Graceful degradation if backend unavailable

## Performance

### Latency
- **MCP overhead:** ~10-20ms
- **Backend API:** ~50-150ms
- **Total:** Typically <200ms per tool call

### Caching
- Knowledge graph recommendations: 15 minutes
- Analytics data: No caching (real-time)
- ServiceNow data: No caching (external source)

### Resource Usage
- **Memory:** ~50MB RAM
- **CPU:** Minimal (<5% during tool calls)
- **Disk:** ~20MB (Node.js + dependencies)

## Monitoring

### Health Check

```bash
# Test MCP server is responding
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | \
  docker exec -i sre-platform-mcp-server node server.js

# Test backend connectivity
docker compose exec mcp-server node -e "
import fetch from 'node-fetch';
const res = await fetch('http://backend:3001/api/incidents');
console.log('Status:', res.status);
"
```

### View Logs

```bash
# Real-time logs
docker compose logs -f mcp-server

# Last 100 lines
docker compose logs --tail=100 mcp-server

# Logs with timestamps
docker compose logs --timestamps mcp-server
```

## Integration with Agent

The agent file ([sre-platform.agent.md](../agents/sre-platform.agent.md)) includes specific instructions for:

1. **Analysis requests** - Using MCP tools instead of generic responses
2. **ServiceNow priority** - Checking SNOW first for INCxxxxxxx format
3. **Data-driven insights** - Fetching real data via MCP tools
4. **Error handling** - Graceful fallback if MCP unavailable

The agent automatically:
- Detects when to use MCP tools vs. direct API calls
- Formats responses with structured data from tools
- Provides actionable insights based on tool results
- Handles errors and suggests alternatives

## Next Steps

1. **Test the integration** - Try analysis commands with the agent
2. **Explore tools** - Review [mcp-server/README.md](../mcp-server/README.md)
3. **Add custom tools** - Extend the MCP server for your needs
4. **Monitor usage** - Check logs to see tool call patterns

## Support

For issues or questions:
- Check [mcp-server/README.md](../mcp-server/README.md) for tool documentation
- View logs: `docker compose logs mcp-server`
- Test backend: `curl http://localhost:3001/api/health`
- GitHub Issues: https://github.com/bvb-org/sre-platform/issues

---

**Last Updated:** March 17, 2026  
**MCP Server Version:** 1.0.0
