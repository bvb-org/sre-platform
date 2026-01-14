'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { AlertCircle, X } from 'lucide-react';

const incidentSchema = z.object({
  incidentNumber: z.string().min(1, 'Incident number is required'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  severity: z.enum(['major', 'preemptive_major']),
  incidentLead: z.string().min(1, 'Incident lead is required'),
});

type IncidentFormData = z.infer<typeof incidentSchema>;

export default function NewIncidentPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<IncidentFormData>({
    resolver: zodResolver(incidentSchema),
    defaultValues: {
      severity: 'major',
      incidentLead: 'Manager on Duty', // Auto-populate for demo
    },
  });

  const onSubmit = async (data: IncidentFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/incidents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create incident');
      }

      const incident = await response.json();
      router.push(`/incidents/${incident.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border bg-white">
        <div className="max-w-content mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <Link href="/" className="text-xl font-bold text-text-primary">
                SRE Platform
              </Link>
              <div className="flex space-x-6">
                <Link
                  href="/incidents"
                  className="text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                  Incidents
                </Link>
                <Link
                  href="/runbooks"
                  className="text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                  Runbooks
                </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-8 py-12">
        <div className="bg-white border border-border rounded-lg shadow-sm">
          {/* Header */}
          <div className="border-b border-border px-8 py-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-status-critical/10 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-status-critical" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-text-primary">
                  Declare Major Incident
                </h1>
                <p className="text-sm text-text-secondary mt-1">
                  Create a new incident to track and manage the response
                </p>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="px-8 py-6 space-y-6">
            {error && (
              <div className="bg-status-critical/10 border border-status-critical/20 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-status-critical flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-status-critical font-medium">
                    Error creating incident
                  </p>
                  <p className="text-sm text-status-critical/80 mt-1">{error}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="text-status-critical/60 hover:text-status-critical"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Incident Number */}
            <div>
              <label
                htmlFor="incidentNumber"
                className="block text-sm font-medium text-text-primary mb-2"
              >
                Incident Number <span className="text-status-critical">*</span>
              </label>
              <input
                {...register('incidentNumber')}
                type="text"
                id="incidentNumber"
                placeholder="INC-XXXXXX (from ServiceNow)"
                className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-status-info focus:border-transparent"
              />
              {errors.incidentNumber && (
                <p className="mt-1 text-sm text-status-critical">
                  {errors.incidentNumber.message}
                </p>
              )}
            </div>

            {/* Title */}
            <div>
              <label
                htmlFor="title"
                className="block text-sm font-medium text-text-primary mb-2"
              >
                Title <span className="text-status-critical">*</span>
              </label>
              <input
                {...register('title')}
                type="text"
                id="title"
                placeholder="Brief description of the incident"
                className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-status-info focus:border-transparent"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-status-critical">
                  {errors.title.message}
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-text-primary mb-2"
              >
                Short Description <span className="text-status-critical">*</span>
              </label>
              <textarea
                {...register('description')}
                id="description"
                rows={4}
                placeholder="What is happening? What services are affected?"
                className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-status-info focus:border-transparent resize-none"
              />
              {errors.description && (
                <p className="mt-1 text-sm text-status-critical">
                  {errors.description.message}
                </p>
              )}
            </div>

            {/* Severity */}
            <div>
              <label
                htmlFor="severity"
                className="block text-sm font-medium text-text-primary mb-2"
              >
                Severity <span className="text-status-critical">*</span>
              </label>
              <select
                {...register('severity')}
                id="severity"
                className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-status-info focus:border-transparent"
              >
                <option value="major">Major</option>
                <option value="preemptive_major">Preemptive Major</option>
              </select>
              {errors.severity && (
                <p className="mt-1 text-sm text-status-critical">
                  {errors.severity.message}
                </p>
              )}
            </div>

            {/* Incident Lead */}
            <div>
              <label
                htmlFor="incidentLead"
                className="block text-sm font-medium text-text-primary mb-2"
              >
                Incident Lead <span className="text-status-critical">*</span>
              </label>
              <input
                {...register('incidentLead')}
                type="text"
                id="incidentLead"
                placeholder="Manager on Duty"
                className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-status-info focus:border-transparent"
              />
              {errors.incidentLead && (
                <p className="mt-1 text-sm text-status-critical">
                  {errors.incidentLead.message}
                </p>
              )}
              <p className="mt-1 text-xs text-text-secondary">
                Auto-populated with current Manager on Duty
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
              <Link
                href="/"
                className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 bg-status-critical text-white font-semibold rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Creating...' : 'Declare Incident'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
