'use client';

import { useState, useEffect } from 'react';
import { Edit2, Check, X, Plus, Trash2, UserPlus } from 'lucide-react';

type Incident = {
  id: string;
  problemStatement?: string;
  impact?: string;
  causes?: string;
  stepsToResolve?: string;
  actionItems: any[];
};

interface OverviewTabProps {
  incident: Incident;
  onUpdate: (updates: Partial<Incident>) => Promise<void>;
  onRefresh: () => Promise<void>;
}

type User = {
  id: string;
  name: string;
  email: string;
};

export function OverviewTab({ incident, onUpdate, onRefresh }: OverviewTabProps) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [newAction, setNewAction] = useState('');
  const [isAddingAction, setIsAddingAction] = useState(false);
  const [assigningActionId, setAssigningActionId] = useState<string | null>(null);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Fetch available users when assignment dropdown is opened
  useEffect(() => {
    if (assigningActionId && availableUsers.length === 0) {
      fetchUsers();
    }
  }, [assigningActionId]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const users = await response.json();
        setAvailableUsers(users);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const startEdit = (field: string, currentValue: string) => {
    console.log('[DEBUG] startEdit called:', { field, currentValue, valueLength: currentValue?.length });
    setEditingField(field);
    setEditValue(currentValue || '');
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValue('');
  };

  const saveEdit = async (field: string) => {
    console.log('[DEBUG] saveEdit called:', { field, editValue, editValueLength: editValue.length });
    await onUpdate({ [field]: editValue });
    setEditingField(null);
    setEditValue('');
  };

  const addActionItem = async () => {
    if (!newAction.trim()) return;

    try {
      const response = await fetch(`/api/incidents/${incident.id}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: newAction }),
      });

      if (response.ok) {
        setNewAction('');
        setIsAddingAction(false);
        await onRefresh();
      }
    } catch (error) {
      console.error('Error adding action item:', error);
    }
  };

  const toggleActionItem = async (actionId: string, completed: boolean) => {
    try {
      await fetch(`/api/incidents/${incident.id}/actions/${actionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !completed }),
      });
      await onRefresh();
    } catch (error) {
      console.error('Error toggling action item:', error);
    }
  };

  const deleteActionItem = async (actionId: string) => {
    try {
      await fetch(`/api/incidents/${incident.id}/actions/${actionId}`, {
        method: 'DELETE',
      });
      await onRefresh();
    } catch (error) {
      console.error('Error deleting action item:', error);
    }
  };

  const assignActionItem = async (actionId: string, userId: string) => {
    try {
      await fetch(`/api/incidents/${incident.id}/actions/${actionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedToId: userId }),
      });
      setAssigningActionId(null);
      await onRefresh();
    } catch (error) {
      console.error('Error assigning action item:', error);
    }
  };

  const EditableSection = ({
    title,
    field,
    value,
    placeholder,
  }: {
    title: string;
    field: string;
    value?: string;
    placeholder: string;
  }) => {
    const isEditing = editingField === field;

    return (
      <div className="bg-white border border-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
          {!isEditing && (
            <button
              onClick={() => startEdit(field, value || '')}
              className="text-text-secondary hover:text-text-primary transition-colors"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-3">
            <textarea
              value={editValue}
              onChange={(e) => {
                console.log('[DEBUG] textarea onChange:', { field, newValue: e.target.value, valueLength: e.target.value.length });
                setEditValue(e.target.value);
              }}
              placeholder={placeholder}
              rows={4}
              dir="ltr"
              style={{ unicodeBidi: 'normal' }}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-status-info resize-none"
              autoFocus
            />
            <div className="flex items-center gap-2">
              <button
                onClick={() => saveEdit(field)}
                className="px-3 py-1.5 bg-status-success text-white text-sm rounded-lg hover:bg-green-600 transition-colors flex items-center gap-1"
              >
                <Check className="w-4 h-4" />
                Save
              </button>
              <button
                onClick={cancelEdit}
                className="px-3 py-1.5 bg-gray-100 text-text-secondary text-sm rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-1"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="text-sm text-text-primary whitespace-pre-wrap" dir="ltr" style={{ unicodeBidi: 'normal' }}>
            {value || (
              <span className="text-text-secondary italic">{placeholder}</span>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Problem Statement */}
      <EditableSection
        title="Problem Statement"
        field="problemStatement"
        value={incident.problemStatement}
        placeholder="Describe the problem that occurred..."
      />

      {/* Impact */}
      <EditableSection
        title="Impact"
        field="impact"
        value={incident.impact}
        placeholder="What was the impact? Which services or customers were affected?"
      />

      {/* Causes */}
      <EditableSection
        title="Causes"
        field="causes"
        value={incident.causes}
        placeholder="What caused this incident?"
      />

      {/* Steps to Resolve */}
      <EditableSection
        title="Steps to Resolve"
        field="stepsToResolve"
        value={incident.stepsToResolve}
        placeholder="What steps were taken to resolve the incident?"
      />

      {/* Action Items */}
      <div className="bg-white border border-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-text-primary">Action Items</h3>
          {!isAddingAction && (
            <button
              onClick={() => setIsAddingAction(true)}
              className="text-status-info hover:text-blue-600 transition-colors flex items-center gap-1 text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Action
            </button>
          )}
        </div>

        <div className="space-y-3">
          {incident.actionItems.map((action) => (
            <div
              key={action.id}
              className="flex items-start gap-3 p-3 rounded-lg hover:bg-background transition-colors group"
            >
              <input
                type="checkbox"
                checked={action.completed}
                onChange={() => toggleActionItem(action.id, action.completed)}
                className="mt-1 w-4 h-4 rounded border-border text-status-success focus:ring-status-info cursor-pointer"
              />
              <div className="flex-1">
                <p
                  className={`text-sm ${
                    action.completed
                      ? 'text-text-secondary line-through'
                      : 'text-text-primary'
                  }`}
                >
                  {action.description}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  {action.assignedTo ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 bg-accent-purple/10 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium text-accent-purple">
                          {action.assignedTo.name.charAt(0)}
                        </span>
                      </div>
                      <span className="text-xs text-text-secondary">
                        {action.assignedTo.name}
                      </span>
                    </div>
                  ) : (
                    <div className="relative">
                      {assigningActionId === action.id ? (
                        <div className="absolute top-0 left-0 z-10 bg-white border border-border rounded-lg shadow-lg p-2 w-64">
                          <div className="max-h-48 overflow-y-auto">
                            {loadingUsers ? (
                              <div className="px-3 py-2 text-sm text-text-secondary text-center">
                                Loading users...
                              </div>
                            ) : availableUsers.length > 0 ? (
                              availableUsers.map((user) => (
                                <button
                                  key={user.id}
                                  onClick={() => assignActionItem(action.id, user.id)}
                                  className="w-full text-left px-3 py-2 hover:bg-background rounded text-sm transition-colors flex items-center gap-2"
                                >
                                  <div className="w-6 h-6 bg-accent-purple/10 rounded-full flex items-center justify-center flex-shrink-0">
                                    <span className="text-xs font-medium text-accent-purple">
                                      {user.name.charAt(0)}
                                    </span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-text-primary font-medium truncate">
                                      {user.name}
                                    </div>
                                    <div className="text-xs text-text-secondary truncate">
                                      {user.email}
                                    </div>
                                  </div>
                                </button>
                              ))
                            ) : (
                              <div className="px-3 py-2 text-sm text-text-secondary text-center">
                                No users available
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => setAssigningActionId(null)}
                            className="w-full mt-2 px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary border-t border-border pt-2"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setAssigningActionId(action.id)}
                          className="text-status-info hover:text-blue-600 transition-colors flex items-center gap-1 text-xs"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          Assign
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => deleteActionItem(action.id)}
                className="opacity-0 group-hover:opacity-100 text-text-secondary hover:text-status-critical transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          {isAddingAction && (
            <div className="space-y-2 p-3 bg-background rounded-lg">
              <input
                type="text"
                value={newAction}
                onChange={(e) => setNewAction(e.target.value)}
                placeholder="Enter action item..."
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-status-info"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    addActionItem();
                  } else if (e.key === 'Escape') {
                    setIsAddingAction(false);
                    setNewAction('');
                  }
                }}
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={addActionItem}
                  className="px-3 py-1.5 bg-status-info text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setIsAddingAction(false);
                    setNewAction('');
                  }}
                  className="px-3 py-1.5 bg-gray-100 text-text-secondary text-sm rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {incident.actionItems.length === 0 && !isAddingAction && (
            <p className="text-sm text-text-secondary italic text-center py-4">
              No action items yet. Click "Add Action" to create one.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
