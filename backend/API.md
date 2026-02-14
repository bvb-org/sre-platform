# Backend API Documentation

This document provides an overview of the SRE Platform backend API endpoints.

## Base URL

- Development: `http://localhost:3001`
- Docker: `http://backend:3001`

## Authentication

Currently, the API does not require authentication. This is a development/demo feature.

## Endpoints

### Health Check

#### `GET /health`

Check if the backend service is running.

**Response:**
```json
{
  "status": "ok"
}
```

---

## Incidents

### List Incidents

#### `GET /api/incidents`

Get all incidents.

**Query Parameters:**
- `status` (optional): Filter by status (e.g., `investigating`, `resolved`)

**Response:**
```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "incident_number": "INC-001",
    "title": "API Gateway Timeout",
    "description": "Users experiencing timeout errors",
    "status": "investigating",
    "severity": "high",
    "created_at": "2024-01-01T12:00:00Z",
    "updated_at": "2024-01-01T12:30:00Z"
  }
]
```

### Get Incident

#### `GET /api/incidents/:id`

Get a specific incident by ID.

**Response:**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "incident_number": "INC-001",
  "title": "API Gateway Timeout",
  "description": "Users experiencing timeout errors",
  "status": "investigating",
  "severity": "high",
  "created_at": "2024-01-01T12:00:00Z",
  "updated_at": "2024-01-01T12:30:00Z"
}
```

### Create Incident

#### `POST /api/incidents`

Create a new incident.

**Request Body:**
```json
{
  "title": "API Gateway Timeout",
  "description": "Users experiencing timeout errors",
  "severity": "high",
  "commander_id": "user-uuid"
}
```

**Response:**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "incident_number": "INC-001",
  "title": "API Gateway Timeout",
  "status": "investigating",
  "created_at": "2024-01-01T12:00:00Z"
}
```

### Update Incident

#### `PATCH /api/incidents/:id`

Update an incident.

**Request Body:**
```json
{
  "status": "resolved",
  "description": "Updated description"
}
```

---

## Postmortems

### Get Postmortem

#### `GET /api/incidents/:id/postmortem`

Get the postmortem for an incident.

**Response:**
```json
{
  "id": "postmortem-uuid",
  "incident_id": "incident-uuid",
  "business_impact_application": "Payment API",
  "business_impact_description": "Service outage description",
  "mitigation_description": "How the issue was resolved",
  "causal_analysis": [],
  "created_at": "2024-01-01T12:00:00Z"
}
```

### Generate Postmortem

#### `POST /api/incidents/:id/postmortem`

Generate an AI-powered postmortem.

**Request Body:**
```json
{
  "action": "generate"
}
```

**Response:**
```json
{
  "id": "postmortem-uuid",
  "incident_id": "incident-uuid",
  "business_impact_application": "Payment API",
  "mitigation_description": "AI-generated mitigation",
  "causal_analysis": []
}
```

### Generate Postmortem Section (Chunked)

#### `POST /api/incidents/:id/postmortem/generate-chunked`

Generate a specific postmortem section (for progressive generation).

**Request Body:**
```json
{
  "section": "business_impact"
}
```

**Sections:**
- `business_impact`
- `mitigation`
- `causal_analysis`

---

## Users

### List Users

#### `GET /api/users`

Get all users.

**Response:**
```json
[
  {
    "id": "user-uuid",
    "username": "jdoe",
    "email": "jdoe@example.com",
    "role": "engineer",
    "created_at": "2024-01-01T12:00:00Z"
  }
]
```

---

## Runbooks

### List Runbooks

#### `GET /api/runbooks`

Get all runbooks.

**Response:**
```json
[
  {
    "id": "runbook-uuid",
    "title": "Database Backup Procedure",
    "service_name": "Database",
    "content": "Markdown content...",
    "created_at": "2024-01-01T12:00:00Z"
  }
]
```

### Get Runbook

#### `GET /api/runbooks/:id`

Get a specific runbook.

### Create Runbook

#### `POST /api/runbooks`

Create a new runbook.

**Request Body:**
```json
{
  "title": "Database Backup Procedure",
  "service_name": "Database",
  "content": "# Procedure\n\n1. Step 1\n2. Step 2"
}
```

---

## Knowledge Graph

### Get Recommendations

#### `GET /api/incidents/:id/recommendations`

Get AI-powered recommendations based on similar past incidents.

**Response:**
```json
{
  "recommendations": [
    {
      "referenceIncident": "INC-123",
      "similarityScore": 0.87,
      "recommendation": "Based on similar incident...",
      "referencePostmortem": {
        "id": "postmortem-uuid",
        "incident_number": "INC-123"
      }
    }
  ],
  "cached": false
}
```

---

## ServiceNow Integration

### Sync Incident

#### `POST /api/servicenow/sync-incident`

Sync an incident with ServiceNow.

**Request Body:**
```json
{
  "incidentId": "uuid",
  "syncDirection": "to_servicenow"
}
```

---

## Analytics

### Get Incident Metrics

#### `GET /api/analytics/incidents/metrics`

Get incident metrics and statistics.

**Query Parameters:**
- `timeRange` (optional): Time range in days (default: 30)

**Response:**
```json
{
  "totalIncidents": 45,
  "byStatus": {
    "investigating": 5,
    "resolved": 40
  },
  "bySeverity": {
    "critical": 2,
    "high": 15,
    "medium": 28
  },
  "avgResolutionTime": 45.5
}
```

---

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "error": "Invalid request parameters"
}
```

### 404 Not Found
```json
{
  "error": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

---

## Development

### Running Tests

```bash
cd backend
npm test
```

### Environment Variables

See `.env.example` for required environment variables.

### Logging

Set `LOG_LEVEL` environment variable to control logging:
- `DEBUG`: All logs
- `INFO`: Info, warnings, and errors (default)
- `WARN`: Warnings and errors only
- `ERROR`: Errors only
