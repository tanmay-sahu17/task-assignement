import React, { useContext } from 'react';
import { LayoutGrid, Menu, X, FolderKanban, BookOpen, User, LogOut } from 'lucide-react';
import { AppContext } from '../../context/AppContext';
import useAuth from '../../hooks/useAuth';
import SpaceSidebar from '../spaces/SpaceSidebar';

export default function Sidebar({ onCreateSpaceClick, onEditSpaceClick }) {
  const { user, logout } = useAuth();
  const {
    currentView,
    setCurrentView,
    selectedProjectId,
    setSelectedProjectId,
    selectedSpaceId,
    setSelectedSpaceId,
    isSidebarOpen,
    setIsSidebarOpen
  } = useContext(AppContext);

  const navigateTo = (view) => {
    setSelectedProjectId(null);
    setSelectedSpaceId(null);
    setCurrentView(view);
  };

  return (
    <aside
      className={`glass-sidebar transition-all duration-300 flex flex-col justify-between shrink-0 ${
        isSidebarOpen ? 'w-64' : 'w-20'
      }`}
    >
      <div>
        {/* Brand Header */}
        <div className="p-6 border-b border-[#1a1a1e]/50 flex items-center justify-between">
          <div className="flex items-center space-x-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
              JC
            </div>
            {isSidebarOpen && (
              <span className="font-bold text-white tracking-tight text-sm truncate">
                Workspace
              </span>
            )}
          </div>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="text-gray-500 hover:text-gray-300 p-1 focus:outline-none cursor-pointer"
          >
            {isSidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="p-4 space-y-1">
          <button
            onClick={() => navigateTo('dashboard')}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              currentView === 'dashboard'
                ? 'bg-[#1c1c1f] text-[#f3f4f6] border border-[#2b2b32]'
                : 'text-[#a1a1aa] hover:bg-[#121214] hover:text-[#e4e4e7] border border-transparent'
            }`}
          >
            <LayoutGrid className="w-5 h-5 shrink-0" />
            {isSidebarOpen && <span className="truncate">Dashboard</span>}
          </button>

          <button
            onClick={() => navigateTo('recent')}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              currentView === 'recent'
                ? 'bg-[#1c1c1f] text-[#f3f4f6] border border-[#2b2b32]'
                : 'text-[#a1a1aa] hover:bg-[#121214] hover:text-[#e4e4e7] border border-transparent'
            }`}
          >
            <FolderKanban className="w-5 h-5 shrink-0" style={{ transform: 'rotate(90deg)' }} /* Clock/recent placeholder or standard lucide */ />
            {isSidebarOpen && <span className="truncate">Recent Activity</span>}
          </button>

          <button
            onClick={() => navigateTo('projects')}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              currentView === 'projects' || (currentView === 'board' && selectedProjectId)
                ? 'bg-[#1c1c1f] text-[#f3f4f6] border border-[#2b2b32]'
                : 'text-[#a1a1aa] hover:bg-[#121214] hover:text-[#e4e4e7] border border-transparent'
            }`}
          >
            <FolderKanban className="w-5 h-5 shrink-0" />
            {isSidebarOpen && <span className="truncate">Projects</span>}
          </button>

          <button
            onClick={() => navigateTo('spaces')}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              currentView === 'spaces' || (currentView === 'board' && selectedSpaceId && !selectedProjectId)
                ? 'bg-[#1c1c1f] text-[#f3f4f6] border border-[#2b2b32]'
                : 'text-[#a1a1aa] hover:bg-[#121214] hover:text-[#e4e4e7] border border-transparent'
            }`}
          >
            <BookOpen className="w-5 h-5 shrink-0" />
            {isSidebarOpen && <span className="truncate">Docs & Spaces</span>}
          </button>

          {/* Project Spaces List */}
          <SpaceSidebar 
            onCreateSpaceClick={onCreateSpaceClick}
            onEditSpaceClick={onEditSpaceClick}
          />

          <div className="pt-4 mt-4 border-t border-[#1a1a1e]/50">
            <button
              onClick={() => navigateTo('profile')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                currentView === 'profile'
                  ? 'bg-[#1c1c1f] text-[#f3f4f6] border border-[#2b2b32]'
                  : 'text-[#a1a1aa] hover:bg-[#121214] hover:text-[#e4e4e7] border border-transparent'
              }`}
            >
              <User className="w-5 h-5 shrink-0" />
              {isSidebarOpen && <span className="truncate">My Profile</span>}
            </button>
          </div>
        </nav>
      </div>

      {/* User Info & Logout Button */}
      <div className="p-4 border-t border-[#1a1a1e]/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold text-xs shrink-0 uppercase">
              {user?.username?.substring(0, 2) || 'US'}
            </div>
            {isSidebarOpen && (
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">{user?.username}</p>
                <p className="text-[10px] text-gray-500 truncate">{user?.email}</p>
              </div>
            )}
          </div>
          {isSidebarOpen && (
            <button
              onClick={logout}
              className="text-gray-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-all cursor-pointer"
              title="Log Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
