'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export interface StreamFormData {
  name: string;
  streamType: string;
  hypothesis: string;
  assignedToId?: string;
  initialTasks?: Array<{ description: string }>;
}

interface AddStreamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: StreamFormData) => Promise<void>;
  availableUsers?: Array<{ id: string; name: string; email: string }>;
  initialData?: Partial<StreamFormData>;
}

export function AddStreamModal({
  isOpen,
  onClose,
  onSubmit,
  availableUsers = [],
  initialData,
}: AddStreamModalProps) {
  const [name, setName] = useState('');
  const [streamType, setStreamType] = useState('technical');
  const [hypothesis, setHypothesis] = useState('');
  const [assignedToId, setAssignedToId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Populate form with initial data when modal opens
  useEffect(() => {
    if (isOpen && initialData) {
      setName(initialData.name || '');
      setStreamType(initialData.streamType || 'technical');
      setHypothesis(initialData.hypothesis || '');
      setAssignedToId(initialData.assignedToId || '');
    }
  }, [isOpen, initialData]);

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
        initialTasks: initialData?.initialTasks,
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

  // Show source badge if this was created from a recommendation
  const isFromRecommendation = initialData?.hypothesis && initialData?.initialTasks?.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full mx-4 max-h-[90vh] overflow-y-auto ${isFromRecommendation ? 'max-w-4xl' : 'max-w-2xl'}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Create Activity Stream
            </h2>
            {isFromRecommendation && (
              <span className="px-2 py-1 text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded">
                From AI Recommendation
              </span>
            )}
          </div>
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

          {/* Pre-populated Tasks (from AI Recommendation) */}
          {initialData?.initialTasks && initialData.initialTasks.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Suggested Tasks (from AI Recommendation)
              </label>
              <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3 space-y-2">
                {initialData.initialTasks.map((task, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-sm">
                    <span className="text-purple-600 dark:text-purple-400 mt-0.5">•</span>
                    <span className="text-gray-700 dark:text-gray-300">{task.description}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                These tasks will be created with the stream. You can modify or add more after creation.
              </p>
            </div>
          )}

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
