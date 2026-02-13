# Incident Roles Management - Architecture

## Overview

This document describes the flexible incident roles management system that replaces the hardcoded `incident_lead_id` and `reporter_id` columns with a dynamic role assignment system.

## Role Types

The system supports four core incident roles (one person per role in UI):

1. **Incident Lead** - Primary incident coordinator
   - Global Major Incident Manager (GMM) for multi-country incidents
   - Domain Major Incident Manager (DMIM) for single country/P1 incidents
   - Required at incident declaration (auto-populated)

2. **Caller** - Person who reported the incident
   - Auto-populated from ServiceNow caller when importing
   - Optional for manually created incidents
   - Named "Caller" to match ServiceNow terminology

3. **DMIM** - Domain Major Incident Manager
   - Executive oversight for domain-level incidents
   - Can be assigned during or after incident declaration
   - Displayed directly below Incident Lead

4. **Communications Lead** - Stakeholder communications manager
   - Can be assigned during or after incident declaration
   - Manages internal and external communications

## Display Order

Roles are displayed in this order on the incident detail page:
1. Incident Lead
2. DMIM
3. Caller
4. Communications Lead

## Database Schema

### New Table: `incident_roles`

```sql
CREATE TABLE incident_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  role_type VARCHAR(50) NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id),
  assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  assigned_by_id UUID REFERENCES users(id),
  removed_at TIMESTAMP,
  removed_by_id UUID REFERENCES users(id),
  UNIQUE(incident_id, role_type, user_id, removed_at)
);

CREATE INDEX idx_incident_roles_incident ON incident_roles(incident_id);
CREATE INDEX idx_incident_roles_active ON incident_roles(incident_id, role_type) 
  WHERE removed_at IS NULL;
```

### Role Type Values

- `incident_lead` - Incident Lead (GMM/DMIM coordinator)
- `caller` - Caller/Reporter from ServiceNow
- `dmim` - Domain Major Incident Manager
- `communications_lead` - Communications Lead

### Design Notes

- Schema supports multiple people per role (future-proofing)
- UI enforces one person per role for simplicity
- Soft delete pattern with `removed_at` allows role history tracking
- Unique constraint allows same person to be reassigned to role later

## Migration Strategy

### Phase 1: Add New Table
1. Create `incident_roles` table
2. Keep existing `incident_lead_id` and `reporter_id` columns

### Phase 2: Data Migration
1. Migrate existing incident_lead_id → incident_roles (role_type='incident_lead')
2. Migrate existing reporter_id → incident_roles (role_type='caller')

### Phase 3: Update Application
1. Update backend queries to read from incident_roles
2. Update frontend to display all roles
3. Add role management UI

### Phase 4: Cleanup (Future)
1. Verify all functionality works with new table
2. Remove old columns in separate migration

## API Endpoints

### Get Incident Roles
```
GET /api/incidents/:id/roles
Response: [
  {
    id: "uuid",
    roleType: "incident_lead",
    user: { id, name, email, avatarUrl },
    assignedAt: "timestamp",
    assignedBy: { id, name }
  }
]
```

### Assign Role
```
POST /api/incidents/:id/roles
Body: {
  roleType: "communications_lead",
  userId: "uuid"
}
```

### Update Role
```
PUT /api/incidents/:id/roles/:roleId
Body: {
  userId: "uuid"
}
```

### Remove Role
```
DELETE /api/incidents/:id/roles/:roleId
```

## UI Components

### Declare Incident Page
- No changes required
- Incident Lead auto-populated (existing behavior)
- Caller auto-populated from ServiceNow if importing

### Incident Detail Page
- Display all assigned roles in order
- "+ Add Role" button for unassigned roles
- Edit/Remove buttons for each role
- User search with ServiceNow API autocomplete
- Timeline events for role changes

## ServiceNow Integration

### Import Caller
When importing incident from ServiceNow:
1. Fetch incident details including caller information
2. Create or find user in local database
3. Assign as "caller" role automatically

### User Search
- Use existing `/api/servicenow/users/search` endpoint
- Autocomplete dropdown for role assignment
- Fallback to manual text entry if ServiceNow unavailable

## Timeline Events

Role changes are tracked in timeline:
- "John Doe assigned as Communications Lead by Jane Smith"
- "Communications Lead changed from John Doe to Bob Wilson"
- "John Doe removed from DMIM role"

## Technical Contributors

Technical contributors are NOT tracked as formal roles. Instead, they are captured through:
- Timeline events (who performed actions)
- Action items (assigned to specific people)
- Affected services (links to service owners via runbooks)

This keeps the role structure simple while maintaining full incident participation history.

## Future Enhancements

### Potential Future Features (Not in Initial Implementation)
- Multiple people per role (schema supports, UI doesn't)
- Custom role types defined by organization
- Role-based permissions and access control
- Azure Active Directory integration for GMM/DMIM team membership
- Role templates for different incident types
- Automatic role assignment based on on-call schedules

## References

- ServiceNow incident fields: caller_id, assigned_to, etc.
- ITIL incident management best practices
- Existing codebase: `backend/services/serviceNowService.js`
