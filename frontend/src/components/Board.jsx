import React, { useEffect, useState } from 'react';
import { projectAPI, issueAPI, commentAPI, authAPI } from '../api/api';
import { Plus, X, Loader2, ArrowLeft, Search, MessageSquare, Trash2, Calendar, User, Users, FolderKanban } from 'lucide-react';

const EpicIcon = ({ className = "w-4 h-4" }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="currentColor"
    fillOpacity="0.2"
    stroke="currentColor" 
    strokeWidth="2.5" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={`${className} text-[#c084fc]`}
  >
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

export default function Board({ projectId, onBack, currentUser, initialSelectedIssueNo, onClearInitialSelectedIssue }) {
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

  // Tab and Epic states
  const [activeTab, setActiveTab] = useState('board');
  const [newEpic, setNewEpic] = useState('');
  const [createEpicTitle, setCreateEpicTitle] = useState('');
  const [isCreatingEpic, setIsCreatingEpic] = useState(false);
  const [expandedEpics, setExpandedEpics] = useState({});
  const [quickTaskTitle, setQuickTaskTitle] = useState({});
  const [quickTaskType, setQuickTaskType] = useState({});

  // Members modal form states
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [membersSubmitLoading, setMembersSubmitLoading] = useState(false);

  // Comment state inside detail modal
  const [comments, setComments] = useState([]);
  const [commentContent, setCommentContent] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);

  // Project Settings Modal states
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [settingsName, setSettingsName] = useState('');
  const [settingsKey, setSettingsKey] = useState('');
  const [settingsDescription, setSettingsDescription] = useState('');
  const [settingsColumns, setSettingsColumns] = useState([]);
  const [settingsError, setSettingsError] = useState('');
  const [settingsLoading, setSettingsLoading] = useState(false);

  // Local details state for explicit description saving
  const [localDetails, setLocalDetails] = useState('');
  const [labelText, setLabelText] = useState('');

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

  const lastIssueNoRef = React.useRef(null);
  useEffect(() => {
    if (selectedIssue) {
      if (lastIssueNoRef.current !== selectedIssue.issue_no) {
        setLocalDetails(selectedIssue.details || '');
        lastIssueNoRef.current = selectedIssue.issue_no;
      }
    } else {
      setLocalDetails('');
      lastIssueNoRef.current = null;
    }
  }, [selectedIssue]);

  useEffect(() => {
    if (initialSelectedIssueNo && issues.length > 0) {
      const found = issues.find(i => i.issue_no.toString() === initialSelectedIssueNo.toString());
      if (found) {
        setSelectedIssue(found);
      }
      if (onClearInitialSelectedIssue) {
        onClearInitialSelectedIssue();
      }
    }
  }, [initialSelectedIssueNo, issues]);

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
        epic: newEpic || null,
      };
      await issueAPI.create(data);
      setIsCreateModalOpen(false);
      setNewTitle('');
      setNewDetails('');
      setNewAssignee('');
      setNewLabel('');
      setNewEpic('');
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
    return matchesSearch && matchesType && matchesPriority && matchesAssignee && issue.type !== 'EP';
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
      case 'EP': return 'bg-purple-950/40 text-purple-400 border border-purple-900/50';
      default: return 'bg-blue-955/40 text-indigo-400 border border-indigo-900/50';
    }
  };

  const renderTimelineView = () => {
    const epics = issues.filter((i) => i.type === 'EP');

    const handleCreateEpicInline = async (e) => {
      e.preventDefault();
      if (!createEpicTitle.trim()) return;
      setIsCreatingEpic(true);
      try {
        await issueAPI.create({
          project: projectId,
          title: createEpicTitle,
          type: 'EP',
          status: 'OP',
          priority: 'ME',
          details: 'Created from Timeline view.'
        });
        setCreateEpicTitle('');
        loadData();
      } catch (err) {
        console.error("Failed to create Epic", err);
      } finally {
        setIsCreatingEpic(false);
      }
    };

    const toggleEpicExpand = (epicId) => {
      setExpandedEpics((prev) => ({ ...prev, [epicId]: !prev[epicId] }));
    };

    const handleAddQuickTask = async (e, epicId) => {
      e.preventDefault();
      const title = quickTaskTitle[epicId];
      const type = quickTaskType[epicId] || 'ST';
      if (!title?.trim()) return;
      try {
        await issueAPI.create({
          project: projectId,
          title,
          type,
          epic: epicId,
          status: 'OP',
          priority: 'ME',
          details: 'Created from Timeline view.'
        });
        setQuickTaskTitle(prev => ({ ...prev, [epicId]: '' }));
        loadData();
      } catch (err) {
        console.error("Failed to add child issue", err);
      }
    };

    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="flex flex-col md:flex-row md:items-center justify-between space-y-3 md:space-y-0 bg-[#131316] border border-[#202024] rounded-xl p-4 shadow-sm">
          <div className="text-sm font-semibold text-white">Project Epics & Backlog</div>
          <div className="text-xs text-[#a1a1aa] font-medium">Create and link bugs/tasks to your project Epics here.</div>
        </div>

        <div className="border border-[#202024] rounded-xl overflow-hidden bg-[#0d0d0f] shadow-lg">
          <div className="w-full bg-[#0c0c0e] divide-y divide-[#202024]/50 flex flex-col">
            <div className="p-3 text-xs font-bold text-[#71717a] uppercase tracking-wider bg-[#131316] h-12 flex items-center">
              Work Items / Epics
            </div>
            
            <div className="divide-y divide-[#202024]/40 flex-1 overflow-y-auto max-h-[600px]">
              {epics.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#71717a] italic">
                  No Epics created yet. Click "+ Create Epic" below to get started.
                </div>
              ) : (
                epics.map((epic) => {
                  const isExpanded = !!expandedEpics[epic.issue_no];
                  const childIssues = epic.child_issues_details || [];

                  return (
                    <div key={epic.issue_no} className="flex flex-col">
                      <div className="h-16 flex items-center justify-between px-6 py-2 hover:bg-[#131316]/50 transition-colors group">
                        <div className="flex items-center space-x-3.5 min-w-0">
                          <button
                            type="button"
                            onClick={() => toggleEpicExpand(epic.issue_no)}
                            className="p-1.5 text-gray-500 hover:text-gray-300 focus:outline-none cursor-pointer"
                          >
                            <span className="text-[10px] font-bold block transform transition-transform" style={{ transform: isExpanded ? 'rotate(90deg)' : 'none' }}>
                              ▶
                            </span>
                          </button>
                          <input
                            type="checkbox"
                            className="w-4 h-4 text-indigo-600 border-[#202024] focus:ring-indigo-500 rounded bg-[#131316] cursor-pointer"
                          />
                          <EpicIcon className="w-4 h-4 shrink-0 select-none" />
                          <span 
                            onClick={() => setSelectedIssue(epic)}
                            className="text-sm font-semibold text-[#e4e4e7] group-hover:text-white truncate cursor-pointer hover:underline"
                          >
                            {epic.title}
                          </span>
                        </div>
                        <span className="text-xs font-semibold text-[#52525b] shrink-0 ml-2">
                          #{epic.issue_no}
                        </span>
                      </div>

                      {isExpanded && (
                        <div className="bg-[#09090b]/80 border-t border-b border-[#202024]/30 pl-12 pr-6 py-3 space-y-3">
                          {childIssues.map((child) => (
                            <div 
                              key={child.issue_no}
                              onClick={() => {
                                const fullChild = issues.find(i => i.issue_no === child.issue_no);
                                if (fullChild) setSelectedIssue(fullChild);
                              }}
                              className="h-10 flex items-center justify-between p-2.5 hover:bg-[#131316] rounded border border-transparent hover:border-[#202024]/40 cursor-pointer transition-all"
                            >
                              <div className="flex items-center space-x-2 min-w-0">
                                <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${getTypeStyle(child.type)}`}>
                                  {child.type_display}
                                </span>
                                <span className="text-xs text-[#a1a1aa] truncate">{child.title}</span>
                              </div>
                              <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full ${
                                child.status === 'OP' ? 'bg-gray-900/50 text-gray-400' :
                                child.status === 'IN' ? 'bg-blue-950/30 text-blue-400' :
                                'bg-green-950/30 text-green-400'
                              }`}>
                                {child.status_display}
                              </span>
                            </div>
                          ))}
                          
                          <form
                            onSubmit={(e) => handleAddQuickTask(e, epic.issue_no)}
                            className="flex items-center space-x-2 bg-[#131316]/50 p-1.5 border border-[#202024] rounded-md h-10"
                          >
                            <select
                              value={quickTaskType[epic.issue_no] || 'ST'}
                              onChange={(e) => setQuickTaskType(prev => ({ ...prev, [epic.issue_no]: e.target.value }))}
                              className="bg-[#0d0d0f] border border-[#202024]/60 text-xs text-[#a1a1aa] px-2 py-1 rounded focus:outline-none"
                            >
                              <option value="ST">Story</option>
                              <option value="BU">Bug</option>
                              <option value="TA">Task</option>
                            </select>
                            <input
                              type="text"
                              value={quickTaskTitle[epic.issue_no] || ''}
                              onChange={(e) => setQuickTaskTitle(prev => ({ ...prev, [epic.issue_no]: e.target.value }))}
                              placeholder="+ Add child issue..."
                              className="flex-1 bg-transparent text-xs text-white placeholder-gray-700 focus:outline-none pl-1"
                            />
                            <button
                              type="submit"
                              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-semibold"
                            >
                              Add
                            </button>
                          </form>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <form onSubmit={handleCreateEpicInline} className="p-4 border-t border-[#202024] bg-[#0c0c0e] flex items-center space-x-2">
              <input
                type="text"
                value={createEpicTitle}
                onChange={(e) => setCreateEpicTitle(e.target.value)}
                placeholder="Create new Epic title..."
                className="flex-1 px-4 py-2 bg-[#131316] border border-[#202024] text-white rounded-lg text-xs focus:outline-none"
                disabled={isCreatingEpic}
              />
              <button
                type="submit"
                disabled={isCreatingEpic || !createEpicTitle.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg text-xs font-semibold shrink-0"
              >
                + Epic
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  };

  const renderCalendarView = () => {
    const epics = issues.filter((i) => i.type === 'EP');

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
    const days = Array.from({ length: totalDays }, (_, idx) => idx + 1);

    const toggleEpicExpand = (epicId) => {
      setExpandedEpics((prev) => ({ ...prev, [epicId]: !prev[epicId] }));
    };

    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="flex flex-col md:flex-row md:items-center justify-between space-y-3 md:space-y-0 bg-[#131316] border border-[#202024] rounded-xl p-4 shadow-sm">
          <div className="text-sm font-semibold text-white">Project Calendar Schedule ({monthNames[currentMonth]} {currentYear})</div>
          <div className="flex items-center space-x-2 text-xs text-[#a1a1aa]">
            <span className="w-3 h-3 bg-purple-600 rounded-full" />
            <span>Epics Timeline</span>
          </div>
        </div>

        <div className="flex border border-[#202024] rounded-xl overflow-hidden bg-[#0d0d0f] shadow-lg">
          <div className="w-[30%] border-r border-[#202024] shrink-0 bg-[#0c0c0e] divide-y divide-[#202024]/50 flex flex-col">
            <div className="p-3 text-xs font-bold text-[#71717a] uppercase tracking-wider bg-[#131316] h-12 flex items-center">
              Scheduled Epics
            </div>
            
            <div className="divide-y divide-[#202024]/40 flex-1 overflow-y-auto max-h-[600px]">
              {epics.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#71717a] italic">No Epics scheduled.</div>
              ) : (
                epics.map((epic) => {
                  const isExpanded = !!expandedEpics[epic.issue_no];
                  return (
                    <div key={epic.issue_no} className="flex flex-col">
                      <div className="h-16 flex items-center px-4 py-2 hover:bg-[#131316]/50 transition-colors justify-between">
                        <div className="flex items-center space-x-2 min-w-0">
                          <button
                            type="button"
                            onClick={() => toggleEpicExpand(epic.issue_no)}
                            className="p-1 text-gray-500 hover:text-gray-300 focus:outline-none cursor-pointer"
                          >
                            <span className="text-[10px] font-bold transform transition-transform" style={{ transform: isExpanded ? 'rotate(90deg)' : 'none' }}>
                              ▶
                            </span>
                          </button>
                          <EpicIcon className="w-4 h-4 shrink-0 select-none" />
                          <span 
                            onClick={() => setSelectedIssue(epic)}
                            className="text-xs font-semibold text-[#e4e4e7] truncate cursor-pointer hover:underline"
                          >
                            {epic.title}
                          </span>
                        </div>
                        <span className="text-[10px] text-[#52525b]">#{epic.issue_no}</span>
                      </div>

                      {isExpanded && (
                        <div className="bg-[#09090b]/85 pl-6 pr-2 py-2 space-y-2 border-t border-[#202024]/30">
                          {(epic.child_issues_details || []).map((child) => (
                            <div 
                              key={child.issue_no}
                              onClick={() => {
                                const fullChild = issues.find(i => i.issue_no === child.issue_no);
                                if (fullChild) setSelectedIssue(fullChild);
                              }}
                              className="h-9 flex items-center p-2 hover:bg-[#131316] rounded cursor-pointer min-w-0"
                            >
                              <span className={`px-1 text-[8px] font-bold rounded mr-2 ${getTypeStyle(child.type)}`}>
                                {child.type_display?.[0]}
                              </span>
                              <span className="text-[11px] text-[#a1a1aa] truncate">{child.title}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex-1 overflow-x-auto bg-[#09090b] flex flex-col min-w-[500px]">
            <div className="h-12 border-b border-[#202024] bg-[#131316] flex flex-col shrink-0 justify-center">
              <div className="px-4 text-xs font-bold text-white mb-0.5">{monthNames[currentMonth]} {currentYear}</div>
              <div className="grid divide-x divide-[#202024]/40 text-[9px] text-[#71717a] font-medium" style={{ gridTemplateColumns: `repeat(${totalDays}, minmax(32px, 1fr))` }}>
                {days.map(d => (
                  <div key={d} className={`text-center py-0.5 ${d === today.getDate() ? 'text-indigo-400 font-bold bg-indigo-950/20' : ''}`}>
                    {d}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-1 divide-y divide-[#202024]/40 relative overflow-y-auto max-h-[600px]" style={{ minHeight: '300px' }}>
              <div 
                className="absolute top-0 bottom-0 w-0.5 bg-indigo-500/80 z-20 pointer-events-none"
                style={{ left: `calc(${(today.getDate() - 1) / totalDays * 100}% + 16px)` }}
                title="Today"
              />

              {epics.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-[#52525b] italic p-8">No Epics scheduled.</div>
              ) : (
                epics.map((epic) => {
                  const isExpanded = !!expandedEpics[epic.issue_no];
                  const defaultDuration = 14;
                  let startDay = 1;
                  let endDay = defaultDuration;

                  if (epic.start_date) {
                    const sDate = new Date(epic.start_date);
                    if (sDate.getMonth() === currentMonth && sDate.getFullYear() === currentYear) {
                      startDay = sDate.getDate();
                    }
                  } else {
                    const cDate = new Date(epic.created_at);
                    if (cDate.getMonth() === currentMonth && cDate.getFullYear() === currentYear) {
                      startDay = cDate.getDate();
                    }
                  }

                  if (epic.due_date) {
                    const dDate = new Date(epic.due_date);
                    if (dDate.getMonth() === currentMonth && dDate.getFullYear() === currentYear) {
                      endDay = dDate.getDate();
                    }
                  } else {
                    endDay = Math.min(startDay + defaultDuration, totalDays);
                  }

                  if (startDay > endDay) {
                    endDay = startDay;
                  }

                  return (
                    <div key={epic.issue_no} className="flex flex-col">
                      <div className="h-16 flex items-center px-4 relative bg-[#0d0d0f]/20 hover:bg-[#131316]/20 transition-colors">
                        <div 
                          className="grid absolute inset-y-0"
                          style={{ 
                            left: '16px', 
                            right: '16px',
                            gridTemplateColumns: `repeat(${totalDays}, minmax(32px, 1fr))` 
                          }}
                        >
                          <div 
                            onClick={() => setSelectedIssue(epic)}
                            className="h-7 self-center bg-purple-600/80 hover:bg-purple-500 rounded-md text-white text-[10px] font-semibold px-3 flex items-center justify-between cursor-pointer shadow-md select-none transform hover:scale-[1.01] transition-transform truncate overflow-hidden border border-purple-500/30 z-10"
                            style={{ 
                              gridColumnStart: startDay, 
                              gridColumnEnd: endDay + 1 
                            }}
                            title={`${epic.title} (${epic.start_date || 'No Start Date'} to ${epic.due_date || 'No Due Date'})`}
                          >
                            <span className="truncate">{epic.title}</span>
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="bg-[#09090b]/40 border-t border-b border-[#202024]/30 py-2 space-y-2.5">
                          {(epic.child_issues_details || []).map((child) => {
                            const fullChild = issues.find(i => i.issue_no === child.issue_no);
                            let cStartDay = null;
                            let cEndDay = null;

                            if (fullChild && fullChild.start_date) {
                              const s = new Date(fullChild.start_date);
                              if (s.getMonth() === currentMonth && s.getFullYear() === currentYear) {
                                cStartDay = s.getDate();
                              }
                            }
                            if (fullChild && fullChild.due_date) {
                              const d = new Date(fullChild.due_date);
                              if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
                                cEndDay = d.getDate();
                              }
                            }

                            return (
                              <div key={child.issue_no} className="h-9 flex items-center px-4 relative">
                                {cStartDay && cEndDay && (
                                  <div 
                                    className="grid absolute inset-y-0"
                                    style={{ 
                                      left: '16px', 
                                      right: '16px',
                                      gridTemplateColumns: `repeat(${totalDays}, minmax(32px, 1fr))` 
                                    }}
                                  >
                                    <div 
                                      onClick={() => setSelectedIssue(fullChild)}
                                      className="h-5 self-center bg-indigo-900/50 hover:bg-indigo-800 rounded border border-indigo-700/30 text-white text-[9px] px-2 flex items-center cursor-pointer shadow-sm select-none truncate overflow-hidden"
                                      style={{ 
                                        gridColumnStart: cStartDay, 
                                        gridColumnEnd: cEndDay + 1 
                                      }}
                                    >
                                      <span className="truncate">{child.title}</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleOpenSettings = () => {
    if (!project) return;
    setSettingsName(project.name || '');
    setSettingsKey(project.key || '');
    setSettingsDescription(project.description || '');
    setSettingsColumns(
      project.statuses 
        ? project.statuses.map(s => ({ ...s })) 
        : [
            { name: "To Do / Open", code: "OP", order: 0 },
            { name: "In Progress", code: "IN", order: 1 },
            { name: "Done / Closed", code: "CL", order: 2 }
          ]
    );
    setSettingsError('');
    setIsSettingsModalOpen(true);
  };

  const handleMoveColumn = (index, direction) => {
    const newCols = [...settingsColumns];
    if (direction === 'up' && index > 0) {
      const temp = newCols[index];
      newCols[index] = newCols[index - 1];
      newCols[index - 1] = temp;
    } else if (direction === 'down' && index < newCols.length - 1) {
      const temp = newCols[index];
      newCols[index] = newCols[index + 1];
      newCols[index + 1] = temp;
    }
    const updated = newCols.map((c, idx) => ({ ...c, order: idx }));
    setSettingsColumns(updated);
  };

  const handleDeleteSettingsColumn = (index) => {
    const newCols = settingsColumns.filter((_, idx) => idx !== index);
    const updated = newCols.map((c, idx) => ({ ...c, order: idx }));
    setSettingsColumns(updated);
  };

  const handleAddSettingsColumn = () => {
    setSettingsColumns(prev => [
      ...prev,
      { name: 'New Column', code: 'NEW', order: prev.length }
    ]);
  };

  const handleEditSettingsColumnField = (index, field, value) => {
    setSettingsColumns(prev => {
      const newCols = [...prev];
      newCols[index] = { ...newCols[index], [field]: value };
      return newCols;
    });
  };

  const handleSaveProjectSettings = async (e) => {
    e.preventDefault();
    if (!settingsName.trim() || !settingsKey.trim()) {
      setSettingsError("Project Name and Key are required.");
      return;
    }
    const codes = settingsColumns.map(c => c.code.trim().toUpperCase());
    const uniqueCodes = new Set(codes);
    if (uniqueCodes.size !== codes.length) {
      setSettingsError("Each column must have a unique status code (e.g. OP, IN, CL, QA).");
      return;
    }

    setSettingsLoading(true);
    setSettingsError('');
    try {
      await projectAPI.update(projectId, {
        name: settingsName,
        key: settingsKey.toUpperCase(),
        description: settingsDescription
      });

      const formattedCols = settingsColumns.map(c => ({
        id: c.id || null,
        name: c.name.trim(),
        code: c.code.trim().toUpperCase(),
        order: c.order
      }));
      await projectAPI.updateColumns(projectId, formattedCols);

      await loadData();
      setIsSettingsModalOpen(false);
    } catch (err) {
      setSettingsError(err.response?.data?.error || err.response?.data?.detail || "Failed to update project settings.");
    } finally {
      setSettingsLoading(false);
    }
  };

  const projectMembers = project?.members_details || [];

  const boardColumns = project?.statuses && project.statuses.length > 0
    ? project.statuses.map((statusObj, idx) => {
        const colors = [
          'bg-gray-100 border-gray-200',
          'bg-blue-50/50 border-blue-100',
          'bg-indigo-50/50 border-indigo-100',
          'bg-green-50/30 border-green-100',
          'bg-purple-50/50 border-purple-100',
          'bg-pink-50/50 border-pink-100',
        ];
        let colColor = colors[idx % colors.length];
        if (statusObj.code === 'OP') colColor = 'bg-gray-100 border-gray-200';
        else if (statusObj.code === 'IN') colColor = 'bg-blue-50/50 border-blue-100';
        else if (statusObj.code === 'CL') colColor = 'bg-green-50/30 border-green-100';

        return {
          title: statusObj.name,
          status: statusObj.code,
          color: colColor
        };
      })
    : [
        { title: 'To Do / Open', status: 'OP', color: 'bg-gray-100 border-gray-200' },
        { title: 'In Progress', status: 'IN', color: 'bg-blue-50/50 border-blue-100' },
        { title: 'Done / Closed', status: 'CL', color: 'bg-green-50/30 border-green-100' },
      ];

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
          {(currentUser.id === project?.lead || currentUser.is_superuser) && (
            <button
              onClick={handleOpenSettings}
              className="inline-flex items-center px-4 py-2 border border-[#202024] hover:bg-[#18181c] text-[#a1a1aa] hover:text-white font-medium text-sm rounded-lg transition-colors shadow-sm focus:outline-none cursor-pointer"
            >
              <FolderKanban className="w-4 h-4 mr-2 text-gray-500" />
              Project Settings
            </button>
          )}
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

      {/* Tab Selector */}
      <div className="flex border-b border-[#202024] pb-px">
        <button
          onClick={() => setActiveTab('board')}
          className={`px-6 py-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center space-x-2 ${
            activeTab === 'board'
              ? 'border-indigo-500 text-white font-bold'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <span>Board</span>
        </button>
        <button
          onClick={() => setActiveTab('timeline')}
          className={`px-6 py-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center space-x-2 ${
            activeTab === 'timeline'
              ? 'border-indigo-500 text-white font-bold'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <span>Timeline</span>
        </button>
        <button
          onClick={() => setActiveTab('calendar')}
          className={`px-6 py-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center space-x-2 ${
            activeTab === 'calendar'
              ? 'border-indigo-500 text-white font-bold'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <span>Calendar</span>
        </button>
      </div>

      {activeTab === 'board' && (
        <>
          {/* Filters Bar */}
          <div className="bg-[#131316] border border-[#202024] rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center space-y-3 md:space-y-0 md:space-x-4">
        {/* Search */}
        <div className="relative w-64 shrink-0">
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

        {/* Assignee Avatar Stack */}
        <div className="flex items-center -space-x-1.5 overflow-visible pr-2 shrink-0 select-none">
          <button
            type="button"
            onClick={() => setFilterAssignee('')}
            className={`w-7 h-7 rounded-full bg-[#1c1c1f] hover:bg-[#27272a] border-2 flex items-center justify-center text-[#a1a1aa] transition-all cursor-pointer shadow-sm ${
              filterAssignee === '' 
                ? 'border-indigo-500 scale-110 z-10' 
                : 'border-[#131316]'
            }`}
            title="All Assignees"
          >
            <User className="w-3.5 h-3.5" />
          </button>

          {projectMembers.slice(0, 5).map((member, index) => {
            const isActive = filterAssignee === member.id.toString();
            const initials = member.username.substring(0, 2).toUpperCase();

            return (
              <button
                key={member.id}
                type="button"
                onClick={() => setFilterAssignee(isActive ? '' : member.id.toString())}
                className={`w-7 h-7 rounded-full text-white text-[9px] font-bold border-2 flex items-center justify-center transition-all cursor-pointer shadow-sm ${
                  isActive 
                    ? 'border-indigo-500 scale-110 z-10' 
                    : 'border-[#131316] hover:border-gray-500 hover:z-10'
                }`}
                style={{ 
                  zIndex: isActive ? 10 : 5 - index,
                  backgroundColor: member.avatar_color || '#4f46e5'
                }}
                title={member.username}
              >
                {initials}
              </button>
            );
          })}

          {projectMembers.length > 5 && (
            <button
              type="button"
              onClick={() => {
                setSelectedMemberIds(project?.members || []);
                setIsMembersModalOpen(true);
              }}
              className="w-7 h-7 rounded-full bg-[#1c1c22] border-2 border-[#131316] flex items-center justify-center text-[9px] font-bold text-[#a1a1aa] hover:border-gray-400 hover:text-white cursor-pointer transition-all shadow"
              title="Manage Team Members"
            >
              +{projectMembers.length - 5}
            </button>
          )}
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


      </div>

      {/* Kanban Board Grid */}
      <div className="overflow-x-auto pb-4">
        <div 
          className="grid gap-6 min-w-[900px]" 
          style={{ gridTemplateColumns: `repeat(${boardColumns.length}, minmax(300px, 1fr))` }}
        >
          {boardColumns.map((column) => {
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
                      {issue.epic_details && (
                        <div className="mt-1.5 flex items-center">
                          <span className="px-1.5 py-0.5 text-[9px] font-bold bg-purple-950/40 text-purple-400 border border-purple-900/50 rounded flex items-center">
                            <EpicIcon className="w-3 h-3 mr-1 shrink-0" />
                            {issue.epic_details.title}
                          </span>
                        </div>
                      )}

                      {/* Details Footer */}
                      <div className="flex items-center justify-between pt-2 border-t border-[#1c1c20] flex-wrap gap-2">
                        <div className="flex items-center space-x-1.5">
                          <span className={`px-2 py-0.5 text-[9px] font-semibold border rounded ${getPriorityBadgeStyle(issue.priority)}`}>
                            {issue.priority_display}
                          </span>
                          {issue.label && issue.label.split(',').map((lbl, idx) => {
                            const trimmed = lbl.trim();
                            if (!trimmed) return null;
                            return (
                              <span key={idx} className="px-2 py-0.5 text-[9px] font-semibold border border-indigo-900/50 bg-[#151520] text-indigo-400 rounded truncate max-w-[100px]">
                                {trimmed}
                              </span>
                            );
                          })}
                        </div>
                        <div className="flex items-center space-x-1.5 text-xs text-[#71717a]">
                          <div 
                            className="w-4 h-4 rounded-full text-white flex items-center justify-center text-[8px] font-extrabold shrink-0 border border-white/5"
                            style={{ backgroundColor: issue.assignee_details?.avatar_color || '#2b2b35' }}
                          >
                            {(issue.assignee_details?.username?.[0] || 'U').toUpperCase()}
                          </div>
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
      </div>
        </>
      )}
      {activeTab === 'timeline' && renderTimelineView()}
      {activeTab === 'calendar' && renderCalendarView()}

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

              <div>
                <label className="block text-xs font-bold text-[#71717a] uppercase tracking-wider mb-1.5">
                  Epic Link
                </label>
                <select
                  value={newEpic}
                  onChange={(e) => setNewEpic(e.target.value)}
                  className="w-full px-3 py-2 bg-[#131316] border border-[#202024] text-white rounded-lg text-sm focus:outline-none"
                >
                  <option value="">No Epic</option>
                  {issues.filter(i => i.type === 'EP').map(ep => (
                    <option key={ep.issue_no} value={ep.issue_no}>
                      {ep.title}
                    </option>
                  ))}
                </select>
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
                    {boardColumns.map(col => (
                      <option key={col.status} value={col.status}>
                        {col.title}
                      </option>
                    ))}
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
                <select
                  value={selectedIssue.type}
                  onChange={(e) => handleIssueUpdateField('type', e.target.value)}
                  className={`px-2 py-0.5 text-xs font-bold rounded bg-[#0d0d0f] focus:outline-none cursor-pointer outline-none ${getTypeStyle(selectedIssue.type)}`}
                >
                  <option value="ST" className="bg-[#131316] text-yellow-500">Story</option>
                  <option value="BU" className="bg-[#131316] text-red-400">Bug</option>
                  <option value="TA" className="bg-[#131316] text-indigo-400">Task</option>
                  <option value="EP" className="bg-[#131316] text-purple-400">Epic</option>
                </select>
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
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-[#71717a] uppercase tracking-wider">
                    Description
                  </label>
                  {localDetails !== (selectedIssue.details || '') && (
                    <button
                      onClick={() => handleIssueUpdateField('details', localDetails)}
                      className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[10px] rounded transition-colors cursor-pointer"
                    >
                      Save Description
                    </button>
                  )}
                </div>
                <textarea
                  value={localDetails}
                  onChange={(e) => setLocalDetails(e.target.value)}
                  rows={10}
                  className="w-full p-3 text-sm text-[#d4d4d8] bg-[#131316] border border-[#202024] rounded-lg focus:border-indigo-500 focus:outline-none transition-all resize-y overflow-y-hidden min-h-[160px]"
                  placeholder="Add a detailed description..."
                />
              </div>

              {/* Child Issues Section (Only if it is an Epic) */}
              {selectedIssue.type === 'EP' && (
                <div className="space-y-4 pt-4 border-t border-[#202024]">
                  <h4 className="text-sm font-bold text-white flex items-center justify-between">
                    <span>Child Issues</span>
                    <span className="px-2 py-0.5 bg-[#1c1c1f] text-[#a1a1aa] text-xs font-semibold rounded-full">
                      {selectedIssue.child_issues_details?.length || 0}
                    </span>
                  </h4>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                    {(!selectedIssue.child_issues_details || selectedIssue.child_issues_details.length === 0) ? (
                      <p className="text-xs text-[#71717a] italic">No child issues linked to this Epic yet.</p>
                    ) : (
                      selectedIssue.child_issues_details.map((child) => (
                        <div 
                          key={child.issue_no}
                          onClick={() => {
                            const found = issues.find(i => i.issue_no === child.issue_no);
                            if (found) setSelectedIssue(found);
                          }}
                          className="p-2.5 bg-[#131316] rounded-lg border border-[#202024] flex items-center justify-between hover:border-[#2b2b32] hover:bg-[#18181c] cursor-pointer transition-all"
                        >
                          <div className="flex items-center space-x-2 min-w-0">
                            <span className={`px-1.5 py-0.5 text-[8px] font-bold rounded ${getTypeStyle(child.type)}`}>
                              {child.type_display}
                            </span>
                            <span className="text-xs font-semibold text-white truncate max-w-[200px]">
                              {child.title}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-[10px] text-[#71717a] font-medium">#{child.issue_no}</span>
                            <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full ${
                              child.status === 'OP' ? 'bg-gray-900/50 text-gray-400 border border-gray-800' :
                              child.status === 'IN' ? 'bg-blue-950/30 text-blue-400 border border-blue-900/50' :
                              'bg-green-950/30 text-green-400 border border-green-900/50'
                            }`}>
                              {child.status_display}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const title = quickTaskTitle[selectedIssue.issue_no];
                      const type = quickTaskType[selectedIssue.issue_no] || 'ST';
                      if (!title?.trim()) return;
                      try {
                        await issueAPI.create({
                          project: projectId,
                          title,
                          type,
                          epic: selectedIssue.issue_no,
                          status: 'OP',
                          priority: 'ME',
                          details: 'Created from Epic Detail view.'
                        });
                        setQuickTaskTitle(prev => ({ ...prev, [selectedIssue.issue_no]: '' }));
                        const freshIssues = await issueAPI.getAll({ project: projectId });
                        setIssues(freshIssues);
                        const updatedEpic = freshIssues.find(i => i.issue_no === selectedIssue.issue_no);
                        if (updatedEpic) setSelectedIssue(updatedEpic);
                      } catch (err) {
                        console.error("Failed to add task to Epic", err);
                      }
                    }}
                    className="flex items-center space-x-2 bg-[#131316] p-2 border border-[#202024] rounded-lg"
                  >
                    <select
                      value={quickTaskType[selectedIssue.issue_no] || 'ST'}
                      onChange={(e) => setQuickTaskType(prev => ({ ...prev, [selectedIssue.issue_no]: e.target.value }))}
                      className="bg-[#0d0d0f] border border-[#202024] text-xs text-[#a1a1aa] px-2 py-1 rounded focus:outline-none"
                    >
                      <option value="ST">Story</option>
                      <option value="BU">Bug</option>
                      <option value="TA">Task</option>
                    </select>
                    <input
                      type="text"
                      value={quickTaskTitle[selectedIssue.issue_no] || ''}
                      onChange={(e) => setQuickTaskTitle(prev => ({ ...prev, [selectedIssue.issue_no]: e.target.value }))}
                      placeholder="Add an issue to this epic..."
                      className="flex-1 bg-transparent text-xs text-white placeholder-gray-600 focus:outline-none pl-1"
                    />
                    <button
                      type="submit"
                      className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[10px] font-semibold transition-colors"
                    >
                      Add
                    </button>
                  </form>
                </div>
              )}

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
                    className="text-gray-500 hover:text-gray-300 focus:outline-none cursor-pointer"
                    title="Close Details"
                  >
                    <X className="w-4 h-4" />
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
                    {boardColumns.map(col => (
                      <option key={col.status} value={col.status}>
                        {col.title}
                      </option>
                    ))}
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

                {/* Label Selection (Interactive Tags Input) */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-[#71717a] uppercase tracking-wider">
                    Labels
                  </label>
                  <div className="flex flex-wrap gap-1.5 p-2 bg-[#131316] border border-[#202024] rounded-lg min-h-[38px] items-center">
                    {(selectedIssue.label ? selectedIssue.label.split(',').map(l => l.trim()).filter(Boolean) : []).map((lbl, idx) => (
                      <span 
                        key={idx} 
                        className="inline-flex items-center px-2 py-0.5 text-xs bg-[#1c1c1f] text-indigo-400 border border-indigo-900/40 rounded-md gap-1"
                      >
                        <span>{lbl}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const currentLabels = selectedIssue.label ? selectedIssue.label.split(',').map(l => l.trim()).filter(Boolean) : [];
                            const updatedLabels = currentLabels.filter(l => l !== lbl).join(', ');
                            handleIssueUpdateField('label', updatedLabels);
                          }}
                          className="text-gray-500 hover:text-red-400 focus:outline-none text-[10px] cursor-pointer font-bold leading-none"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    <input
                      type="text"
                      value={labelText}
                      onChange={(e) => setLabelText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const newTag = labelText.trim();
                          if (newTag) {
                            const currentLabels = selectedIssue.label ? selectedIssue.label.split(',').map(l => l.trim()).filter(Boolean) : [];
                            if (!currentLabels.includes(newTag)) {
                              const updatedLabels = [...currentLabels, newTag].join(', ');
                              handleIssueUpdateField('label', updatedLabels);
                            }
                            setLabelText('');
                          }
                        }
                      }}
                      placeholder={(selectedIssue.label ? selectedIssue.label.split(',').map(l => l.trim()).filter(Boolean) : []).length === 0 ? "Add label & press Enter..." : ""}
                      className="flex-1 min-w-[60px] bg-transparent text-xs text-white focus:outline-none py-0.5 border-none outline-none"
                    />
                  </div>
                </div>

                {/* Epic Link Selector (for non-Epic issues) */}
                {selectedIssue.type !== 'EP' && (
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-[#71717a] uppercase tracking-wider">
                      Epic Link
                    </label>
                    <select
                      value={selectedIssue.epic || ''}
                      onChange={(e) => handleIssueUpdateField('epic', e.target.value || null)}
                      className="w-full px-2.5 py-1.5 bg-[#131316] border border-[#202024] rounded-md text-xs text-[#e4e4e7] focus:outline-none"
                    >
                      <option value="">No Epic</option>
                      {issues.filter(i => i.type === 'EP').map(ep => (
                        <option key={ep.issue_no} value={ep.issue_no}>
                          {ep.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Date configurations for timeline scheduling */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-[#71717a] uppercase tracking-wider">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={selectedIssue.start_date || ''}
                    onChange={(e) => handleIssueUpdateField('start_date', e.target.value || null)}
                    className="w-full px-2.5 py-1.5 bg-[#131316] border border-[#202024] text-white rounded-md text-xs focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-[#71717a] uppercase tracking-wider">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={selectedIssue.due_date || ''}
                    onChange={(e) => handleIssueUpdateField('due_date', e.target.value || null)}
                    className="w-full px-2.5 py-1.5 bg-[#131316] border border-[#202024] text-white rounded-md text-xs focus:outline-none"
                  />
                </div>

                {/* Reporter display */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-[#71717a] uppercase tracking-wider">
                    Reporter
                  </label>
                  <div className="flex items-center space-x-2 px-1 text-xs text-[#e4e4e7]">
                    <div 
                      className="w-5 h-5 rounded-full text-white flex items-center justify-center text-[9px] font-bold border border-white/10 shadow-sm shrink-0"
                      style={{ backgroundColor: selectedIssue.reporter_details?.avatar_color || '#4f46e5' }}
                    >
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

              {/* Redundant bottom close button removed */}
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

      {/* PROJECT SETTINGS MODAL */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-2xl bg-[#0d0d0f] rounded-xl shadow-2xl border border-[#202024] flex flex-col max-h-[90vh] overflow-hidden animate-slideUp text-[#f3f4f6]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#202024]">
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <FolderKanban className="w-5 h-5 text-indigo-400" />
                <span>Project Settings ({settingsName})</span>
              </h3>
              <button 
                onClick={() => setIsSettingsModalOpen(false)} 
                className="text-gray-500 hover:text-gray-300 focus:outline-none cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {settingsError && (
              <div className="mx-6 mt-4 p-3 bg-red-950/20 border border-red-900/50 text-red-400 text-xs rounded-lg animate-fadeIn">
                {settingsError}
              </div>
            )}

            <form onSubmit={handleSaveProjectSettings} className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-[#71717a] uppercase tracking-wider border-b border-[#202024] pb-1.5">Project Details</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-[#a1a1aa] mb-1.5">Project Name</label>
                    <input
                      type="text"
                      required
                      value={settingsName}
                      onChange={(e) => setSettingsName(e.target.value)}
                      className="w-full px-3 py-2 bg-[#131316] border border-[#202024] rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#a1a1aa] mb-1.5">Project Key</label>
                    <input
                      type="text"
                      required
                      value={settingsKey}
                      onChange={(e) => setSettingsKey(e.target.value)}
                      className="w-full px-3 py-2 bg-[#131316] border border-[#202024] rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors uppercase"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#a1a1aa] mb-1.5">Description</label>
                  <textarea
                    value={settingsDescription}
                    onChange={(e) => setSettingsDescription(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 bg-[#131316] border border-[#202024] rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                    placeholder="Short description of this project..."
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-[#202024] pb-1.5">
                  <h4 className="text-xs font-bold text-[#71717a] uppercase tracking-wider">Board Columns (Statuses)</h4>
                  <button
                    type="button"
                    onClick={handleAddSettingsColumn}
                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[10px] font-bold transition-all cursor-pointer"
                  >
                    + Add Column
                  </button>
                </div>
                <p className="text-[11px] text-[#71717a]">
                  Customize the columns displayed on your Kanban board. Columns will be ordered left-to-right as listed here.
                </p>

                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                  {settingsColumns.map((col, index) => (
                    <div 
                      key={index} 
                      className="p-3 bg-[#131316] border border-[#202024] rounded-lg flex items-center space-x-3"
                    >
                      <div className="flex flex-col space-y-1">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => handleMoveColumn(index, 'up')}
                          className="text-gray-500 hover:text-white disabled:text-gray-800 focus:outline-none text-[10px] cursor-pointer animate-fadeIn"
                          title="Move Left/Up"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          disabled={index === settingsColumns.length - 1}
                          onClick={() => handleMoveColumn(index, 'down')}
                          className="text-gray-500 hover:text-white disabled:text-gray-800 focus:outline-none text-[10px] cursor-pointer animate-fadeIn"
                          title="Move Right/Down"
                        >
                          ▼
                        </button>
                      </div>

                      <div className="flex-1 grid grid-cols-2 gap-3">
                        <div>
                          <input
                            type="text"
                            required
                            placeholder="Column Name"
                            value={col.name}
                            onChange={(e) => handleEditSettingsColumnField(index, 'name', e.target.value)}
                            className="w-full px-2 py-1 bg-[#0d0d0f] border border-[#202024] rounded-md text-xs text-white focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            required
                            placeholder="Status Code (e.g. OP, QA)"
                            value={col.code}
                            onChange={(e) => handleEditSettingsColumnField(index, 'code', e.target.value)}
                            className="w-full px-2 py-1 bg-[#0d0d0f] border border-[#202024] rounded-md text-xs text-white focus:outline-none focus:border-indigo-500 uppercase"
                            disabled={['OP', 'IN', 'CL'].includes(col.code)}
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteSettingsColumn(index)}
                        className="text-[#71717a] hover:text-red-400 transition-colors p-1.5 cursor-pointer"
                        title="Delete Column (Issues will fallback to Open)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-[#202024]">
                <button
                  type="button"
                  onClick={() => setIsSettingsModalOpen(false)}
                  className="px-4 py-2 border border-[#202024] hover:bg-[#131316] text-[#a1a1aa] hover:text-white font-medium text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={settingsLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium text-xs rounded-lg transition-colors flex items-center space-x-2 cursor-pointer shadow-sm"
                >
                  {settingsLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
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
