import React, { useEffect, useState } from 'react';
import { issueAPI } from '../api/api';
import { Loader2, Clock, AlertCircle, Search, Bug, CheckSquare, Layers } from 'lucide-react';

export default function Recent({ onNavigateToIssue }) {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function fetchRecentIssues() {
      try {
        const data = await issueAPI.getAll({ recent: 'true' });
        setIssues(data);
      } catch (err) {
        console.error("Failed to fetch recent issues", err);
        setError("Failed to load recent activity.");
      } finally {
        setLoading(false);
      }
    }
    fetchRecentIssues();
  }, []);

  const getIcon = (type) => {
    switch (type) {
      case 'BU': 
        return <Bug className="w-4 h-4 text-red-500 shrink-0" />;
      case 'ST':
        return <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />;
      case 'EP':
        return <Layers className="w-4 h-4 text-[#c084fc] shrink-0" />;
      default: // Task
        return <CheckSquare className="w-4 h-4 text-blue-400 shrink-0" />;
    }
  };

  const formatTimeAgo = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  // Filter issues based on search query
  const filteredIssues = issues.filter(issue => 
    issue.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    issue.issue_no.toString().includes(searchQuery)
  );

  const getGroupedIssues = (issuesList) => {
    const today = [];
    const yesterday = [];
    const earlier = [];

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);

    issuesList.forEach(issue => {
      const date = new Date(issue.created_at);
      if (date >= startOfToday) {
        today.push(issue);
      } else if (date >= startOfYesterday) {
        yesterday.push(issue);
      } else {
        earlier.push(issue);
      }
    });

    return { today, yesterday, earlier };
  };

  const { today, yesterday, earlier } = getGroupedIssues(filteredIssues);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  const renderIssueGroupList = (groupTitle, list) => {
    if (list.length === 0) return null;
    return (
      <div className="space-y-1.5">
        <h3 className="text-[10px] font-bold text-[#71717a] px-2.5 uppercase tracking-wider">{groupTitle}</h3>
        <div className="space-y-0.5">
          {list.map((issue) => (
            <div
              key={issue.issue_no}
              onClick={() => onNavigateToIssue(issue.space, issue.issue_no)}
              className="flex items-start space-x-2.5 px-2.5 py-1.5 hover:bg-[#1c1c1f] rounded-lg transition-colors cursor-pointer group"
            >
              <div className="mt-0.5 shrink-0">
                {getIcon(issue.type)}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-normal text-[#e4e4e7] group-hover:text-indigo-400 group-hover:underline transition-all truncate">
                  {issue.title}
                </h4>
                <p className="text-[10px] text-[#71717a] mt-0.5">
                  {issue.project_details?.name || `Project: ${issue.project}`} <span className="mx-1">•</span> {formatTimeAgo(issue.created_at)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 text-[#f3f4f6]">
      {error && (
        <div className="p-3 bg-red-950/20 border border-red-900/50 text-red-400 text-xs rounded-xl flex items-center space-x-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Header Search */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search recent items"
          className="w-full bg-[#0d0d0f] border border-[#202024] text-white pl-9 pr-3 py-1.5 rounded-lg text-xs focus:outline-none focus:border-indigo-500 transition-colors"
        />
        <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-gray-500" />
      </div>

      {/* List Content */}
      {!error && filteredIssues.length === 0 ? (
        <div className="py-8 text-center text-[#71717a]">
          <Clock className="w-8 h-8 mx-auto text-[#2b2b30] mb-2" />
          <p className="text-xs">No recent items found</p>
        </div>
      ) : (
        <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
          {renderIssueGroupList('Today', today)}
          {renderIssueGroupList('Yesterday', yesterday)}
          {renderIssueGroupList('Earlier', earlier)}
        </div>
      )}
    </div>
  );
}
