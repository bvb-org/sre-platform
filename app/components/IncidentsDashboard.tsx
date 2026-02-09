'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';

interface IncidentAnalytics {
  past7Days: {
    opened: number;
    active: number;
    resolved: number;
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
  resolvedPast7Days: {
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
    opened: number;
    resolved: number;
  }>;
  recentActive: Array<{
    id: number;
    incidentNumber: string;
    title: string;
    severity: string;
    status: string;
    createdAt: string;
  }>;
  recentResolved: Array<{
    id: number;
    incidentNumber: string;
    title: string;
    severity: string;
    status: string;
    createdAt: string;
    resolvedAt: string;
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

const getSeverityBg = (severity: string) => {
  switch (severity) {
    case 'critical':
      return 'bg-status-critical/10 dark:bg-status-critical/20';
    case 'high':
      return 'bg-orange-500/10 dark:bg-orange-500/20';
    case 'medium':
      return 'bg-yellow-500/10 dark:bg-yellow-500/20';
    case 'low':
      return 'bg-blue-500/10 dark:bg-blue-500/20';
    default:
      return 'bg-gray-500/10 dark:bg-gray-500/20';
  }
};

export default function IncidentsDashboard() {
  const [analytics, setAnalytics] = useState<IncidentAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/analytics/incidents');
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
        <p className="text-status-critical">Error loading incident analytics</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-status-critical/10 dark:bg-status-critical/20 rounded-lg flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-status-critical" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-text-primary dark:text-white">
              Major Incidents
            </h2>
            <p className="text-sm text-text-secondary dark:text-gray-400">
              Past 7 days overview
            </p>
          </div>
        </div>
        <Link
          href="/incidents"
          className="text-sm text-status-info hover:text-blue-600 dark:hover:text-blue-400 font-medium"
        >
          View All →
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Active Incidents */}
        <div className="bg-white dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-text-secondary dark:text-gray-400 uppercase tracking-wide">
                Active & Ongoing
              </h3>
              <span className="text-2xl font-bold text-status-critical">
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

            {/* Recent Active Incidents */}
            {analytics.recentActive.length > 0 && (
              <div className="pt-4 border-t border-border dark:border-gray-700">
                <h4 className="text-xs font-semibold text-text-secondary dark:text-gray-400 uppercase tracking-wide mb-3">
                  Recent Active
                </h4>
                <div className="space-y-2">
                  {analytics.recentActive.slice(0, 3).map((incident) => (
                    <Link
                      key={incident.id}
                      href={`/incidents/${incident.id}`}
                      className="block p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-primary dark:text-white truncate">
                            {incident.incidentNumber}
                          </p>
                          <p className="text-xs text-text-secondary dark:text-gray-400 truncate">
                            {incident.title}
                          </p>
                        </div>
                        <span className={`text-xs font-semibold ${getSeverityColor(incident.severity)} capitalize`}>
                          {incident.severity}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Resolved Incidents (Past 7 Days) */}
        <div className="bg-white dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-text-secondary dark:text-gray-400 uppercase tracking-wide">
                Resolved (7 Days)
              </h3>
              <span className="text-2xl font-bold text-status-success">
                {analytics.resolvedPast7Days.total}
              </span>
            </div>
            
            {/* Severity Breakdown */}
            <div className="space-y-2">
              {analytics.resolvedPast7Days.bySeverity.critical > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary dark:text-gray-400">Critical</span>
                  <span className="font-semibold text-status-critical">
                    {analytics.resolvedPast7Days.bySeverity.critical}
                  </span>
                </div>
              )}
              {analytics.resolvedPast7Days.bySeverity.high > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary dark:text-gray-400">High</span>
                  <span className="font-semibold text-orange-500">
                    {analytics.resolvedPast7Days.bySeverity.high}
                  </span>
                </div>
              )}
              {analytics.resolvedPast7Days.bySeverity.medium > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary dark:text-gray-400">Medium</span>
                  <span className="font-semibold text-yellow-500">
                    {analytics.resolvedPast7Days.bySeverity.medium}
                  </span>
                </div>
              )}
              {analytics.resolvedPast7Days.bySeverity.low > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary dark:text-gray-400">Low</span>
                  <span className="font-semibold text-blue-500">
                    {analytics.resolvedPast7Days.bySeverity.low}
                  </span>
                </div>
              )}
            </div>

            {/* Recent Resolved Incidents */}
            {analytics.recentResolved.length > 0 && (
              <div className="pt-4 border-t border-border dark:border-gray-700">
                <h4 className="text-xs font-semibold text-text-secondary dark:text-gray-400 uppercase tracking-wide mb-3">
                  Recently Resolved
                </h4>
                <div className="space-y-2">
                  {analytics.recentResolved.slice(0, 3).map((incident) => (
                    <Link
                      key={incident.id}
                      href={`/incidents/${incident.id}`}
                      className="block p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-primary dark:text-white truncate">
                            {incident.incidentNumber}
                          </p>
                          <p className="text-xs text-text-secondary dark:text-gray-400 truncate">
                            {incident.title}
                          </p>
                        </div>
                        <span className={`text-xs font-semibold ${getSeverityColor(incident.severity)} capitalize`}>
                          {incident.severity}
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
              <TrendingUp className="w-5 h-5 text-status-critical" />
              <span className="text-3xl font-bold text-text-primary dark:text-white">
                {analytics.past7Days.opened}
              </span>
            </div>
            <p className="text-sm text-text-secondary dark:text-gray-400">Opened</p>
          </div>
          <div className="h-12 w-px bg-border dark:bg-gray-700"></div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <TrendingDown className="w-5 h-5 text-status-success" />
              <span className="text-3xl font-bold text-text-primary dark:text-white">
                {analytics.past7Days.resolved}
              </span>
            </div>
            <p className="text-sm text-text-secondary dark:text-gray-400">Resolved</p>
          </div>
        </div>
      </div>
    </div>
  );
}
