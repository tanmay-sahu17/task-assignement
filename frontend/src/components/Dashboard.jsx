import React, { useEffect, useState } from 'react';
import { projectAPI } from '../api/api';
import { BookOpen, FileText, Rss, Layers, Plus, Trash2, Calendar, Loader2 } from 'lucide-react';

export default function Dashboard({ user, onNavigateToProject }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [time, setTime] = useState(new Date());

  // Stickies state
  const [stickies, setStickies] = useState(() => {
    const saved = localStorage.getItem('jiraclone_stickies');
    return saved ? JSON.parse(saved) : [
      { id: 1, text: 'Welcome to JiraClone! Use this space to write quick notes, tasks or ideas. Anything you type here auto-saves locally.' }
    ];
  });

  useEffect(() => {
    // Save stickies to local storage on change
    localStorage.setItem('jiraclone_stickies', JSON.stringify(stickies));
  }, [stickies]);

  useEffect(() => {
    async function loadData() {
      try {
        const projData = await projectAPI.getAll();
        setProjects(projData);
      } catch (err) {
        console.error('Error fetching dashboard stats', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Update clock every minute
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    const hrs = time.getHours();
    if (hrs < 12) return 'Good morning';
    if (hrs < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const formatDate = (date) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const dayName = days[date.getDay()];
    const monthName = months[date.getMonth()];
    const dayNum = date.getDate();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${dayName}, ${monthName} ${dayNum} ${hours}:${minutes}`;
  };

  const addSticky = () => {
    const newSticky = {
      id: Date.now(),
      text: ''
    };
    setStickies([...stickies, newSticky]);
  };

  const updateSticky = (id, text) => {
    setStickies(stickies.map(s => s.id === id ? { ...s, text } : s));
  };

  const deleteSticky = (id) => {
    setStickies(stickies.filter(s => s.id !== id));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  // Get up to 3 recent active projects
  const recentProjects = projects.slice(0, 3);

  return (
    <div className="space-y-10 animate-fadeIn">
      {/* Welcome Banner */}
      <div className="text-center md:text-left py-4">
        <h1 className="text-3xl md:text-4xl font-semibold text-white tracking-tight">
          {getGreeting()}, {user.username}
        </h1>
        <p className="text-sm text-[#71717a] mt-2.5 flex items-center justify-center md:justify-start">
          <Calendar className="w-4 h-4 mr-2 text-[#71717a]" />
          {formatDate(time)}
        </p>
      </div>

      {/* QUICKLINKS SECTION */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-[#71717a] uppercase tracking-wider">Quicklinks</h3>
          <button className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold focus:outline-none transition-colors">
            + Add quick Link
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1 */}
          <div className="bg-[#131316] border border-[#202024] rounded-xl p-4 flex items-center space-x-4 shadow-sm hover:border-[#2e2e36] transition-all">
            <div className="p-2.5 bg-[#1b1b21] rounded-lg text-indigo-400 border border-[#2a2a35]">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#e4e4e7]">JiraClone Changelog</h4>
              <p className="text-[10px] text-[#71717a] mt-0.5">29 days ago</p>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-[#131316] border border-[#202024] rounded-xl p-4 flex items-center space-x-4 shadow-sm hover:border-[#2e2e36] transition-all">
            <div className="p-2.5 bg-[#1b1b21] rounded-lg text-indigo-400 border border-[#2a2a35]">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#e4e4e7]">Developer Docs</h4>
              <p className="text-[10px] text-[#71717a] mt-0.5">29 days ago</p>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-[#131316] border border-[#202024] rounded-xl p-4 flex items-center space-x-4 shadow-sm hover:border-[#2e2e36] transition-all">
            <div className="p-2.5 bg-[#1b1b21] rounded-lg text-indigo-400 border border-[#2a2a35]">
              <Rss className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#e4e4e7]">Team Blogs & Stories</h4>
              <p className="text-[10px] text-[#71717a] mt-0.5">29 days ago</p>
            </div>
          </div>
        </div>
      </div>

      {/* RECENTS SECTION */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-[#71717a] uppercase tracking-wider">Recents</h3>
          <select className="bg-[#131316] border border-[#202024] rounded-lg text-[10px] font-bold text-[#a1a1aa] px-2.5 py-1 focus:outline-none">
            <option>All</option>
            <option>Projects</option>
          </select>
        </div>

        {recentProjects.length === 0 ? (
          <div className="bg-[#131316] border border-[#202024] rounded-xl p-16 text-center shadow-sm">
            <div className="w-16 h-16 bg-[#18181c] border border-[#26262b] rounded-2xl flex items-center justify-center mx-auto text-[#52525b] mb-4">
              <Layers className="w-8 h-8" />
            </div>
            <p className="text-xs text-[#71717a] font-medium">You don't have any recents yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {recentProjects.map((project) => (
              <div
                key={project.id}
                onClick={() => onNavigateToProject(project.id)}
                className="bg-[#131316] border border-[#202024] rounded-xl p-5 shadow-sm hover:border-[#2b2b34] cursor-pointer transition-all flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-950/40 border border-indigo-900/50 px-2 py-0.5 rounded">
                      {project.key}
                    </span>
                    <span className="text-[9px] text-[#71717a]">Active Project</span>
                  </div>
                  <h4 className="text-sm font-bold text-[#e4e4e7] truncate">{project.name}</h4>
                  <p className="text-xs text-[#71717a] line-clamp-2">{project.description || 'No description.'}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-[#1c1c20] flex items-center justify-between text-[10px] text-[#71717a]">
                  <span>Lead: <span className="font-semibold text-[#a1a1aa]">{project.lead_details?.username}</span></span>
                  <span className="text-indigo-400 font-bold hover:text-indigo-300">View board &rarr;</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* STICKIES SECTION */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-[#71717a] uppercase tracking-wider">Your stickies</h3>
          <button
            onClick={addSticky}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center focus:outline-none transition-colors"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Add sticky
          </button>
        </div>

        {stickies.length === 0 ? (
          <div className="border border-dashed border-[#202024] hover:border-[#2e2e36] rounded-xl p-8 text-center text-xs text-[#71717a] cursor-pointer" onClick={addSticky}>
            + Click here to create a new sticky note
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-fadeIn">
            {stickies.map((sticky) => (
              <div
                key={sticky.id}
                className="bg-[#131316] border border-[#202024] rounded-xl p-4 flex flex-col justify-between min-h-[140px] group hover:border-[#2e2e36] transition-all relative"
              >
                {/* Delete button (only visible on group hover to keep minimal UI) */}
                <button
                  onClick={() => deleteSticky(sticky.id)}
                  className="absolute top-2.5 right-2.5 p-1 bg-[#18181c] border border-[#28282f] rounded text-[#71717a] hover:text-red-400 hover:bg-red-950/20 opacity-0 group-hover:opacity-100 transition-all focus:outline-none"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                <textarea
                  value={sticky.text}
                  onChange={(e) => updateSticky(sticky.id, e.target.value)}
                  placeholder="Write something down..."
                  className="w-full h-full bg-transparent resize-none outline-none text-xs text-[#d4d4d8] placeholder-[#52525b] leading-relaxed pr-6"
                />

                <span className="text-[9px] text-[#52525b] mt-2 block self-end">
                  {new Date(sticky.id).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
