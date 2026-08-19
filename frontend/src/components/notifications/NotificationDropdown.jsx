import React, { useContext, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { AppContext } from '../../context/AppContext';
import useNotifications from '../../hooks/useNotifications';

export default function NotificationDropdown({ onNavigateToIssue, onNavigateToSpace }) {
  const {
    currentView,
    setCurrentView,
    setSelectedSpaceId,
    setPreviousView
  } = useContext(AppContext);

  const {
    notifications,
    unreadCount,
    isOpen,
    setIsOpen,
    markAllAsRead,
    markSingleAsRead
  } = useNotifications();

  const containerRef = useRef(null);

  // Close notifications dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target) &&
        !e.target.closest('.notifications-menu-btn')
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [setIsOpen]);

  const handleNotificationClick = async (n) => {
    try {
      await markSingleAsRead(n.id);
      setIsOpen(false);

      if (n.link) {
        if (n.link === '/projects') {
          setCurrentView('projects');
        } else if (n.link === '/dashboard') {
          setCurrentView('dashboard');
        } else if (n.link === '/profile') {
          setCurrentView('profile');
        } else {
          const boardMatch = n.link.match(/\/board\/(\d+)/);
          const issueMatch = n.link.match(/\/issue\/(\d+)/);
          if (boardMatch) {
            const spaceId = parseInt(boardMatch[1]);
            if (issueMatch) {
              const issueNo = parseInt(issueMatch[1]);
              if (onNavigateToIssue) {
                onNavigateToIssue(spaceId, issueNo);
              }
            } else {
              if (onNavigateToSpace) {
                onNavigateToSpace(spaceId);
              }
            }
          } else {
            window.location.href = n.link;
          }
        }
      }
    } catch (err) {
      console.error("Error handling notification click:", err);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="notifications-menu-btn relative p-2 text-gray-400 hover:text-white hover:bg-[#131316] rounded-lg border border-transparent hover:border-[#202024] transition-all cursor-pointer focus:outline-none flex items-center justify-center"
      >
        <Bell className="w-4 h-4 text-[#a1a1aa] hover:text-white" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-indigo-500 rounded-full ring-1 ring-[#09090b]"></span>
        )}
      </button>

      {isOpen && (
        <div 
          className="notifications-popup absolute right-0 mt-2 bg-[#131316] border border-[#202024] rounded-xl shadow-2xl w-[360px] text-[#f3f4f6] z-50 animate-fadeIn"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-xs font-bold text-[#71717a] uppercase tracking-wider mb-1 flex items-center justify-between border-b border-[#202024] p-3 pb-2.5">
            <span>Notifications ({unreadCount} unread)</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-indigo-400 hover:text-indigo-300 font-bold text-[10px] cursor-pointer focus:outline-none"
              >
                Mark all as read
              </button>
            )}
          </h3>
          <div className="max-h-[300px] overflow-y-auto divide-y divide-[#1a1a1e]">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-xs text-gray-500">
                No notifications yet.
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`p-3 text-left transition-colors cursor-pointer hover:bg-[#18181c] ${
                    !n.is_read ? 'bg-indigo-950/10' : ''
                  }`}
                >
                  <div className="flex justify-between items-start space-x-2">
                    <span className="text-xs font-bold text-white leading-tight">
                      {n.title}
                    </span>
                    {!n.is_read && (
                      <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full shrink-0 mt-1"></span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1 leading-snug">
                    {n.description}
                  </p>
                  <div className="flex items-center space-x-1.5 mt-1.5 text-[9px] text-gray-500 font-medium">
                    <span>by {n.actor}</span>
                    <span>•</span>
                    <span>{new Date(n.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
