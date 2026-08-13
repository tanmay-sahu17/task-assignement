import React, { useEffect, useState } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Projects from './components/Projects';
import Board from './components/Board';
import AcceptInvite from './components/AcceptInvite';
import SpacesList from './components/SpacesList';
import Profile from './components/Profile';
import Recent from './components/Recent';
import { authAPI, spaceAPI } from './api/api';
import { LayoutGrid, FolderKanban, LogOut, Menu, X, User, BookOpen, Clock, Plus, MoreVertical } from 'lucide-react';

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
            <h2 className="text-sm font-bold text-[#71717a] uppercase tracking-wider">
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
          </div>
          <div className="flex items-center space-x-4">
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
