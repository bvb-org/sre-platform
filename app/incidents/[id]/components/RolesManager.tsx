'use client';

import { useState, useEffect } from 'react';
import { InlineUserSearch } from './InlineUserSearch';

interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

interface Role {
  id: string;
  roleType: string;
  user: User;
  assignedAt: string;
  assignedBy?: {
    id: string;
    name: string;
  };
}

interface RolesManagerProps {
  incidentId: string;
  onRoleChange?: () => void;
}

const ROLE_TYPES = {
  incident_lead: 'Incident Lead',
  dmim: 'DMIM',
  caller: 'Caller',
  communications_lead: 'Communications Lead',
};

const ROLE_ORDER = ['incident_lead', 'dmim', 'caller', 'communications_lead'];

export function RolesManager({ incidentId, onRoleChange }: RolesManagerProps) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingRoleType, setEditingRoleType] = useState<string | null>(null);

  useEffect(() => {
    fetchRoles();
  }, [incidentId]);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/incidents/${incidentId}/roles`);
      if (!response.ok) throw new Error('Failed to fetch roles');
      const data = await response.json();
      setRoles(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch roles');
    } finally {
      setLoading(false);
    }
  };

  const handleEditRole = (roleType: string) => {
    setEditingRoleType(roleType);
  };

  const handleCancelEdit = () => {
    setEditingRoleType(null);
  };

  const handleRemoveRole = async (roleId: string) => {
    if (!confirm('Are you sure you want to remove this role assignment?')) {
      return;
    }

    try {
      const response = await fetch(`/api/incidents/${incidentId}/roles/${roleId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to remove role');
      }

      await fetchRoles();
      onRoleChange?.();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to remove role');
    }
  };

  const handleUserSelected = async (user: User, roleType: string) => {
    try {
      const existingRole = getRoleByType(roleType);
      
      if (existingRole) {
        // Update existing role
        const response = await fetch(`/api/incidents/${incidentId}/roles/${existingRole.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to update role');
        }
      } else {
        // Assign new role
        const response = await fetch(`/api/incidents/${incidentId}/roles`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roleType: roleType,
            userId: user.id,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to assign role');
        }
      }

      setEditingRoleType(null);
      await fetchRoles();
      onRoleChange?.();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save role');
    }
  };

  const getRoleByType = (roleType: string): Role | undefined => {
    return roles.find((r) => r.roleType === roleType);
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Incident Roles</h2>
        <div className="text-gray-500 dark:text-gray-400">Loading roles...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Incident Roles</h2>
        <div className="text-red-600 dark:text-red-400">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg p-6">
      <h3 className="text-sm font-semibold text-text-primary dark:text-white mb-4">Roles</h3>
      
      <div className="space-y-4">
          {ROLE_ORDER.map((roleType) => {
            const role = getRoleByType(roleType);
            const roleLabel = ROLE_TYPES[roleType as keyof typeof ROLE_TYPES];

            return (
              <div key={roleType}>
                <p className="text-xs text-text-secondary dark:text-gray-400 mb-2">{roleLabel}</p>
                
                {editingRoleType === roleType ? (
                  <InlineUserSearch
                    onSelectUser={(user) => handleUserSelected(user, roleType)}
                    onCancel={handleCancelEdit}
                    currentUser={role?.user}
                  />
                ) : role ? (
                  <div className="group">
                    <div className="flex items-center gap-2">
                      {role.user.avatarUrl ? (
                        <img
                          src={role.user.avatarUrl}
                          alt={role.user.name}
                          className="w-6 h-6 rounded-full flex-shrink-0"
                        />
                      ) : (
                        <div className="w-6 h-6 bg-accent-purple/10 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-medium text-accent-purple">
                            {role.user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-text-primary dark:text-white truncate block">
                          {role.user.name}
                        </span>
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEditRole(roleType)}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleRemoveRole(role.id)}
                          className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => handleEditRole(roleType)}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center"
                  >
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add
                  </button>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}
