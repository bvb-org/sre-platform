'use client';

import { AlertCircle, CheckCircle } from 'lucide-react';

type Finding = {
  id: string;
  findingType: string;
  content: string;
  createdAt: string;
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
};

type Stream = {
  id: string;
  name: string;
  status: string;
  findings: Finding[];
};

interface RootCauseSummaryProps {
  streams: Stream[];
}

export function RootCauseSummary({ streams }: RootCauseSummaryProps) {
  // Collect ALL findings that are proposed or confirmed root causes
  const rootCauseFindings: Array<Finding & { streamName: string; streamId: string }> = [];
  
  streams.forEach((stream) => {
    stream.findings.forEach((finding) => {
      if (finding.findingType === 'proposed_root_cause' || finding.findingType === 'root_cause') {
        rootCauseFindings.push({
          ...finding,
          streamName: stream.name,
          streamId: stream.id,
        });
      }
    });
  });

  if (rootCauseFindings.length === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">
          Root Cause Summary
        </h3>
      </div>

      <div className="space-y-4">
        {rootCauseFindings.map((finding) => {
          const isConfirmed = finding.findingType === 'root_cause';

          return (
            <div
              key={finding.id}
              className={`p-4 rounded-lg border-l-4 ${
                isConfirmed
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-500'
                  : 'bg-orange-50 dark:bg-orange-900/20 border-orange-500'
              }`}
            >
              <div className="flex items-start gap-3">
                {isConfirmed ? (
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded ${
                        isConfirmed
                          ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                          : 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300'
                      }`}
                    >
                      {isConfirmed ? 'ROOT CAUSE CONFIRMED' : 'PROPOSED ROOT CAUSE'}
                    </span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {finding.streamName}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                    {finding.content}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
                    <span>
                      {isConfirmed ? 'Confirmed' : 'Proposed'} by{' '}
                      {finding.createdBy.name}
                    </span>
                    <span>•</span>
                    <span>
                      {new Date(finding.createdAt).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
