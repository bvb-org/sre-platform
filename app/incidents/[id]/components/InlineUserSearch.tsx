'use client';

import { useState, useEffect, useRef } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

interface InlineUserSearchProps {
  onSelectUser: (user: User) => void;
  onCancel: () => void;
  currentUser?: User;
  autoFocus?: boolean;
}

export function InlineUserSearch({
  onSelectUser,
  onCancel,
  currentUser,
  autoFocus = true,
}: InlineUserSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timeoutId = setTimeout(() => {
      searchUsers(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const searchUsers = async (query: string) => {
    try {
      setLoading(true);
      setError(null);

      // Try ServiceNow search first
      const snowResponse = await fetch(`/api/servicenow/users/search?query=${encodeURIComponent(query)}`);
      
      if (snowResponse.ok) {
        const snowUsers = await snowResponse.json();
        
        // Map ServiceNow users to our User format
        const mappedUsers = snowUsers.map((u: any) => ({
          id: u.sys_id || u.user_name,
          name: u.name || u.user_name,
          email: u.email || `${u.user_name}@company.com`,
          avatarUrl: u.avatar,
        }));
        
        setSearchResults(mappedUsers);
      } else {
        // Fallback to local users if ServiceNow is unavailable
        const localResponse = await fetch(`/api/users?search=${encodeURIComponent(query)}`);
        
        if (localResponse.ok) {
          const localUsers = await localResponse.json();
          setSearchResults(localUsers);
        } else {
          throw new Error('Failed to search users');
        }
      }
    } catch (err) {
      console.error('Error searching users:', err);
      setError('Failed to search users');
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className="space-y-2">
      {/* Search input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search by name or email..."
          className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
        />
        <button
          onClick={onCancel}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          title="Cancel"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Search results */}
      {searchQuery && (
        <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700">
          {loading && (
            <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
              Searching...
            </div>
          )}

          {error && (
            <div className="px-3 py-2 text-xs text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {!loading && !error && searchResults.length === 0 && (
            <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
              No users found
            </div>
          )}

          {!loading && !error && searchResults.length > 0 && (
            <div className="divide-y divide-gray-200 dark:divide-gray-600">
              {searchResults.map((user) => (
                <button
                  key={user.id}
                  onClick={() => onSelectUser(user)}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-left"
                >
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.name}
                      className="w-6 h-6 rounded-full flex-shrink-0"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-accent-purple/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-medium text-accent-purple">
                        {user.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {user.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {user.email}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
