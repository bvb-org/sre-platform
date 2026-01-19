# SRE Platform Backend

This is the backend API server for the SRE Platform, built with Express.js.

## Overview

The backend provides RESTful API endpoints for:
- Incident management
- Runbooks
- Users
- Timeline events
- Action items
- Postmortem generation and management (with AI integration)

## Technology Stack

- **Node.js** with **Express.js**
- **PostgreSQL** database
- **Anthropic Claude** for AI-powered postmortem generation
- **CORS** enabled for frontend communication

## API Endpoints

### Incidents
- `GET /api/incidents` - List all incidents
- `POST /api/incidents` - Create new incident
- `GET /api/incidents/:id` - Get incident details
- `PATCH /api/incidents/:id` - Update incident
- `DELETE /api/incidents/:id` - Delete incident

### Timeline
- `GET /api/incidents/:id/timeline` - Get timeline events
- `POST /api/incidents/:id/timeline` - Add timeline event

### Action Items
- `GET /api/incidents/:id/actions` - List action items
- `POST /api/incidents/:id/actions` - Create action item
- `PATCH /api/incidents/:id/actions/:actionId` - Update action item
- `DELETE /api/incidents/:id/actions/:actionId` - Delete action item

### Postmortem
- `GET /api/incidents/:id/postmortem` - Get postmortem
- `POST /api/incidents/:id/postmortem` - Generate postmortem (AI)
- `PATCH /api/incidents/:id/postmortem` - Update postmortem
- `POST /api/incidents/:id/postmortem/check` - AI quality check/coaching

### Runbooks
- `GET /api/runbooks` - List runbooks
- `POST /api/runbooks` - Create runbook

### Users
- `GET /api/users` - List users

## Environment Variables

Create a `.env` file based on `.env.example`:

```bash
DATABASE_URL=postgresql://sre_user:sre_password@postgres:5432/sre_platform
ANTHROPIC_API_KEY=your_anthropic_api_key_here
PORT=3001
NODE_ENV=development
```

## Running Locally

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Start production server
npm start
```

The server will run on port 3001 by default.

## Docker

The backend runs in its own Docker container:

```bash
docker-compose up backend
```

## Database Connection

The backend connects to PostgreSQL using the `DATABASE_URL` environment variable. In Docker, it connects to the `postgres` service defined in `docker-compose.yml`.
