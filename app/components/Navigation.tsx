'use client';

import Link from 'next/link';
import { AlertCircle } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { WatchtowerLogo } from './WatchtowerLogo';

type NavigationProps = {
  activePage?: 'incidents' | 'postmortems' | 'runbooks' | 'calendar';
};

export function Navigation({ activePage }: NavigationProps) {
  return (
    <nav className="sticky top-0 z-50 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
      <div className="max-w-content mx-auto px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center gap-3 group">
              <WatchtowerLogo className="h-10 w-10 transition-transform group-hover:scale-105" />
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                Watchtower
              </span>
            </Link>
            <div className="flex space-x-6">
              <Link
                href="/incidents"
                className={`text-sm transition-colors ${
                  activePage === 'incidents'
                    ? 'font-semibold text-gray-900 dark:text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Incidents
              </Link>
              <Link
                href="/postmortems"
                className={`text-sm transition-colors ${
                  activePage === 'postmortems'
                    ? 'font-semibold text-gray-900 dark:text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Postmortems
              </Link>
              <Link
                href="/runbooks"
                className={`text-sm transition-colors ${
                  activePage === 'runbooks'
                    ? 'font-semibold text-gray-900 dark:text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Runbooks
              </Link>
              <Link
                href="/calendar"
                className={`text-sm transition-colors ${
                  activePage === 'calendar'
                    ? 'font-semibold text-gray-900 dark:text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Calendar
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
  );
}
