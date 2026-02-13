'use client';

import { useState, useEffect, useCallback } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

interface UserSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectUser: (user: User) => void;
  roleType: string;
  currentUser?: User;
}

export function UserSearchModal({
  isOpen,
  onClose,
  onSelectUser,
  roleType,
  currentUser,
}: UserSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setError('Failed to search users. Please try again.');
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUser = (user: User) => {
    onSelectUser(user);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-75"
          onClick={onClose}
        />

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="w-full mt-3 text-center sm:mt-0 sm:text-left">
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
                  {currentUser ? `Change ${roleType}` : `Assign ${roleType}`}
                </h3>

                {currentUser && (
                  <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Current: <span className="font-medium">{currentUser.name}</span> ({currentUser.email})
                    </p>
                  </div>
                )}

                {/* Search input */}
                <div className="mb-4">
                  <label htmlFor="user-search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Search for user
                  </label>
                  <input
                    id="user-search"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Enter name or email..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    autoFocus
                  />
                </div>

                {/* Search results */}
                <div className="max-h-64 overflow-y-auto">
                  {loading && (
                    <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                      Searching...
                    </div>
                  )}

                  {error && (
                    <div className="text-center py-4 text-red-600 dark:text-red-400">
                      {error}
                    </div>
                  )}

                  {!loading && !error && searchQuery && searchResults.length === 0 && (
                    <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                      No users found
                    </div>
                  )}

                  {!loading && !error && searchResults.length > 0 && (
                    <div className="space-y-2">
                      {searchResults.map((user) => (
                        <button
                          key={user.id}
                          onClick={() => handleSelectUser(user)}
                          className="w-full flex items-center space-x-3 p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors text-left"
                        >
                          {user.avatarUrl ? (
                            <img
                              src={user.avatarUrl}
                              alt={user.name}
                              className="w-10 h-10 rounded-full"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium">
                              {user.name.charAt(0).toUpperCase()}
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

                  {!searchQuery && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <p className="mt-2">Start typing to search for users</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={onClose}
              className="w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
