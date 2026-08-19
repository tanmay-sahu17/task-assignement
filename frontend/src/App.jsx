import React, { useEffect, useState, useContext } from 'react';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { AppProvider, AppContext } from './context/AppContext';
import Login from './components/auth/Login';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import Board from './pages/Board';
import AcceptInvite from './pages/AcceptInvite';
import SpacesList from './pages/SpacesList';
import Profile from './pages/Profile';
import Recent from './pages/Recent';
import AppLayout from './components/layout/AppLayout';
import CreateSpaceModal from './components/spaces/CreateSpaceModal';
import EditSpaceModal from './components/spaces/EditSpaceModal';
import ConfirmDialog from './components/ui/ConfirmDialog';
import { spaceAPI } from './api/api';

function MainRouter() {
  const { user, token, loading, updateProfile, setUser, setToken } = useContext(AuthContext);
  const {
    currentView,
    setCurrentView,
    previousView,
    setPreviousView,
    selectedProjectId,
    setSelectedProjectId,
    selectedSpaceId,
    setSelectedSpaceId,
    fetchSpaces,
    confirmState
  } = useContext(AppContext);

  const [initialSelectedIssueNo, setInitialSelectedIssueNo] = useState(null);
  const [inviteToken, setInviteToken] = useState(null);

  // Space Modal States
  const [isCreateSpaceModalOpen, setIsCreateSpaceModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingSpace, setEditingSpace] = useState(null);

  // Check URL for invite token on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get('token');
    if (tokenParam && !localStorage.getItem('token')) {
      setInviteToken(tokenParam);
    }
  }, []);

  const handleLoginSuccess = (loggedInUser) => {
    const freshToken = localStorage.getItem('token');
    setToken(freshToken);
    setUser(loggedInUser);
  };

  const handleNavigateToProject = async (id) => {
    if (currentView !== 'board') {
      setPreviousView(currentView);
    }
    setSelectedProjectId(id);
    try {
      const spaceList = await spaceAPI.getAll();
      const projSpaces = spaceList.filter(s => s.project === id);
      if (projSpaces.length > 0) {
        handleNavigateToSpace(projSpaces[0].id);
      } else {
        const defaultSpace = await spaceAPI.create({
          name: "Default Space",
          key: `SP-${id}`,
          project: id
        });
        await fetchSpaces();
        handleNavigateToSpace(defaultSpace.id);
      }
    } catch (err) {
      console.error("Failed to navigate to project first space", err);
    }
  };

  const handleNavigateToSpace = (id) => {
    if (currentView !== 'board') {
      setPreviousView(currentView);
    }
    setSelectedSpaceId(id);
    setInitialSelectedIssueNo(null);
    setCurrentView('board');
  };

  const handleNavigateToIssue = (spaceId, issueNo) => {
    if (currentView !== 'board') {
      setPreviousView(currentView);
    }
    setSelectedSpaceId(spaceId);
    setInitialSelectedIssueNo(issueNo);
    setCurrentView('board');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090b]">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle Invite token link scenario
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
      case 'spaces':
        return (
          <SpacesList
            currentUser={user}
          />
        );
      case 'recent':
        return (
          <Recent
            onNavigateToIssue={handleNavigateToIssue}
          />
        );
      case 'profile':
        return (
          <Profile
            currentUser={user}
            onProfileUpdate={updateProfile}
          />
        );
      case 'board':
        return (
          <Board
            spaceId={selectedSpaceId}
            currentUser={user}
            onBack={() => {
              const destination = ['dashboard', 'projects', 'spaces', 'recent'].includes(previousView) ? previousView : 'projects';
              setCurrentView(destination);
            }}
            initialSelectedIssueNo={initialSelectedIssueNo}
            onClearInitialSelectedIssue={() => setInitialSelectedIssueNo(null)}
          />
        );
      default:
        return <Dashboard user={user} onNavigateToProject={handleNavigateToProject} />;
    }
  };

  return (
    <>
      <AppLayout
        onNavigateToIssue={handleNavigateToIssue}
        onNavigateToSpace={handleNavigateToSpace}
        onCreateSpaceClick={() => setIsCreateSpaceModalOpen(true)}
        onEditSpaceClick={(space) => {
          setEditingSpace(space);
          setIsEditModalOpen(true);
        }}
      >
        {renderActiveView()}
      </AppLayout>

      {/* CREATE SPACE MODAL */}
      <CreateSpaceModal
        isOpen={isCreateSpaceModalOpen}
        onClose={() => setIsCreateSpaceModalOpen(false)}
        projectId={selectedProjectId}
      />

      {/* EDIT SPACE MODAL */}
      <EditSpaceModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingSpace(null);
        }}
        space={editingSpace}
      />

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={confirmState.onConfirm}
        onCancel={confirmState.onCancel}
      />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <MainRouter />
      </AppProvider>
    </AuthProvider>
  );
}
