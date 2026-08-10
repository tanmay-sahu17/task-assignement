import React, { useEffect, useState } from 'react';
import { projectAPI, authAPI, invitationAPI, joinRequestAPI } from '../api/api';
import { Plus, X, FolderKanban, Briefcase, Loader2, Users, Send, Check, AlertCircle, Copy } from 'lucide-react';

export default function Projects({ onNavigateToProject, currentUser }) {
  const [projects, setProjects] = useState([]);
  const [joinableProjects, setJoinableProjects] = useState([]);
  const [joinRequests, setJoinRequests] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Tab state
  const [activeTab, setActiveTab] = useState('active'); // 'active', 'joinable', 'requests', 'invites'

  // Modal & Form states (Project Creation)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');
  const [lead, setLead] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState('');

  // Form states (Inviting Members)
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteProject, setInviteProject] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');

  const loadData = async () => {
    try {
      const [projData, userData, requestsData] = await Promise.all([
        projectAPI.getAll(),
        authAPI.getUsers(),
        joinRequestAPI.getAll().catch(() => []), 
      ]);

      setProjects(projData);
      setUsers(userData);
      setJoinRequests(requestsData);

      if (userData.length > 0) {
        setLead(userData[0].id);
      }

      if (!currentUser.is_superuser) {
        const joinableData = await projectAPI.getJoinable();
        setJoinableProjects(joinableData);
      } else {
        const invitesData = await invitationAPI.getAll();
        setInvitations(invitesData);
      }
    } catch (err) {
      console.error('Failed to load projects metadata', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!name || !key) {
      setError('Project Name and Key are required.');
      return;
    }
    setError('');
    setSubmitLoading(true);
    try {
      await projectAPI.create({ name, key: key.toUpperCase(), description, lead });
      setIsModalOpen(false);
      setName('');
      setKey('');
      setDescription('');
      loadData();
    } catch (err) {
      setError(err.response?.data?.key?.[0] || err.response?.data?.error || 'Failed to create project.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleRequestAccess = async (projectId) => {
    try {
      await joinRequestAPI.create(projectId);
      loadData(); 
    } catch (err) {
      alert(err.response?.data?.[0] || 'Failed to request access.');
    }
  };

  const handleProcessRequest = async (requestId, approved) => {
    try {
      if (approved) {
        await joinRequestAPI.approve(requestId);
      } else {
        await joinRequestAPI.reject(requestId);
      }
      loadData(); 
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to process request.');
    }
  };

  const handleSendInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail) return;
    setInviteLoading(true);
    setInviteError('');
    setGeneratedLink('');
    try {
      const invite = await invitationAPI.create(inviteEmail, inviteProject || null);
      const link = `${window.location.origin}/accept-invite?token=${invite.id}`;
      setGeneratedLink(link);
      setInviteEmail('');
      loadData(); 
    } catch (err) {
      setInviteError(err.response?.data?.error || 'Failed to generate invitation.');
    } finally {
      setInviteLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Link copied to clipboard!');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const pendingRequestsToApprove = joinRequests.filter(r => 
    r.status === 'PE' && (currentUser.is_superuser || r.project_details?.lead === currentUser.id)
  );

  return (
    <div className="space-y-6 animate-fadeIn text-[#f3f4f6]">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-white">Workspace Projects</h1>
          <p className="text-sm text-[#71717a] mt-1">Manage, join, and collaborate on active projects.</p>
        </div>
        
        {currentUser.is_superuser && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-lg transition-colors shadow-sm focus:outline-none cursor-pointer"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Project
          </button>
        )}
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-[#202024]">
        <button
          onClick={() => setActiveTab('active')}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'active' ? 'border-indigo-600 text-indigo-400' : 'border-transparent text-[#71717a] hover:text-[#a1a1aa]'
          }`}
        >
          My Projects ({projects.length})
        </button>

        {!currentUser.is_superuser && (
          <button
            onClick={() => setActiveTab('joinable')}
            className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'joinable' ? 'border-indigo-600 text-indigo-400' : 'border-transparent text-[#71717a] hover:text-[#a1a1aa]'
            }`}
          >
            Available Projects ({joinableProjects.length})
          </button>
        )}

        <button
          onClick={() => setActiveTab('requests')}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-all relative cursor-pointer ${
            activeTab === 'requests' ? 'border-indigo-600 text-indigo-400' : 'border-transparent text-[#71717a] hover:text-[#a1a1aa]'
          }`}
        >
          Join Requests 
          {pendingRequestsToApprove.length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 bg-red-950/40 text-red-400 border border-red-900/50 text-[10px] font-bold rounded-full">
              {pendingRequestsToApprove.length}
            </span>
          )}
        </button>

        {currentUser.is_superuser && (
          <button
            onClick={() => setActiveTab('invites')}
            className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'invites' ? 'border-indigo-600 text-indigo-400' : 'border-transparent text-[#71717a] hover:text-[#a1a1aa]'
            }`}
          >
            Workspace Invites ({invitations.length})
          </button>
        )}
      </div>

      {/* ACTIVE PROJECTS TAB */}
      {activeTab === 'active' && (
        projects.length === 0 ? (
          <div className="bg-[#131316] border border-[#202024] rounded-xl shadow-sm p-12 text-center text-[#71717a]">
            <FolderKanban className="w-16 h-16 mx-auto text-[#2b2b30] mb-4" />
            <h3 className="text-lg font-semibold text-white">No active projects</h3>
            <p className="text-sm text-[#71717a] mt-1">You are not a member of any projects. Check "Available Projects" to request access.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div
                key={project.id}
                onClick={() => onNavigateToProject(project.id)}
                className="bg-[#131316] border border-[#202024] rounded-xl p-6 shadow-sm hover:border-[#2e2e36] transition-all flex flex-col justify-between cursor-pointer group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="inline-flex p-2 bg-[#1c1c1f] text-indigo-400 border border-[#282830] rounded-lg">
                      <Briefcase className="w-5 h-5" />
                    </div>
                    <span className="px-2 py-0.5 bg-[#1c1c1f] text-[#a1a1aa] border border-[#282830] text-xs font-semibold rounded">
                      {project.key}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white truncate group-hover:text-indigo-400 transition-colors">{project.name}</h3>
                  <p className="text-sm text-[#71717a] line-clamp-2 h-10">
                    {project.description || 'No description provided.'}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-[#202024] flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-full bg-[#1c1c1f] text-indigo-400 border border-[#2a2a30] flex items-center justify-center text-[10px] font-bold">
                      {project.lead_details?.username?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <span className="text-xs text-[#71717a]">
                      Lead: <span className="font-medium text-[#a1a1aa]">{project.lead_details?.username}</span>
                    </span>
                  </div>
                  <span
                    className="text-xs font-semibold text-indigo-400 group-hover:text-indigo-300 transition-colors"
                  >
                    View Board &rarr;
                  </span>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* JOINABLE PROJECTS TAB */}
      {activeTab === 'joinable' && (
        joinableProjects.length === 0 ? (
          <div className="bg-[#131316] border border-[#202024] rounded-xl shadow-sm p-12 text-center text-[#71717a]">
            <Check className="w-12 h-12 mx-auto text-green-500 mb-4" />
            <h3 className="text-lg font-semibold text-white">All caught up!</h3>
            <p className="text-sm text-[#71717a] mt-1">You are already a member of all active projects in the workspace.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {joinableProjects.map((project) => {
              const hasPendingRequest = joinRequests.some(r => r.project === project.id && r.status === 'PE');
              return (
                <div
                  key={project.id}
                  className="bg-[#131316] border border-[#202024] rounded-xl p-6 shadow-sm flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="inline-flex p-2 bg-[#1c1c1f] border border-[#282830] rounded-lg text-gray-500">
                        <Briefcase className="w-5 h-5" />
                      </div>
                      <span className="px-2 py-0.5 bg-[#1c1c1f] text-[#71717a] border border-[#282830] text-xs font-semibold rounded">
                        {project.key}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-white truncate">{project.name}</h3>
                    <p className="text-sm text-[#71717a] line-clamp-2 h-10">
                      {project.description || 'No description provided.'}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-[#202024] flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 rounded-full bg-[#1c1c1f] text-[#71717a] border border-[#282830] flex items-center justify-center text-[10px] font-bold">
                        {project.lead_details?.username?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <span className="text-xs text-[#71717a]">
                        Lead: <span className="font-medium text-[#a1a1aa]">{project.lead_details?.username}</span>
                      </span>
                    </div>

                    {hasPendingRequest ? (
                      <span className="px-3 py-1 bg-yellow-950/20 border border-yellow-900/50 text-yellow-550 text-xs font-semibold rounded-lg">
                        Pending Admin Approval
                      </span>
                    ) : (
                      <button
                        onClick={() => handleRequestAccess(project.id)}
                        className="px-3 py-1 bg-indigo-955/30 hover:bg-indigo-950/50 text-indigo-400 border border-indigo-900/50 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                      >
                        Request Access
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* JOIN REQUESTS TAB */}
      {activeTab === 'requests' && (
        <div className="space-y-6">
          {/* Section: Pending Approval (For Admins/Leads) */}
          {(currentUser.is_superuser || pendingRequestsToApprove.length > 0) && (
            <div className="bg-[#131316] border border-[#202024] rounded-xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-[#202024] bg-[#18181c]">
                <h3 className="font-bold text-white text-sm">Requests Awaiting Your Approval</h3>
              </div>
              <div className="divide-y divide-[#202024]">
                {pendingRequestsToApprove.length === 0 ? (
                  <p className="p-6 text-xs text-[#71717a] italic text-center">No pending join requests to process.</p>
                ) : (
                  pendingRequestsToApprove.map((req) => (
                    <div key={req.id} className="p-4 flex items-center justify-between flex-wrap gap-4">
                      <div>
                        <p className="text-xs text-[#e4e4e7]">
                          Developer <span className="font-bold text-white">{req.user_details?.username}</span> requested to join project <span className="font-bold text-white">{req.project_details?.name}</span>.
                        </p>
                        <p className="text-[10px] text-[#71717a] mt-0.5">Submitted on: {new Date(req.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleProcessRequest(req.id, false)}
                          className="px-3 py-1.5 border border-red-900/50 text-red-400 hover:bg-red-950/20 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleProcessRequest(req.id, true)}
                          className="px-3 py-1.5 bg-green-700 hover:bg-green-600 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                        >
                          Approve
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Section: My Requests Status (For Standard Users) */}
          {!currentUser.is_superuser && (
            <div className="bg-[#131316] border border-[#202024] rounded-xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-[#202024] bg-[#18181c]">
                <h3 className="font-bold text-white text-sm">My Join Requests Status</h3>
              </div>
              <div className="divide-y divide-[#202024]">
                {joinRequests.filter(r => r.user === currentUser.id).length === 0 ? (
                  <p className="p-6 text-xs text-[#71717a] italic text-center">You haven't requested to join any projects yet.</p>
                ) : (
                  joinRequests.filter(r => r.user === currentUser.id).map((req) => (
                    <div key={req.id} className="p-4 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-white">{req.project_details?.name}</p>
                        <p className="text-[10px] text-[#71717a]">Key: {req.project_details?.key}</p>
                      </div>
                      <span className={`px-2 py-0.5 border text-[10px] font-bold rounded ${
                        req.status === 'PE' ? 'bg-yellow-950/20 border-yellow-900/50 text-yellow-550' :
                        req.status === 'AP' ? 'bg-green-950/20 border-green-900/50 text-green-400' :
                        'bg-red-950/20 border-red-900/50 text-red-400'
                      }`}>
                        {req.status === 'PE' ? 'Pending Approval' : req.status === 'AP' ? 'Approved' : 'Rejected'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* WORKSPACE INVITES TAB */}
      {activeTab === 'invites' && currentUser.is_superuser && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Invite Form */}
          <div className="lg:col-span-1 bg-[#131316] border border-[#202024] rounded-xl p-6 shadow-sm h-fit space-y-4">
            <h3 className="font-bold text-white text-sm">Invite New Developer</h3>
            {inviteError && (
              <div className="p-3 bg-red-950/20 border border-red-900/50 text-red-400 text-xs rounded-lg">
                {inviteError}
              </div>
            )}
            <form onSubmit={handleSendInvite} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#71717a] uppercase mb-1.5">Developer Email *</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="e.g. dev@company.com"
                  className="w-full px-3 py-2 bg-[#131316] border border-[#202024] text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#71717a] uppercase mb-1.5">Assign to Project (Optional)</label>
                <select
                  value={inviteProject}
                  onChange={(e) => setInviteProject(e.target.value)}
                  className="w-full px-3 py-2 bg-[#131316] border border-[#202024] text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="">No Project (Workspace Invitation)</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={inviteLoading}
                className="w-full inline-flex items-center justify-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium text-sm rounded-lg transition-colors focus:outline-none cursor-pointer"
              >
                <Send className="w-4 h-4 mr-2" />
                Generate Link
              </button>
            </form>

            {generatedLink && (
              <div className="p-4 bg-green-950/20 border border-green-900/50 rounded-xl space-y-2">
                <p className="text-xs text-green-400 font-bold flex items-center"><Check className="w-4 h-4 mr-1" /> Invite Created!</p>
                <p className="text-[10px] text-[#71717a]">Copy this invite link and send it to the developer:</p>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    readOnly
                    value={generatedLink}
                    className="flex-1 px-2 py-1 bg-[#131316] border border-[#202024] rounded text-xs select-all text-[#e4e4e7] outline-none"
                  />
                  <button
                    onClick={() => copyToClipboard(generatedLink)}
                    className="p-1.5 bg-[#131316] border border-[#202024] hover:bg-[#1c1c22] rounded text-[#71717a] cursor-pointer"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Invites List */}
          <div className="lg:col-span-2 bg-[#131316] border border-[#202024] rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[#202024] bg-[#18181c]">
              <h3 className="font-bold text-white text-sm">Active Workspace Invitations</h3>
            </div>
            <div className="divide-y divide-[#202024]">
              {invitations.length === 0 ? (
                <p className="p-12 text-xs text-[#71717a] italic text-center">No invitations sent yet.</p>
              ) : (
                invitations.map((invite) => {
                  const link = `${window.location.origin}/accept-invite?token=${invite.id}`;
                  return (
                    <div key={invite.id} className="p-4 flex items-center justify-between flex-wrap gap-4">
                      <div>
                        <p className="text-xs font-bold text-white">{invite.email}</p>
                        <p className="text-[10px] text-[#71717a]">Invited to: {invite.project_details?.name || 'Entire Workspace'}</p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${
                          invite.accepted ? 'bg-green-950/20 border-green-900/50 text-green-400' : 'bg-yellow-950/20 border-yellow-900/50 text-yellow-550'
                        }`}>
                          {invite.accepted ? 'Accepted' : 'Pending Link'}
                        </span>
                        {!invite.accepted && (
                          <button
                            onClick={() => copyToClipboard(link)}
                            className="p-1.5 hover:bg-[#18181c] border border-[#202024] rounded text-indigo-400 hover:text-indigo-300 flex items-center text-xs font-semibold cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5 mr-1" /> Copy Link
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Project Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-lg bg-[#0d0d0f] rounded-xl shadow-lg border border-[#202024] overflow-hidden animate-slideUp text-[#f3f4f6]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#202024]">
              <h3 className="text-lg font-bold text-white">Create New Project</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-200 focus:outline-none cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mx-6 mt-4 p-3 bg-red-950/20 border border-red-900/50 text-red-400 text-xs rounded-lg animate-fadeIn">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateProject} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#71717a] uppercase tracking-wider mb-1.5">
                  Project Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#131316] border border-[#202024] rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                  placeholder="e.g. Apollo Launch"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#71717a] uppercase tracking-wider mb-1.5">
                    Project Key *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    className="w-full px-3 py-2 bg-[#131316] border border-[#202024] rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                    placeholder="e.g. APO"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#71717a] uppercase tracking-wider mb-1.5">
                    Project Lead *
                  </label>
                  <select
                    value={lead}
                    onChange={(e) => setLead(e.target.value)}
                    className="w-full px-3 py-2 bg-[#131316] border border-[#202024] text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.username}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#71717a] uppercase tracking-wider mb-1.5">
                  Description
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-[#131316] border border-[#202024] rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  placeholder="Summarize the project's purpose..."
                />
              </div>

              <div className="pt-4 flex items-center justify-end space-x-3 border-t border-[#202024]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-[#202024] hover:bg-[#18181c] text-[#71717a] hover:text-white font-medium text-sm rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="flex items-center justify-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold text-sm rounded-lg transition-colors focus:outline-none cursor-pointer"
                >
                  {submitLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Creating...
                    </>
                  ) : (
                    'Create Project'
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
