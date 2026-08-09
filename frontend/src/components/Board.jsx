import React, { useEffect, useState } from 'react';
import { projectAPI, issueAPI, commentAPI, authAPI } from '../api/api';
import { Plus, X, Loader2, ArrowLeft, Search, MessageSquare, Trash2, Calendar, User, Users } from 'lucide-react';

export default function Board({ projectId, onBack, currentUser }) {
  const [project, setProject] = useState(null);
  const [issues, setIssues] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState(null); // For detail view modal
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false); // For managing project members

  // Create issue form states
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState('BU');
  const [newStatus, setNewStatus] = useState('OP');
  const [newPriority, setNewPriority] = useState('ME');
  const [newDetails, setNewDetails] = useState('');
  const [newAssignee, setNewAssignee] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  // Members modal form states
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [membersSubmitLoading, setMembersSubmitLoading] = useState(false);

  // Comment state inside detail modal
  const [comments, setComments] = useState([]);
  const [commentContent, setCommentContent] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);

  const loadData = async () => {
    try {
      const [projData, issueData, userData] = await Promise.all([
        projectAPI.getOne(projectId),
        issueAPI.getAll({ project: projectId }),
        authAPI.getUsers(),
      ]);
      setProject(projData);
      setIssues(issueData);
      setUsers(userData);
    } catch (err) {
      console.error('Failed to load board details', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId]);

  // Load comments when an issue is selected
  useEffect(() => {
    if (selectedIssue) {
      commentAPI.getByIssue(selectedIssue.issue_no)
        .then(setComments)
        .catch(err => console.error("Failed to load comments", err));
    } else {
      setComments([]);
    }
  }, [selectedIssue]);

  // Drag and Drop Handlers
  const handleDragStart = (e, issue) => {
    e.dataTransfer.setData('text/plain', issue.issue_no);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault();
    const issueNo = e.dataTransfer.getData('text/plain');
    if (!issueNo) return;

    // Optimistically update status in UI
    const updatedIssues = issues.map((i) => {
      if (i.issue_no.toString() === issueNo.toString()) {
        return { ...i, status: targetStatus, status_display: targetStatus === 'OP' ? 'Open' : targetStatus === 'IN' ? 'In Progress' : 'Closed' };
      }
      return i;
    });
    setIssues(updatedIssues);

    try {
      await issueAPI.update(issueNo, { status: targetStatus });
      const freshIssues = await issueAPI.getAll({ project: projectId });
      setIssues(freshIssues);
    } catch (err) {
      console.error('Failed to update issue status', err);
      loadData();
    }
  };

  const handleCreateIssue = async (e) => {
    e.preventDefault();
    if (!newTitle) {
      setCreateError('Issue title is required.');
      return;
    }
    setCreateError('');
    setCreateLoading(true);
    try {
      const data = {
        project: projectId,
        title: newTitle,
        type: newType,
        status: newStatus,
        priority: newPriority,
        details: newDetails,
        assignee: newAssignee || null,
        label: newLabel,
      };
      await issueAPI.create(data);
      setIsCreateModalOpen(false);
      setNewTitle('');
      setNewDetails('');
      setNewAssignee('');
      setNewLabel('');
      loadData();
    } catch (err) {
      setCreateError(err.response?.data?.assignee?.[0] || 'Failed to create issue.');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleIssueUpdateField = async (field, value) => {
    if (!selectedIssue) return;
    try {
      const updated = await issueAPI.update(selectedIssue.issue_no, { [field]: value });
      setSelectedIssue(updated);
      setIssues(issues.map(i => i.issue_no === updated.issue_no ? updated : i));
    } catch (err) {
      console.error(`Failed to update issue field ${field}`, err);
      if (err.response?.data?.assignee) {
        alert(err.response.data.assignee[0]);
      }
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentContent.trim() || !selectedIssue) return;
    setCommentLoading(true);
    try {
      const newComment = await commentAPI.create({
        content: commentContent,
        issue: selectedIssue.issue_no,
      });
      setComments([...comments, newComment]);
      setCommentContent('');
    } catch (err) {
      console.error("Failed to add comment", err);
    } finally {
      setCommentLoading(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await commentAPI.delete(commentId);
      setComments(comments.filter(c => c.id !== commentId));
    } catch (err) {
      console.error("Failed to delete comment", err);
    }
  };

  const filteredIssues = issues.filter((issue) => {
    const matchesSearch = issue.title.toLowerCase().includes(search.toLowerCase()) || 
                          issue.issue_no.toString().includes(search) ||
                          issue.label?.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType ? issue.type === filterType : true;
    const matchesPriority = filterPriority ? issue.priority === filterPriority : true;
    const matchesAssignee = filterAssignee ? issue.assignee?.toString() === filterAssignee.toString() : true;
    return matchesSearch && matchesType && matchesPriority && matchesAssignee;
  });

  const getIssuesByStatus = (statusVal) => {
    return filteredIssues.filter((i) => i.status === statusVal);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const getPriorityBadgeStyle = (priority) => {
    switch (priority) {
      case 'CR': return 'bg-red-950/20 text-red-400 border-red-900/50';
      case 'HI': return 'bg-orange-955/20 text-orange-400 border-orange-900/50';
      case 'ME': return 'bg-yellow-950/20 text-yellow-500 border-yellow-900/50';
      default: return 'bg-[#1c1c1f] text-[#71717a] border-[#2b2b30]';
    }
  };

  const getTypeStyle = (type) => {
    switch (type) {
      case 'BU': return 'bg-red-950/40 text-red-400 border border-red-900/50';
      case 'ST': return 'bg-yellow-950/40 text-yellow-500 border border-yellow-900/50';
      default: return 'bg-blue-955/40 text-indigo-400 border border-indigo-900/50';
    }
  };

  const projectMembers = project?.members_details || [];

  return (
    <div className="space-y-6 animate-fadeIn text-[#f3f4f6]">
      {/* Header and Back Button */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="p-2 border border-[#202024] hover:bg-[#18181c] rounded-lg text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">{project?.name}</h1>
            <p className="text-sm text-[#71717a] mt-1">Project Key: <span className="font-semibold text-[#a1a1aa]">{project?.key}</span></p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              setSelectedMemberIds(project?.members || []);
              setIsMembersModalOpen(true);
            }}
            className="inline-flex items-center px-4 py-2 border border-[#202024] hover:bg-[#18181c] text-[#a1a1aa] hover:text-white font-medium text-sm rounded-lg transition-colors shadow-sm focus:outline-none cursor-pointer"
          >
            <Users className="w-4 h-4 mr-2 text-gray-500" />
            {currentUser.id === project?.lead || currentUser.is_superuser ? 'Manage Team' : 'Team Members'}
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-lg transition-colors shadow-sm focus:outline-none cursor-pointer"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Issue
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-[#131316] border border-[#202024] rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center space-y-3 md:space-y-0 md:space-x-4">
        {/* Search */}
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#0d0d0f] border border-[#202024] text-white rounded-lg text-xs focus:outline-none focus:bg-[#131316] transition-all"
            placeholder="Search by title, label or #issue"
          />
        </div>

        {/* Type Filter */}
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-2 bg-[#0d0d0f] border border-[#202024] rounded-lg text-xs text-[#a1a1aa] focus:outline-none"
        >
          <option value="">All Types</option>
          <option value="ST">Story</option>
          <option value="BU">Bug</option>
          <option value="TA">Task</option>
        </select>

        {/* Priority Filter */}
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="px-3 py-2 bg-[#0d0d0f] border border-[#202024] rounded-lg text-xs text-[#a1a1aa] focus:outline-none"
        >
          <option value="">All Priorities</option>
          <option value="LO">Low</option>
          <option value="ME">Medium</option>
          <option value="HI">High</option>
          <option value="CR">Critical</option>
        </select>

        {/* Assignee Filter */}
        <select
          value={filterAssignee}
          onChange={(e) => setFilterAssignee(e.target.value)}
          className="px-3 py-2 bg-[#0d0d0f] border border-[#202024] rounded-lg text-xs text-[#a1a1aa] focus:outline-none"
        >
          <option value="">All Assignees</option>
          {projectMembers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.username}
            </option>
          ))}
        </select>
      </div>

      {/* Kanban Board Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[
          { title: 'To Do / Open', status: 'OP', color: 'bg-gray-100 border-gray-200' },
          { title: 'In Progress', status: 'IN', color: 'bg-blue-50/50 border-blue-100' },
          { title: 'Done / Closed', status: 'CL', color: 'bg-green-50/30 border-green-100' },
        ].map((column) => {
          const colIssues = getIssuesByStatus(column.status);
          return (
            <div
              key={column.status}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, column.status)}
              className="border border-[#202024] rounded-xl bg-[#0d0d0f] shadow-sm flex flex-col h-[600px] min-h-[300px] transition-colors"
            >
              {/* Column Header */}
              <div className="p-4 border-b border-[#202024] flex items-center justify-between bg-[#131316] rounded-t-xl">
                <h3 className="font-bold text-[#e4e4e7] text-sm">{column.title}</h3>
                <span className="px-2 py-0.5 bg-[#1c1c1f] text-[#a1a1aa] border border-[#282830] text-xs font-semibold rounded-full">
                  {colIssues.length}
                </span>
              </div>

              {/* Cards List */}
              <div className="p-3 space-y-3 overflow-y-auto flex-1 bg-[#09090b]">
                {colIssues.length === 0 ? (
                  <div className="h-24 border border-dashed border-[#202024] hover:border-[#2b2b30] rounded-lg flex items-center justify-center text-xs text-[#52525b]">
                    Drag issues here
                  </div>
                ) : (
                  colIssues.map((issue) => (
                    <div
                      key={issue.issue_no}
                      draggable
                      onDragStart={(e) => handleDragStart(e, issue)}
                      onClick={() => setSelectedIssue(issue)}
                      className="bg-[#131316] border border-[#202024] rounded-xl p-4 shadow-sm hover:border-[#2e2e36] cursor-pointer transition-all space-y-3"
                    >
                      {/* Badge / Key */}
                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-0.5 text-[9px] font-bold rounded ${getTypeStyle(issue.type)}`}>
                          {issue.type_display}
                        </span>
                        <span className="text-[10px] font-semibold text-[#52525b]">
                          #{issue.issue_no}
                        </span>
                      </div>

                      {/* Title */}
                      <h4 className="text-sm font-semibold text-[#e4e4e7] leading-tight">
                        {issue.title}
                      </h4>

                      {/* Details Footer */}
                      <div className="flex items-center justify-between pt-2 border-t border-[#1c1c20] flex-wrap gap-2">
                        <div className="flex items-center space-x-1.5">
                          <span className={`px-2 py-0.5 text-[9px] font-semibold border rounded ${getPriorityBadgeStyle(issue.priority)}`}>
                            {issue.priority_display}
                          </span>
                          {issue.label && (
                            <span className="px-2 py-0.5 text-[9px] font-semibold border border-indigo-900/50 bg-[#151520] text-indigo-400 rounded truncate max-w-[100px]">
                              {issue.label}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-1 text-xs text-[#71717a]">
                          <User className="w-3 h-3 text-gray-500" />
                          <span className="font-medium truncate max-w-[80px]">
                            {issue.assignee_details?.username || 'Unassigned'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* CREATE ISSUE MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-xl bg-[#0d0d0f] rounded-xl shadow-lg border border-[#202024] overflow-hidden animate-slideUp text-[#f3f4f6]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#202024]">
              <h3 className="text-lg font-bold text-white">Create New Issue</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-500 hover:text-gray-300 focus:outline-none cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div className="mx-6 mt-4 p-3 bg-red-950/20 border border-red-900/50 text-red-400 text-xs rounded-lg animate-fadeIn">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateIssue} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#71717a] uppercase tracking-wider mb-1.5">
                  Summary / Title *
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-[#131316] border border-[#202024] rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  placeholder="What needs to be done?"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#71717a] uppercase tracking-wider mb-1.5">
                    Issue Type
                  </label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    className="w-full px-3 py-2 bg-[#131316] border border-[#202024] text-white rounded-lg text-sm focus:outline-none"
                  >
                    <option value="ST">Story</option>
                    <option value="BU">Bug</option>
                    <option value="TA">Task</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#71717a] uppercase tracking-wider mb-1.5">
                    Priority
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="w-full px-3 py-2 bg-[#131316] border border-[#202024] text-white rounded-lg text-sm focus:outline-none"
                  >
                    <option value="LO">Low</option>
                    <option value="ME">Medium</option>
                    <option value="HI">High</option>
                    <option value="CR">Critical</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#71717a] uppercase tracking-wider mb-1.5">
                    Status
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-[#131316] border border-[#202024] text-white rounded-lg text-sm focus:outline-none"
                  >
                    <option value="OP">Open</option>
                    <option value="IN">In Progress</option>
                    <option value="CL">Closed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#71717a] uppercase tracking-wider mb-1.5">
                    Assignee
                  </label>
                  <select
                    value={newAssignee}
                    onChange={(e) => setNewAssignee(e.target.value)}
                    className="w-full px-3 py-2 bg-[#131316] border border-[#202024] text-white rounded-lg text-sm focus:outline-none"
                  >
                    <option value="">Unassigned</option>
                    {projectMembers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.username}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#71717a] uppercase tracking-wider mb-1.5">
                    Label
                  </label>
                  <input
                    type="text"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    className="w-full px-3 py-2 bg-[#131316] border border-[#202024] text-white rounded-lg text-sm focus:outline-none"
                    placeholder="e.g. Front-end"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#71717a] uppercase tracking-wider mb-1.5">
                  Details / Description
                </label>
                <textarea
                  rows={4}
                  value={newDetails}
                  onChange={(e) => setNewDetails(e.target.value)}
                  className="w-full px-3 py-2 bg-[#131316] border border-[#202024] rounded-lg text-sm text-white focus:outline-none transition-all"
                  placeholder="Explain the technical requirements..."
                />
              </div>

              <div className="pt-4 flex items-center justify-end space-x-3 border-t border-[#202024]">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-[#202024] hover:bg-[#18181c] text-[#71717a] hover:text-white font-medium text-sm rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="flex items-center justify-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold text-sm rounded-lg transition-colors focus:outline-none cursor-pointer"
                >
                  {createLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Creating...
                    </>
                  ) : (
                    'Create Issue'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL MODAL (INLINE VIEWS + COMMENTS) */}
      {selectedIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-4xl bg-[#0d0d0f] rounded-xl shadow-2xl border border-[#202024] overflow-hidden flex flex-col md:flex-row h-[90vh] md:h-[80vh] animate-slideUp text-[#f3f4f6]">
            {/* Left Main Panel */}
            <div className="flex-1 p-6 overflow-y-auto space-y-6 border-b md:border-b-0 md:border-r border-[#202024]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#52525b]">
                  Issue ID: #{selectedIssue.issue_no}
                </span>
                <span className={`px-2 py-0.5 text-xs font-bold rounded ${getTypeStyle(selectedIssue.type)}`}>
                  {selectedIssue.type_display}
                </span>
              </div>

              {/* Title Input */}
              <input
                type="text"
                value={selectedIssue.title}
                onChange={(e) => handleIssueUpdateField('title', e.target.value)}
                className="w-full text-xl font-bold text-white border-b border-transparent hover:border-[#202024] focus:border-indigo-500 py-1 focus:outline-none transition-colors"
              />

              {/* Description */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-[#71717a] uppercase tracking-wider">
                  Description
                </label>
                <textarea
                  value={selectedIssue.details}
                  onChange={(e) => handleIssueUpdateField('details', e.target.value)}
                  rows={4}
                  className="w-full p-3 text-sm text-[#d4d4d8] bg-[#131316] border border-[#202024] rounded-lg focus:border-indigo-500 focus:outline-none transition-all"
                />
              </div>

              {/* Comments Section */}
              <div className="space-y-4 pt-4 border-t border-[#202024]">
                <h4 className="text-sm font-bold text-white flex items-center space-x-2">
                  <MessageSquare className="w-4 h-4 text-gray-500" />
                  <span>Comments ({comments.length})</span>
                </h4>

                {/* Comment Feed */}
                <div className="space-y-3 max-h-[220px] overflow-y-auto pr-2">
                  {comments.length === 0 ? (
                    <p className="text-xs text-[#71717a] italic">No comments yet. Start the conversation!</p>
                  ) : (
                    comments.map((comment) => (
                      <div key={comment.id} className="p-3 bg-[#131316] rounded-lg border border-[#202024] space-y-1.5 flex justify-between items-start">
                        <div className="space-y-1 pr-4 min-w-0">
                          <div className="flex items-center space-x-2 text-xs">
                            <span className="font-semibold text-[#e4e4e7]">
                              {comment.user_details?.username}
                            </span>
                            <span className="text-[10px] text-[#52525b]">
                              {new Date(comment.created).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-xs text-[#a1a1aa] break-words leading-relaxed">
                            {comment.content}
                          </p>
                        </div>
                        {comment.user === currentUser.id && (
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="text-[#71717a] hover:text-red-400 transition-colors p-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Post Comment Input */}
                <form onSubmit={handleAddComment} className="flex items-center space-x-3">
                  <input
                    type="text"
                    value={commentContent}
                    onChange={(e) => setCommentContent(e.target.value)}
                    placeholder="Add a comment..."
                    className="flex-1 px-3 py-2 bg-[#131316] border border-[#202024] text-white rounded-lg text-xs focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={commentLoading || !commentContent.trim()}
                    className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium text-xs rounded-lg transition-colors cursor-pointer"
                  >
                    Send
                  </button>
                </form>
              </div>
            </div>

            {/* Right Side Sidebar Panel */}
            <div className="w-full md:w-[280px] p-6 bg-[#0c0c0e] flex flex-col justify-between overflow-y-auto">
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-[#202024] pb-3">
                  <h3 className="font-bold text-white text-sm">Issue Properties</h3>
                  <button
                    onClick={() => setSelectedIssue(null)}
                    className="text-gray-500 hover:text-gray-300 focus:outline-none md:hidden cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Status Selection */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-[#71717a] uppercase tracking-wider">
                    Status
                  </label>
                  <select
                    value={selectedIssue.status}
                    onChange={(e) => handleIssueUpdateField('status', e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#131316] border border-[#202024] rounded-md text-xs text-[#e4e4e7] focus:outline-none"
                  >
                    <option value="OP">Open</option>
                    <option value="IN">In Progress</option>
                    <option value="CL">Closed</option>
                  </select>
                </div>

                {/* Priority Selection */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-[#71717a] uppercase tracking-wider">
                    Priority
                  </label>
                  <select
                    value={selectedIssue.priority}
                    onChange={(e) => handleIssueUpdateField('priority', e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#131316] border border-[#202024] rounded-md text-xs text-[#e4e4e7] focus:outline-none"
                  >
                    <option value="LO">Low</option>
                    <option value="ME">Medium</option>
                    <option value="HI">High</option>
                    <option value="CR">Critical</option>
                  </select>
                </div>

                {/* Assignee Selection */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-[#71717a] uppercase tracking-wider">
                    Assignee
                  </label>
                  <select
                    value={selectedIssue.assignee || ''}
                    onChange={(e) => handleIssueUpdateField('assignee', e.target.value || null)}
                    className="w-full px-2.5 py-1.5 bg-[#131316] border border-[#202024] rounded-md text-xs text-[#e4e4e7] focus:outline-none"
                  >
                    <option value="">Unassigned</option>
                    {projectMembers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.username}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Label Selection */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-[#71717a] uppercase tracking-wider">
                    Label
                  </label>
                  <input
                    type="text"
                    value={selectedIssue.label || ''}
                    onChange={(e) => handleIssueUpdateField('label', e.target.value)}
                    placeholder="Add a label..."
                    className="w-full px-2.5 py-1.5 bg-[#131316] border border-[#202024] text-white rounded-md text-xs focus:outline-none"
                  />
                </div>

                {/* Reporter display */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-[#71717a] uppercase tracking-wider">
                    Reporter
                  </label>
                  <div className="flex items-center space-x-2 px-1 text-xs text-[#e4e4e7]">
                    <div className="w-5 h-5 rounded-full bg-[#1c1c1f] text-indigo-400 border border-[#2a2a30] flex items-center justify-center text-[9px] font-bold">
                      {selectedIssue.reporter_details?.username?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <span className="font-medium">
                      {selectedIssue.reporter_details?.username || 'Unknown'}
                    </span>
                  </div>
                </div>

                {/* Created Date */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-[#71717a] uppercase tracking-wider">
                    Created
                  </label>
                  <div className="flex items-center space-x-1.5 text-xs text-[#71717a] px-1">
                    <Calendar className="w-3.5 h-3.5 text-[#52525b]" />
                    <span>{new Date(selectedIssue.created_at).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedIssue(null)}
                className="w-full mt-6 py-2 border border-[#202024] hover:bg-[#131316] text-[#a1a1aa] hover:text-white font-medium text-xs rounded-lg transition-colors focus:outline-none text-center cursor-pointer"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MANAGE TEAM MEMBERS MODAL */}
      {isMembersModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md bg-[#0d0d0f] rounded-xl shadow-lg border border-[#202024] overflow-hidden animate-slideUp text-[#f3f4f6]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#202024]">
              <h3 className="text-lg font-bold text-white">
                {currentUser.id === project?.lead || currentUser.is_superuser ? 'Manage Project Team' : 'Project Team Members'}
              </h3>
              <button onClick={() => setIsMembersModalOpen(false)} className="text-gray-500 hover:text-gray-300 focus:outline-none cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-[#71717a]">
                {currentUser.id === project?.lead || currentUser.is_superuser 
                  ? "Select which developers should have access to this project's board and tasks."
                  : "These are the developers who currently have access to this project."
                }
              </p>

              {/* Members check List */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto border border-[#202024] rounded-lg divide-y divide-[#202024] p-2 bg-[#131316]/30">
                {users.map((u) => {
                  const isLead = u.id === project?.lead;
                  const isMember = selectedMemberIds.includes(u.id);
                  const isUserAllowedToEdit = currentUser.id === project?.lead || currentUser.is_superuser;

                  return (
                    <label key={u.id} className="flex items-center justify-between p-2.5 rounded-md hover:bg-[#131316] cursor-pointer select-none">
                      <div className="flex items-center space-x-3">
                        <div className="w-6 h-6 rounded-full bg-indigo-950/40 text-indigo-400 border border-indigo-900/50 flex items-center justify-center text-[10px] font-bold">
                          {u.username?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-[#e4e4e7]">{u.username} {isLead && <span className="text-[10px] text-indigo-400 bg-indigo-950/40 border border-indigo-900/50 px-1.5 py-0.5 rounded ml-1.5 font-bold">Lead</span>}</p>
                          <p className="text-[10px] text-[#71717a]">{u.email}</p>
                        </div>
                      </div>
                      
                      {isUserAllowedToEdit ? (
                        <input
                          type="checkbox"
                          checked={isMember}
                          disabled={isLead}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedMemberIds([...selectedMemberIds, u.id]);
                            } else {
                              setSelectedMemberIds(selectedMemberIds.filter(id => id !== u.id));
                            }
                          }}
                          className="w-4 h-4 text-indigo-600 border-[#202024] focus:ring-indigo-500 rounded cursor-pointer disabled:cursor-not-allowed"
                        />
                      ) : (
                        isMember && <span className="text-[10px] text-green-400 bg-green-950/20 px-2 py-0.5 border border-green-900/50 rounded font-semibold">Active Member</span>
                      )}
                    </label>
                  );
                })}
              </div>

              {/* Modal controls */}
              <div className="pt-4 flex items-center justify-end space-x-3 border-t border-[#202024]">
                <button
                  type="button"
                  onClick={() => setIsMembersModalOpen(false)}
                  className="px-4 py-2 border border-[#202024] hover:bg-[#18181c] text-[#71717a] hover:text-white font-medium text-sm rounded-lg transition-colors cursor-pointer"
                >
                  {currentUser.id === project?.lead || currentUser.is_superuser ? 'Cancel' : 'Close'}
                </button>
                {(currentUser.id === project?.lead || currentUser.is_superuser) && (
                  <button
                    onClick={async () => {
                      setMembersSubmitLoading(true);
                      try {
                        await projectAPI.updateMembers(project.id, selectedMemberIds);
                        setIsMembersModalOpen(false);
                        loadData(); 
                      } catch (err) {
                        console.error('Failed to sync members list', err);
                      } finally {
                        setMembersSubmitLoading(false);
                      }
                    }}
                    disabled={membersSubmitLoading}
                    className="flex items-center justify-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold text-sm rounded-lg transition-colors focus:outline-none cursor-pointer"
                  >
                    {membersSubmitLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
