'use client';

import { useState } from 'react';
import { X, Link as LinkIcon } from 'lucide-react';

interface AddFindingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    findingType: string;
    content: string;
    metadata: {
      evidenceLinks?: string[];
    };
  }) => Promise<void>;
  streamName: string;
}

export function AddFindingModal({
  isOpen,
  onClose,
  onSubmit,
  streamName,
}: AddFindingModalProps) {
  const [findingType, setFindingType] = useState('observation');
  const [content, setContent] = useState('');
  const [evidenceLink, setEvidenceLink] = useState('');
  const [evidenceLinks, setEvidenceLinks] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleAddLink = () => {
    if (evidenceLink.trim()) {
      setEvidenceLinks([...evidenceLinks, evidenceLink.trim()]);
      setEvidenceLink('');
    }
  };

  const handleRemoveLink = (index: number) => {
    setEvidenceLinks(evidenceLinks.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        findingType,
        content: content.trim(),
        metadata: {
          evidenceLinks: evidenceLinks.length > 0 ? evidenceLinks : undefined,
        },
      });

      // Reset form
      setFindingType('observation');
      setContent('');
      setEvidenceLink('');
      setEvidenceLinks([]);
      onClose();
    } catch (error) {
      console.error('Error creating finding:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setFindingType('observation');
      setContent('');
      setEvidenceLink('');
      setEvidenceLinks([]);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Add Finding
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Stream: {streamName}
            </p>
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
          {/* Finding Type */}
          <div>
            <label
              htmlFor="finding-type"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Finding Type
            </label>
            <select
              id="finding-type"
              value={findingType}
              onChange={(e) => setFindingType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="observation">Observation</option>
              <option value="proposed_root_cause">Proposed Root Cause</option>
              <option value="root_cause">Root Cause (Confirmed)</option>
              <option value="ruled_out">Ruled Out</option>
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {findingType === 'proposed_root_cause' &&
                'Mark this as a potential root cause for team discussion'}
              {findingType === 'root_cause' &&
                'Confirm this as the verified root cause of the incident'}
              {findingType === 'ruled_out' &&
                'Document why this path was ruled out'}
              {findingType === 'observation' &&
                'General finding or observation during investigation'}
            </p>
          </div>

          {/* Content */}
          <div>
            <label
              htmlFor="content"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Finding Description <span className="text-red-500">*</span>
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Describe what you found during the investigation..."
              rows={5}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              required
              autoFocus
            />
          </div>

          {/* Evidence Links */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Evidence Links (Optional)
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="url"
                value={evidenceLink}
                onChange={(e) => setEvidenceLink(e.target.value)}
                placeholder="https://dashboard.example.com/..."
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddLink();
                  }
                }}
              />
              <button
                type="button"
                onClick={handleAddLink}
                className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
              >
                Add
              </button>
            </div>

            {/* Evidence Links List */}
            {evidenceLinks.length > 0 && (
              <div className="space-y-2">
                {evidenceLinks.map((link, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600"
                  >
                    <LinkIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 text-sm text-blue-600 dark:text-blue-400 hover:underline truncate"
                    >
                      {link}
                    </a>
                    <button
                      type="button"
                      onClick={() => handleRemoveLink(index)}
                      className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

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
              disabled={!content.trim() || isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Adding...' : 'Add Finding'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
