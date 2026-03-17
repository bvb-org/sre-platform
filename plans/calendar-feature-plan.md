# Calendar Feature Plan — Watchtower SRE Platform

## Overview

Add a **Calendar** module to Watchtower that allows a Manager on Duty (MoD/GMIM) to create and manage operational events. A special event type — **Change Freeze** — integrates with Azure DevOps pipelines to block deployments while the freeze is active.

---

## Event Types

| Type | Color | Blocks Deployments |
|---|---|---|
| `change_freeze` | Red | ✅ Yes |
| `planned_maintenance` | Orange | ❌ No |
| `incident_window` | Purple | ❌ No |
| `informational` | Blue | ❌ No |

---

## Architecture Flow

```
MoD logs into Watchtower
  → navigates to Calendar (header nav)
  → creates a Change Freeze event (start/end time, title, description)
  → event stored in PostgreSQL calendar_events table

Developer triggers Azure DevOps pipeline
  → pipeline runs freeze-check step (before deploy)
  → HTTP GET https://watchtower.yourdomain.com/api/calendar/freeze-check
      Header: X-API-Key: <WATCHTOWER_API_KEY>
  → Watchtower queries DB: any change_freeze event active right now?
      YES → pipeline step exits 1 → deployment blocked with clear error message
      NO  → pipeline step exits 0 → deployment proceeds
```

---

## Local → Azure DevOps Connectivity: Cloudflare Tunnel

Azure DevOps Microsoft-hosted agents run in the cloud and cannot reach `localhost`. We use a **Cloudflare Tunnel** to expose the local backend securely.

### Setup

```bash
# 1. Install cloudflared
brew install cloudflare/cloudflare/cloudflared

# 2. Authenticate (one-time)
cloudflared tunnel login

# 3. Create a named tunnel
cloudflared tunnel create watchtower

# 4. Route a DNS hostname to the tunnel
#    (requires a domain managed in Cloudflare)
cloudflared tunnel route dns watchtower watchtower.yourdomain.com

# 5. Run the tunnel (keep this running during demos)
cloudflared tunnel run watchtower
# → backend is now reachable at https://watchtower.yourdomain.com
```

The tunnel forwards `https://watchtower.yourdomain.com` → `http://localhost:3001`.

---

## Database Schema

### New table: `calendar_events`

```sql
CREATE TABLE calendar_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    event_type      VARCHAR(50) NOT NULL,  -- change_freeze | planned_maintenance | incident_window | informational
    start_time      TIMESTAMP NOT NULL,
    end_time        TIMESTAMP NOT NULL,
    created_by_id   UUID REFERENCES users(id),
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metadata        JSONB
);

CREATE INDEX idx_calendar_events_time ON calendar_events (start_time, end_time);
CREATE INDEX idx_calendar_events_type ON calendar_events (event_type);
CREATE INDEX idx_calendar_events_created_by ON calendar_events (created_by_id);
```

**Liquibase file:** `liquibase/changesets/013-calendar-events-schema.xml`

---

## Backend API

### Routes: `backend/routes/calendar.js`

| Method | Path | Description | Auth |
|---|---|---|---|
| `GET` | `/api/calendar/events` | List events (optional `?from=&to=` ISO date range) | None |
| `POST` | `/api/calendar/events` | Create a new event | `X-API-Key` header |
| `PUT` | `/api/calendar/events/:id` | Update an event | `X-API-Key` header |
| `DELETE` | `/api/calendar/events/:id` | Delete an event | `X-API-Key` header |
| `GET` | `/api/calendar/freeze-check` | Returns `{frozen: bool, event?: {...}}` | `X-API-Key` header |

### `GET /api/calendar/freeze-check` Response

```json
// No active freeze
{ "frozen": false }

// Active freeze
{
  "frozen": true,
  "event": {
    "id": "uuid",
    "title": "Q4 Release Freeze",
    "description": "No deployments until Monday 09:00",
    "eventType": "change_freeze",
    "startTime": "2026-02-24T18:00:00.000Z",
    "endTime": "2026-02-27T09:00:00.000Z"
  }
}
```

### API Key Authentication

- Backend env var: `CALENDAR_API_KEY` (in `backend/.env`)
- Frontend env var: `NEXT_PUBLIC_CALENDAR_API_KEY` (in `.env`) — same value
- All write operations and `freeze-check` require header: `X-API-Key: <key>`
- Generate a key: `openssl rand -hex 32`

---

## Frontend

### Navigation

[`app/components/Navigation.tsx`](../app/components/Navigation.tsx) — `calendar` added to `activePage` union; Calendar link with icon added to nav bar.

### Calendar Page: `app/calendar/page.tsx`

- Monthly grid view (Mon–Sun columns)
- Events rendered as coloured chips on their day cells
- Active Change Freeze banner at top of page (red, with shield icon)
- Click any day → opens EventModal in create mode (pre-filled with that date)
- Click an event chip → opens EventModal in edit/delete mode
- "Events this month" list below the grid, sorted by start time, with "Active now" badge
- "Today" button to jump back to current month

### EventModal Component: `app/calendar/components/EventModal.tsx`

Fields:
- **Event Type** — 4-button selector (Change Freeze / Planned Maintenance / Incident Window / Informational)
- **Title** — text input, required
- **Description** — textarea, optional
- **Start** / **End** — `datetime-local` pickers

Validation:
- Title required
- End time must be after start time
- Change Freeze shows a red warning banner in the modal

---

## Azure DevOps Integration

### Pipeline YAML: `azure-pipelines-freeze-check.yml`

The freeze-check step runs **before** the deploy step. It:
1. Calls `GET /api/calendar/freeze-check` with `X-API-Key` header
2. If HTTP ≠ 200 → blocks deployment (Watchtower unreachable = safe default)
3. If `frozen: true` → exits 1 with detailed error showing event title, description, end time
4. If `frozen: false` → exits 0, pipeline continues

### Azure DevOps Pipeline Variables

| Variable | Value | Secret? |
|---|---|---|
| `WATCHTOWER_API_URL` | `https://watchtower.yourdomain.com` | No |
| `WATCHTOWER_API_KEY` | Value of `CALENDAR_API_KEY` from `backend/.env` | ✅ Yes |

---

## Files Created / Modified

| File | Action |
|---|---|
| `liquibase/changesets/013-calendar-events-schema.xml` | ✅ Created |
| `liquibase/db.changelog-master.xml` | ✅ Modified — added changeset 013 include |
| `backend/routes/calendar.js` | ✅ Created |
| `backend/server.js` | ✅ Modified — registered `/api/calendar` router |
| `backend/.env.example` | ✅ Modified — added `CALENDAR_API_KEY` |
| `.env.example` | ✅ Modified — added `NEXT_PUBLIC_CALENDAR_API_KEY` |
| `app/calendar/page.tsx` | ✅ Created |
| `app/calendar/components/EventModal.tsx` | ✅ Created |
| `app/components/Navigation.tsx` | ✅ Modified — added Calendar nav link + `calendar` to activePage type |
| `azure-pipelines-freeze-check.yml` | ✅ Created |

---

## Demo Script

1. **Before freeze:** Developer triggers pipeline → freeze-check passes → deployment succeeds
2. **Create freeze:** MoD logs into Watchtower → Calendar → New Event → Change Freeze → "Q4 Release Freeze" → set start = now, end = tomorrow → Create
3. **Red banner** appears on the Calendar page: "🚫 Change Freeze Active — Deployments are currently blocked"
4. **During freeze:** Developer triggers pipeline again → freeze-check step fails:
   ```
   🚫 CHANGE FREEZE DETECTED — Deployment blocked
   Freeze event : Q4 Release Freeze
   Active until : 2026-02-26 09:00 UTC
   To deploy, the Manager on Duty must end or delete the change freeze event.
   ```
5. **Lift freeze:** MoD clicks the event → Edit → sets end time to now → Save (or deletes it)
6. **After freeze:** Developer triggers pipeline → freeze-check passes → deployment succeeds
