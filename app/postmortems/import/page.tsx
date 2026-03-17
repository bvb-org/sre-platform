'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Loader2,
  FileText,
  Clock,
  AlertTriangle,
  MessageSquare,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Send,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { Navigation } from '@/app/components/Navigation';

// ─── Types ──────────────────────────────────────────────────────────────────

type AIQuestion = {
  id: string;
  question: string;
  field: string;
  answered: boolean;
  answer: string | null;
};

type ExtractedMetadata = {
  incidentNumber?: string;
  title?: string;
  description?: string;
  severity?: string;
  detectedAt?: string;
  resolvedAt?: string;
  affectedService?: string;
  summary?: string;
  hasActionItems?: boolean;
  actionItemCount?: number;
  hasMitigationSteps?: boolean;
  hasBusinessImpact?: boolean;
  hasTimeline?: boolean;
  error?: string;
};

type ImportItem = {
  id: string;
  sessionId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  status: string;
  statusMessage: string;
  currentStep: string;
  extractedMetadata: ExtractedMetadata | null;
  aiQuestions: AIQuestion[];
  incidentId: string | null;
  postmortemId: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

type ImportSession = {
  id: string;
  status: string;
  autoPublish: boolean;
  totalFiles: number;
  completedFiles: number;
  failedFiles: number;
  createdAt: string;
  updatedAt: string;
  items: ImportItem[];
};

// ─── Step definitions for progress display ──────────────────────────────────

const STEPS = [
  { key: 'uploading', label: 'Uploaded', icon: FileText },
  { key: 'extracting_text', label: 'Extracting Text', icon: FileText },
  { key: 'extracting_metadata', label: 'Analyzing Document', icon: Clock },
  { key: 'looking_up_servicenow', label: 'ServiceNow Lookup', icon: ExternalLink },
  { key: 'generating_incident', label: 'Creating Incident', icon: AlertTriangle },
  { key: 'generating_postmortem', label: 'Generating Postmortem', icon: FileText },
  { key: 'completed', label: 'Completed', icon: CheckCircle },
];

function getStepIndex(step: string): number {
  const idx = STEPS.findIndex((s) => s.key === step);
  return idx >= 0 ? idx : 0;
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function ImportStatusPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session');

  const [session, setSession] = useState<ImportSession | null>(null);
  const [sessions, setSessions] = useState<ImportSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Fetch session data
  const fetchSession = useCallback(async (id: string) => {
    try {
      const res = await fetch(`http://localhost:3001/api/bulk-import/sessions/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSession(data);
      }
    } catch (err) {
      console.error('Failed to fetch session:', err);
    }
  }, []);

  // Fetch all sessions (for the list view)
  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:3001/api/bulk-import/sessions');
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
      }
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      if (sessionId) {
        await fetchSession(sessionId);
      } else {
        await fetchSessions();
      }
      setLoading(false);
    };
    load();
  }, [sessionId, fetchSession, fetchSessions]);

  // Poll for updates when viewing a session
  useEffect(() => {
    if (!sessionId) return;

    const interval = setInterval(() => {
      fetchSession(sessionId);
    }, 3000);

    return () => clearInterval(interval);
  }, [sessionId, fetchSession]);

  // Stop polling when all items are terminal
  const allTerminal = session?.items.every(
    (i) => ['completed', 'failed'].includes(i.status)
  );

  const toggleExpand = (itemId: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation activePage="postmortems" />

      <main className="max-w-content mx-auto px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/postmortems"
            className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {sessionId ? 'Import Progress' : 'Import History'}
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              {sessionId
                ? 'Track the status of your postmortem imports'
                : 'View past import sessions'}
            </p>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        )}

        {/* ── Session detail view ─────────────────────────────────────── */}
        {!loading && sessionId && session && (
          <div className="space-y-6">
            {/* Session summary bar */}
            <SessionSummary session={session} onRefresh={() => fetchSession(sessionId)} />

            {/* Items */}
            <div className="space-y-4">
              {session.items.map((item) => (
                <ImportItemCard
                  key={item.id}
                  item={item}
                  expanded={expandedItems.has(item.id)}
                  onToggle={() => toggleExpand(item.id)}
                  onRefresh={() => fetchSession(sessionId)}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Sessions list view ──────────────────────────────────────── */}
        {!loading && !sessionId && (
          <div className="space-y-4">
            {sessions.length === 0 && (
              <div className="text-center py-16 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-300">No import sessions yet</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Go to the Postmortems page and click &quot;Import&quot; to get started
                </p>
              </div>
            )}
            {sessions.map((s) => (
              <Link
                key={s.id}
                href={`/postmortems/import?session=${s.id}`}
                className="block bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5 hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <SessionStatusBadge status={s.status} />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {s.totalFiles} file{s.totalFiles !== 1 ? 's' : ''}
                        {s.autoPublish && (
                          <span className="ml-2 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full">
                            Auto-publish
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(s.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-sm text-gray-500 dark:text-gray-400">
                    <p>
                      {s.completedFiles}/{s.totalFiles} completed
                    </p>
                    {s.failedFiles > 0 && (
                      <p className="text-red-500">{s.failedFiles} failed</p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function SessionSummary({ session, onRefresh }: { session: ImportSession; onRefresh: () => void }) {
  const [retrying, setRetrying] = useState(false);

  const progress =
    session.totalFiles > 0
      ? Math.round(((session.completedFiles + session.failedFiles) / session.totalFiles) * 100)
      : 0;

  const handleRetryAllFailed = async () => {
    setRetrying(true);
    try {
      const res = await fetch(`http://localhost:3001/api/bulk-import/sessions/${session.id}/retry-failed`, {
        method: 'POST',
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error('Failed to retry:', err);
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <SessionStatusBadge status={session.status} />
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">
              {session.totalFiles} file{session.totalFiles !== 1 ? 's' : ''} imported
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Started {new Date(session.createdAt).toLocaleString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-green-600 dark:text-green-400 font-medium">
            {session.completedFiles} completed
          </span>
          {session.failedFiles > 0 && (
            <span className="text-red-500 font-medium">{session.failedFiles} failed</span>
          )}
          {session.autoPublish && (
            <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded-full text-xs font-medium">
              Auto-publish ON
            </span>
          )}
          {session.failedFiles > 0 && (
            <button
              onClick={handleRetryAllFailed}
              disabled={retrying}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
            >
              {retrying ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              Retry All Failed
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">{progress}%</p>
    </div>
  );
}

function SessionStatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    pending: {
      bg: 'bg-gray-100 dark:bg-gray-700',
      text: 'text-gray-700 dark:text-gray-300',
      icon: <Clock className="w-3.5 h-3.5" />,
    },
    processing: {
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      text: 'text-blue-700 dark:text-blue-400',
      icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
    },
    awaiting_input: {
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      text: 'text-yellow-700 dark:text-yellow-400',
      icon: <MessageSquare className="w-3.5 h-3.5" />,
    },
    completed: {
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-700 dark:text-green-400',
      icon: <CheckCircle className="w-3.5 h-3.5" />,
    },
    failed: {
      bg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-700 dark:text-red-400',
      icon: <XCircle className="w-3.5 h-3.5" />,
    },
  };

  const c = config[status] || config.pending;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      {c.icon}
      {status.replace(/_/g, ' ')}
    </span>
  );
}

// ─── Import Item Card ───────────────────────────────────────────────────────

function ImportItemCard({
  item,
  expanded,
  onToggle,
  onRefresh,
}: {
  item: ImportItem;
  expanded: boolean;
  onToggle: () => void;
  onRefresh: () => void;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [retryingItem, setRetryingItem] = useState(false);

  const meta = item.extractedMetadata;
  const stepIdx = getStepIndex(item.currentStep);
  const isTerminal = ['completed', 'failed'].includes(item.status);
  const needsInput = item.status === 'awaiting_input';
  const incidentDeleted = item.status === 'completed' && !item.incidentId;
  const postmortemDeleted = item.status === 'completed' && !item.postmortemId;

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSubmitAnswers = async () => {
    const unanswered = (item.aiQuestions || []).filter((q) => !q.answered);
    const payload = unanswered
      .filter((q) => answers[q.id])
      .map((q) => ({ questionId: q.id, answer: answers[q.id] }));

    if (payload.length === 0) return;

    setSubmitting(true);
    try {
      await fetch(`http://localhost:3001/api/bulk-import/items/${item.id}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: payload }),
      });
      setAnswers({});
      onRefresh();
    } catch (err) {
      console.error('Failed to submit answers:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={`border rounded-lg overflow-hidden transition-all ${
        incidentDeleted
          ? 'bg-gray-50 dark:bg-gray-800/60 border-gray-300 dark:border-gray-600 opacity-75'
          : 'bg-white dark:bg-gray-800'
      } ${
        needsInput
          ? 'border-yellow-300 dark:border-yellow-600 shadow-md'
          : item.status === 'failed'
          ? 'border-red-200 dark:border-red-800'
          : incidentDeleted
          ? ''
          : 'border-gray-200 dark:border-gray-700'
      }`}
    >
      {/* Header row */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
      >
        <div className="flex items-center gap-4 min-w-0 flex-1">
          {/* Status icon */}
          <ItemStatusIcon status={item.status} incidentDeleted={incidentDeleted} />

          {/* File info + metadata preview */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="font-medium text-gray-900 dark:text-white truncate">{item.fileName}</p>
              <span className="text-xs text-gray-400 flex-shrink-0">{formatSize(item.fileSize)}</span>
            </div>

            {/* Metadata preview line */}
            {meta && !meta.error && (
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                {meta.incidentNumber && (
                  <span className="font-mono bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                    {meta.incidentNumber}
                  </span>
                )}
                {meta.severity && (
                  <SeverityBadge severity={meta.severity} />
                )}
                {meta.affectedService && <span>{meta.affectedService}</span>}
                {meta.title && (
                  <span className="truncate max-w-[200px]">{meta.title}</span>
                )}
              </div>
            )}

            {/* Status message */}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{item.statusMessage}</p>
          </div>
        </div>

        {/* Right side: links + expand */}
        <div className="flex items-center gap-3 flex-shrink-0 ml-4">
          {item.incidentId && (
            <Link
              href={`/incidents/${item.incidentId}`}
              onClick={(e) => e.stopPropagation()}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              View Incident →
            </Link>
          )}
          {incidentDeleted && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400">
              <Trash2 className="w-3.5 h-3.5" />
              Incident deleted
            </span>
          )}
          {needsInput && (
            <span className="flex items-center gap-1 text-xs font-medium text-yellow-600 dark:text-yellow-400">
              <MessageSquare className="w-3.5 h-3.5" />
              Input needed
            </span>
          )}
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-gray-200 dark:border-gray-700 px-5 py-4 space-y-4">
          {/* Step progress */}
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
              Processing Steps
            </p>
            <div className="flex items-center gap-1">
              {STEPS.map((step, idx) => {
                const StepIcon = step.icon;
                const isCurrent = step.key === item.currentStep;
                const isDone = idx < stepIdx || item.status === 'completed';
                const isFailed = item.status === 'failed' && isCurrent;

                return (
                  <div key={step.key} className="flex items-center gap-1 flex-1">
                    <div
                      className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-all ${
                        isFailed
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                          : isDone
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : isCurrent
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                      }`}
                    >
                      {isCurrent && !isDone && !isFailed ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : isDone ? (
                        <CheckCircle className="w-3 h-3" />
                      ) : isFailed ? (
                        <XCircle className="w-3 h-3" />
                      ) : (
                        <StepIcon className="w-3 h-3" />
                      )}
                      <span className="hidden sm:inline">{step.label}</span>
                    </div>
                    {idx < STEPS.length - 1 && (
                      <div
                        className={`h-0.5 flex-1 rounded ${
                          idx < stepIdx ? 'bg-green-300 dark:bg-green-700' : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Extracted metadata */}
          {meta && !meta.error && (
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                Extracted Metadata
              </p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <MetaField label="Incident #" value={meta.incidentNumber} />
                <MetaField label="Severity" value={meta.severity} />
                <MetaField label="Affected Service" value={meta.affectedService} />
                <MetaField label="Detected" value={meta.detectedAt ? new Date(meta.detectedAt).toLocaleString() : undefined} />
                <MetaField label="Resolved" value={meta.resolvedAt ? new Date(meta.resolvedAt).toLocaleString() : undefined} />
                <MetaField label="Action Items" value={meta.hasActionItems ? `${meta.actionItemCount || 'Yes'}` : 'None found'} />
                {meta.summary && (
                  <div className="col-span-2">
                    <MetaField label="Summary" value={meta.summary} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Error message + Retry button */}
          {item.errorMessage && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm text-red-700 dark:text-red-400">{item.errorMessage}</p>
                {item.status === 'failed' && (
                  <button
                    onClick={async () => {
                      setRetryingItem(true);
                      try {
                        const res = await fetch(`http://localhost:3001/api/bulk-import/items/${item.id}/retry`, {
                          method: 'POST',
                        });
                        if (res.ok) {
                          onRefresh();
                        }
                      } catch (err) {
                        console.error('Failed to retry item:', err);
                      } finally {
                        setRetryingItem(false);
                      }
                    }}
                    disabled={retryingItem}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 flex-shrink-0"
                  >
                    {retryingItem ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5" />
                    )}
                    Retry
                  </button>
                )}
              </div>
            </div>
          )}

          {/* AI Questions */}
          {needsInput && item.aiQuestions.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-yellow-600 dark:text-yellow-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" />
                AI needs your input
              </p>
              <div className="space-y-3">
                {item.aiQuestions
                  .filter((q) => !q.answered)
                  .map((q) => (
                    <div
                      key={q.id}
                      className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4"
                    >
                      <p className="text-sm text-gray-800 dark:text-gray-200 mb-2">{q.question}</p>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={answers[q.id] || ''}
                          onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSubmitAnswers();
                          }}
                          placeholder="Type your answer…"
                          className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  ))}
                <button
                  onClick={handleSubmitAnswers}
                  disabled={submitting || Object.keys(answers).length === 0}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Submit &amp; Continue
                </button>
              </div>
            </div>
          )}

          {/* Already answered questions */}
          {item.aiQuestions.filter((q) => q.answered).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                Answered Questions
              </p>
              <div className="space-y-2">
                {item.aiQuestions
                  .filter((q) => q.answered)
                  .map((q) => (
                    <div key={q.id} className="text-sm text-gray-600 dark:text-gray-400">
                      <span className="font-medium">Q:</span> {q.question}
                      <br />
                      <span className="font-medium text-green-600 dark:text-green-400">A:</span> {q.answer}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Small helpers ──────────────────────────────────────────────────────────

function ItemStatusIcon({ status, incidentDeleted }: { status: string; incidentDeleted?: boolean }) {
  if (incidentDeleted) {
    return <Trash2 className="w-6 h-6 text-gray-400 flex-shrink-0" />;
  }
  switch (status) {
    case 'completed':
      return <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />;
    case 'failed':
      return <XCircle className="w-6 h-6 text-red-500 flex-shrink-0" />;
    case 'awaiting_input':
      return <MessageSquare className="w-6 h-6 text-yellow-500 flex-shrink-0" />;
    default:
      return <Loader2 className="w-6 h-6 text-blue-500 animate-spin flex-shrink-0" />;
  }
}

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    low: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  };

  return (
    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${colors[severity] || colors.medium}`}>
      {severity}
    </span>
  );
}

function MetaField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-sm text-gray-900 dark:text-white font-medium">
        {value || <span className="text-gray-400 italic">Not found</span>}
      </p>
    </div>
  );
}
