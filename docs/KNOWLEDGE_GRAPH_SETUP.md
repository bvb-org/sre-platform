# AI Knowledge Graph Setup Guide

## Overview

The AI Knowledge Graph feature provides intelligent recommendations for incident investigation by analyzing similar past incidents. When a new incident is declared, the system:

1. Generates embeddings from the incident description and current state
2. Performs vector similarity search against published postmortems
3. Uses Gemini AI to generate contextualized recommendations
4. Auto-updates recommendations every 15 minutes as the incident evolves

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Incident Investigation                       │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  New Incident Data → Generate Embedding → Vector Search    │ │
│  │         ↓                                                   │ │
│  │  Find Similar Postmortems → Gemini AI → Recommendations    │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                   Postmortem Publishing                          │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Published Postmortem → Extract Key Data → Generate        │ │
│  │  Embedding → Store in Vector Database                      │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## GCP Services Used

- **Vertex AI**: For generating text embeddings and AI recommendations
- **Gemini 2.0 Flash**: For generating contextualized recommendations
- **Text Embedding Model**: `text-embedding-004` for vector generation
- **PostgreSQL**: For storing embeddings and caching recommendations

## Prerequisites

1. **GCP Project** with the following APIs enabled:
   - Vertex AI API
   - AI Platform API
   - Cloud Resource Manager API

2. **Service Account** with the following roles:
   - `roles/aiplatform.user` - For Vertex AI access
   - `roles/ml.developer` - For ML model access

3. **Service Account Key** (JSON file)

## Setup Instructions

### 1. Enable GCP APIs

```bash
# Set your project ID
export PROJECT_ID="your-gcp-project-id"

# Enable required APIs
gcloud services enable aiplatform.googleapis.com --project=$PROJECT_ID
gcloud services enable ml.googleapis.com --project=$PROJECT_ID
```

### 2. Create Service Account

```bash
# Create service account
gcloud iam service-accounts create sre-platform-ai \
  --display-name="SRE Platform AI Service" \
  --project=$PROJECT_ID

# Grant necessary roles
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:sre-platform-ai@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:sre-platform-ai@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/ml.developer"

# Create and download key
gcloud iam service-accounts keys create google-service-account-key.json \
  --iam-account=sre-platform-ai@${PROJECT_ID}.iam.gserviceaccount.com
```

### 3. Configure Application

Place the `google-service-account-key.json` file in the project root directory:

```bash
# Project structure
sre-platform/
├── google-service-account-key.json  ← Place here
├── backend/
├── app/
└── ...
```

The application will automatically detect and use this file. No environment variables needed!

### 4. Set GCP Location (Optional)

By default, the service uses `us-central1`. To change the location:

```bash
# In backend/.env
GOOGLE_CLOUD_LOCATION=us-central1  # or europe-west1, asia-southeast1, etc.
```

### 5. Run Database Migrations

The knowledge graph schema will be automatically applied:

```bash
# Using Docker Compose
docker-compose up -d

# The Liquibase migrations will run automatically
# Check logs: docker-compose logs liquibase
```

### 6. Verify Setup

Check if the knowledge graph service is available:

```bash
curl http://localhost:3001/api/knowledge-graph/status
```

Expected response:
```json
{
  "available": true,
  "service": "Vertex AI Knowledge Graph",
  "features": {
    "embeddings": true,
    "vectorSearch": true,
    "recommendations": true
  }
}
```

## How It Works

### Postmortem Publishing Flow

1. **User publishes a postmortem** (status changes to "published")
2. **System extracts key information**:
   - Incident title, description, severity
   - Business impact description
   - Root causes and mitigation steps
   - Causal analysis (Swiss cheese model)
3. **Generate embedding** using Vertex AI text-embedding-004
4. **Store in database** with metadata for fast retrieval

### Incident Recommendation Flow

1. **New incident is created or updated**
2. **System generates embedding** from current incident state
3. **Vector similarity search** finds top 5 similar postmortems
4. **Gemini AI analyzes** similar incidents and generates recommendations
5. **Recommendations cached** for 15 minutes
6. **Auto-refresh** every 15 minutes as incident evolves

### Similarity Scoring

- Uses **cosine similarity** between embedding vectors
- Scores range from 0.0 (no similarity) to 1.0 (identical)
- Recommendations sorted by similarity score (highest first)
- Typical thresholds:
  - **≥ 0.8**: Highly similar (green)
  - **0.6-0.8**: Similar (blue)
  - **0.4-0.6**: Somewhat similar (yellow)
  - **< 0.4**: Low similarity (gray)

## API Endpoints

### Get Recommendations

```bash
GET /api/incidents/:id/recommendations
```

Returns cached recommendations (if available and < 15 minutes old).

**Response:**
```json
{
  "available": true,
  "cached": true,
  "recommendations": [
    {
      "referenceIncident": "INC-12345",
      "incidentNumber": "INC-12345",
      "title": "Payment API Timeout",
      "severity": "critical",
      "similarityScore": 0.87,
      "recommendation": "Check database connection pool",
      "details": "Based on INC-12345, a similar timeout issue was caused by...",
      "actions": [
        "Verify database connection pool settings",
        "Check for long-running queries",
        "Review connection timeout configuration"
      ]
    }
  ]
}
```

### Force Refresh Recommendations

```bash
POST /api/incidents/:id/recommendations/refresh
```

Forces regeneration of recommendations (bypasses cache).

### Check Service Status

```bash
GET /api/knowledge-graph/status
```

## Frontend Integration

The Knowledge Graph Recommendations component is automatically displayed in the Investigation tab:

```tsx
import { KnowledgeGraphRecommendations } from './KnowledgeGraphRecommendations';

<KnowledgeGraphRecommendations 
  incidentId={incident.id}
  autoRefreshInterval={15 * 60 * 1000} // 15 minutes
/>
```

### Features

- ✅ **Auto-refresh** every 15 minutes
- ✅ **Manual refresh** button
- ✅ **Similarity scores** with color coding
- ✅ **Expandable details** for each recommendation
- ✅ **Direct links** to referenced incidents
- ✅ **Severity badges** for context
- ✅ **Actionable suggestions** for each recommendation

## Database Schema

### postmortem_embeddings

Stores vector embeddings for published postmortems:

```sql
CREATE TABLE postmortem_embeddings (
  id UUID PRIMARY KEY,
  postmortem_id UUID NOT NULL,
  incident_id UUID NOT NULL,
  embedding_version INT DEFAULT 1,
  embedding_vector JSONB NOT NULL,  -- Vector array
  embedding_text TEXT NOT NULL,      -- Original text
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### incident_recommendations

Caches recommendations for incidents:

```sql
CREATE TABLE incident_recommendations (
  id UUID PRIMARY KEY,
  incident_id UUID NOT NULL,
  recommended_incident_id UUID NOT NULL,
  similarity_score DECIMAL(5,4) NOT NULL,
  recommendation_text TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Cost Considerations

### Vertex AI Pricing (as of 2024)

- **Text Embeddings**: ~$0.025 per 1,000 characters
- **Gemini 2.0 Flash**: ~$0.075 per 1M input tokens, ~$0.30 per 1M output tokens

### Estimated Costs

For a typical incident with 5 recommendations:

- **Embedding generation**: ~$0.001 per incident
- **Recommendation generation**: ~$0.005 per refresh
- **Total per incident**: ~$0.01 - $0.02

With 100 incidents/month and 4 refreshes each:
- **Monthly cost**: ~$4 - $8

## Troubleshooting

### Service Not Available

**Symptom**: "Knowledge graph service is not available"

**Solutions**:
1. Verify `google-service-account-key.json` exists in project root
2. Check service account has correct permissions
3. Verify APIs are enabled in GCP project
4. Check backend logs: `docker-compose logs backend`

### No Recommendations

**Symptom**: "No similar incidents found"

**Causes**:
- No postmortems have been published yet
- Published postmortems are not similar enough
- Embeddings not generated (check logs)

**Solutions**:
1. Publish at least 2-3 postmortems
2. Wait for embedding generation to complete
3. Check database: `SELECT COUNT(*) FROM postmortem_embeddings;`

### Slow Performance

**Symptom**: Recommendations take > 10 seconds

**Solutions**:
1. Check GCP region matches your location
2. Verify database indexes exist
3. Use cached recommendations (default behavior)
4. Consider reducing `topN` similar incidents (default: 5)

### Authentication Errors

**Symptom**: "Failed to authenticate with GCP"

**Solutions**:
1. Verify service account key is valid JSON
2. Check key hasn't expired
3. Ensure service account has required roles
4. Try regenerating the key

## Best Practices

### 1. Postmortem Quality

For best recommendations, ensure postmortems include:
- Clear problem statement
- Detailed business impact
- Root cause analysis
- Specific mitigation steps
- Lessons learned

### 2. Incident Documentation

Update incidents regularly with:
- Current symptoms
- Investigation findings
- Actions taken
- Impact updates

This helps generate better embeddings and more relevant recommendations.

### 3. Cache Management

- Default 15-minute cache is optimal for most cases
- Use manual refresh when incident state changes significantly
- Cache prevents excessive API calls and costs

### 4. Monitoring

Monitor these metrics:
- Embedding generation success rate
- Recommendation cache hit rate
- Average similarity scores
- API response times

## Advanced Configuration

### Custom Embedding Model

To use a different embedding model:

```javascript
// backend/services/knowledgeGraphService.js
this.embeddingModel = 'text-embedding-005'; // Update model
```

### Adjust Similarity Threshold

To filter low-similarity recommendations:

```javascript
// In findSimilarPostmortems method
const similarities = result.rows
  .map(/* ... */)
  .filter(item => item.similarityScore >= 0.5); // Add threshold
```

### Change Auto-Refresh Interval

```tsx
<KnowledgeGraphRecommendations 
  incidentId={incident.id}
  autoRefreshInterval={10 * 60 * 1000} // 10 minutes
/>
```

## Security Considerations

1. **Service Account Key**: Keep `google-service-account-key.json` secure
   - Add to `.gitignore` (already configured)
   - Use environment-specific keys
   - Rotate keys regularly

2. **Least Privilege**: Service account only has AI/ML permissions
   - No access to other GCP resources
   - No data storage permissions
   - Read-only for most operations

3. **Data Privacy**: Embeddings stored in your database
   - No data sent to external services except GCP
   - Embeddings are anonymized vectors
   - Original text stored for reference only

## Support

For issues or questions:
1. Check backend logs: `docker-compose logs backend`
2. Verify GCP setup: `gcloud auth list`
3. Test API directly: `curl http://localhost:3001/api/knowledge-graph/status`
4. Review this documentation

## Future Enhancements

Potential improvements:
- [ ] BigQuery integration for large-scale vector search
- [ ] Vertex AI Vector Search for faster similarity queries
- [ ] Multi-language support for embeddings
- [ ] Custom fine-tuned models for domain-specific recommendations
- [ ] Feedback loop to improve recommendation quality
- [ ] Integration with incident metrics and SLOs
