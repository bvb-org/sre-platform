import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, ChevronDown, ChevronUp, User } from 'lucide-react';
import { CausalAnalysisItem, ActionItem, SWISS_CHEESE_LAYERS } from './types';

export function CausalAnalysisEditor({ 
  items, 
  onChange,
  users = []
}: { 
  items: CausalAnalysisItem[]; 
  onChange: (items: CausalAnalysisItem[]) => void;
  users?: Array<{ id: string; name: string; email: string }>;
}) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [newItem, setNewItem] = useState<CausalAnalysisItem>({
    interceptionLayer: 'define',
    cause: '',
    subCause: '',
    description: '',
    actionItems: [],
  });

  const addItem = () => {
    if (newItem.cause && newItem.subCause) {
      onChange([...items, newItem]);
      setNewItem({
        interceptionLayer: 'define',
        cause: '',
        subCause: '',
        description: '',
        actionItems: [],
      });
    }
  };

  const updateItem = (index: number, updated: CausalAnalysisItem) => {
    const newItems = [...items];
    newItems[index] = updated;
    onChange(newItems);
    setEditingIndex(null);
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
    if (expandedIndex === index) {
      setExpandedIndex(null);
    }
  };

  const addActionItem = (analysisIndex: number, actionItem: ActionItem) => {
    const newItems = [...items];
    const currentActionItems = newItems[analysisIndex].actionItems || [];
    newItems[analysisIndex] = {
      ...newItems[analysisIndex],
      actionItems: [...currentActionItems, actionItem],
    };
    onChange(newItems);
  };

  const updateActionItem = (analysisIndex: number, actionIndex: number, updatedAction: ActionItem) => {
    const newItems = [...items];
    const currentActionItems = [...(newItems[analysisIndex].actionItems || [])];
    currentActionItems[actionIndex] = updatedAction;
    newItems[analysisIndex] = {
      ...newItems[analysisIndex],
      actionItems: currentActionItems,
    };
    onChange(newItems);
  };

  const removeActionItem = (analysisIndex: number, actionIndex: number) => {
    const newItems = [...items];
    const currentActionItems = newItems[analysisIndex].actionItems || [];
    newItems[analysisIndex] = {
      ...newItems[analysisIndex],
      actionItems: currentActionItems.filter((_, i) => i !== actionIndex),
    };
    onChange(newItems);
  };

  const toggleExpanded = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <div className="space-y-4">
      {/* Existing Items */}
      {items.map((item, index) => (
        <div key={index} className="p-4 bg-background border border-border rounded-lg">
          {editingIndex === index ? (
            <div className="space-y-3">
              <select
                value={item.interceptionLayer}
                onChange={(e) => updateItem(index, { ...item, interceptionLayer: e.target.value as any })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-purple"
              >
                {SWISS_CHEESE_LAYERS.map(layer => (
                  <option key={layer} value={layer}>{layer.charAt(0).toUpperCase() + layer.slice(1)}</option>
                ))}
              </select>
              <input
                type="text"
                value={item.cause}
                onChange={(e) => updateItem(index, { ...item, cause: e.target.value })}
                placeholder="Cause"
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-purple"
              />
              <input
                type="text"
                value={item.subCause}
                onChange={(e) => updateItem(index, { ...item, subCause: e.target.value })}
                placeholder="Sub-cause"
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-purple"
              />
              <textarea
                value={item.description}
                onChange={(e) => updateItem(index, { ...item, description: e.target.value })}
                placeholder="Description"
                rows={2}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-purple resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingIndex(null)}
                  className="px-3 py-1 bg-status-info text-white rounded text-sm hover:bg-blue-600"
                >
                  Done
                </button>
                <button
                  onClick={() => setEditingIndex(null)}
                  className="px-3 py-1 border border-border text-text-secondary rounded text-sm hover:bg-background"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 bg-accent-purple/10 text-accent-purple text-xs font-medium rounded">
                      {item.interceptionLayer.charAt(0).toUpperCase() + item.interceptionLayer.slice(1)}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-text-primary">Cause: {item.cause}</p>
                  <p className="text-sm text-text-secondary">Sub-cause: {item.subCause}</p>
                  {item.description && (
                    <p className="text-sm text-text-secondary mt-1">{item.description}</p>
                  )}
                  {item.actionItems && item.actionItems.length > 0 && (
                    <div className="mt-2">
                      <span className="text-xs text-text-secondary">
                        {item.actionItems.length} action item{item.actionItems.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => toggleExpanded(index)}
                    className="p-1 hover:bg-background rounded"
                    title="Manage action items"
                  >
                    {expandedIndex === index ? (
                      <ChevronUp className="w-4 h-4 text-text-secondary" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-text-secondary" />
                    )}
                  </button>
                  <button
                    onClick={() => setEditingIndex(index)}
                    className="p-1 hover:bg-background rounded"
                  >
                    <Edit2 className="w-4 h-4 text-text-secondary" />
                  </button>
                  <button
                    onClick={() => removeItem(index)}
                    className="p-1 hover:bg-background rounded"
                  >
                    <Trash2 className="w-4 h-4 text-status-critical" />
                  </button>
                </div>
              </div>

              {/* Action Items Section */}
              {expandedIndex === index && (
                <ActionItemsSection
                  actionItems={item.actionItems || []}
                  onAdd={(actionItem) => addActionItem(index, actionItem)}
                  onUpdate={(actionIndex, actionItem) => updateActionItem(index, actionIndex, actionItem)}
                  onRemove={(actionIndex) => removeActionItem(index, actionIndex)}
                  users={users}
                />
              )}
            </div>
          )}
        </div>
      ))}

      {/* Add New Item Form */}
      <div className="p-4 bg-background/50 border-2 border-dashed border-border rounded-lg">
        <h4 className="text-sm font-medium text-text-primary mb-3">Add New Analysis</h4>
        <div className="space-y-3">
          <select
            value={newItem.interceptionLayer}
            onChange={(e) => setNewItem({ ...newItem, interceptionLayer: e.target.value as any })}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-purple"
          >
            {SWISS_CHEESE_LAYERS.map(layer => (
              <option key={layer} value={layer}>{layer.charAt(0).toUpperCase() + layer.slice(1)}</option>
            ))}
          </select>
          <input
            type="text"
            value={newItem.cause}
            onChange={(e) => setNewItem({ ...newItem, cause: e.target.value })}
            placeholder="Cause (e.g., Alerting gaps, Architectural weakness)"
            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-purple"
          />
          <input
            type="text"
            value={newItem.subCause}
            onChange={(e) => setNewItem({ ...newItem, subCause: e.target.value })}
            placeholder="Sub-cause (e.g., Missing alerts for key metrics)"
            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-purple"
          />
          <textarea
            value={newItem.description}
            onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
            placeholder="Description (optional)"
            rows={2}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-purple resize-none"
          />
          <button
            onClick={addItem}
            disabled={!newItem.cause || !newItem.subCause}
            className="w-full px-4 py-2 bg-accent-purple text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Analysis
          </button>
        </div>
      </div>

      {items.length === 0 && (
        <p className="text-sm text-text-secondary italic text-center py-4">
          No causal analysis items yet. Add your first analysis above.
        </p>
      )}
    </div>
  );
}

function ActionItemsSection({
  actionItems,
  onAdd,
  onUpdate,
  onRemove,
  users
}: {
  actionItems: ActionItem[];
  onAdd: (item: ActionItem) => void;
  onUpdate: (index: number, item: ActionItem) => void;
  onRemove: (index: number) => void;
  users: Array<{ id: string; name: string; email: string }>;
}) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingItem, setEditingItem] = useState<ActionItem | null>(null);
  const [newActionItem, setNewActionItem] = useState<ActionItem>({
    description: '',
    priority: 'medium',
    assignedTo: '',
  });

  const handleAdd = () => {
    if (newActionItem.description.trim()) {
      const selectedUser = users.find(u => u.id === newActionItem.assignedTo);
      onAdd({
        ...newActionItem,
        assignedToName: selectedUser?.name,
      });
      setNewActionItem({
        description: '',
        priority: 'medium',
        assignedTo: '',
      });
    }
  };

  const startEdit = (index: number, item: ActionItem) => {
    setEditingIndex(index);
    setEditingItem({ ...item });
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditingItem(null);
  };

  const saveEdit = (index: number) => {
    if (editingItem && editingItem.description.trim()) {
      const selectedUser = users.find(u => u.id === editingItem.assignedTo);
      onUpdate(index, {
        ...editingItem,
        assignedToName: selectedUser?.name,
      });
      setEditingIndex(null);
      setEditingItem(null);
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-border space-y-3">
      <h5 className="text-xs font-semibold text-text-primary uppercase tracking-wide">Action Items</h5>
      
      {/* Existing Action Items */}
      {actionItems.map((item, index) => (
        <div key={index} className="p-3 bg-white rounded border border-border">
          {editingIndex === index && editingItem ? (
            <div className="space-y-2">
              <textarea
                value={editingItem.description}
                onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                placeholder="Describe the action item..."
                rows={2}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-purple resize-none"
              />
              <div className="flex gap-2">
                <select
                  value={editingItem.priority}
                  onChange={(e) => setEditingItem({ ...editingItem, priority: e.target.value as any })}
                  className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-purple"
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                </select>
                <select
                  value={editingItem.assignedTo || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, assignedTo: e.target.value })}
                  className="flex-1 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-purple"
                >
                  <option value="">Assign to...</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>{user.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => saveEdit(index)}
                  className="px-3 py-1 bg-status-info text-white rounded text-sm hover:bg-blue-600"
                >
                  Save
                </button>
                <button
                  onClick={cancelEdit}
                  className="px-3 py-1 border border-border text-text-secondary rounded text-sm hover:bg-background"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <p className="text-sm text-text-primary">{item.description}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`inline-block px-2 py-0.5 text-xs rounded ${
                    item.priority === 'high' ? 'bg-status-critical/10 text-status-critical' :
                    item.priority === 'medium' ? 'bg-status-warning/10 text-status-warning' :
                    'bg-status-info/10 text-status-info'
                  }`}>
                    {item.priority} priority
                  </span>
                  {item.assignedToName && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded">
                      <User className="w-3 h-3" />
                      {item.assignedToName}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => startEdit(index, item)}
                  className="p-1 hover:bg-background rounded"
                >
                  <Edit2 className="w-4 h-4 text-text-secondary" />
                </button>
                <button
                  onClick={() => onRemove(index)}
                  className="p-1 hover:bg-background rounded"
                >
                  <Trash2 className="w-4 h-4 text-status-critical" />
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Add New Action Item */}
      <div className="p-3 bg-white/50 border border-dashed border-border rounded-lg">
        <div className="space-y-2">
          <textarea
            value={newActionItem.description}
            onChange={(e) => setNewActionItem({ ...newActionItem, description: e.target.value })}
            placeholder="Describe the action item..."
            rows={2}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-purple resize-none"
          />
          <div className="flex gap-2">
            <select
              value={newActionItem.priority}
              onChange={(e) => setNewActionItem({ ...newActionItem, priority: e.target.value as any })}
              className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-purple"
            >
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
            </select>
            <select
              value={newActionItem.assignedTo || ''}
              onChange={(e) => setNewActionItem({ ...newActionItem, assignedTo: e.target.value })}
              className="flex-1 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-purple"
            >
              <option value="">Assign to...</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>{user.name}</option>
              ))}
            </select>
            <button
              onClick={handleAdd}
              disabled={!newActionItem.description.trim()}
              className="px-4 py-2 bg-accent-purple text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>
        </div>
      </div>

      {actionItems.length === 0 && (
        <p className="text-xs text-text-secondary italic text-center py-2">
          No action items yet. Add action items based on this analysis.
        </p>
      )}
    </div>
  );
}
