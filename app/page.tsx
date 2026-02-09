'use client';

import Link from "next/link";
import { AlertCircle, BookOpen } from "lucide-react";
import { ThemeToggle } from "./components/ThemeToggle";
import IncidentsDashboard from "./components/IncidentsDashboard";
import PostmortemsDashboard from "./components/PostmortemsDashboard";

export default function Home() {
  return (
    <div className="min-h-screen bg-background dark:bg-gray-900">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-border dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-content mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-bold text-text-primary dark:text-white">SRE Platform</h1>
              <div className="flex space-x-6">
                <Link 
                  href="/incidents" 
                  className="text-sm text-text-secondary dark:text-gray-300 hover:text-text-primary dark:hover:text-white transition-colors"
                >
                  Incidents
                </Link>
                <Link 
                  href="/postmortems" 
                  className="text-sm text-text-secondary dark:text-gray-300 hover:text-text-primary dark:hover:text-white transition-colors"
                >
                  Postmortems
                </Link>
                <Link 
                  href="/runbooks" 
                  className="text-sm text-text-secondary dark:text-gray-300 hover:text-text-primary dark:hover:text-white transition-colors"
                >
                  Runbooks
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Link
                href="/incidents/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-status-critical text-white font-semibold rounded-lg hover:bg-red-600 transition-colors shadow-sm"
              >
                <AlertCircle className="w-4 h-4" />
                Declare Major Incident
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-content mx-auto px-8 py-12">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-5xl font-bold text-text-primary dark:text-white">
            Incident Management, Simplified
          </h2>
          <p className="text-xl text-text-secondary dark:text-gray-300 max-w-2xl mx-auto">
            AI-powered incident management, postmortems, and service runbooks.
            Respond faster, learn from incidents, and improve reliability.
          </p>
        </div>

        {/* Platform Analytics Dashboards */}
        <div className="space-y-12 mb-16">
          <div>
            <h2 className="text-2xl font-bold text-text-primary dark:text-white mb-6">
              Platform Analytics
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <IncidentsDashboard />
              <PostmortemsDashboard />
            </div>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-text-primary dark:text-white mb-6">
            Key Features
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg p-6 text-left space-y-3">
            <div className="w-12 h-12 bg-status-critical/10 dark:bg-status-critical/20 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-status-critical" />
            </div>
            <h3 className="text-lg font-semibold text-text-primary dark:text-white">
              Incident Management
            </h3>
            <p className="text-sm text-text-secondary dark:text-gray-300">
              Declare, track, and resolve incidents with real-time collaboration
              and structured workflows.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg p-6 text-left space-y-3">
            <div className="w-12 h-12 bg-status-info/10 dark:bg-status-info/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-status-info" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-text-primary dark:text-white">
              AI-Powered Postmortems
            </h3>
            <p className="text-sm text-text-secondary dark:text-gray-300">
              Automatically generate comprehensive postmortems from incident data
              with AI assistance and quality checks.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg p-6 text-left space-y-3">
            <div className="w-12 h-12 bg-accent-purple/10 dark:bg-accent-purple/20 rounded-lg flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-accent-purple" />
            </div>
            <h3 className="text-lg font-semibold text-text-primary dark:text-white">
              Service Runbooks
            </h3>
            <p className="text-sm text-text-secondary dark:text-gray-300">
              Centralized repository of service documentation, monitoring links,
              and troubleshooting procedures.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
