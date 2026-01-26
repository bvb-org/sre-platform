# Knowledge Graph Quick Start

## 🚀 5-Minute Setup

### Step 1: Enable GCP APIs

```bash
export PROJECT_ID="your-gcp-project-id"
gcloud services enable aiplatform.googleapis.com --project=$PROJECT_ID
```

### Step 2: Create Service Account

```bash
# Create service account
gcloud iam service-accounts create sre-platform-ai \
  --display-name="SRE Platform AI Service" \
  --project=$PROJECT_ID

# Grant permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:sre-platform-ai@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"

# Download key
gcloud iam service-accounts keys create google-service-account-key.json \
  --iam-account=sre-platform-ai@${PROJECT_ID}.iam.gserviceaccount.com
```

### Step 3: Place Key File

```bash
# Move to project root
mv google-service-account-key.json /path/to/sre-platform/
```

### Step 4: Start Application

```bash
docker-compose up -d
```

### Step 5: Verify

```bash
curl http://localhost:3001/api/knowledge-graph/status
```

✅ You should see `"available": true`

## 📊 How to Use

### 1. Publish Postmortems

- Complete postmortem for resolved incidents
- Click "Publish" button
- System automatically generates embeddings

### 2. View Recommendations

- Open any active incident
- Go to "Investigation" tab
- See "AI Knowledge Graph Recommendations" section
- Recommendations auto-refresh every 15 minutes

### 3. Manual Refresh

- Click "Refresh" button to force update
- Useful after significant incident updates

## 🎯 What You Get

### For Each Recommendation:

- **Reference Incident**: Link to similar past incident
- **Similarity Score**: How similar (0-100%)
- **Recommendation**: What to try
- **Details**: Why this might help
- **Actions**: Specific steps to take

### Example:

```
INC-12345 - Payment API Timeout (87% match)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Recommendation: Check database connection pool

Details: Based on INC-12345, a sudden loss of connection 
in the payments API was caused by an unannounced network 
switch reset. The connection pool was exhausted...

Actions:
• Verify database connection pool settings
• Check for long-running queries  
• Review connection timeout configuration
```

## 💡 Tips

1. **Publish Quality Postmortems**: Better postmortems = better recommendations
2. **Update Incidents Regularly**: More context = more relevant suggestions
3. **Build Your Knowledge Base**: Start with 5-10 published postmortems
4. **Use Recommendations Early**: Check during initial investigation

## 🔧 Troubleshooting

| Issue | Solution |
|-------|----------|
| "Service not available" | Check `google-service-account-key.json` exists |
| "No recommendations" | Publish more postmortems (need 2+ published) |
| Slow performance | Check GCP region matches your location |
| Authentication error | Verify service account has `aiplatform.user` role |

## 📚 Full Documentation

See [KNOWLEDGE_GRAPH_SETUP.md](./KNOWLEDGE_GRAPH_SETUP.md) for complete details.

## 💰 Cost Estimate

- **Per incident**: ~$0.01 - $0.02
- **100 incidents/month**: ~$4 - $8
- **Includes**: Embeddings + AI recommendations

## 🎉 That's It!

Your AI-powered knowledge graph is ready. Start publishing postmortems and watch the recommendations flow!
