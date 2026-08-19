import React, { useContext } from 'react';
import { Menu } from 'lucide-react';
import { AppContext } from '../../context/AppContext';
import useAuth from '../../hooks/useAuth';
import GlobalSearch from '../search/GlobalSearch';
import NotificationDropdown from '../notifications/NotificationDropdown';

export default function Header({ onNavigateToIssue, onNavigateToSpace }) {
  const { user } = useAuth();
  const {
    currentView,
    setCurrentView,
    isSidebarOpen,
    setIsSidebarOpen
  } = useContext(AppContext);

  const getViewTitle = () => {
    switch (currentView) {
      case 'dashboard': return 'Dashboard';
      case 'projects': return 'Projects';
      case 'spaces': return 'Spaces & Docs';
      case 'profile': return 'Profile Settings';
      case 'recent': return 'Recent Activity';
      default: return 'Space Board View';
    }
  };

  return (
    <header className="bg-[#09090b] border-b border-[#1a1a1e] h-16 flex items-center justify-between px-8 shrink-0">
      <div className="flex items-center space-x-2">
        {!isSidebarOpen && (
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="text-gray-500 hover:text-gray-300 p-1 mr-2 focus:outline-none cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <h2 className="text-sm font-bold text-[#71717a] uppercase tracking-wider hidden sm:block">
          {getViewTitle()}
        </h2>

        {/* Global Search Component */}
        <GlobalSearch onNavigateToIssue={onNavigateToIssue} />
      </div>

      <div className="flex items-center space-x-4">
        {/* Notification Bell Dropdown */}
        <NotificationDropdown 
          onNavigateToIssue={onNavigateToIssue}
          onNavigateToSpace={onNavigateToSpace}
        />

        {/* User profile button */}
        <button 
          onClick={() => setCurrentView('profile')}
          className="flex items-center space-x-2 text-xs font-medium text-[#a1a1aa] bg-[#131316] hover:bg-[#18181c] hover:text-white px-2.5 py-1.5 border border-[#202024] rounded-lg transition-colors cursor-pointer"
        >
          <div 
            className="w-5 h-5 rounded-full text-white flex items-center justify-center text-[10px] font-extrabold shrink-0 border border-white/5"
            style={{ backgroundColor: user?.avatar_color || '#4f46e5' }}
          >
            {(user?.username?.[0] || 'U').toUpperCase()}
          </div>
          <span>{user?.username}</span>
        </button>
      </div>
    </header>
  );
}
