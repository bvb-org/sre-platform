# Migration Guide: Frontend/Backend Separation

This guide explains the changes made to separate the frontend and backend into different Docker containers.

## What Changed

### Before
- Single Next.js container handling both UI and API routes
- API routes located in `app/api/`
- Container name: `sre-platform-frontend`

### After
- **Separate Backend Container**: Express.js API server in `backend/` directory
- **Separate Frontend Container**: Next.js UI-only application
- API routes migrated from Next.js to Express.js
- Frontend proxies API requests to backend via Next.js rewrites

## Architecture Overview

```
┌─────────────────┐
│   Frontend      │
│   (Next.js)     │
│   Port 3000     │
└────────┬────────┘
         │ API Proxy
         ↓
┌─────────────────┐
│   Backend       │
│   (Express.js)  │
│   Port 3001     │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│   PostgreSQL    │
│   Port 5432     │
└─────────────────┘
```

## File Structure Changes

### New Backend Directory
```
backend/
├── routes/
│   ├── incidents.js      # Incident management endpoints
│   ├── runbooks.js       # Runbook endpoints
│   ├── users.js          # User endpoints
│   └── postmortem.js     # Postmortem & AI endpoints
├── server.js             # Express server setup
├── package.json          # Backend dependencies
├── Dockerfile            # Backend container config
├── .env.example          # Backend environment template
└── README.md             # Backend documentation
```

### Frontend Changes
- `next.config.mjs`: Added API proxy configuration
- API routes in `app/api/` are now deprecated (but still present for reference)
- Frontend makes requests to `/api/*` which are proxied to backend

## Docker Compose Changes

### New Services
```yaml
backend:
  build: ./backend
  ports:
    - "3001:3001"
  environment:
    - DATABASE_URL=postgresql://...
    - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}

frontend:
  build: .
  ports:
    - "3000:3000"
  environment:
    - NEXT_PUBLIC_API_URL=http://backend:3001
  depends_on:
    - backend
```

## Environment Variables

### Frontend (.env)
```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Backend (backend/.env)
```bash
DATABASE_URL=postgresql://sre_user:sre_password@postgres:5432/sre_platform
ANTHROPIC_API_KEY=your_anthropic_api_key_here
PORT=3001
NODE_ENV=development
```

## Migration Steps

### For Docker Users

1. **Stop existing containers**
   ```bash
   docker-compose down
   ```

2. **Update environment files**
   ```bash
   # Update root .env
   cp .env.example .env
   # Edit and add ANTHROPIC_API_KEY
   
   # Create backend .env
   cp backend/.env.example backend/.env
   # Edit and add ANTHROPIC_API_KEY
   ```

3. **Rebuild and start**
   ```bash
   docker-compose up --build -d
   ```

4. **Verify services**
   ```bash
   # Check all containers are running
   docker-compose ps
   
   # Test backend API
   curl http://localhost:3001/health
   
   # Test frontend
   curl http://localhost:3000
   ```

### For Local Development

1. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   cd ..
   ```

2. **Start services in order**
   ```bash
   # Terminal 1: Backend
   cd backend
   npm run dev
   
   # Terminal 2: Frontend
   npm run dev
   
   # Terminal 3: WebSocket (if needed)
   cd websocket
   npm start
   ```

## API Endpoint Changes

All API endpoints remain the same from the client perspective:
- `GET /api/incidents` → Proxied to `http://backend:3001/api/incidents`
- `POST /api/incidents` → Proxied to `http://backend:3001/api/incidents`
- etc.

The frontend automatically proxies these requests via Next.js rewrites configuration.

## Troubleshooting

### Backend not accessible
```bash
# Check backend logs
docker-compose logs backend

# Verify backend is running
docker-compose ps backend

# Test backend directly
curl http://localhost:3001/health
```

### Frontend can't reach backend
```bash
# Check environment variable
docker-compose exec frontend env | grep NEXT_PUBLIC_API_URL

# Check Next.js rewrites
# Look for proxy configuration in next.config.mjs
```

### Database connection issues
```bash
# Check database is running
docker-compose ps postgres

# Check backend can connect
docker-compose logs backend | grep -i database
```

## Benefits of This Architecture

1. **Separation of Concerns**: Frontend and backend can be developed, tested, and deployed independently
2. **Scalability**: Each service can be scaled independently based on load
3. **Technology Flexibility**: Backend can be replaced with different technology without affecting frontend
4. **Better Development Experience**: Clearer boundaries between UI and API logic
5. **Easier Testing**: Backend API can be tested independently with tools like Postman
6. **Production Ready**: Follows microservices best practices

## Rollback (if needed)

If you need to rollback to the old architecture:

1. Stop new containers:
   ```bash
   docker-compose down
   ```

2. Checkout previous version:
   ```bash
   git checkout <previous-commit>
   ```

3. Start old containers:
   ```bash
   docker-compose up -d
   ```

## Next Steps

- The old Next.js API routes in `app/api/` can be removed once you verify everything works
- Consider adding API documentation (Swagger/OpenAPI) to the backend
- Add backend unit tests
- Set up separate CI/CD pipelines for frontend and backend
