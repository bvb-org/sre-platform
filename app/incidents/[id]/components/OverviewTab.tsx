'use client';

import { useState, useEffect } from 'react';
import { Sparkles, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';

type Incident = {
  id: string;
  problemStatement?: string;
  impact?: string;
  causes?: string;
  stepsToResolve?: string;
};

interface OverviewTabProps {
  incident: Incident;
  onUpdate: (updates: Partial<Incident>) => Promise<void>;
  onRefresh: () => Promise<void>;
}

export function OverviewTab({ incident, onUpdate, onRefresh }: OverviewTabProps) {
  const [problemStatement, setProblemStatement] = useState(incident.problemStatement || '');
  const [impact, setImpact] = useState(incident.impact || '');
  const [causes, setCauses] = useState(incident.causes || '');
  const [stepsToResolve, setStepsToResolve] = useState(incident.stepsToResolve || '');
  
  // AI Summary states
  const [aiSummary, setAiSummary] = useState<string>('');
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // Update local state when incident changes
  useEffect(() => {
    setProblemStatement(incident.problemStatement || '');
    setImpact(incident.impact || '');
    setCauses(incident.causes || '');
    setStepsToResolve(incident.stepsToResolve || '');
  }, [incident]);

  // Generate AI summary when component loads or when incident data changes
  useEffect(() => {
    const hasData = incident.problemStatement || incident.impact || 
                    incident.causes || incident.stepsToResolve;
    if (hasData && !aiSummary) {
      generateAISummary();
    }
  }, [incident.id, incident.problemStatement, incident.impact, incident.causes, incident.stepsToResolve]);

  // Fetch available users when assignment dropdown is opened
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
        setAiSummary(data.summary);
      } else {
        throw new Error('Failed to generate summary');
      }
    } catch (error) {
      console.error('Error generating AI summary:', error);
      setSummaryError('Failed to generate AI summary. Please try again.');
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
      {/* AI Summary Section */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">AI Executive Summary</h3>
          </div>
          <button
            onClick={generateAISummary}
            disabled={loadingSummary}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors flex items-center space-x-1 text-sm disabled:opacity-50"
            title="Regenerate summary"
          >
            <RefreshCw className={`w-4 h-4 ${loadingSummary ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {loadingSummary && (
          <div className="flex items-center space-x-3 text-blue-600 dark:text-blue-400">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 dark:border-blue-400"></div>
            <span className="text-sm">Analyzing incident data...</span>
          </div>
        )}

        {summaryError && (
          <div className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-3">
            {summaryError}
          </div>
        )}

        {!loadingSummary && !summaryError && aiSummary && (
          <div className="prose prose-sm max-w-none">
            <div className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
              {aiSummary}
            </div>
          </div>
        )}

        {!loadingSummary && !summaryError && !aiSummary && (
          <div className="text-gray-500 dark:text-gray-400 text-sm italic">
            Fill in incident details below to generate an AI summary.
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
                <span>Hide Raw Details</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                <span>View Raw Details</span>
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

          {/* Impact */}
          <div>
            <h3 className="text-sm font-semibold text-text-primary dark:text-white mb-3">Impact</h3>
            <textarea
              value={impact}
              onChange={(e) => {
                setImpact(e.target.value);
                updateField('impact', e.target.value);
              }}
              placeholder="What was the impact? Which services or customers were affected?"
              rows={4}
              className="w-full px-3 py-2 border border-border dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-status-info resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            />
          </div>

          {/* Causes */}
          <div>
            <h3 className="text-sm font-semibold text-text-primary dark:text-white mb-3">Causes</h3>
            <textarea
              value={causes}
              onChange={(e) => {
                setCauses(e.target.value);
                updateField('causes', e.target.value);
              }}
              placeholder="What caused this incident?"
              rows={4}
              className="w-full px-3 py-2 border border-border dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-status-info resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            />
          </div>

          {/* Steps to Resolve */}
          <div>
            <h3 className="text-sm font-semibold text-text-primary dark:text-white mb-3">
              Steps to Resolve
            </h3>
            <textarea
              value={stepsToResolve}
              onChange={(e) => {
                setStepsToResolve(e.target.value);
                updateField('stepsToResolve', e.target.value);
              }}
              placeholder="What steps were taken to resolve the incident?"
              rows={4}
              className="w-full px-3 py-2 border border-border dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-status-info resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            />
          </div>
        </div>
      )}
    </div>
  );
}
