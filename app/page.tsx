'use client';

import Link from "next/link";
import { AlertCircle, BookOpen } from "lucide-react";
import { ThemeToggle } from "./components/ThemeToggle";
import { WatchtowerLogo } from "./components/WatchtowerLogo";
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
              <Link href="/" className="flex items-center gap-3 group">
                <WatchtowerLogo className="h-10 w-10 transition-transform group-hover:scale-105" />
                <h1 className="text-xl font-bold text-text-primary dark:text-white">Watchtower</h1>
              </Link>
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
                className="inline-flex items-center gap-2 px-4 py-2 btn-ing-orange font-semibold rounded-lg shadow-sm"
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
            Vigilant Oversight for Your Infrastructure
          </h2>
          <p className="text-xl text-text-secondary dark:text-gray-300 max-w-2xl mx-auto">
            From the watchtower, observe live incidents, analyze postmortems, and maintain 
            service reliability with AI-powered insights and comprehensive documentation.
          </p>
          <div className="flex items-center justify-center gap-4 pt-4">
            <Link
              href="/incidents"
              className="inline-flex items-center gap-2 px-6 py-3 btn-ing-orange font-semibold rounded-lg shadow-md hover:shadow-lg transition-all"
            >
              <AlertCircle className="w-5 h-5" />
              View Active Incidents
            </Link>
            <Link
              href="/postmortems"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white font-semibold rounded-lg hover:border-gray-400 dark:hover:border-gray-500 transition-all"
            >
              <BookOpen className="w-5 h-5" />
              Browse Postmortems
            </Link>
          </div>
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

        {/* Watchtower Philosophy */}
        <div className="mt-16 text-center max-w-3xl mx-auto">
          <div className="flex justify-center mb-6">
            <WatchtowerLogo className="h-16 w-16" />
          </div>
          <h3 className="text-2xl font-bold text-text-primary dark:text-white mb-4">
            The Watchtower Advantage
          </h3>
          <p className="text-text-secondary dark:text-gray-300 leading-relaxed">
            Like a medieval watchtower providing a commanding view of the landscape, 
            Watchtower gives you complete visibility into your infrastructure. 
            From this vantage point, you can observe incidents as they unfold, 
            analyze patterns from historical data, and maintain vigilant oversight 
            to ensure the reliability and stability of your services.
          </p>
        </div>
      </main>
    </div>
  );
}
