import React, { useEffect, useState } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Projects from './components/Projects';
import Board from './components/Board';
import AcceptInvite from './components/AcceptInvite';
import SpacesList from './components/SpacesList';
import Profile from './components/Profile';
import Recent from './components/Recent';
import { authAPI, spaceAPI, notificationAPI, searchAPI } from './api/api';
import { LayoutGrid, FolderKanban, LogOut, Menu, X, User, BookOpen, Clock, Plus, MoreVertical, Bell, Search, Loader2 } from 'lucide-react';
import { requestNotificationPermission } from './firebase';

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard', 'projects', 'board', 'spaces', 'profile'
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [selectedSpaceId, setSelectedSpaceId] = useState(null);
  const [initialSelectedIssueNo, setInitialSelectedIssueNo] = useState(null);
  const [isRecentOpen, setIsRecentOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [inviteToken, setInviteToken] = useState(null);
  const [spaces, setSpaces] = useState([]);

  // Check URL for invite token on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get('token');
    if (tokenParam && !localStorage.getItem('token')) {
      setInviteToken(tokenParam);
    }
  }, []);

  // Check auth state on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser && token) {
      setUser(JSON.parse(savedUser));
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setToken(null);
      setUser(null);
    }
  }, [token]);

  // Create Space states and handler for Admin
  const [isCreateSpaceModalOpen, setIsCreateSpaceModalOpen] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState('');
  const [newSpaceKey, setNewSpaceKey] = useState('');
  const [newSpaceDescription, setNewSpaceDescription] = useState('');
  const [createSpaceError, setCreateSpaceError] = useState('');

  const handleCreateSpace = async (e) => {
    e.preventDefault();
    setCreateSpaceError('');
    try {
      const payload = {
        name: newSpaceName,
        key: newSpaceKey.toUpperCase(),
        description: newSpaceDescription,
        project: selectedProjectId || null
      };
      const newSpace = await spaceAPI.create(payload);
      
      const updated = await spaceAPI.getAll();
      setSpaces(updated);
      
      setIsCreateSpaceModalOpen(false);
      setNewSpaceName('');
      setNewSpaceKey('');
      setNewSpaceDescription('');
      
      handleNavigateToSpace(newSpace.id, selectedProjectId);
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.key?.[0] || err.response?.data?.detail || "Failed to create space. Please make sure the Key is unique.";
      setCreateSpaceError(errMsg);
    }
  };

  // Edit and Delete Space states & handlers for Sidebar
  const [activeSidebarMenuSpaceId, setActiveSidebarMenuSpaceId] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingSpace, setEditingSpace] = useState(null);
  const [editSpaceName, setEditSpaceName] = useState('');
  const [editSpaceKey, setEditSpaceKey] = useState('');
  const [editSpaceDescription, setEditSpaceDescription] = useState('');
  const [editSpaceError, setEditSpaceError] = useState('');
  const [editSpaceSubmitLoading, setEditSpaceSubmitLoading] = useState(false);

  useEffect(() => {
    const handleCloseMenus = (e) => {
      if (e.target.closest('.three-dot-btn')) return;
      setActiveSidebarMenuSpaceId(null);
      if (!e.target.closest('.notifications-menu-btn') && !e.target.closest('.notifications-popup')) {
        setIsNotificationsOpen(false);
      }
      if (!e.target.closest('.search-bar-container')) {
        setIsSearchFocused(false);
      }
    };
    window.addEventListener('click', handleCloseMenus);
    return () => window.removeEventListener('click', handleCloseMenus);
  }, []);

  const handleDeleteSpace = async (spaceId) => {
    if (!window.confirm("Are you sure you want to delete this space and all its issues/pages?")) return;
    try {
      await spaceAPI.delete(spaceId);
      const updated = await spaceAPI.getAll();
      setSpaces(updated);
      if (selectedSpaceId === spaceId) {
        setSelectedSpaceId(null);
        setCurrentView('dashboard');
      }
    } catch (err) {
      console.error(err);
      alert("Failed to delete space.");
    }
  };

  const handleUpdateSpace = async (e) => {
    e.preventDefault();
    setEditSpaceError('');
    setEditSpaceSubmitLoading(true);
    try {
      const updatedSpace = await spaceAPI.update(editingSpace.id, {
        name: editSpaceName,
        key: editSpaceKey.toUpperCase(),
        description: editSpaceDescription,
        project: editingSpace.project
      });
      const updatedList = await spaceAPI.getAll();
      setSpaces(updatedList);
      setIsEditModalOpen(false);
      setEditingSpace(null);
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.key?.[0] || err.response?.data?.error || "Failed to update Space.";
      setEditSpaceError(errMsg);
    } finally {
      setEditSpaceSubmitLoading(false);
    }
  };

  // Fetch all spaces for sidebar list
  useEffect(() => {
    async function loadSpaces() {
      try {
        const data = await spaceAPI.getAll();
        setSpaces(data);
      } catch (err) {
        console.error("Failed to load spaces in sidebar", err);
      }
    }
    if (token) {
      loadSpaces();
    }
  }, [token, currentView]);

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const fetchNotifications = async () => {
    try {
      const data = await notificationAPI.getNotifications();
      setNotifications(data.notifications);
      setUnreadCount(data.unread_count);
    } catch (err) {
      console.error("Failed to load notifications", err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationAPI.markAsRead([], true);
      setUnreadCount(0);
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error("Failed to mark notifications read", err);
    }
  };

  const handleNotificationClick = async (n) => {
    try {
      if (!n.is_read) {
        await notificationAPI.markAsRead([n.id]);
        setUnreadCount(prev => Math.max(0, prev - 1));
        setNotifications(notifications.map(item => item.id === n.id ? { ...item, is_read: true } : item));
      }
      setIsNotificationsOpen(false);
      if (n.link) {
        const boardMatch = n.link.match(/\/board\/(\d+)/);
        const issueMatch = n.link.match(/\/issue\/(\d+)/);
        if (boardMatch) {
          const spaceId = parseInt(boardMatch[1]);
          if (issueMatch) {
            const issueNo = parseInt(issueMatch[1]);
            handleNavigateToIssue(spaceId, issueNo);
          } else {
            handleNavigateToSpace(spaceId);
          }
        } else {
          window.location.href = n.link;
        }
      }
    } catch (err) {
      console.error("Error handling notification click:", err);
    }
  };

  useEffect(() => {
    if (token) {
      fetchNotifications();
      requestNotificationPermission().catch(err => console.warn(err));

      const setupFCMListener = async () => {
        const { messaging } = await import('./firebase');
        if (messaging) {
          const { onMessage } = await import('firebase/messaging');
          const unsubscribe = onMessage(messaging, (payload) => {
            console.log("Foreground message received:", payload);
            fetchNotifications();
            if (Notification.permission === 'granted') {
              new Notification(payload.notification.title, {
                body: payload.notification.body,
                icon: '/favicon.svg'
              });
            }
          });
          return unsubscribe;
        }
      };

      let fcmUnsubscribePromise = setupFCMListener();
      return () => {
        fcmUnsubscribePromise.then(unsub => {
          if (unsub) unsub();
        });
      };
    }
  }, [token]);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isSearchLoading, setIsSearchLoading] = useState(false);

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults(null);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      setIsSearchLoading(true);
      try {
        const data = await searchAPI.query(searchQuery);
        setSearchResults(data);
      } catch (err) {
        console.error("Failed to fetch search results", err);
      } finally {
        setIsSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const handleLoginSuccess = (loggedInUser) => {
    setUser(loggedInUser);
    setToken(localStorage.getItem('token'));
    setCurrentView('dashboard');
  };

  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch (err) {
      console.error('Failed to log out cleanly', err);
    } finally {
      setUser(null);
      setToken(null);
      setCurrentView('dashboard');
    }
  };

  const handleNavigateToProject = async (id) => {
    setSelectedProjectId(id);
    try {
      const spaceList = await spaceAPI.getAll();
      const projSpaces = spaceList.filter(s => s.project === id);
      if (projSpaces.length > 0) {
        handleNavigateToSpace(projSpaces[0].id);
      } else {
        // If no space exists, create a default space for this project
        const defaultSpace = await spaceAPI.create({
          name: "Default Space",
          key: `SP-${id}`,
          project: id
        });
        // Refresh spaces list
        const updated = await spaceAPI.getAll();
        setSpaces(updated);
        handleNavigateToSpace(defaultSpace.id);
      }
    } catch (err) {
      console.error("Failed to navigate to project first space", err);
    }
  };

  const handleNavigateToSpace = (id) => {
    setSelectedSpaceId(id);
    setInitialSelectedIssueNo(null);
    setCurrentView('board');
    const activeSpace = spaces.find(s => s.id === id);
    if (activeSpace) {
      setSelectedProjectId(activeSpace.project);
    }
  };


  const handleNavigateToIssue = (spaceId, issueNo) => {
    setSelectedSpaceId(spaceId);
    setInitialSelectedIssueNo(issueNo);
    setCurrentView('board');
  };

  // Render invite accept screen if URL contains invite token and user is not logged in
  if (inviteToken) {
    return (
      <AcceptInvite
        token={inviteToken}
        onLoginSuccess={(loggedInUser) => {
          setInviteToken(null);
          window.history.replaceState({}, document.title, window.location.pathname);
          handleLoginSuccess(loggedInUser);
        }}
        onCancel={() => {
          setInviteToken(null);
          window.history.replaceState({}, document.title, window.location.pathname);
        }}
      />
    );
  }

  // Guard: If not logged in, render Login page
  if (!token || !user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const renderActiveView = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <Dashboard
            user={user}
            onNavigateToProject={handleNavigateToProject}
          />
        );
      case 'projects':
        return (
          <Projects
            currentUser={user}
            onNavigateToProject={handleNavigateToProject}
          />
        );
      case 'board':
        return (
          <Board
            spaceId={selectedSpaceId}
            currentUser={user}
            onBack={() => setCurrentView('spaces')}
            initialSelectedIssueNo={initialSelectedIssueNo}
            onClearInitialSelectedIssue={() => setInitialSelectedIssueNo(null)}
          />
        );
      case 'spaces':
        return (
          <SpacesList
            currentUser={user}
          />
        );
      case 'profile':
        return (
          <Profile
            currentUser={user}
            onProfileUpdate={(updatedUser) => {
              const merged = { ...user, ...updatedUser };
              setUser(merged);
              localStorage.setItem('user', JSON.stringify(merged));
            }}
          />
        );
      default:
        return <Dashboard user={user} onNavigateToProject={handleNavigateToProject} />;
    }
  };

  return (
    <div className="flex h-screen bg-[#09090b] overflow-hidden text-[#f3f4f6] font-sans">
      {/* Sidebar navigation */}
      <aside
        className={`bg-[#0d0d0f] border-r border-[#1a1a1e] transition-all duration-300 flex flex-col justify-between shrink-0 ${
          isSidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        <div>
          {/* Brand header */}
          <div className="p-6 border-b border-[#1a1a1e] flex items-center justify-between">
            <div className="flex items-center space-x-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
                JC
              </div>
              {isSidebarOpen && (
                <span className="font-bold text-white tracking-tight text-sm truncate">
                  JiraClone Workspace
                </span>
              )}
            </div>
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="text-gray-500 hover:text-gray-300 p-1 focus:outline-none"
            >
              {isSidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            <button
              onClick={() => {
                setSelectedProjectId(null);
                setSelectedSpaceId(null);
                setCurrentView('dashboard');
              }}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                currentView === 'dashboard'
                  ? 'bg-[#1c1c1f] text-[#f3f4f6] border border-[#2b2b32]'
                  : 'text-[#a1a1aa] hover:bg-[#121214] hover:text-[#e4e4e7] border border-transparent'
              }`}
            >
              <LayoutGrid className="w-5 h-5 shrink-0" />
              {isSidebarOpen && <span className="truncate">Dashboard</span>}
            </button>

            <button
              onClick={() => setIsRecentOpen(!isRecentOpen)}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isRecentOpen
                  ? 'bg-[#1c1c1f] text-[#f3f4f6] border border-[#2b2b32]'
                  : 'text-[#a1a1aa] hover:bg-[#121214] hover:text-[#e4e4e7] border border-transparent'
              }`}
            >
              <Clock className="w-5 h-5 shrink-0" />
              {isSidebarOpen && <span className="truncate">Recent Activity</span>}
            </button>

            <button
              onClick={() => {
                setSelectedProjectId(null);
                setSelectedSpaceId(null);
                setCurrentView('projects');
              }}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                currentView === 'projects' || (currentView === 'board' && selectedProjectId)
                  ? 'bg-[#1c1c1f] text-[#f3f4f6] border border-[#2b2b32]'
                  : 'text-[#a1a1aa] hover:bg-[#121214] hover:text-[#e4e4e7] border border-transparent'
              }`}
            >
              <FolderKanban className="w-5 h-5 shrink-0" />
              {isSidebarOpen && <span className="truncate">Projects</span>}
            </button>

            <button
              onClick={() => {
                setSelectedProjectId(null);
                setSelectedSpaceId(null);
                setCurrentView('spaces');
              }}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                currentView === 'spaces'
                  ? 'bg-[#1c1c1f] text-[#f3f4f6] border border-[#2b2b32]'
                  : 'text-[#a1a1aa] hover:bg-[#121214] hover:text-[#e4e4e7] border border-transparent'
              }`}
            >
              <BookOpen className="w-5 h-5 shrink-0" />
              {isSidebarOpen && <span className="truncate">Spaces & Docs</span>}
            </button>

            <button
              onClick={() => {
                setSelectedProjectId(null);
                setSelectedSpaceId(null);
                setCurrentView('profile');
              }}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                currentView === 'profile'
                  ? 'bg-[#1c1c1f] text-[#f3f4f6] border border-[#2b2b32]'
                  : 'text-[#a1a1aa] hover:bg-[#121214] hover:text-[#e4e4e7] border border-transparent'
              }`}
            >
              <User className="w-5 h-5 shrink-0" />
              {isSidebarOpen && <span className="truncate">Profile Settings</span>}
            </button>
          </nav>

          {/* SPACES HEADER & LIST IN SIDEBAR */}
          {selectedProjectId && (
            <div className="pt-4 mt-4 border-t border-[#1a1a1e]">
              <div className="px-3 py-1.5 flex items-center justify-between text-xs font-bold text-[#71717a] uppercase tracking-wider">
                <span>Project Spaces</span>
                {user?.is_superuser && (
                  <button
                    onClick={() => setIsCreateSpaceModalOpen(true)}
                    className="text-gray-500 hover:text-white transition-colors cursor-pointer"
                    title="Create Space"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="space-y-0.5 mt-1 max-h-[45vh] overflow-y-auto overflow-x-visible pr-1">
                {spaces.filter(s => s.project === selectedProjectId).map(s => {
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
                                onClick={() => {
                                  setEditingSpace(s);
                                  setEditSpaceName(s.name);
                                  setEditSpaceKey(s.key);
                                  setEditSpaceDescription(s.description || '');
                                  setIsEditModalOpen(true);
                                  setActiveSidebarMenuSpaceId(null);
                                }}
                                className="w-full text-left px-3 py-1.5 hover:bg-[#1c1c1f] text-xs text-[#a1a1aa] hover:text-white transition-colors"
                              >
                                Edit Space
                              </button>
                              <button
                                onClick={() => {
                                  handleDeleteSpace(s.id);
                                  setActiveSidebarMenuSpaceId(null);
                                }}
                                className="w-full text-left px-3 py-1.5 hover:bg-red-955/20 text-xs text-red-400 transition-colors font-semibold"
                              >
                                Delete Space
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Area / User & Logout */}
        <div className="p-4 border-t border-[#1a1a1e] space-y-2">
          {/* User profile brief */}
          <div 
            onClick={() => setCurrentView('profile')}
            className="flex items-center space-x-3 px-3 py-1.5 rounded-lg overflow-hidden cursor-pointer hover:bg-[#121214] transition-colors group"
          >
            <div 
              className="w-8 h-8 rounded-full text-white flex items-center justify-center text-xs font-extrabold shrink-0 border border-white/10 shadow-sm transition-all duration-300"
              style={{ backgroundColor: user.avatar_color || '#4f46e5' }}
            >
              {user.username?.[0]?.toUpperCase() || 'U'}
            </div>
            {isSidebarOpen && (
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#e4e4e7] group-hover:text-white truncate transition-colors">{user.username}</p>
                <p className="text-[10px] text-[#71717a] truncate">{user.email}</p>
              </div>
            )}
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-950/20 hover:text-red-300 transition-colors border border-transparent"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {isSidebarOpen && <span className="truncate">Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main viewport */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header Panel */}
        <header className="bg-[#09090b] border-b border-[#1a1a1e] h-16 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center space-x-2">
            {!isSidebarOpen && (
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="text-gray-500 hover:text-gray-300 p-1 mr-2 focus:outline-none"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            <h2 className="text-sm font-bold text-[#71717a] uppercase tracking-wider hidden sm:block">
              {currentView === 'dashboard' 
                ? 'Dashboard' 
                : currentView === 'projects' 
                ? 'Projects' 
                : currentView === 'spaces' 
                ? 'Spaces & Docs' 
                : currentView === 'profile' 
                ? 'Profile Settings' 
                : 'Space Board View'}
            </h2>

            {/* Global Search Component */}
            <div className="relative ml-8 w-64 md:w-80 search-bar-container">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-[#71717a]" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                placeholder="Search projects, spaces, issues..."
                className="block w-full pl-9 pr-3 py-1.5 bg-[#131316] border border-[#202024] rounded-lg text-xs placeholder-[#52525b] text-white focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
              />
              
              {isSearchFocused && searchQuery.trim().length >= 2 && (
                <div className="absolute left-0 right-0 mt-2 bg-[#131316] border border-[#202024] rounded-xl shadow-2xl overflow-hidden z-50 max-h-[360px] overflow-y-auto divide-y divide-[#202024]">
                  {isSearchLoading ? (
                    <div className="p-4 text-center text-xs text-[#71717a] flex items-center justify-center space-x-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                      <span>Searching...</span>
                    </div>
                  ) : !searchResults || (searchResults.projects.length === 0 && searchResults.spaces.length === 0 && searchResults.issues.length === 0) ? (
                    <div className="p-4 text-center text-xs text-[#71717a]">
                      No results match "{searchQuery}"
                    </div>
                  ) : (
                    <>
                      {searchResults.projects.length > 0 && (
                        <div className="p-2">
                          <h4 className="text-[10px] font-bold text-[#71717a] uppercase tracking-wider px-2 py-1">Projects</h4>
                          {searchResults.projects.map(p => (
                            <button
                              key={p.id}
                              onClick={() => {
                                setSelectedProjectId(p.id);
                                setSelectedSpaceId(null);
                                setCurrentView('projects');
                                setIsSearchFocused(false);
                                setSearchQuery('');
                              }}
                              className="w-full text-left px-2 py-1.5 hover:bg-[#1c1c1f] rounded-lg text-xs text-[#e4e4e7] hover:text-white transition-colors flex items-center justify-between cursor-pointer"
                            >
                              <span className="truncate">{p.name}</span>
                              <span className="text-[9px] text-[#71717a] uppercase ml-2 bg-[#09090b] px-1.5 py-0.5 rounded font-mono font-semibold">{p.key}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {searchResults.spaces.length > 0 && (
                        <div className="p-2">
                          <h4 className="text-[10px] font-bold text-[#71717a] uppercase tracking-wider px-2 py-1">Spaces</h4>
                          {searchResults.spaces.map(s => (
                            <button
                              key={s.id}
                              onClick={() => {
                                setSelectedProjectId(s.project_id);
                                setSelectedSpaceId(s.id);
                                setCurrentView('board');
                                setIsSearchFocused(false);
                                setSearchQuery('');
                              }}
                              className="w-full text-left px-2 py-1.5 hover:bg-[#1c1c1f] rounded-lg text-xs text-[#e4e4e7] hover:text-white transition-colors flex items-center justify-between cursor-pointer"
                            >
                              <span className="truncate">{s.name}</span>
                              <span className="text-[9px] text-[#71717a] uppercase ml-2 bg-[#09090b] px-1.5 py-0.5 rounded font-mono font-semibold">{s.key}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {searchResults.issues.length > 0 && (
                        <div className="p-2">
                          <h4 className="text-[10px] font-bold text-[#71717a] uppercase tracking-wider px-2 py-1">Issues</h4>
                          {searchResults.issues.map(i => (
                            <button
                              key={i.issue_no}
                              onClick={() => {
                                setSelectedSpaceId(i.space_id);
                                setInitialSelectedIssueNo(i.issue_no);
                                setCurrentView('board');
                                setIsSearchFocused(false);
                                setSearchQuery('');
                              }}
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
          </div>
          <div className="flex items-center space-x-4">
            {/* Notification Bell Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="notifications-menu-btn relative p-2 text-gray-400 hover:text-white hover:bg-[#131316] rounded-lg border border-transparent hover:border-[#202024] transition-all cursor-pointer focus:outline-none flex items-center justify-center"
              >
                <Bell className="w-4 h-4 text-[#a1a1aa] hover:text-white" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-indigo-500 rounded-full ring-1 ring-[#09090b]"></span>
                )}
              </button>

              {isNotificationsOpen && (
                <div 
                  className="notifications-popup absolute right-0 mt-2 bg-[#131316] border border-[#202024] rounded-xl shadow-2xl w-[360px] text-[#f3f4f6] z-50 animate-fadeIn"
                  onClick={(e) => e.stopPropagation()}
                >
                  <h3 className="text-xs font-bold text-[#71717a] uppercase tracking-wider mb-1 flex items-center justify-between border-b border-[#202024] p-3 pb-2.5">
                    <span>Notifications ({unreadCount} unread)</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
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

            <button 
              onClick={() => setCurrentView('profile')}
              className="flex items-center space-x-2 text-xs font-medium text-[#a1a1aa] bg-[#131316] hover:bg-[#18181c] hover:text-white px-2.5 py-1.5 border border-[#202024] rounded-lg transition-colors cursor-pointer"
            >
              <div 
                className="w-5 h-5 rounded-full text-white flex items-center justify-center text-[10px] font-extrabold shrink-0 border border-white/5"
                style={{ backgroundColor: user.avatar_color || '#4f46e5' }}
              >
                {(user.username?.[0] || 'U').toUpperCase()}
              </div>
              <span>{user.username}</span>
            </button>
          </div>
        </header>

        {/* Main page content container */}
        <main className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto h-full">
            {renderActiveView()}
          </div>
        </main>
      </div>

      {/* FLOATING RECENT DROPDOWN POPUP OVERLAY */}
      {isRecentOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden" onClick={() => setIsRecentOpen(false)}>
          <div 
            className="absolute bg-[#131316] border border-[#202024] rounded-xl shadow-2xl p-4 w-[360px] text-[#f3f4f6] animate-fadeIn"
            style={{
              left: isSidebarOpen ? '260px' : '88px',
              top: '110px',
            }}
            onClick={(e) => e.stopPropagation()} // Prevent close on interior click
          >
            <h3 className="text-xs font-bold text-[#71717a] uppercase tracking-wider mb-3 flex items-center justify-between border-b border-[#202024] pb-2">
              <span>Recent Items</span>
              <button 
                onClick={() => setIsRecentOpen(false)}
                className="text-gray-500 hover:text-gray-300 font-bold text-[10px] cursor-pointer"
              >
                ✕
              </button>
            </h3>
            <Recent onNavigateToIssue={(projId, issueNo) => {
              handleNavigateToIssue(projId, issueNo);
              setIsRecentOpen(false);
            }} />
          </div>
        </div>
      )}

      {/* CREATE SPACE MODAL */}
      {isCreateSpaceModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#131316] border border-[#202024] rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Create New Space</h3>
              <button 
                onClick={() => {
                  setIsCreateSpaceModalOpen(false);
                  setNewSpaceName('');
                  setNewSpaceKey('');
                  setNewSpaceDescription('');
                  setCreateSpaceError('');
                }} 
                className="text-gray-500 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            {createSpaceError && (
              <div className="p-3 bg-red-950/20 border border-red-900/50 text-red-400 text-xs rounded-xl">
                {createSpaceError}
              </div>
            )}
            
            <form onSubmit={handleCreateSpace} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#71717a] uppercase mb-1.5">Space Name</label>
                <input
                  type="text"
                  required
                  value={newSpaceName}
                  onChange={(e) => {
                    setNewSpaceName(e.target.value);
                    if (!newSpaceKey) {
                      const words = e.target.value.trim().split(/\s+/);
                      let keySuggestion = "";
                      if (words.length >= 2) {
                        keySuggestion = (words[0][0] + words[1][0]).toUpperCase();
                      } else if (words[0]?.length >= 3) {
                        keySuggestion = words[0].slice(0, 3).toUpperCase();
                      }
                      setNewSpaceKey(keySuggestion.slice(0, 10));
                    }
                  }}
                  placeholder="e.g. Engineering Documentation"
                  className="w-full px-3 py-2 bg-[#09090b] border border-[#202024] text-white rounded-lg text-sm focus:outline-none focus:border-indigo-500/50"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-[#71717a] uppercase mb-1.5">Space Key (Unique)</label>
                <input
                  type="text"
                  required
                  maxLength={10}
                  value={newSpaceKey}
                  onChange={(e) => setNewSpaceKey(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''))}
                  placeholder="e.g. ENG"
                  className="w-full px-3 py-2 bg-[#09090b] border border-[#202024] text-white rounded-lg text-sm focus:outline-none focus:border-indigo-500/50 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#71717a] uppercase mb-1.5">Description</label>
                <textarea
                  value={newSpaceDescription}
                  onChange={(e) => setNewSpaceDescription(e.target.value)}
                  placeholder="Describe the purpose of this space..."
                  rows={3}
                  className="w-full px-3 py-2 bg-[#09090b] border border-[#202024] text-white rounded-lg text-sm focus:outline-none focus:border-indigo-500/50 resize-none"
                />
              </div>
              
              {selectedProjectId && (
                <div className="p-3 bg-indigo-950/20 border border-indigo-900/30 rounded-xl text-xs text-[#a1a1aa]">
                  This space will be restricted to the active project. Only project members will have access.
                </div>
              )}

              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateSpaceModalOpen(false);
                    setNewSpaceName('');
                    setNewSpaceKey('');
                    setNewSpaceDescription('');
                    setCreateSpaceError('');
                  }}
                  className="px-4 py-2 text-xs font-medium text-[#a1a1aa] hover:bg-[#121214] rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow transition-colors cursor-pointer"
                >
                  Create Space
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT SPACE MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md bg-[#0d0d0f] rounded-xl shadow-lg border border-[#202024] overflow-hidden animate-slideUp text-[#f3f4f6]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#202024]">
              <h3 className="text-lg font-bold text-white">Edit Space Details</h3>
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingSpace(null);
                }}
                className="text-gray-400 hover:text-gray-200 focus:outline-none cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editSpaceError && (
              <div className="mx-6 mt-4 p-3 bg-red-955/20 border border-red-900/50 text-red-400 text-xs rounded-lg">
                {editSpaceError}
              </div>
            )}

            <form onSubmit={handleUpdateSpace} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#71717a] uppercase mb-1.5">Space Name *</label>
                <input
                  type="text"
                  required
                  value={editSpaceName}
                  onChange={(e) => setEditSpaceName(e.target.value)}
                  placeholder="e.g. API Reference Guidelines"
                  className="w-full px-3 py-2 bg-[#09090b] border border-[#202024] text-white rounded-lg text-sm focus:outline-none focus:border-indigo-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#71717a] uppercase mb-1.5">Space Key (Unique) *</label>
                <input
                  type="text"
                  required
                  maxLength={10}
                  value={editSpaceKey}
                  onChange={(e) => setEditSpaceKey(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''))}
                  placeholder="e.g. API"
                  className="w-full px-3 py-2 bg-[#09090b] border border-[#202024] text-white rounded-lg text-sm focus:outline-none focus:border-indigo-500/50 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#71717a] uppercase mb-1.5">Description</label>
                <textarea
                  value={editSpaceDescription}
                  onChange={(e) => setEditSpaceDescription(e.target.value)}
                  placeholder="Describe the purpose of this space..."
                  rows={3}
                  className="w-full px-3 py-2 bg-[#09090b] border border-[#202024] text-white rounded-lg text-sm focus:outline-none focus:border-indigo-500/50 resize-none"
                />
              </div>

              <div className="pt-4 flex items-center justify-end space-x-3 border-t border-[#202024]">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingSpace(null);
                  }}
                  className="px-4 py-2 text-xs font-medium text-[#a1a1aa] hover:bg-[#121214] rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSpaceSubmitLoading}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow transition-colors cursor-pointer"
                >
                  {editSpaceSubmitLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
