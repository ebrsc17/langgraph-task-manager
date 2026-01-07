import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  onSearchChange: (query: string) => void;
  onFilterChange: (filters: FilterState) => void;
  showProjectFilter?: boolean;
  projects?: Array<{ id: string; name: string }>;
}

export interface FilterState {
  status?: 'all' | 'pending' | 'completed';
  priority?: 'all' | 'low' | 'medium' | 'high';
  projectId?: string | 'all';
}

const SearchAndFilter: React.FC<Props> = ({
  onSearchChange,
  onFilterChange,
  showProjectFilter = false,
  projects = [],
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    status: 'all',
    priority: 'all',
    projectId: 'all',
  });

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    onSearchChange(value);
  };

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const activeFilterCount = Object.values(filters).filter(v => v !== 'all').length;

  return (
    <div className="space-y-3">
      {/* Search Bar */}
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          🔍
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search tasks, ideas, or projects..."
          className="w-full pl-10 pr-20 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600
            rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500
            focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        {searchQuery && (
          <button
            onClick={() => handleSearchChange('')}
            className="absolute right-14 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600
              dark:hover:text-gray-300"
          >
            ✕
          </button>
        )}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 rounded-lg text-sm font-medium
            transition-colors ${showFilters
              ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
        >
          Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
        </button>
      </div>

      {/* Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3">
              {/* Status Filter */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1.5">
                  Status
                </label>
                <div className="flex gap-2">
                  {['all', 'pending', 'completed'].map((status) => (
                    <button
                      key={status}
                      onClick={() => handleFilterChange('status', status)}
                      className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                        ${filters.status === status
                          ? 'bg-primary-500 text-white'
                          : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                        }`}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority Filter */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1.5">
                  Priority
                </label>
                <div className="flex gap-2">
                  {['all', 'low', 'medium', 'high'].map((priority) => (
                    <button
                      key={priority}
                      onClick={() => handleFilterChange('priority', priority)}
                      className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                        ${filters.priority === priority
                          ? 'bg-primary-500 text-white'
                          : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                        }`}
                    >
                      {priority.charAt(0).toUpperCase() + priority.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Project Filter */}
              {showProjectFilter && projects.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1.5">
                    Project
                  </label>
                  <select
                    value={filters.projectId}
                    onChange={(e) => handleFilterChange('projectId', e.target.value)}
                    className="w-full px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600
                      rounded-lg text-gray-900 dark:text-white text-sm
                      focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="all">All Projects</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Clear Filters */}
              {activeFilterCount > 0 && (
                <button
                  onClick={() => {
                    const resetFilters = { status: 'all', priority: 'all', projectId: 'all' };
                    setFilters(resetFilters as FilterState);
                    onFilterChange(resetFilters);
                  }}
                  className="w-full px-3 py-1.5 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300
                    rounded-lg text-sm font-medium hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SearchAndFilter;
