'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileText, TrendingUp, TrendingDown } from 'lucide-react';

interface PostmortemAnalytics {
  past7Days: {
    created: number;
    draft: number;
    published: number;
  };
  currentlyActive: {
    total: number;
    bySeverity: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
  };
  publishedPast7Days: {
    total: number;
    bySeverity: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
  };
  trend: Array<{
    date: string;
    created: number;
    published: number;
  }>;
  recentActive: Array<{
    id: number;
    incidentId: number;
    incidentNumber: string;
    incidentTitle: string;
    incidentSeverity: string;
    status: string;
    createdAt: string;
  }>;
  recentPublished: Array<{
    id: number;
    incidentId: number;
    incidentNumber: string;
    incidentTitle: string;
    incidentSeverity: string;
    status: string;
    createdAt: string;
    publishedAt: string;
  }>;
}

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'critical':
      return 'text-status-critical';
    case 'high':
      return 'text-orange-500';
    case 'medium':
      return 'text-yellow-500';
    case 'low':
      return 'text-blue-500';
    default:
      return 'text-gray-500';
  }
};

export default function PostmortemsDashboard() {
  const [analytics, setAnalytics] = useState<PostmortemAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/analytics/postmortems');
        if (!response.ok) throw new Error('Failed to fetch analytics');
        const data = await response.json();
        setAnalytics(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg p-6">
        <p className="text-status-critical">Error loading postmortem analytics</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-status-info/10 dark:bg-status-info/20 rounded-lg flex items-center justify-center">
            <FileText className="w-5 h-5 text-status-info" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-text-primary dark:text-white">
              Post-Mortems
            </h2>
            <p className="text-sm text-text-secondary dark:text-gray-400">
              Past 7 days overview
            </p>
          </div>
        </div>
        <Link
          href="/postmortems"
          className="text-sm text-status-info hover:text-blue-600 dark:hover:text-blue-400 font-medium"
        >
          View All →
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Active (Draft) Postmortems */}
        <div className="bg-white dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-text-secondary dark:text-gray-400 uppercase tracking-wide">
                Active & Ongoing
              </h3>
              <span className="text-2xl font-bold text-status-warning">
                {analytics.currentlyActive.total}
              </span>
            </div>
            
            {/* Severity Breakdown */}
            <div className="space-y-2">
              {analytics.currentlyActive.bySeverity.critical > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary dark:text-gray-400">Critical</span>
                  <span className="font-semibold text-status-critical">
                    {analytics.currentlyActive.bySeverity.critical}
                  </span>
                </div>
              )}
              {analytics.currentlyActive.bySeverity.high > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary dark:text-gray-400">High</span>
                  <span className="font-semibold text-orange-500">
                    {analytics.currentlyActive.bySeverity.high}
                  </span>
                </div>
              )}
              {analytics.currentlyActive.bySeverity.medium > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary dark:text-gray-400">Medium</span>
                  <span className="font-semibold text-yellow-500">
                    {analytics.currentlyActive.bySeverity.medium}
                  </span>
                </div>
              )}
              {analytics.currentlyActive.bySeverity.low > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary dark:text-gray-400">Low</span>
                  <span className="font-semibold text-blue-500">
                    {analytics.currentlyActive.bySeverity.low}
                  </span>
                </div>
              )}
            </div>

            {/* Recent Active Postmortems */}
            {analytics.recentActive.length > 0 && (
              <div className="pt-4 border-t border-border dark:border-gray-700">
                <h4 className="text-xs font-semibold text-text-secondary dark:text-gray-400 uppercase tracking-wide mb-3">
                  Recent Drafts
                </h4>
                <div className="space-y-2">
                  {analytics.recentActive.slice(0, 3).map((postmortem) => (
                    <Link
                      key={postmortem.id}
                      href={`/incidents/${postmortem.incidentId}`}
                      className="block p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-primary dark:text-white truncate">
                            {postmortem.incidentNumber}
                          </p>
                          <p className="text-xs text-text-secondary dark:text-gray-400 truncate">
                            {postmortem.incidentTitle}
                          </p>
                        </div>
                        <span className={`text-xs font-semibold ${getSeverityColor(postmortem.incidentSeverity)} capitalize`}>
                          {postmortem.incidentSeverity}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Published Postmortems (Past 7 Days) */}
        <div className="bg-white dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-text-secondary dark:text-gray-400 uppercase tracking-wide">
                Published (7 Days)
              </h3>
              <span className="text-2xl font-bold text-status-success">
                {analytics.publishedPast7Days.total}
              </span>
            </div>
            
            {/* Severity Breakdown */}
            <div className="space-y-2">
              {analytics.publishedPast7Days.bySeverity.critical > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary dark:text-gray-400">Critical</span>
                  <span className="font-semibold text-status-critical">
                    {analytics.publishedPast7Days.bySeverity.critical}
                  </span>
                </div>
              )}
              {analytics.publishedPast7Days.bySeverity.high > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary dark:text-gray-400">High</span>
                  <span className="font-semibold text-orange-500">
                    {analytics.publishedPast7Days.bySeverity.high}
                  </span>
                </div>
              )}
              {analytics.publishedPast7Days.bySeverity.medium > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary dark:text-gray-400">Medium</span>
                  <span className="font-semibold text-yellow-500">
                    {analytics.publishedPast7Days.bySeverity.medium}
                  </span>
                </div>
              )}
              {analytics.publishedPast7Days.bySeverity.low > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary dark:text-gray-400">Low</span>
                  <span className="font-semibold text-blue-500">
                    {analytics.publishedPast7Days.bySeverity.low}
                  </span>
                </div>
              )}
            </div>

            {/* Recent Published Postmortems */}
            {analytics.recentPublished.length > 0 && (
              <div className="pt-4 border-t border-border dark:border-gray-700">
                <h4 className="text-xs font-semibold text-text-secondary dark:text-gray-400 uppercase tracking-wide mb-3">
                  Recently Published
                </h4>
                <div className="space-y-2">
                  {analytics.recentPublished.slice(0, 3).map((postmortem) => (
                    <Link
                      key={postmortem.id}
                      href={`/incidents/${postmortem.incidentId}`}
                      className="block p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-primary dark:text-white truncate">
                            {postmortem.incidentNumber}
                          </p>
                          <p className="text-xs text-text-secondary dark:text-gray-400 truncate">
                            {postmortem.incidentTitle}
                          </p>
                        </div>
                        <span className={`text-xs font-semibold ${getSeverityColor(postmortem.incidentSeverity)} capitalize`}>
                          {postmortem.incidentSeverity}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Simplified Trend */}
      <div className="bg-white dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg p-6">
        <h3 className="text-sm font-semibold text-text-secondary dark:text-gray-400 uppercase tracking-wide mb-4">
          7-Day Trend
        </h3>
        <div className="flex items-center justify-around">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-status-warning" />
              <span className="text-3xl font-bold text-text-primary dark:text-white">
                {analytics.past7Days.created}
              </span>
            </div>
            <p className="text-sm text-text-secondary dark:text-gray-400">Created</p>
          </div>
          <div className="h-12 w-px bg-border dark:bg-gray-700"></div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <TrendingDown className="w-5 h-5 text-status-success" />
              <span className="text-3xl font-bold text-text-primary dark:text-white">
                {analytics.past7Days.published}
              </span>
            </div>
            <p className="text-sm text-text-secondary dark:text-gray-400">Published</p>
          </div>
        </div>
      </div>
    </div>
  );
}
