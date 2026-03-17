'use client';

import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { StreamCard } from './StreamCard';
import { AddStreamModal } from './AddStreamModal';
import { AddFindingModal } from './AddFindingModal';
import { RootCauseSummary } from './RootCauseSummary';

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
  incidentId: string;
  name: string;
  streamType: string;
  hypothesis?: string;
  status: string;
  priority: number;
  assignedTo?: User;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  createdBy: User;
  metadata: any;
  tasks: Task[];
  findings: Finding[];
};

interface InvestigationStreamsProps {
  incidentId: string;
  refreshTrigger?: number; // Used to trigger a refresh from parent
}

export function InvestigationStreams({ incidentId, refreshTrigger }: InvestigationStreamsProps) {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddStreamModalOpen, setIsAddStreamModalOpen] = useState(false);
  const [addFindingStreamId, setAddFindingStreamId] = useState<string | null>(null);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);

  useEffect(() => {
    fetchStreams();
    fetchUsers();
  }, [incidentId, refreshTrigger]); // Added refreshTrigger to dependencies

  const fetchStreams = async () => {
    try {
      const response = await fetch(`http://localhost:3001/api/incidents/${incidentId}/streams`);
      if (response.ok) {
        const data = await response.json();
        setStreams(data);
      }
    } catch (error) {
      console.error('Error fetching streams:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/users');
      if (response.ok) {
        const data = await response.json();
        setAvailableUsers(data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleCreateStream = async (data: {
    name: string;
    streamType: string;
    hypothesis: string;
    assignedToId?: string;
  }) => {
    try {
      const response = await fetch(`http://localhost:3001/api/incidents/${incidentId}/streams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        await fetchStreams();
      }
    } catch (error) {
      console.error('Error creating stream:', error);
    }
  };

  const handleUpdateStream = async (streamId: string, updates: any) => {
    try {
      const response = await fetch(
        `http://localhost:3001/api/incidents/${incidentId}/streams/${streamId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        }
      );

      if (response.ok) {
        await fetchStreams();
      }
    } catch (error) {
      console.error('Error updating stream:', error);
    }
  };

  const handleDeleteStream = async (streamId: string) => {
    if (!confirm('Are you sure you want to delete this activity stream?')) {
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:3001/api/incidents/${incidentId}/streams/${streamId}`,
        {
          method: 'DELETE',
        }
      );

      if (response.ok) {
        await fetchStreams();
      }
    } catch (error) {
      console.error('Error deleting stream:', error);
    }
  };

  const handleAddTask = async (
    streamId: string,
    description: string,
    assignedToId?: string
  ) => {
    try {
      const response = await fetch(
        `http://localhost:3001/api/incidents/${incidentId}/streams/${streamId}/tasks`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ description, assignedToId }),
        }
      );

      if (response.ok) {
        await fetchStreams();
      }
    } catch (error) {
      console.error('Error adding task:', error);
    }
  };

  const handleToggleTask = async (streamId: string, taskId: string, completed: boolean) => {
    try {
      const response = await fetch(
        `http://localhost:3001/api/incidents/${incidentId}/streams/${streamId}/tasks/${taskId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ completed: !completed }),
        }
      );

      if (response.ok) {
        await fetchStreams();
      }
    } catch (error) {
      console.error('Error toggling task:', error);
    }
  };

  const handleDeleteTask = async (streamId: string, taskId: string) => {
    try {
      const response = await fetch(
        `http://localhost:3001/api/incidents/${incidentId}/streams/${streamId}/tasks/${taskId}`,
        {
          method: 'DELETE',
        }
      );

      if (response.ok) {
        await fetchStreams();
      }
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const handleAddFinding = async (data: {
    findingType: string;
    content: string;
    metadata: { evidenceLinks?: string[] };
  }) => {
    if (!addFindingStreamId) return;

    try {
      const response = await fetch(
        `http://localhost:3001/api/incidents/${incidentId}/streams/${addFindingStreamId}/findings`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }
      );

      if (response.ok) {
        await fetchStreams();
      }
    } catch (error) {
      console.error('Error adding finding:', error);
    }
  };

  const handleDeleteFinding = async (streamId: string, findingId: string) => {
    if (!confirm('Are you sure you want to delete this finding?')) {
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:3001/api/incidents/${incidentId}/streams/${streamId}/findings/${findingId}`,
        {
          method: 'DELETE',
        }
      );

      if (response.ok) {
        await fetchStreams();
      }
    } catch (error) {
      console.error('Error deleting finding:', error);
    }
  };

  const handleUpdateFinding = async (streamId: string, findingId: string, updates: any) => {
    try {
      const response = await fetch(
        `http://localhost:3001/api/incidents/${incidentId}/streams/${streamId}/findings/${findingId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        }
      );

      if (response.ok) {
        await fetchStreams();
      }
    } catch (error) {
      console.error('Error updating finding:', error);
    }
  };

  const currentStream = streams.find((s) => s.id === addFindingStreamId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Root Cause Summary */}
      <RootCauseSummary streams={streams} />

      {/* Activity Streams */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            Activity Streams
          </h3>
          <button
            onClick={() => setIsAddStreamModalOpen(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Stream
          </button>
        </div>

        {streams.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              No activity streams yet. Create one to start tracking your investigation.
            </p>
            <button
              onClick={() => setIsAddStreamModalOpen(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create First Stream
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {streams.map((stream) => (
              <StreamCard
                key={stream.id}
                stream={stream}
                onUpdateStream={handleUpdateStream}
                onDeleteStream={handleDeleteStream}
                onAddTask={handleAddTask}
                onToggleTask={handleToggleTask}
                onDeleteTask={handleDeleteTask}
                onAddFinding={(streamId) => setAddFindingStreamId(streamId)}
                onDeleteFinding={handleDeleteFinding}
                onUpdateFinding={handleUpdateFinding}
                availableUsers={availableUsers}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <AddStreamModal
        isOpen={isAddStreamModalOpen}
        onClose={() => setIsAddStreamModalOpen(false)}
        onSubmit={handleCreateStream}
        availableUsers={availableUsers}
      />

      <AddFindingModal
        isOpen={addFindingStreamId !== null}
        onClose={() => setAddFindingStreamId(null)}
        onSubmit={handleAddFinding}
        streamName={currentStream?.name || ''}
      />
    </div>
  );
}
