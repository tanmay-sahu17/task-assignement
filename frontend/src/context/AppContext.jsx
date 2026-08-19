import React, { createContext, useState, useEffect, useContext } from 'react';
import { spaceAPI } from '../api/api';
import { AuthContext } from './AuthContext';

export const AppContext = createContext(null);

export function AppProvider({ children }) {
  const { token } = useContext(AuthContext);

  const [currentView, setCurrentView] = useState(() => {
    return localStorage.getItem('spacess_view') || 'dashboard';
  });
  const [previousView, setPreviousView] = useState('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState(() => {
    const val = localStorage.getItem('spacess_project_id');
    return val ? parseInt(val) : null;
  });
  const [selectedSpaceId, setSelectedSpaceId] = useState(() => {
    const val = localStorage.getItem('spacess_space_id');
    return val ? parseInt(val) : null;
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [spaces, setSpaces] = useState([]);

  // Confirm state
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    onCancel: null
  });

  const showConfirm = (message, onConfirm, title = "Confirm Action") => {
    setConfirmState({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmState(prev => ({ ...prev, isOpen: false }));
      },
      onCancel: () => {
        setConfirmState(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  useEffect(() => {
    window.showConfirm = showConfirm;
  }, []);

  // Sync state on change
  useEffect(() => {
    if (token) {
      localStorage.setItem('spacess_view', currentView);
      if (selectedProjectId) {
        localStorage.setItem('spacess_project_id', selectedProjectId.toString());
      } else {
        localStorage.removeItem('spacess_project_id');
      }
      if (selectedSpaceId) {
        localStorage.setItem('spacess_space_id', selectedSpaceId.toString());
      } else {
        localStorage.removeItem('spacess_space_id');
      }
    }
  }, [currentView, selectedProjectId, selectedSpaceId, token]);

  const fetchSpaces = async () => {
    if (!token) return;
    try {
      const data = await spaceAPI.getAll();
      setSpaces(data);
    } catch (err) {
      console.error("Failed to fetch spaces:", err);
    }
  };

  useEffect(() => {
    if (token) {
      fetchSpaces();
    }
  }, [token]);

  const deleteSpace = async (spaceId) => {
    showConfirm(
      "Are you sure you want to delete this space and all its issues/pages?",
      async () => {
        try {
          await spaceAPI.delete(spaceId);
          fetchSpaces();
          if (selectedSpaceId === spaceId) {
            setSelectedSpaceId(null);
            setCurrentView('dashboard');
          }
        } catch (err) {
          console.error(err);
          alert("Failed to delete space.");
        }
      },
      "Delete Space"
    );
  };

  return (
    <AppContext.Provider
      value={{
        currentView,
        setCurrentView,
        previousView,
        setPreviousView,
        selectedProjectId,
        setSelectedProjectId,
        selectedSpaceId,
        setSelectedSpaceId,
        isSidebarOpen,
        setIsSidebarOpen,
        spaces,
        setSpaces,
        fetchSpaces,
        deleteSpace,
        confirmState,
        showConfirm
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
