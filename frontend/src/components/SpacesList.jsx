import React, { useEffect, useState } from 'react';
import { spaceAPI, pageAPI, projectAPI } from '../api/api';
import { BookOpen, FolderKanban, Plus, X, Loader2, Save, Trash2, Calendar, FileText, Search } from 'lucide-react';
import Loader from './Loader';

export default function SpacesList({ currentUser }) {
  const [spaces, setSpaces] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Selection states
  const [selectedSpace, setSelectedSpace] = useState(null);
  const [pages, setPages] = useState([]);
  const [selectedPage, setSelectedPage] = useState(null);
  const [pageSearch, setPageSearch] = useState('');

  // Modals / Forms
  const [isSpaceModalOpen, setIsSpaceModalOpen] = useState(false);
  const [spaceName, setSpaceName] = useState('');
  const [spaceKey, setSpaceKey] = useState('');
  const [spaceProject, setSpaceProject] = useState('');
  const [spaceError, setSpaceError] = useState('');
  const [spaceSubmitLoading, setSpaceSubmitLoading] = useState(false);

  // Editor states (local copies for inputs)
  const [editorTitle, setEditorTitle] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [editorSaving, setEditorSaving] = useState(false);
  const [editorMessage, setEditorMessage] = useState('');

  const loadSpaces = async () => {
    try {
      const [spaceData, projectData] = await Promise.all([
        spaceAPI.getAll(),
        projectAPI.getAll().catch(() => [])
      ]);
      setSpaces(spaceData);
      setProjects(projectData);
    } catch (err) {
      console.error('Failed to load spaces data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSpaces();
  }, []);

  // Fetch pages when space changes
  useEffect(() => {
    if (selectedSpace) {
      setPages([]);
      setSelectedPage(null);
      pageAPI.getBySpace(selectedSpace.id)
        .then(data => {
          setPages(data);
          if (data.length > 0) {
            handleSelectPage(data[0]);
          }
        })
        .catch(err => console.error('Failed to load space pages', err));
    }
  }, [selectedSpace]);

  const handleSelectPage = (page) => {
    setSelectedPage(page);
    setEditorTitle(page.title);
    setEditorContent(page.content || '');
    setEditorMessage('');
  };

  const handleCreateSpace = async (e) => {
    e.preventDefault();
    if (!spaceName || !spaceKey) {
      setSpaceError('Space name and unique key are required.');
      return;
    }
    setSpaceError('');
    setSpaceSubmitLoading(true);
    try {
      const newSpace = await spaceAPI.create({
        name: spaceName,
        key: spaceKey.toUpperCase(),
        project: spaceProject || null
      });
      setSpaces([...spaces, newSpace]);
      setSelectedSpace(newSpace);
      setIsSpaceModalOpen(false);
      setSpaceName('');
      setSpaceKey('');
      setSpaceProject('');
    } catch (err) {
      setSpaceError(err.response?.data?.key?.[0] || err.response?.data?.error || 'Failed to create Space.');
    } finally {
      setSpaceSubmitLoading(false);
    }
  };

  const handleDeleteSpace = async (spaceId) => {
    if (!window.confirm('Are you sure you want to delete this documentation Space and all its pages?')) return;
    try {
      await spaceAPI.delete(spaceId);
      setSpaces(spaces.filter(s => s.id !== spaceId));
      if (selectedSpace?.id === spaceId) {
        setSelectedSpace(null);
        setPages([]);
        setSelectedPage(null);
      }
    } catch (err) {
      alert('Failed to delete Space.');
    }
  };

  const handleCreatePage = async () => {
    if (!selectedSpace) return;
    try {
      const newPage = await pageAPI.create({
        space: selectedSpace.id,
        title: 'Untitled Page',
        content: ''
      });
      setPages([newPage, ...pages]);
      handleSelectPage(newPage);
    } catch (err) {
      alert('Failed to create Page.');
    }
  };

  const handleSavePage = async () => {
    if (!selectedPage) return;
    setEditorSaving(true);
    setEditorMessage('');
    try {
      const updated = await pageAPI.update(selectedPage.id, {
        title: editorTitle,
        content: editorContent
      });
      // Update in local pages lists
      setPages(pages.map(p => p.id === updated.id ? updated : p));
      setSelectedPage(updated);
      setEditorMessage('Document saved successfully.');
      setTimeout(() => setEditorMessage(''), 3000);
    } catch (err) {
      setEditorMessage('Failed to save document changes.');
    } finally {
      setEditorSaving(false);
    }
  };

  const handleDeletePage = async (pageId) => {
    if (!window.confirm('Delete this page permanently?')) return;
    try {
      await pageAPI.delete(pageId);
      const remaining = pages.filter(p => p.id !== pageId);
      setPages(remaining);
      if (selectedPage?.id === pageId) {
        if (remaining.length > 0) {
          handleSelectPage(remaining[0]);
        } else {
          setSelectedPage(null);
        }
      }
    } catch (err) {
      alert('Failed to delete page.');
    }
  };

  if (loading) {
    return <Loader text="Loading Space documents..." fullScreen={false} />;
  }

  const filteredPages = pages.filter(p => 
    p.title.toLowerCase().includes(pageSearch.toLowerCase()) || 
    p.content?.toLowerCase().includes(pageSearch.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-[#09090b] border border-[#202024] rounded-2xl shadow-xl overflow-hidden text-[#f3f4f6] animate-fadeIn">
      {/* 1. SPACES DIRECTORY (Left Sidebar) */}
      <aside className="w-64 bg-[#0c0c0e] border-r border-[#202024] flex flex-col justify-between shrink-0">
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-[#71717a] uppercase tracking-wider">Docs & Spaces</h3>
            <button
              onClick={() => setIsSpaceModalOpen(true)}
              className="p-1 hover:bg-[#18181c] border border-[#202024] rounded text-indigo-400 hover:text-indigo-300 transition-colors focus:outline-none cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1.5 overflow-y-auto max-h-[calc(100vh-16rem)]">
            {spaces.length === 0 ? (
              <p className="text-[11px] text-[#52525b] italic p-2 text-center">No spaces created yet.</p>
            ) : (
              spaces.map(s => {
                const isActive = selectedSpace?.id === s.id;
                return (
                  <div
                    key={s.id}
                    className={`group flex items-center justify-between px-3 py-2 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                      isActive 
                        ? 'bg-[#1c1c1f] text-white border-[#2b2b32]' 
                        : 'text-[#a1a1aa] bg-transparent border-transparent hover:bg-[#131316] hover:text-white'
                    }`}
                    onClick={() => setSelectedSpace(s)}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <span className="w-6 h-6 rounded bg-[#1e1e23] border border-[#2b2b35] flex items-center justify-center text-[9px] font-bold text-indigo-400 shrink-0">
                        {s.key}
                      </span>
                      <span className="truncate">{s.name}</span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSpace(s.id);
                      }}
                      className="p-0.5 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Global indicator */}
        <div className="p-4 border-t border-[#202024] bg-[#09090b]/55 flex items-center space-x-2 text-[10px] text-[#71717a]">
          <BookOpen className="w-3.5 h-3.5 text-gray-500" />
          <span>Documentation Engine v1.0</span>
        </div>
      </aside>

      {/* 2. PAGES LIST PANEL (Middle Panel) */}
      {selectedSpace ? (
        <div className="w-72 bg-[#09090b] border-r border-[#202024] flex flex-col justify-between shrink-0">
          <div className="p-4 space-y-4">
            {/* Header info */}
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-[10px] font-bold px-1.5 py-0.5 bg-indigo-950/40 border border-indigo-900/50 text-indigo-400 rounded">
                  {selectedSpace.key}
                </span>
                {selectedSpace.project_details && (
                  <span className="text-[9px] font-medium text-[#71717a] flex items-center">
                    <FolderKanban className="w-3 h-3 mr-1 text-[#52525b]" />
                    {selectedSpace.project_details.key} Project
                  </span>
                )}
              </div>
              <h2 className="text-sm font-bold text-white mt-1.5 truncate">{selectedSpace.name}</h2>
            </div>

            {/* Page Search */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-gray-600">
                <Search className="w-3.5 h-3.5" />
              </span>
              <input
                type="text"
                value={pageSearch}
                onChange={(e) => setPageSearch(e.target.value)}
                className="w-full pl-7 pr-3 py-1.5 bg-[#131316] border border-[#202024] text-[#d4d4d8] placeholder-[#52525b] rounded-lg text-xs focus:outline-none"
                placeholder="Search pages..."
              />
            </div>

            {/* Pages Navigation */}
            <div className="space-y-1 overflow-y-auto max-h-[calc(100vh-24rem)]">
              {filteredPages.length === 0 ? (
                <p className="text-[11px] text-[#52525b] italic text-center p-4">No pages found.</p>
              ) : (
                filteredPages.map(p => {
                  const isActive = selectedPage?.id === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => handleSelectPage(p)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center space-x-2 border transition-all ${
                        isActive
                          ? 'bg-[#1c1c1f] text-white border-[#2b2b32]'
                          : 'text-[#71717a] hover:bg-[#131316] hover:text-[#a1a1aa] border-transparent'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                      <span className="truncate flex-1">{p.title || 'Untitled Page'}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Add Page Control */}
          <div className="p-4 border-t border-[#202024] bg-[#0c0c0e]/40">
            <button
              onClick={handleCreatePage}
              className="w-full flex items-center justify-center py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-colors focus:outline-none cursor-pointer"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Add Documentation Page
            </button>
          </div>
        </div>
      ) : (
        /* Empty Space Placeholder */
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#09090b]">
          <BookOpen className="w-16 h-16 text-[#202024] mb-4" />
          <h3 className="text-lg font-bold text-white">Select a Documentation Space</h3>
          <p className="text-xs text-[#71717a] mt-1">Choose a documentation space from the left sidebar or create a new one.</p>
        </div>
      )}

      {/* 3. EDITOR PANEL (Right Main Panel) */}
      {selectedSpace && (
        selectedPage ? (
          <div className="flex-1 bg-[#09090b] flex flex-col overflow-hidden">
            {/* Toolbar */}
            <div className="h-14 border-b border-[#202024] px-6 flex items-center justify-between shrink-0 bg-[#0d0d0f]">
              <div className="flex items-center space-x-3 text-xs text-[#71717a]">
                <span>Author: <span className="font-semibold text-[#a1a1aa]">{selectedPage.created_by_details?.username}</span></span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#202024]"></span>
                <span className="flex items-center"><Calendar className="w-3.5 h-3.5 mr-1" /> {new Date(selectedPage.updated_at).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center space-x-3">
                {editorMessage && (
                  <span className={`text-xs font-semibold ${editorMessage.includes('failed') ? 'text-red-400' : 'text-green-400'}`}>
                    {editorMessage}
                  </span>
                )}
                <button
                  onClick={() => handleDeletePage(selectedPage.id)}
                  className="p-1.5 border border-[#202024] hover:bg-red-955/20 text-gray-500 hover:text-red-400 rounded-lg transition-colors focus:outline-none cursor-pointer"
                  title="Delete Page"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={handleSavePage}
                  disabled={editorSaving}
                  className="inline-flex items-center px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold text-xs rounded-lg transition-colors focus:outline-none cursor-pointer"
                >
                  {editorSaving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  ) : (
                    <Save className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  Save Document
                </button>
              </div>
            </div>

            {/* Document Editor Fields */}
            <div className="flex-1 p-8 space-y-4 overflow-y-auto">
              <input
                type="text"
                value={editorTitle}
                onChange={(e) => setEditorTitle(e.target.value)}
                className="w-full text-2xl font-bold bg-transparent text-white border-b border-transparent hover:border-[#202024] focus:border-indigo-500 py-1.5 focus:outline-none transition-colors"
                placeholder="Page Title"
              />

              <textarea
                value={editorContent}
                onChange={(e) => setEditorContent(e.target.value)}
                className="w-full h-[calc(100vh-22rem)] bg-transparent resize-none outline-none text-sm text-[#d4d4d8] placeholder-[#3f3f46] leading-relaxed"
                placeholder="Start writing documentation for your team. You can outline database structures, guidelines, or setup notes here..."
              />
            </div>
          </div>
        ) : (
          /* Empty Page Placeholder */
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#09090b]">
            <FileText className="w-12 h-12 text-[#202024] mb-4" />
            <h3 className="text-md font-bold text-white">This Space is Empty</h3>
            <p className="text-xs text-[#71717a] mt-1">Create a documentation page to start writing notes for your team.</p>
          </div>
        )
      )}

      {/* CREATE SPACE MODAL */}
      {isSpaceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md bg-[#0d0d0f] rounded-xl shadow-lg border border-[#202024] overflow-hidden animate-slideUp text-[#f3f4f6]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#202024]">
              <h3 className="text-lg font-bold text-white">Create Documentation Space</h3>
              <button
                onClick={() => setIsSpaceModalOpen(false)}
                className="text-gray-400 hover:text-gray-200 focus:outline-none cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {spaceError && (
              <div className="mx-6 mt-4 p-3 bg-red-955/20 border border-red-900/50 text-red-400 text-xs rounded-lg">
                {spaceError}
              </div>
            )}

            <form onSubmit={handleCreateSpace} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#71717a] uppercase mb-1.5">Space Name *</label>
                <input
                  type="text"
                  required
                  value={spaceName}
                  onChange={(e) => setSpaceName(e.target.value)}
                  placeholder="e.g. API Reference Guidelines"
                  className="w-full px-3 py-2 bg-[#131316] border border-[#202024] text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#71717a] uppercase mb-1.5">Space Key (Unique) *</label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={spaceKey}
                    onChange={(e) => setSpaceKey(e.target.value)}
                    placeholder="e.g. API"
                    className="w-full px-3 py-2 bg-[#131316] border border-[#202024] text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#71717a] uppercase mb-1.5">Project Scoping</label>
                  <select
                    value={spaceProject}
                    onChange={(e) => setSpaceProject(e.target.value)}
                    className="w-full px-3 py-2 bg-[#131316] border border-[#202024] text-white rounded-lg text-sm focus:outline-none"
                  >
                    <option value="">Global (Entire Workspace)</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end space-x-3 border-t border-[#202024]">
                <button
                  type="button"
                  onClick={() => setIsSpaceModalOpen(false)}
                  className="px-4 py-2 border border-[#202024] hover:bg-[#18181c] text-[#71717a] hover:text-white font-medium text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={spaceSubmitLoading}
                  className="flex items-center justify-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold text-xs rounded-lg transition-colors focus:outline-none cursor-pointer"
                >
                  {spaceSubmitLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                      Creating...
                    </>
                  ) : (
                    'Create Space'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
