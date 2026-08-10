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
import { LayoutGrid, FolderKanban, LogOut, Menu, X, User, BookOpen, Clock } from 'lucide-react';

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
              onClick={() => setCurrentView('dashboard')}
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
              onClick={() => setCurrentView('projects')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                currentView === 'projects' || currentView === 'board'
                  ? 'bg-[#1c1c1f] text-[#f3f4f6] border border-[#2b2b32]'
                  : 'text-[#a1a1aa] hover:bg-[#121214] hover:text-[#e4e4e7] border border-transparent'
              }`}
            >
              <FolderKanban className="w-5 h-5 shrink-0" />
              {isSidebarOpen && <span className="truncate">Projects</span>}
            </button>

            <button
              onClick={() => setCurrentView('spaces')}
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
              onClick={() => setCurrentView('profile')}
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
          <div className="pt-4 mt-4 border-t border-[#1a1a1e]">
            <div className="px-3 py-1.5 flex items-center justify-between text-xs font-bold text-[#71717a] uppercase tracking-wider">
              <span>Spaces</span>
            </div>
            <div className="space-y-0.5 mt-1 max-h-[25vh] overflow-y-auto pr-1">
              {spaces.map(s => {
                const isSelected = currentView === 'board' && selectedSpaceId === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => handleNavigateToSpace(s.id)}
                    className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-indigo-950/30 text-indigo-400 border border-indigo-900/30 font-semibold'
                        : 'text-[#a1a1aa] hover:bg-[#121214] hover:text-[#e4e4e7] border border-transparent'
                    }`}
                  >
                    <div className="w-5 h-5 rounded bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold text-[9px] shrink-0 font-mono">
                      {s.key}
                    </div>
                    {isSidebarOpen && <span className="truncate">{s.name}</span>}
                  </button>
                );
              })}
            </div>
          </div>
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
    </div>
  );
}
