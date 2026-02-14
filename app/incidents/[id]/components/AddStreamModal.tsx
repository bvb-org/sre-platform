'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

interface AddStreamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    streamType: string;
    hypothesis: string;
    assignedToId?: string;
  }) => Promise<void>;
  availableUsers?: Array<{ id: string; name: string; email: string }>;
}

export function AddStreamModal({
  isOpen,
  onClose,
  onSubmit,
  availableUsers = [],
}: AddStreamModalProps) {
  const [name, setName] = useState('');
  const [streamType, setStreamType] = useState('technical');
  const [hypothesis, setHypothesis] = useState('');
  const [assignedToId, setAssignedToId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        streamType,
        hypothesis: hypothesis.trim(),
        assignedToId: assignedToId || undefined,
      });
      
      // Reset form
      setName('');
      setStreamType('technical');
      setHypothesis('');
      setAssignedToId('');
      onClose();
    } catch (error) {
      console.error('Error creating stream:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setName('');
      setStreamType('technical');
      setHypothesis('');
      setAssignedToId('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Create Investigation Stream
          </h2>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Stream Name */}
          <div>
            <label
              htmlFor="stream-name"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Stream Name <span className="text-red-500">*</span>
            </label>
            <input
              id="stream-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., API Service Layer, Database Investigation"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              required
              autoFocus
            />
          </div>

          {/* Stream Type */}
          <div>
            <label
              htmlFor="stream-type"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Stream Type
            </label>
            <select
              id="stream-type"
              value={streamType}
              onChange={(e) => setStreamType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="technical">Technical Investigation</option>
              <option value="operational">Operational / Communications</option>
            </select>
          </div>

          {/* Hypothesis */}
          <div>
            <label
              htmlFor="hypothesis"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Hypothesis (Optional)
            </label>
            <textarea
              id="hypothesis"
              value={hypothesis}
              onChange={(e) => setHypothesis(e.target.value)}
              placeholder="What are you investigating? What do you think might be the cause?"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            />
          </div>

          {/* Assign To */}
          {availableUsers.length > 0 && (
            <div>
              <label
                htmlFor="assigned-to"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Assign To (Optional)
              </label>
              <select
                id="assigned-to"
                value={assignedToId}
                onChange={(e) => setAssignedToId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Unassigned</option>
                {availableUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating...' : 'Create Stream'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
