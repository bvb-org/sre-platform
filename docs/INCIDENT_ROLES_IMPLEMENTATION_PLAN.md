# Incident Roles Implementation Plan

## Overview

This document outlines the implementation plan for the flexible incident roles management system. The system replaces hardcoded role columns with a dynamic role assignment table.

## Completed Work

### ✅ 1. Architecture Design
- **File**: [`docs/INCIDENT_ROLES_ARCHITECTURE.md`](INCIDENT_ROLES_ARCHITECTURE.md)
- Defined four core roles: Incident Lead, Caller, DMIM, Communications Lead
- Designed database schema with soft delete pattern
- Planned migration strategy to preserve existing data

### ✅ 2. Database Migration
- **File**: [`liquibase/changesets/008-incident-roles-schema.xml`](../liquibase/changesets/008-incident-roles-schema.xml)
- Created `incident_roles` table with flexible many-to-many relationship
- Added indexes for performance (incident_id, active roles)
- Migrated existing `incident_lead_id` and `reporter_id` data
- Updated master changelog to include new migration

### ✅ 3. Backend API Routes
- **File**: [`backend/routes/incidentRoles.js`](../backend/routes/incidentRoles.js)
- `GET /api/incidents/:id/roles` - Fetch all active roles
- `POST /api/incidents/:id/roles` - Assign a role
- `PUT /api/incidents/:id/roles/:roleId` - Update role assignment
- `DELETE /api/incidents/:id/roles/:roleId` - Remove role assignment
- Automatic timeline event creation for all role changes
- Enforces one person per role (UI constraint)

### ✅ 4. Server Configuration
- **File**: [`backend/server.js`](../backend/server.js)
- Registered incident roles routes at `/api/incidents/:id/roles`

## Remaining Work

### 🔄 5. Update Incidents API

**Files to modify:**
- [`backend/routes/incidents.js`](../backend/routes/incidents.js)

**Changes needed:**
1. Update incident creation to use `incident_roles` table
2. Modify incident queries to join with `incident_roles`
3. Return roles array instead of `incidentLead` and `reporter` objects
4. Keep backward compatibility during transition

**Example query structure:**
```sql
SELECT i.*,
  COALESCE(
    json_agg(
      json_build_object(
        'roleType', ir.role_type,
        'user', json_build_object('id', u.id, 'name', u.name, 'email', u.email)
      )
    ) FILTER (WHERE ir.id IS NOT NULL),
    '[]'
  ) as roles
FROM incidents i
LEFT JOIN incident_roles ir ON i.id = ir.incident_id AND ir.removed_at IS NULL
LEFT JOIN users u ON ir.user_id = u.id
WHERE i.id = $1
GROUP BY i.id
```

### 🔄 6. ServiceNow Caller Integration

**Files to modify:**
- [`backend/routes/incidents.js`](../backend/routes/incidents.js)
- [`backend/routes/servicenow.js`](../backend/routes/servicenow.js)

**Changes needed:**
1. When importing from ServiceNow, extract caller information
2. Create or find caller user in local database
3. Automatically assign as "caller" role
4. Update incident creation flow to handle caller assignment

**ServiceNow caller field**: Check `caller_id` field in ServiceNow incident response

### 🔄 7. Role Management UI Component

**New file to create:**
- `app/incidents/[id]/components/RolesManager.tsx`

**Component features:**
- Display all four roles in order: Incident Lead, DMIM, Caller, Communications Lead
- Show assigned user with avatar, name, email
- "+ Add" button for unassigned roles
- "Edit" and "Remove" buttons for assigned roles
- User search modal with ServiceNow autocomplete
- Real-time updates after role changes

**UI mockup:**
```
┌─────────────────────────────────────┐
│ Incident Roles                      │
├─────────────────────────────────────┤
│ Incident Lead                       │
│ 👤 John Doe (john@example.com)     │
│    [Edit] [Remove]                  │
├─────────────────────────────────────┤
│ DMIM                                │
│ [+ Add DMIM]                        │
├─────────────────────────────────────┤
│ Caller                              │
│ 👤 Jane Smith (jane@example.com)   │
│    [Edit] [Remove]                  │
├─────────────────────────────────────┤
│ Communications Lead                 │
│ [+ Add Communications Lead]         │
└─────────────────────────────────────┘
```

### 🔄 8. User Search Component

**New file to create:**
- `app/incidents/[id]/components/UserSearchModal.tsx`

**Component features:**
- Modal dialog for user selection
- Search input with debounced ServiceNow API calls
- Dropdown with search results (name, email, title)
- Fallback to manual text entry if ServiceNow unavailable
- "Assign" and "Cancel" buttons

**API endpoint to use:**
- `GET /api/servicenow/users/search?query={searchTerm}`

### 🔄 9. Update Incident Detail Page

**File to modify:**
- [`app/incidents/[id]/page.tsx`](../app/incidents/[id]/page.tsx)

**Changes needed:**
1. Import and render `RolesManager` component
2. Fetch roles from `/api/incidents/:id/roles`
3. Update incident type to include `roles` array
4. Remove or deprecate `incidentLead` and `reporter` fields
5. Add role refresh after updates

**Placement**: Add roles section in the Overview tab, below incident details

### 🔄 10. Update Incident Queries

**Files to modify:**
- [`backend/routes/incidents.js`](../backend/routes/incidents.js) - List and detail endpoints
- [`backend/routes/analytics.js`](../backend/routes/analytics.js) - Analytics queries
- [`backend/routes/postmortem.js`](../backend/routes/postmortem.js) - Postmortem generation

**Pattern to follow:**
```javascript
// Old way
LEFT JOIN users u ON i.incident_lead_id = u.id

// New way
LEFT JOIN incident_roles ir ON i.id = ir.incident_id AND ir.removed_at IS NULL
LEFT JOIN users u ON ir.user_id = u.id
```

### 🔄 11. Update Postmortem Generation

**File to modify:**
- [`backend/routes/postmortem.js`](../backend/routes/postmortem.js)

**Changes needed:**
1. Update incident query to fetch all roles
2. Include all roles in AI context for postmortem generation
3. Update postmortem template to show all roles
4. Format roles section: "Incident Lead: John Doe, DMIM: Jane Smith, ..."

### 🔄 12. Testing

**Test scenarios:**
1. **Database Migration**
   - Run Liquibase migration
   - Verify existing incidents have roles migrated
   - Check indexes are created

2. **API Endpoints**
   - Test GET /api/incidents/:id/roles
   - Test POST to assign each role type
   - Test PUT to change role assignment
   - Test DELETE to remove role
   - Verify timeline events are created
   - Test one-person-per-role constraint

3. **ServiceNow Integration**
   - Import incident from ServiceNow
   - Verify caller is auto-assigned
   - Test user search autocomplete

4. **UI Components**
   - Test role display on incident detail page
   - Test adding roles via UI
   - Test editing roles
   - Test removing roles
   - Verify real-time updates

5. **Edge Cases**
   - Incident with no roles assigned
   - Assigning same user to multiple roles
   - Removing last role
   - ServiceNow unavailable scenarios

### 🔄 13. Documentation Updates

**Files to update:**
- [`README.md`](../README.md) - Add roles feature description
- [`docs/SETUP.md`](SETUP.md) - Update setup instructions
- Create user guide for role management

## Implementation Order

Recommended implementation sequence:

1. ✅ **Phase 1: Foundation** (Completed)
   - Architecture design
   - Database migration
   - Backend API routes

2. **Phase 2: Backend Integration** (Next)
   - Update incidents API to use incident_roles
   - Integrate ServiceNow caller import
   - Update all queries to use new table

3. **Phase 3: Frontend** (After Phase 2)
   - Create RolesManager component
   - Create UserSearchModal component
   - Update incident detail page

4. **Phase 4: Testing & Polish** (Final)
   - Comprehensive testing
   - Bug fixes
   - Documentation updates

## Migration Rollback Plan

If issues arise, rollback strategy:

1. Keep old columns (`incident_lead_id`, `reporter_id`) until fully validated
2. Can revert to old columns by updating queries
3. New `incident_roles` table can be dropped if needed
4. Timeline events for role changes remain for audit trail

## Future Enhancements

Features not in initial implementation but supported by schema:

1. **Multiple people per role** - Schema supports, just update UI
2. **Custom role types** - Add to role_type enum
3. **Role-based permissions** - Use roles for access control
4. **Azure AD integration** - Auto-assign based on AD groups
5. **Role templates** - Pre-defined role sets for incident types
6. **On-call integration** - Auto-assign based on on-call schedule

## Questions & Decisions

### Decided:
- ✅ Role types: Incident Lead, Caller, DMIM, Communications Lead
- ✅ One person per role (UI enforced)
- ✅ Caller auto-populated from ServiceNow
- ✅ Roles can be added/modified after incident declaration
- ✅ Use ServiceNow user search for autocomplete
- ✅ Track role changes in timeline

### Open Questions:
- Should we add role change notifications?
- Should roles be required or all optional?
- Should we show role history (removed roles)?

## References

- Architecture: [`docs/INCIDENT_ROLES_ARCHITECTURE.md`](INCIDENT_ROLES_ARCHITECTURE.md)
- Database Migration: [`liquibase/changesets/008-incident-roles-schema.xml`](../liquibase/changesets/008-incident-roles-schema.xml)
- API Routes: [`backend/routes/incidentRoles.js`](../backend/routes/incidentRoles.js)
- ServiceNow Service: [`backend/services/serviceNowService.js`](../backend/services/serviceNowService.js)
