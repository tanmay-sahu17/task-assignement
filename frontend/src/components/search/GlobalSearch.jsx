import React, { useContext, useEffect, useRef } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { AppContext } from '../../context/AppContext';
import useSearch from '../../hooks/useSearch';

export default function GlobalSearch({ onNavigateToIssue }) {
  const {
    currentView,
    setCurrentView,
    setSelectedProjectId,
    setSelectedSpaceId,
    setPreviousView
  } = useContext(AppContext);

  const {
    query,
    setQuery,
    results,
    isFocused,
    setIsFocused,
    isLoading,
    clearSearch
  } = useSearch();

  const containerRef = useRef(null);

  // Close search popup when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [setIsFocused]);

  const handleProjectClick = (projectId) => {
    setSelectedProjectId(projectId);
    setSelectedSpaceId(null);
    setCurrentView('projects');
    clearSearch();
  };

  const handleSpaceClick = (spaceId, projectId) => {
    if (currentView !== 'board') {
      setPreviousView(currentView);
    }
    setSelectedProjectId(projectId);
    setSelectedSpaceId(spaceId);
    setCurrentView('board');
    clearSearch();
  };

  const handleIssueClick = (spaceId, issueNo) => {
    if (currentView !== 'board') {
      setPreviousView(currentView);
    }
    setSelectedSpaceId(spaceId);
    if (onNavigateToIssue) {
      onNavigateToIssue(spaceId, issueNo);
    }
    setCurrentView('board');
    clearSearch();
  };

  return (
    <div ref={containerRef} className="relative ml-8 w-64 md:w-80 search-bar-container">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search className="h-4 w-4 text-[#71717a]" />
      </div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setIsFocused(true)}
        placeholder="Search projects, spaces, issues..."
        className="block w-full pl-9 pr-3 py-1.5 bg-[#131316] border border-[#202024] rounded-lg text-xs placeholder-[#52525b] text-white focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
      />

      {isFocused && query.trim().length >= 2 && (
        <div className="absolute left-0 right-0 mt-2 bg-[#131316] border border-[#202024] rounded-xl shadow-2xl overflow-hidden z-50 max-h-[360px] overflow-y-auto divide-y divide-[#202024]">
          {isLoading ? (
            <div className="p-4 text-center text-xs text-[#71717a] flex items-center justify-center space-x-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
              <span>Searching...</span>
            </div>
          ) : !results || (results.projects.length === 0 && results.spaces.length === 0 && results.issues.length === 0) ? (
            <div className="p-4 text-center text-xs text-[#71717a]">
              No results match "{query}"
            </div>
          ) : (
            <>
              {results.projects.length > 0 && (
                <div className="p-2">
                  <h4 className="text-[10px] font-bold text-[#71717a] uppercase tracking-wider px-2 py-1">Projects</h4>
                  {results.projects.map(p => (
                    <button
                      key={p.id}
                      onClick={() => handleProjectClick(p.id)}
                      className="w-full text-left px-2 py-1.5 hover:bg-[#1c1c1f] rounded-lg text-xs text-[#e4e4e7] hover:text-white transition-colors flex items-center justify-between cursor-pointer"
                    >
                      <span className="truncate">{p.name}</span>
                      <span className="text-[9px] text-[#71717a] uppercase ml-2 bg-[#09090b] px-1.5 py-0.5 rounded font-mono font-semibold">{p.key}</span>
                    </button>
                  ))}
                </div>
              )}

              {results.spaces.length > 0 && (
                <div className="p-2">
                  <h4 className="text-[10px] font-bold text-[#71717a] uppercase tracking-wider px-2 py-1">Spaces</h4>
                  {results.spaces.map(s => (
                    <button
                      key={s.id}
                      onClick={() => handleSpaceClick(s.id, s.project_id)}
                      className="w-full text-left px-2 py-1.5 hover:bg-[#1c1c1f] rounded-lg text-xs text-[#e4e4e7] hover:text-white transition-colors flex items-center justify-between cursor-pointer"
                    >
                      <span className="truncate">{s.name}</span>
                      <span className="text-[9px] text-[#71717a] uppercase ml-2 bg-[#09090b] px-1.5 py-0.5 rounded font-mono font-semibold">{s.key}</span>
                    </button>
                  ))}
                </div>
              )}

              {results.issues.length > 0 && (
                <div className="p-2">
                  <h4 className="text-[10px] font-bold text-[#71717a] uppercase tracking-wider px-2 py-1">Issues</h4>
                  {results.issues.map(i => (
                    <button
                      key={i.issue_no}
                      onClick={() => handleIssueClick(i.space_id, i.issue_no)}
                      className="w-full text-left px-2 py-1.5 hover:bg-[#1c1c1f] rounded-lg text-xs text-[#e4e4e7] hover:text-white transition-colors flex flex-col cursor-pointer"
                    >
                      <div className="flex justify-between items-center w-full">
                        <span className="truncate text-white font-medium">#{i.issue_no} - {i.title}</span>
                        <span className="text-[9px] text-gray-500 ml-2 font-semibold truncate shrink-0">{i.space_name}</span>
                      </div>
                      <div className="flex items-center space-x-1.5 mt-0.5 text-[9px] text-gray-500">
                        <span className={`uppercase font-bold ${i.status === 'CL' ? 'text-emerald-400' : 'text-gray-400'}`}>{i.status === 'OP' ? 'Open' : i.status === 'IN' ? 'In Progress' : 'Closed'}</span>
                        <span>•</span>
                        <span className="capitalize">{i.priority === 'LO' ? 'low' : i.priority === 'ME' ? 'medium' : i.priority === 'HI' ? 'high' : 'critical'}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
