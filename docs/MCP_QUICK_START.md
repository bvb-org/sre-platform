# MCP Server Quick Start

Get the SRE Platform MCP server running in 5 minutes.

## What is it?

The MCP (Model Context Protocol) server provides AI agents with structured access to SRE Platform APIs. Instead of making HTTP requests manually, agents can call tools like:

- `get_servicenow_incident` - Analyze SNOW incidents
- `get_incident_recommendations` - Get AI recommendations
- `get_incident_analytics` - System health metrics

## Setup (5 minutes)

### Step 1: Start the Server

```bash
# From project root
npm run docker:up

# Or specifically
docker compose up -d backend mcp-server
```

### Step 2: Install Dependencies

```bash
# Build MCP server (first time only)
npm run mcp:build
```

### Step 3: Configure VS Code

Create `.vscode/settings.json` in project root:

```json
{
  "github.copilot.advanced": {
    "mcp": {
      "servers": [
        {
          "name": "sre-platform",
          "command": "docker",
          "args": ["exec", "-i", "sre-platform-mcp-server", "node", "server.js"]
        }
      ]
    }
  }
}
```

### Step 4: Restart VS Code

Close and reopen VS Code to load the MCP configuration.

### Step 5: Test

In the SRE Platform agent mode, try:

```
@workspace Analyze incident INC0001990
```

The agent should fetch real data from ServiceNow and provide analysis.

## Verify It's Working

### Check Container Status

```bash
docker ps | grep mcp-server
```

Should show: `sre-platform-mcp-server` with status "Up"

### View Logs

```bash
npm run mcp:logs
```

Should show: "SRE Platform MCP Server running on stdio"

### Test Backend Connection

```bash
npm run mcp:test
```

Should show: "Backend reachable: true"

## Usage Examples

Once configured, the agent automatically uses MCP tools:

### Example 1: ServiceNow Analysis

**You ask:**
```
Get recommendations for INC0001990
```

**Agent does:**
1. Calls `get_servicenow_incident("INC0001990")`
2. Analyzes status, age, priority
3. Provides actionable recommendations

### Example 2: System Health

**You ask:**
```
How are our incidents looking?
```

**Agent does:**
1. Calls `get_incident_analytics()`
2. Analyzes trends
3. Highlights concerns and healthy metrics

### Example 3: Triage

**You ask:**
```
What should I focus on?
```

**Agent does:**
1. Calls `list_active_incidents()`
2. Ranks by severity + age
3. Provides prioritized list

## Troubleshooting

### Agent Not Using Tools

**Problem:** Agent gives generic responses instead of using MCP tools.

**Solutions:**
1. Verify settings.json has MCP configuration
2. Restart VS Code completely
3. Check logs: `npm run mcp:logs`

### Container Not Running

**Problem:** `docker ps | grep mcp-server` shows nothing.

**Solution:**
```bash
# Start it
docker compose up -d mcp-server

# Check logs for errors
npm run mcp:logs
```

### Backend Connection Failed

**Problem:** MCP server can't reach backend API.

**Solution:**
```bash
# Ensure backend is running
docker compose ps backend

# Should show: "Up (healthy)"
# If not:
docker compose up -d backend
```

## Advanced Usage

### Environment Variables

Override backend URL:

```bash
docker compose exec \
  -e BACKEND_URL=http://custom:3001 \
  mcp-server node server.js
```

### Debug Mode

See detailed logs:

```bash
docker compose logs -f mcp-server 2>&1 | tee mcp-debug.log
```

### Test Individual Tools

Use MCP Inspector:

```bash
# Install
npm install -g @modelcontextprotocol/inspector

# Run
docker exec -i sre-platform-mcp-server npx @modelcontextprotocol/inspector
```

## Available Tools

| Tool | Purpose | Example Input |
|------|---------|---------------|
| `get_servicenow_incident` | Fetch SNOW incident | `{"incidentNumber": "INC0001990"}` |
| `get_incident_recommendations` | Knowledge graph | `{"incidentId": "uuid"}` |
| `get_incident_analytics` | Health metrics | `{}` |
| `list_active_incidents` | Active triage | `{"status": "active"}` |
| `search_incidents` | Keyword search | `{"query": "timeout"}` |
| `list_servicenow_incidents` | List SNOW | `{"state": "1", "limit": 50}` |
| `get_incident_details` | Full details | `{"incidentId": "uuid"}` |
| `get_postmortem_analytics` | PM metrics | `{}` |

## Next Steps

- **Read full docs:** [docs/MCP_CONFIGURATION.md](MCP_CONFIGURATION.md)
- **Explore tools:** [mcp-server/README.md](../mcp-server/README.md)
- **View agent guide:** [.github/agents/sre-platform.agent.md](../.github/agents/sre-platform.agent.md)

## Need Help?

```bash
# View logs
npm run mcp:logs

# Test backend
npm run mcp:test

# Restart everything
docker compose restart backend mcp-server
```

---

**Total setup time:** ~5 minutes  
**Prerequisites:** Docker, VS Code, GitHub Copilot  
**Status:** Production ready 🚀
