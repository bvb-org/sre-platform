'use client';

import { useState, useEffect } from 'react';
import { Sparkles, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { IncidentTimeline } from './IncidentTimeline';

type Incident = {
  id: string;
  problemStatement?: string;
  impact?: string;
  causes?: string;
  stepsToResolve?: string;
  detectedAt: string;
  mitigatedAt?: string;
  resolvedAt?: string;
  closedAt?: string;
  aiSummary?: string;
  aiSummaryGeneratedAt?: string;
};

interface OverviewTabProps {
  incident: Incident;
  onUpdate: (updates: Partial<Incident>) => Promise<void>;
  onRefresh: () => Promise<void>;
}

export function OverviewTab({ incident, onUpdate, onRefresh }: OverviewTabProps) {
  const [problemStatement, setProblemStatement] = useState(incident.problemStatement || '');
  const [impact, setImpact] = useState(incident.impact || '');
  
  // AI Summary states - use cached summary from incident
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [showDetails, setShowDetails] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // Update local state when incident changes
  useEffect(() => {
    setProblemStatement(incident.problemStatement || '');
    setImpact(incident.impact || '');
  }, [incident]);

  // Generate AI summary on-demand
  const generateAISummary = async () => {
    setLoadingSummary(true);
    setSummaryError(null);
    try {
      const response = await fetch(`/api/incidents/${incident.id}/summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (response.ok) {
        const data = await response.json();
        // Refresh the incident data to get the updated summary
        await onRefresh();
      } else {
        throw new Error('Failed to generate summary');
      }
    } catch (error) {
      console.error('Error generating AI summary:', error);
      setSummaryError('Failed to generate summary. Please try again.');
    } finally {
      setLoadingSummary(false);
    }
  };

  // Debounced update function
  const updateField = (field: string, value: string) => {
    onUpdate({ [field]: value });
  };

  return (
    <div className="space-y-6">
      {/* Timeline Section */}
      <IncidentTimeline
        detectedAt={incident.detectedAt}
        mitigatedAt={incident.mitigatedAt}
        resolvedAt={incident.resolvedAt}
        closedAt={incident.closedAt}
      />

      {/* Summary Section */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Summary</h3>
          </div>
          <button
            onClick={generateAISummary}
            disabled={loadingSummary}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors flex items-center space-x-1 text-sm disabled:opacity-50"
            title="Generate summary"
          >
            <RefreshCw className={`w-4 h-4 ${loadingSummary ? 'animate-spin' : ''}`} />
            <span>{incident.aiSummary ? 'Refresh' : 'Generate'}</span>
          </button>
        </div>

        {loadingSummary && (
          <div className="flex items-center space-x-3 text-blue-600 dark:text-blue-400">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 dark:border-blue-400"></div>
            <span className="text-sm">Generating summary...</span>
          </div>
        )}

        {summaryError && (
          <div className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-3">
            {summaryError}
          </div>
        )}

        {!loadingSummary && !summaryError && incident.aiSummary && (
          <>
            <div className="prose prose-sm max-w-none">
              <div className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                {incident.aiSummary}
              </div>
            </div>
            {incident.aiSummaryGeneratedAt && (
              <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Last updated {new Date(incident.aiSummaryGeneratedAt).toLocaleString()}
                </p>
              </div>
            )}
          </>
        )}

        {!loadingSummary && !summaryError && !incident.aiSummary && (
          <div className="text-gray-500 dark:text-gray-400 text-sm italic">
            Click "Generate" to create a summary based on the incident details.
          </div>
        )}

        {/* Toggle Details Button */}
        <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-800">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors text-sm font-medium"
          >
            {showDetails ? (
              <>
                <ChevronUp className="w-4 h-4" />
                <span>Hide Details</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                <span>View Details</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Raw Details Section - Collapsible */}
      {showDetails && (
        <div className="space-y-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Incident Details</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Edit the fields below to update incident information. Changes will regenerate the AI summary.
            </p>
          </div>

          {/* Problem Statement */}
          <div>
            <h3 className="text-sm font-semibold text-text-primary dark:text-white mb-3">
              Problem Statement
            </h3>
            <textarea
              value={problemStatement}
              onChange={(e) => {
                setProblemStatement(e.target.value);
                updateField('problemStatement', e.target.value);
              }}
              placeholder="Describe the problem that occurred..."
              rows={4}
              className="w-full px-3 py-2 border border-border dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-status-info resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            />
          </div>

          {/* Business Impact */}
          <div>
            <h3 className="text-sm font-semibold text-text-primary dark:text-white mb-3">Business Impact</h3>
            <textarea
              value={impact}
              onChange={(e) => {
                setImpact(e.target.value);
                updateField('impact', e.target.value);
              }}
              placeholder="What was the business impact? Which services or customers were affected?"
              rows={4}
              className="w-full px-3 py-2 border border-border dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-status-info resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            />
          </div>

        </div>
      )}
    </div>
  );
}
