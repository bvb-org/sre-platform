'use client';

import { Clock, CheckCircle, AlertTriangle, Shield, XCircle } from 'lucide-react';
import { formatRelativeTime, formatDuration } from '@/lib/utils';

type IncidentTimelineProps = {
  detectedAt: string;
  mitigatedAt?: string;
  resolvedAt?: string;
  closedAt?: string;
};

export function IncidentTimeline({ detectedAt, mitigatedAt, resolvedAt, closedAt }: IncidentTimelineProps) {
  const detectedDate = new Date(detectedAt);
  const mitigatedDate = mitigatedAt ? new Date(mitigatedAt) : null;
  const resolvedDate = resolvedAt ? new Date(resolvedAt) : null;
  const closedDate = closedAt ? new Date(closedAt) : null;

  // Calculate total duration - use closed date if available, otherwise resolved, otherwise ongoing
  const totalDuration = closedDate
    ? formatDuration(detectedDate, closedDate)
    : resolvedDate
    ? formatDuration(detectedDate, resolvedDate)
    : formatDuration(detectedDate, undefined);

  // Calculate progress percentage for the progress bar
  const getProgressPercentage = () => {
    if (closedDate) return 100;
    if (resolvedDate) return 75;
    if (mitigatedDate) return 50;
    return 25;
  };

  // Timeline stages
  const stages = [
    {
      label: 'Detected',
      timestamp: detectedAt,
      icon: AlertTriangle,
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-500',
      borderColor: 'border-yellow-500',
      completed: true,
    },
    {
      label: 'Mitigated',
      timestamp: mitigatedAt,
      icon: Shield,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-500',
      borderColor: 'border-blue-500',
      completed: !!mitigatedAt,
    },
    {
      label: 'Resolved',
      timestamp: resolvedAt,
      icon: CheckCircle,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-500',
      borderColor: 'border-green-500',
      completed: !!resolvedAt,
    },
    {
      label: 'Closed',
      timestamp: closedAt,
      icon: XCircle,
      color: 'text-gray-600 dark:text-gray-400',
      bgColor: 'bg-gray-500',
      borderColor: 'border-gray-500',
      completed: !!closedAt,
    },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Incident Timeline
        </h3>
        <div className="text-xs text-gray-600 dark:text-gray-400">
          <span className="font-medium">Total Duration:</span> {totalDuration}
        </div>
      </div>

      {/* Compact Timeline visualization */}
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute top-3 left-3 right-3 h-0.5 bg-gray-200 dark:bg-gray-700" />
        
        {/* Progress line */}
        <div
          className="absolute top-3 left-3 h-0.5 transition-all duration-500"
          style={{
            width: `${getProgressPercentage()}%`,
            background: closedDate
              ? 'linear-gradient(to right, #eab308, #3b82f6, #22c55e, #6b7280)'
              : resolvedDate
              ? 'linear-gradient(to right, #eab308, #3b82f6, #22c55e)'
              : mitigatedDate
              ? 'linear-gradient(to right, #eab308, #3b82f6)'
              : 'linear-gradient(to right, #eab308, #eab308)'
          }}
        />

        {/* Timeline stages */}
        <div className="relative flex justify-between">
          {stages.map((stage) => {
            const Icon = stage.icon;
            return (
              <div key={stage.label} className="flex flex-col items-center" style={{ width: '25%' }}>
                {/* Compact Icon circle */}
                <div
                  className={`relative z-10 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                    stage.completed
                      ? `${stage.bgColor} border-transparent`
                      : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600'
                  }`}
                >
                  <Icon
                    className={`w-3.5 h-3.5 ${
                      stage.completed ? 'text-white' : 'text-gray-400 dark:text-gray-500'
                    }`}
                  />
                </div>

                {/* Compact Label */}
                <div className="mt-2 text-center">
                  <div
                    className={`text-xs font-semibold ${
                      stage.completed
                        ? 'text-gray-900 dark:text-white'
                        : 'text-gray-400 dark:text-gray-500'
                    }`}
                  >
                    {stage.label}
                  </div>
                  
                  {/* Timestamp */}
                  {stage.timestamp && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {formatRelativeTime(stage.timestamp)}
                    </div>
                  )}
                  
                  {/* Pending indicator */}
                  {!stage.completed && (
                    <div className="text-xs text-gray-400 dark:text-gray-500 italic mt-0.5">
                      Pending
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
