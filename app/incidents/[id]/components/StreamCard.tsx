'use client';

import { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  UserPlus,
  Link as LinkIcon,
  CheckCircle,
  AlertCircle,
  Circle,
  XCircle,
  Clock,
} from 'lucide-react';

type User = {
  id: string;
  name: string;
  email: string;
};

type Task = {
  id: string;
  description: string;
  completed: boolean;
  orderIndex: number;
  createdAt: string;
  completedAt?: string;
  assignedTo?: User;
  completedBy?: User;
};

type Finding = {
  id: string;
  findingType: string;
  content: string;
  createdAt: string;
  metadata: {
    evidenceLinks?: string[];
  };
  createdBy: User;
};

type Stream = {
  id: string;
  name: string;
  streamType: string;
  hypothesis?: string;
  status: string;
  assignedTo?: User;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  tasks: Task[];
  findings: Finding[];
};

interface StreamCardProps {
  stream: Stream;
  onUpdateStream: (streamId: string, updates: any) => Promise<void>;
  onDeleteStream: (streamId: string) => Promise<void>;
  onAddTask: (streamId: string, description: string, assignedToId?: string) => Promise<void>;
  onToggleTask: (streamId: string, taskId: string, completed: boolean) => Promise<void>;
  onDeleteTask: (streamId: string, taskId: string) => Promise<void>;
  onAddFinding: (streamId: string) => void;
  onDeleteFinding: (streamId: string, findingId: string) => Promise<void>;
  onUpdateFinding: (streamId: string, findingId: string, updates: any) => Promise<void>;
  availableUsers: User[];
}

const statusConfig = {
  active: {
    icon: Circle,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-500',
    label: 'Active',
  },
  blocked: {
    icon: Clock,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-900/20',
    borderColor: 'border-amber-500',
    label: 'Blocked',
  },
  ruled_out: {
    icon: XCircle,
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-50 dark:bg-gray-900/20',
    borderColor: 'border-gray-500',
    label: 'Ruled Out',
  },
  proposed_root_cause: {
    icon: AlertCircle,
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    borderColor: 'border-orange-500',
    label: 'Proposed Root Cause',
  },
  root_cause_found: {
    icon: CheckCircle,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    borderColor: 'border-green-500',
    label: 'Root Cause Confirmed',
  },
  completed: {
    icon: CheckCircle,
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-50 dark:bg-gray-900/20',
    borderColor: 'border-gray-500',
    label: 'Completed',
  },
};

const findingTypeConfig = {
  observation: {
    label: 'Observation',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800'
  },
  proposed_root_cause: {
    label: 'Proposed Root Cause',
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    borderColor: 'border-orange-200 dark:border-orange-800'
  },
  root_cause: {
    label: 'Root Cause',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-red-200 dark:border-red-800'
  },
  ruled_out: {
    label: 'Ruled Out',
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-50 dark:bg-gray-900/20',
    borderColor: 'border-gray-200 dark:border-gray-700'
  },
};

export function StreamCard({
  stream,
  onUpdateStream,
  onDeleteStream,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  onAddFinding,
  onDeleteFinding,
  onUpdateFinding,
  availableUsers,
}: StreamCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [assigningTaskId, setAssigningTaskId] = useState<string | null>(null);

  const config = statusConfig[stream.status as keyof typeof statusConfig] || statusConfig.active;
  const StatusIcon = config.icon;

  const handleAddTask = async () => {
    if (!newTaskDescription.trim()) return;

    await onAddTask(stream.id, newTaskDescription.trim());
    setNewTaskDescription('');
    setIsAddingTask(false);
  };

  const handleAssignTask = async (taskId: string, userId: string) => {
    await onToggleTask(stream.id, taskId, false); // This will be updated to handle assignment
    setAssigningTaskId(null);
  };

  const handleStatusChange = async (newStatus: string) => {
    await onUpdateStream(stream.id, { status: newStatus });
  };

  return (
    <div
      className={`border-l-4 ${config.borderColor} ${config.bgColor} rounded-lg overflow-hidden transition-all ${
        stream.status === 'ruled_out' ? 'opacity-70' : ''
      }`}
    >
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <StatusIcon className={`w-4 h-4 ${config.color} flex-shrink-0`} />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {stream.name}
              </h3>
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded ${config.bgColor} ${config.color} border ${config.borderColor}`}
              >
                {config.label}
              </span>
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              {stream.assignedTo && (
                <div className="flex items-center gap-1">
                  <div className="w-5 h-5 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
                      {stream.assignedTo.name.charAt(0)}
                    </span>
                  </div>
                  <span>{stream.assignedTo.name}</span>
                </div>
              )}
              {stream.startedAt && (
                <span>
                  Started{' '}
                  {new Date(stream.startedAt).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              {isExpanded ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Hypothesis */}
        {stream.hypothesis && isExpanded && (
          <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Hypothesis:
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">{stream.hypothesis}</p>
          </div>
        )}
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Tasks */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                Tasks
              </h4>
              {!isAddingTask && (
                <button
                  onClick={() => setIsAddingTask(true)}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Task
                </button>
              )}
            </div>

            <div className="space-y-2">
              {stream.tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-start gap-3 p-2 rounded hover:bg-white dark:hover:bg-gray-800 transition-colors group"
                >
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => onToggleTask(stream.id, task.id, task.completed)}
                    className="mt-1 w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm ${
                        task.completed
                          ? 'text-gray-500 dark:text-gray-500 line-through'
                          : 'text-gray-900 dark:text-white'
                      }`}
                    >
                      {task.description}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {task.assignedTo && (
                        <div className="flex items-center gap-1">
                          <div className="w-4 h-4 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                            <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
                              {task.assignedTo.name.charAt(0)}
                            </span>
                          </div>
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            {task.assignedTo.name}
                          </span>
                        </div>
                      )}
                      {task.completedAt && (
                        <span className="text-xs text-gray-500 dark:text-gray-500">
                          {new Date(task.completedAt).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => onDeleteTask(stream.id, task.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {isAddingTask && (
                <div className="p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                  <input
                    type="text"
                    value={newTaskDescription}
                    onChange={(e) => setNewTaskDescription(e.target.value)}
                    placeholder="Enter task description..."
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 mb-2"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleAddTask();
                      } else if (e.key === 'Escape') {
                        setIsAddingTask(false);
                        setNewTaskDescription('');
                      }
                    }}
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleAddTask}
                      className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => {
                        setIsAddingTask(false);
                        setNewTaskDescription('');
                      }}
                      className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {stream.tasks.length === 0 && !isAddingTask && (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic text-center py-2">
                  No tasks yet
                </p>
              )}
            </div>
          </div>

          {/* Findings */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                Findings ({stream.findings.length})
              </h4>
              <button
                onClick={() => onAddFinding(stream.id)}
                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Finding
              </button>
            </div>

            <div className="space-y-2">
              {stream.findings.map((finding) => {
                const findingConfig =
                  findingTypeConfig[finding.findingType as keyof typeof findingTypeConfig] ||
                  findingTypeConfig.observation;

                return (
                  <div
                    key={finding.id}
                    className={`p-3 bg-white dark:bg-gray-800 rounded border ${findingConfig.borderColor} group`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${findingConfig.bgColor} ${findingConfig.color} border ${findingConfig.borderColor}`}>
                        {findingConfig.label}
                      </span>
                      <button
                        onClick={() => onDeleteFinding(stream.id, finding.id)}
                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <p className="text-sm text-gray-900 dark:text-gray-100 mb-2">
                      {finding.content}
                    </p>

                    {finding.metadata?.evidenceLinks &&
                      finding.metadata.evidenceLinks.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2">
                          {finding.metadata.evidenceLinks.map((link, index) => (
                            <a
                              key={index}
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                            >
                              <LinkIcon className="w-3 h-3" />
                              Evidence
                            </a>
                          ))}
                        </div>
                      )}

                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
                        <span>{finding.createdBy.name}</span>
                        <span>•</span>
                        <span>
                          {new Date(finding.createdAt).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      
                      {/* Finding-level actions for root cause identification */}
                      {finding.findingType === 'observation' && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => onUpdateFinding(stream.id, finding.id, { findingType: 'proposed_root_cause' })}
                            className="px-2 py-1 text-xs font-medium text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-900/20 rounded hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
                            title="Mark as proposed root cause"
                          >
                            Propose Root Cause
                          </button>
                        </div>
                      )}
                      
                      {finding.findingType === 'proposed_root_cause' && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => onUpdateFinding(stream.id, finding.id, { findingType: 'root_cause' })}
                            className="px-2 py-1 text-xs font-medium text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 rounded hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                            title="Confirm as root cause"
                          >
                            Confirm Root Cause
                          </button>
                          <button
                            onClick={() => onUpdateFinding(stream.id, finding.id, { findingType: 'observation' })}
                            className="px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            title="Revert to observation"
                          >
                            Un-propose
                          </button>
                        </div>
                      )}
                      
                      {finding.findingType === 'root_cause' && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => onUpdateFinding(stream.id, finding.id, { findingType: 'proposed_root_cause' })}
                            className="px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            title="Revert to proposed"
                          >
                            Unconfirm
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {stream.findings.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic text-center py-2">
                  No findings yet
                </p>
              )}
            </div>
          </div>

          {/* Stream Actions - Investigation Progress Only */}
          <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-wrap gap-2">
              {stream.status === 'active' && (
                <>
                  <button
                    onClick={() => handleStatusChange('ruled_out')}
                    className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Rule Out
                  </button>
                  <button
                    onClick={() => handleStatusChange('blocked')}
                    className="px-3 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/30 rounded hover:bg-amber-200 dark:hover:bg-amber-900/40 transition-colors"
                  >
                    Mark as Blocked
                  </button>
                  <button
                    onClick={() => handleStatusChange('completed')}
                    className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Complete Stream
                  </button>
                </>
              )}

              {stream.status === 'blocked' && (
                <>
                  <button
                    onClick={() => handleStatusChange('active')}
                    className="px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30 rounded hover:bg-blue-200 dark:hover:bg-blue-900/40 transition-colors"
                  >
                    Unblock Stream
                  </button>
                  <button
                    onClick={() => handleStatusChange('completed')}
                    className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Complete Stream
                  </button>
                </>
              )}

              {stream.status === 'ruled_out' && (
                <button
                  onClick={() => handleStatusChange('active')}
                  className="px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30 rounded hover:bg-blue-200 dark:hover:bg-blue-900/40 transition-colors"
                >
                  Reopen Stream
                </button>
              )}

              {stream.status === 'completed' && (
                <button
                  onClick={() => handleStatusChange('active')}
                  className="px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30 rounded hover:bg-blue-200 dark:hover:bg-blue-900/40 transition-colors"
                >
                  Reopen Stream
                </button>
              )}

              <button
                onClick={() => onDeleteStream(stream.id)}
                className="px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30 rounded hover:bg-red-200 dark:hover:bg-red-900/40 transition-colors ml-auto"
              >
                Delete Stream
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
