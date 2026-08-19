import React, { useContext, useState, useEffect } from 'react';
import { Plus, MoreVertical } from 'lucide-react';
import { AppContext } from '../../context/AppContext';
import useAuth from '../../hooks/useAuth';

export default function SpaceSidebar({ onCreateSpaceClick, onEditSpaceClick }) {
  const { user } = useAuth();
  const {
    currentView,
    setCurrentView,
    selectedProjectId,
    selectedSpaceId,
    setSelectedSpaceId,
    isSidebarOpen,
    spaces,
    deleteSpace,
    setPreviousView
  } = useContext(AppContext);

  const [activeSidebarMenuSpaceId, setActiveSidebarMenuSpaceId] = useState(null);

  // Close menus on click outside
  useEffect(() => {
    const handleCloseSidebarMenus = (e) => {
      if (!e.target.closest('.three-dot-btn')) {
        setActiveSidebarMenuSpaceId(null);
      }
    };
    window.addEventListener('click', handleCloseSidebarMenus);
    return () => window.removeEventListener('click', handleCloseSidebarMenus);
  }, []);

  const handleNavigateToSpace = (id) => {
    if (currentView !== 'board') {
      setPreviousView(currentView);
    }
    setSelectedSpaceId(id);
    setCurrentView('board');
  };

  if (!selectedProjectId) return null;

  const projectSpaces = spaces.filter(s => s.project === selectedProjectId);

  return (
    <div className="pt-4 mt-4 border-t border-[#1a1a1e]/50">
      <div className="px-3 py-1.5 flex items-center justify-between text-xs font-bold text-[#71717a] uppercase tracking-wider">
        {isSidebarOpen ? <span>Project Spaces</span> : <span>Spaces</span>}
        {user?.is_superuser && isSidebarOpen && (
          <button
            onClick={onCreateSpaceClick}
            className="text-gray-500 hover:text-white transition-colors cursor-pointer focus:outline-none"
            title="Create Space"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="space-y-0.5 mt-1 max-h-[45vh] overflow-y-auto overflow-x-visible pr-1">
        {projectSpaces.length === 0 ? (
          isSidebarOpen && <p className="text-[10px] text-gray-600 px-3 py-2 italic">No spaces created.</p>
        ) : (
          projectSpaces.map(s => {
            const isSelected = currentView === 'board' && selectedSpaceId === s.id;
            const isMenuOpen = activeSidebarMenuSpaceId === s.id;
            return (
              <div
                key={s.id}
                className={`group relative flex items-center justify-between rounded-lg transition-all ${
                  isSelected
                    ? 'bg-indigo-950/30 border border-indigo-900/30 text-indigo-400 font-semibold'
                    : 'text-[#a1a1aa] hover:bg-[#121214] hover:text-[#e4e4e7] border border-transparent'
                }`}
              >
                <button
                  onClick={() => handleNavigateToSpace(s.id)}
                  className="flex-1 flex items-center space-x-2.5 px-3 py-2 text-xs font-medium text-left min-w-0"
                >
                  <div className="w-5 h-5 rounded bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold text-[9px] shrink-0 font-mono">
                    {s.key}
                  </div>
                  {isSidebarOpen && <span className="truncate">{s.name}</span>}
                </button>

                {user?.is_superuser && isSidebarOpen && (
                  <div className="absolute right-2 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveSidebarMenuSpaceId(isMenuOpen ? null : s.id);
                      }}
                      className="three-dot-btn p-1 hover:bg-[#202024] text-gray-500 hover:text-white rounded transition-colors focus:outline-none opacity-0 group-hover:opacity-100 cursor-pointer"
                    >
                      <MoreVertical className="w-3.5 h-3.5 pointer-events-none" />
                    </button>

                    {isMenuOpen && (
                      <div 
                        className="absolute right-6 -top-2 bg-[#131316] border border-[#202024] rounded-lg shadow-xl py-1 w-28 z-50 animate-fadeIn"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => onEditSpaceClick(s)}
                          className="w-full text-left px-3 py-1.5 hover:bg-[#1c1c1f] text-xs text-[#a1a1aa] hover:text-white transition-colors cursor-pointer"
                        >
                          Edit Space
                        </button>
                        <button
                          onClick={() => deleteSpace(s.id)}
                          className="w-full text-left px-3 py-1.5 hover:bg-red-955/20 text-xs text-red-400 transition-colors font-semibold cursor-pointer"
                        >
                          Delete Space
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
