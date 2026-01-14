'use client';

import { useState, useEffect } from 'react';
import { FileText, Loader2, CheckCircle, AlertCircle, Sparkles, MessageSquare } from 'lucide-react';

type Postmortem = {
  id: string;
  incidentId: string;
  status: string;
  introduction: string;
  timelineSummary: string;
  rootCause: string;
  impactAnalysis: string;
  howWeFixedIt: string;
  actionItems: Array<{ description: string; priority: string }>;
  lessonsLearned: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
};

type PostmortemTabProps = {
  incident: any;
  onRefresh: () => void;
};

export function PostmortemTab({ incident, onRefresh }: PostmortemTabProps) {
  const [postmortem, setPostmortem] = useState<Postmortem | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [aiAction, setAiAction] = useState<'check' | 'ask' | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiFeedback, setAiFeedback] = useState('');
  const [aiQuestion, setAiQuestion] = useState('');
  const [editingSection, setEditingSection] = useState<string | null>(null);

  useEffect(() => {
    fetchPostmortem();
  }, [incident.id]);

  const fetchPostmortem = async () => {
    try {
      const response = await fetch(`/api/incidents/${incident.id}/postmortem`);
      if (!response.ok) throw new Error('Failed to fetch postmortem');
      const data = await response.json();
      setPostmortem(data.postmortem || data);
    } catch (error) {
      console.error('Error fetching postmortem:', error);
    } finally {
      setLoading(false);
    }
  };

  const generatePostmortem = async () => {
    if (!confirm('Generate AI postmortem? This will analyze the incident data and create a comprehensive postmortem document.')) {
      return;
    }

    setGenerating(true);
    try {
      const response = await fetch(`/api/incidents/${incident.id}/postmortem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          userId: incident.incidentLead?.id || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate postmortem');
      }

      const data = await response.json();
      setPostmortem(data);
    } catch (error) {
      console.error('Error generating postmortem:', error);
      alert(error instanceof Error ? error.message : 'Failed to generate postmortem');
    } finally {
      setGenerating(false);
    }
  };

  const updateSection = async (field: string, value: any) => {
    if (!postmortem) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/incidents/${incident.id}/postmortem`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });

      if (!response.ok) throw new Error('Failed to update postmortem');
      const data = await response.json();
      setPostmortem(data);
    } catch (error) {
      console.error('Error updating postmortem:', error);
    } finally {
      setSaving(false);
    }
  };

  const checkPostmortem = async () => {
    if (!postmortem) return;

    setAiAction('check');
    setShowAIPanel(true);
    setAiLoading(true);
    setAiFeedback('');

    try {
      const response = await fetch(`/api/incidents/${incident.id}/postmortem/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'check',
          postmortem,
        }),
      });

      if (!response.ok) throw new Error('Failed to check postmortem');
      const data = await response.json();
      setAiFeedback(data.feedback);
    } catch (error) {
      console.error('Error checking postmortem:', error);
      setAiFeedback('Failed to analyze postmortem. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const askAI = async () => {
    if (!aiQuestion.trim() || !postmortem) return;

    setAiAction('ask');
    setAiLoading(true);
    setAiFeedback('');

    try {
      const response = await fetch(`/api/incidents/${incident.id}/postmortem/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ask',
          question: aiQuestion,
          postmortem,
        }),
      });

      if (!response.ok) throw new Error('Failed to get AI response');
      const data = await response.json();
      setAiFeedback(data.answer);
      setAiQuestion('');
    } catch (error) {
      console.error('Error asking AI:', error);
      setAiFeedback('Failed to get AI response. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const publishPostmortem = async () => {
    if (!confirm('Publish this postmortem? It will be marked as final and shared with the team.')) {
      return;
    }

    await updateSection('status', 'published');
  };

  if (loading) {
    return (
      <div className="bg-white border border-border rounded-lg p-8 text-center">
        <Loader2 className="w-8 h-8 text-status-info animate-spin mx-auto mb-4" />
        <p className="text-text-secondary">Loading postmortem...</p>
      </div>
    );
  }

  // Show generate button if no postmortem exists and incident is resolved/closed
  if (!postmortem) {
    const canGenerate = incident.status === 'resolved' || incident.status === 'closed';

    return (
      <div className="bg-white border border-border rounded-lg p-8">
        <div className="text-center max-w-2xl mx-auto">
          <FileText className="w-16 h-16 text-text-secondary mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-text-primary mb-2">
            No Postmortem Yet
          </h3>
          {canGenerate ? (
            <>
              <p className="text-text-secondary mb-6">
                Generate an AI-powered postmortem based on the incident timeline, actions taken, and impact analysis.
              </p>
              <button
                onClick={generatePostmortem}
                disabled={generating}
                className="inline-flex items-center gap-2 px-6 py-3 bg-accent-purple text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating Postmortem...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Generate Postmortem with AI
                  </>
                )}
              </button>
            </>
          ) : (
            <p className="text-text-secondary">
              Postmortem can only be generated after the incident is resolved or closed.
              <br />
              Current status: <span className="font-medium capitalize">{incident.status}</span>
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-6">
      {/* Main Editor */}
      <div className="flex-1 space-y-6">
        {/* Status Banner */}
        {postmortem.status === 'published' && (
          <div className="bg-status-success/10 border border-status-success rounded-lg p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-status-success" />
            <div>
              <p className="text-sm font-medium text-status-success">Published</p>
              <p className="text-xs text-text-secondary">
                This postmortem was published on {new Date(postmortem.publishedAt!).toLocaleDateString()}
              </p>
            </div>
          </div>
        )}

        {/* Auto-save indicator */}
        {saving && (
          <div className="text-xs text-text-secondary flex items-center gap-2">
            <Loader2 className="w-3 h-3 animate-spin" />
            Saving...
          </div>
        )}

        {/* Introduction */}
        <Section
          title="Introduction"
          content={postmortem.introduction}
          onSave={(value) => updateSection('introduction', value)}
          isEditing={editingSection === 'introduction'}
          onEdit={() => setEditingSection('introduction')}
          onCancel={() => setEditingSection(null)}
        />

        {/* Timeline Summary */}
        <Section
          title="Timeline Summary"
          content={postmortem.timelineSummary}
          onSave={(value) => updateSection('timelineSummary', value)}
          isEditing={editingSection === 'timelineSummary'}
          onEdit={() => setEditingSection('timelineSummary')}
          onCancel={() => setEditingSection(null)}
        />

        {/* Root Cause */}
        <Section
          title="Root Cause"
          content={postmortem.rootCause}
          onSave={(value) => updateSection('rootCause', value)}
          isEditing={editingSection === 'rootCause'}
          onEdit={() => setEditingSection('rootCause')}
          onCancel={() => setEditingSection(null)}
        />

        {/* Impact Analysis */}
        <Section
          title="Impact Analysis"
          content={postmortem.impactAnalysis}
          onSave={(value) => updateSection('impactAnalysis', value)}
          isEditing={editingSection === 'impactAnalysis'}
          onEdit={() => setEditingSection('impactAnalysis')}
          onCancel={() => setEditingSection(null)}
        />

        {/* How We Fixed It */}
        <Section
          title="How We Fixed It"
          content={postmortem.howWeFixedIt}
          onSave={(value) => updateSection('howWeFixedIt', value)}
          isEditing={editingSection === 'howWeFixedIt'}
          onEdit={() => setEditingSection('howWeFixedIt')}
          onCancel={() => setEditingSection(null)}
        />

        {/* Action Items */}
        <div className="bg-white border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Action Items</h3>
          <div className="space-y-3">
            {(postmortem.actionItems || []).map((item, index) => (
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
              </div>
            ))}
            {(!postmortem.actionItems || postmortem.actionItems.length === 0) && (
              <p className="text-sm text-text-secondary italic">No action items yet</p>
            )}
          </div>
        </div>

        {/* Lessons Learned */}
        <Section
          title="Lessons Learned"
          content={postmortem.lessonsLearned}
          onSave={(value) => updateSection('lessonsLearned', value)}
          isEditing={editingSection === 'lessonsLearned'}
          onEdit={() => setEditingSection('lessonsLearned')}
          onCancel={() => setEditingSection(null)}
        />

        {/* Actions */}
        {postmortem.status !== 'published' && (
          <div className="flex gap-3">
            <button
              onClick={publishPostmortem}
              className="px-4 py-2 bg-status-success text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              Publish Postmortem
            </button>
          </div>
        )}
      </div>

      {/* AI Assistant Sidebar */}
      <div className="w-80 space-y-4">
        <div className="bg-white border border-border rounded-lg p-4">
          <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent-purple" />
            AI Assistant
          </h3>

          <div className="space-y-3">
            <button
              onClick={checkPostmortem}
              disabled={aiLoading}
              className="w-full px-4 py-2 bg-accent-purple text-white rounded-lg hover:bg-purple-700 transition-colors text-sm disabled:opacity-50"
            >
              {aiLoading && aiAction === 'check' ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Checking...
                </span>
              ) : (
                'Check Postmortem Quality'
              )}
            </button>

            <div className="border-t border-border pt-3">
              <label className="text-xs font-medium text-text-secondary mb-2 block">
                Ask AI a Question
              </label>
              <textarea
                value={aiQuestion}
                onChange={(e) => setAiQuestion(e.target.value)}
                placeholder="e.g., How do I use the Swiss Cheese Model?"
                className="w-full px-3 py-2 border border-border rounded text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent-purple"
                rows={3}
              />
              <button
                onClick={askAI}
                disabled={aiLoading || !aiQuestion.trim()}
                className="w-full mt-2 px-4 py-2 bg-status-info text-white rounded-lg hover:bg-blue-600 transition-colors text-sm disabled:opacity-50"
              >
                {aiLoading && aiAction === 'ask' ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Asking...
                  </span>
                ) : (
                  'Ask AI'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* AI Feedback Panel */}
        {aiFeedback && (
          <div className="bg-white border border-border rounded-lg p-4">
            <div className="flex items-start gap-2 mb-3">
              <MessageSquare className="w-4 h-4 text-accent-purple mt-0.5" />
              <h4 className="text-sm font-semibold text-text-primary">
                {aiAction === 'check' ? 'Quality Check Results' : 'AI Response'}
              </h4>
            </div>
            <div className="text-sm text-text-primary whitespace-pre-wrap prose prose-sm max-w-none">
              {aiFeedback}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

type SectionProps = {
  title: string;
  content: string;
  onSave: (value: string) => void;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
};

function Section({ title, content, onSave, isEditing, onEdit, onCancel }: SectionProps) {
  const [editValue, setEditValue] = useState(content);

  useEffect(() => {
    setEditValue(content);
  }, [content]);

  const handleSave = () => {
    onSave(editValue);
    onCancel();
  };

  return (
    <div className="bg-white border border-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
        {!isEditing && (
          <button
            onClick={onEdit}
            className="text-sm text-status-info hover:text-blue-600 transition-colors"
          >
            Edit
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-3">
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-status-info min-h-[150px]"
            rows={8}
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-status-info text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
            >
              Save
            </button>
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-border text-text-secondary rounded-lg hover:bg-background transition-colors text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="text-sm text-text-primary whitespace-pre-wrap">
          {content || <span className="text-text-secondary italic">No content yet</span>}
        </div>
      )}
    </div>
  );
}
