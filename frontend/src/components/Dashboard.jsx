import React, { useEffect, useState } from 'react';
import { projectAPI, analyticsAPI } from '../api/api';
import { BookOpen, FileText, Rss, Layers, Plus, Trash2, Calendar, Loader2, TrendingUp, BarChart3, Flame, PieChart as LucidePieChart } from 'lucide-react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  Legend, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  LineChart, 
  Line, 
  AreaChart, 
  Area 
} from 'recharts';

export default function Dashboard({ user, onNavigateToProject }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [time, setTime] = useState(new Date());

  // Stickies state
  const [stickies, setStickies] = useState(() => {
    const saved = localStorage.getItem('jiraclone_stickies');
    return saved ? JSON.parse(saved) : [
      { id: 1, text: 'Welcome to Spacess! Use this space to write quick notes, tasks or ideas. Anything you type here auto-saves locally.' }
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

  const [analyticsData, setAnalyticsData] = useState(null);
  const [selectedProjectFilter, setSelectedProjectFilter] = useState('');

  useEffect(() => {
    async function loadAnalytics() {
      try {
        const data = await analyticsAPI.getDashboardData(selectedProjectFilter || null);
        setAnalyticsData(data);
      } catch (err) {
        console.error('Error loading dashboard analytics', err);
      }
    }
    loadAnalytics();
  }, [selectedProjectFilter]);

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

      {/* ANALYTICS SECTION */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
          <div>
            <h3 className="text-xs font-bold text-[#71717a] uppercase tracking-wider">Project Analytics</h3>
            <p className="text-[11px] text-[#52525b] mt-0.5">Real-time team performance metrics and sprint tracking</p>
          </div>
          <select
            value={selectedProjectFilter}
            onChange={(e) => setSelectedProjectFilter(e.target.value)}
            className="bg-[#131316] border border-[#202024] rounded-lg text-[10px] font-bold text-[#a1a1aa] px-2.5 py-1.5 focus:outline-none w-full sm:w-48 cursor-pointer"
          >
            <option value="">All Projects</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {analyticsData ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Burndown Chart Card */}
              <div className="bg-[#131316] border border-[#202024] rounded-xl p-5 shadow-sm lg:col-span-3 flex flex-col justify-between min-h-[320px]">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <Flame className="w-4 h-4 text-orange-400" />
                    <h4 className="text-xs font-bold text-[#e4e4e7]">Active Sprint Burndown</h4>
                  </div>
                  {analyticsData.has_active_sprint ? (
                    <span className="text-[9px] font-semibold text-orange-400 bg-orange-950/20 border border-orange-900/50 px-2 py-0.5 rounded">
                      {analyticsData.active_sprint_name}
                    </span>
                  ) : (
                    <span className="text-[9px] font-semibold text-[#71717a] bg-[#1a1a1e] px-2 py-0.5 rounded">
                      No Active Sprint
                    </span>
                  )}
                </div>
                
                {analyticsData.has_active_sprint && analyticsData.burndown_data.length > 0 ? (
                  <div className="flex-1 h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={analyticsData.burndown_data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1c1c20" />
                        <XAxis dataKey="day" stroke="#52525b" fontSize={9} tickLine={false} />
                        <YAxis stroke="#52525b" fontSize={9} tickLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#131316', borderColor: '#202024', borderRadius: 8, fontSize: 10 }} />
                        <Legend wrapperStyle={{ fontSize: 9, paddingTop: 10 }} />
                        <Line type="monotone" dataKey="ideal" name="Ideal Burndown" stroke="#71717a" strokeDasharray="5 5" strokeWidth={1.5} dot={false} />
                        <Line type="monotone" dataKey="actual" name="Actual Remaining" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3, fill: '#6366f1' }} connectNulls />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center text-xs text-gray-500">
                    <p>Activate a sprint in spaces to visualize the daily burndown timeline.</p>
                  </div>
                )}
              </div>

              {/* Status Pie Chart Card */}
              <div className="bg-[#131316] border border-[#202024] rounded-xl p-5 shadow-sm lg:col-span-2 flex flex-col justify-between min-h-[320px]">
                <div className="flex items-center space-x-2 mb-4">
                  <LucidePieChart className="w-4 h-4 text-indigo-400" />
                  <h4 className="text-xs font-bold text-[#e4e4e7]">Issues Status Split</h4>
                </div>

                {analyticsData.status_data.length > 0 ? (
                  <div className="flex-1 h-[220px] flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={analyticsData.status_data}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {analyticsData.status_data.map((entry, index) => {
                            const colors = {
                              'Open': '#6366f1',
                              'In Progress': '#f59e0b',
                              'Closed': '#10b981'
                            };
                            return <Cell key={`cell-${index}`} fill={colors[entry.name] || '#3f3f46'} />;
                          })}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#131316', borderColor: '#202024', borderRadius: 8, fontSize: 10 }} />
                        <Legend wrapperStyle={{ fontSize: 9 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-center text-xs text-gray-500">
                    No issue data available.
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Velocity Area Chart Card */}
              <div className="bg-[#131316] border border-[#202024] rounded-xl p-5 shadow-sm lg:col-span-3 flex flex-col justify-between min-h-[320px]">
                <div className="flex items-center space-x-2 mb-4">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-xs font-bold text-[#e4e4e7]">Sprint Velocity Trend</h4>
                </div>

                {analyticsData.velocity_data.length > 0 ? (
                  <div className="flex-1 h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={analyticsData.velocity_data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorSP" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1c1c20" />
                        <XAxis dataKey="sprint_name" stroke="#52525b" fontSize={9} tickLine={false} />
                        <YAxis stroke="#52525b" fontSize={9} tickLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#131316', borderColor: '#202024', borderRadius: 8, fontSize: 10 }} />
                        <Legend wrapperStyle={{ fontSize: 9, paddingTop: 10 }} />
                        <Area type="monotone" dataKey="completed_sp" name="Completed Story Points" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorSP)" />
                        <Area type="monotone" dataKey="total_sp" name="Total Committed Story Points" stroke="#6366f1" strokeWidth={1.5} fillOpacity={1} fill="url(#colorTotal)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-center text-xs text-gray-500">
                    No sprint records found to calculate velocity.
                  </div>
                )}
              </div>

              {/* Priority Bar Chart Card */}
              <div className="bg-[#131316] border border-[#202024] rounded-xl p-5 shadow-sm lg:col-span-2 flex flex-col justify-between min-h-[320px]">
                <div className="flex items-center space-x-2 mb-4">
                  <BarChart3 className="w-4 h-4 text-amber-400" />
                  <h4 className="text-xs font-bold text-[#e4e4e7]">Issue Priority Breakdown</h4>
                </div>

                {analyticsData.priority_data.length > 0 ? (
                  <div className="flex-1 h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analyticsData.priority_data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1c1c20" />
                        <XAxis dataKey="name" stroke="#52525b" fontSize={9} tickLine={false} />
                        <YAxis stroke="#52525b" fontSize={9} tickLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#131316', borderColor: '#202024', borderRadius: 8, fontSize: 10 }} />
                        <Bar dataKey="value" name="Issues" radius={[4, 4, 0, 0]}>
                          {analyticsData.priority_data.map((entry, index) => {
                            const colors = {
                              'Low': '#10b981',
                              'Medium': '#3b82f6',
                              'High': '#f97316',
                              'Critical': '#ef4444'
                            };
                            return <Cell key={`cell-${index}`} fill={colors[entry.name] || '#3f3f46'} />;
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-center text-xs text-gray-500">
                    No priority statistics available.
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center min-h-[200px]">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
          </div>
        )}
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
