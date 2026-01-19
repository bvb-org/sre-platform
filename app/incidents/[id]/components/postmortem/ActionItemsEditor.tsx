import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

export function ActionItemsEditor({ items, onChange }: { 
  items: Array<{ description: string; priority: string }>; 
  onChange: (items: Array<{ description: string; priority: string }>) => void 
}) {
  const [newItem, setNewItem] = useState({ description: '', priority: 'medium' });

  const addItem = () => {
    if (newItem.description.trim()) {
      onChange([...items, newItem]);
      setNewItem({ description: '', priority: 'medium' });
    }
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={index} className="flex items-start gap-3 p-3 bg-background rounded border border-border">
          <div className="flex-1">
            <p className="text-sm text-text-primary">{item.description}</p>
            <span className={`inline-block mt-1 px-2 py-0.5 text-xs rounded ${
              item.priority === 'high' ? 'bg-status-critical/10 text-status-critical' :
              item.priority === 'medium' ? 'bg-status-warning/10 text-status-warning' :
              'bg-status-info/10 text-status-info'
            }`}>
              {item.priority} priority
            </span>
          </div>
          <button
            onClick={() => removeItem(index)}
            className="p-1 hover:bg-background rounded"
          >
            <Trash2 className="w-4 h-4 text-status-critical" />
          </button>
        </div>
      ))}

      <div className="p-4 bg-background/50 border-2 border-dashed border-border rounded-lg">
        <div className="space-y-3">
          <textarea
            value={newItem.description}
            onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
            placeholder="Describe the action item..."
            rows={2}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-purple resize-none"
          />
          <div className="flex gap-2">
            <select
              value={newItem.priority}
              onChange={(e) => setNewItem({ ...newItem, priority: e.target.value })}
              className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-purple"
            >
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
            </select>
            <button
              onClick={addItem}
              disabled={!newItem.description.trim()}
              className="flex-1 px-4 py-2 bg-accent-purple text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Action Item
            </button>
          </div>
        </div>
      </div>

      {items.length === 0 && (
        <p className="text-sm text-text-secondary italic text-center py-4">
          No action items yet. Add your first action item above.
        </p>
      )}
    </div>
  );
}
