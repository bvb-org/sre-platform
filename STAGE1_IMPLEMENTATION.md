# Stage 1 Implementation - Incident Creation & Management

## Completed Features

### ✅ 1.1 Incident Declaration Flow
- **Incident Creation Form** (`/incidents/new`)
  - Incident number input (from ServiceNow)
  - Title and description fields
  - Severity dropdown (Major, Preemptive Major)
  - Auto-populated incident lead
  - Form validation with Zod
  - Redirect to incident detail after creation

### ✅ 1.2 Incident Detail Page - Overview Tab
- **Left Side (Main Content)**
  - Editable problem statement section
  - Editable impact section (default: "Unknown")
  - Editable causes section
  - Editable steps to resolve section
  - Action items checklist with add/complete/delete functionality

- **Right Sidebar (Metadata)**
  - Status dropdown (Active, Investigating, Mitigated, Resolved, Closed)
  - Severity indicator with icon
  - Live duration calculation
  - Roles section (Incident Lead, Reporter)
  - Custom fields (Services affected, Customer impact, Escalation status)
  - Timestamps and duration metrics

### ✅ 1.3 Investigation Tab - Activity Timeline
- **Timeline Features**
  - Chronological event list with timestamps
  - Date separators for organization
  - Event type icons (reported, accepted, update, status_change)
  - User avatars and attribution
  - Rich content support with markdown-style links
  - Real-time update form

- **Update Sharing**
  - Text input with `/` command support
  - Service referencing with searchable dropdown
  - Auto-save on submission
  - Status change tracking

### ✅ 1.4 Service/API Referencing System
- **`/` Command Menu**
  - Trigger on typing `/`
  - Options: Services, People, Teams
  - Searchable service selector
  - Live search across 10 mock APIs

- **Service Integration**
  - 10 mock APIs across 5 teams:
    - **Payments Team**: Payment API, Billing API
    - **Identity Team**: User Auth API
    - **Communications Team**: Notification Service, Email Service
    - **Commerce Team**: Order Processing API, Inventory API
    - **Data Team**: Analytics API
    - **Discovery Team**: Search API, Recommendation Engine

- **Service Display**
  - Insert as markdown-style link in timeline
  - Clickable links to runbook pages
  - Team and description preview in search

### ✅ 1.5 Status Management
- **Status Dropdown**
  - Active (red)
  - Investigating (yellow)
  - Mitigated (blue)
  - Resolved (green)
  - Closed (gray)
- Auto-log status changes to timeline
- Update duration calculations
- Visual status indicators with badges

### ✅ Additional Features
- **Incidents List Page** (`/incidents`)
  - View all incidents with filtering
  - Status-based filters
  - Incident cards with key metrics
  - Quick navigation to incident details

- **API Routes**
  - `POST /api/incidents` - Create incident
  - `GET /api/incidents` - List incidents with optional status filter
  - `GET /api/incidents/[id]` - Get incident details
  - `PATCH /api/incidents/[id]` - Update incident
  - `POST /api/incidents/[id]/timeline` - Add timeline event
  - `GET /api/incidents/[id]/timeline` - Get timeline events
  - `POST /api/incidents/[id]/actions` - Create action item
  - `PATCH /api/incidents/[id]/actions/[actionId]` - Update action item
  - `DELETE /api/incidents/[id]/actions/[actionId]` - Delete action item
  - `GET /api/runbooks` - Search runbooks

- **Database Schema**
  - All tables from plan implemented via Liquibase
  - Direct PostgreSQL access using `pg` library (no ORM complexity)
  - Seed script for 10 mock services

## How to Run

### Prerequisites
- Docker and Docker Compose installed

### Setup Steps

1. **Rebuild and start all services**
   ```bash
   docker-compose down
   docker-compose build --no-cache
   docker-compose up -d
   ```
   This will start:
   - PostgreSQL database (port 5432)
   - Next.js frontend (port 3000)
   - Liquibase migrations (runs once)

2. **Wait for services to be ready** (about 30 seconds)
   ```bash
   # Check logs to ensure everything is running
   docker-compose logs -f frontend
   ```
   Wait until you see: `✓ Ready in X ms`

3. **Seed the database with mock data**
   ```bash
   docker-compose exec frontend npm run seed
   ```

4. **Access the application**
   - Open http://localhost:3000
   - Click "Declare Major Incident" to create your first incident
   - Fill in the form and submit
   - Explore the Overview and Investigation tabs
  - Try the `/services` command in the Investigation tab

### Troubleshooting

**If seed fails:**
```bash
# Check if database is ready
docker-compose exec postgres pg_isready

# Check database connection
docker-compose exec frontend sh
# Inside container:
echo $DATABASE_URL

# Try seeding again
npm run seed
```

**If you get connection errors:**
```bash
# Restart services
docker-compose restart

# Check logs
docker-compose logs postgres
docker-compose logs frontend
```

## Testing the Flow

### Create an Incident
1. Go to http://localhost:3000
2. Click "Declare Major Incident"
3. Fill in:
   - Incident Number: `INC-001`
   - Title: `Payment API experiencing high latency`
   - Description: `Users reporting slow checkout process`
   - Severity: `Major`
4. Click "Declare Incident"

### Use the Overview Tab
1. Edit the Problem Statement
2. Update the Impact section
3. Add action items
4. Mark action items as complete

### Use the Investigation Tab
1. Type an update in the text area
2. Type `/` to open the command menu
3. Select "Services"
4. Search for "Payment API"
5. Click to insert the service reference
6. Submit the update
7. See the timeline update with a clickable link

### Change Status
1. Use the status dropdown in the right sidebar
2. Change from "Active" to "Investigating"
3. Check the timeline for the status change event

## Architecture Highlights

### Frontend
- **Next.js 14** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **React Hook Form + Zod** for form validation
- **Lucide React** for icons

### Backend
- **Next.js API Routes** for REST endpoints
- **Native PostgreSQL** with `pg` library (no ORM complexity!)
- **PostgreSQL** database
- **Liquibase** for schema migrations

### Design System
- Clean, minimalist UI inspired by incident.io
- Consistent color palette for status indicators
- Responsive layout with sidebar
- Accessible components

## Why No Prisma?

Initially, the project used Prisma ORM, but it added unnecessary complexity:
- Binary compatibility issues with Alpine Linux in Docker
- OpenSSL version mismatches
- Extra build steps and configuration

**Solution:** Switched to native PostgreSQL client (`pg`) which:
- Works out of the box in any environment
- No binary compatibility issues
- Simpler, more direct SQL queries
- Easier to debug and understand
- Smaller Docker images

## What's Next (Stage 2)

Stage 2 will implement:
- AI-powered postmortem generation
- Rich text editor for postmortems
- AI coaching and proofreading
- Image upload support
- Quality checks before submission

## Notes

- WebSocket real-time updates are planned but not yet implemented (will be added in a future iteration)
- The `/people` and `/teams` commands show placeholders (full implementation in future stages)
- Runbook detail pages will be implemented in Stage 3
- Custom fields in the sidebar are currently static (will be made editable in future iterations)
