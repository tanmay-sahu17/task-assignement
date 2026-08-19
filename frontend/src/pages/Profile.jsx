import React, { useEffect, useState } from 'react';
import { authAPI } from '../api/api';
import { User, Mail, Briefcase, Building, Phone, MapPin, AlignLeft, CheckCircle, AlertCircle, Save, Loader2, Lock } from 'lucide-react';

const AVATAR_COLORS = [
  { name: 'Indigo', hex: '#4f46e5' },
  { name: 'Emerald', hex: '#10b981' },
  { name: 'Rose', hex: '#f43f5e' },
  { name: 'Amber', hex: '#f59e0b' },
  { name: 'Violet', hex: '#8b5cf6' },
  { name: 'Cyan', hex: '#06b6d4' }
];

export default function Profile({ currentUser, onProfileUpdate }) {
  const [profile, setProfile] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    job_title: '',
    department: '',
    bio: '',
    avatar_color: '#4f46e5',
    phone: '',
    location: ''
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null); // { type: 'success' | 'error', text: string }
  const [originalProfile, setOriginalProfile] = useState(null);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const data = await authAPI.getProfile();
        setProfile(data);
        setOriginalProfile(data);
      } catch (err) {
        console.error('Failed to load profile:', err);
        setStatusMessage({
          type: 'error',
          text: 'Failed to load profile details. Please try again.'
        });
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectColor = (hex) => {
    setProfile(prev => ({ ...prev, avatar_color: hex }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setStatusMessage(null);
    
    try {
      const response = await authAPI.updateProfile(profile);
      setProfile(response.profile);
      setOriginalProfile(response.profile);
      setStatusMessage({
        type: 'success',
        text: 'Profile updated successfully!'
      });
      // Propagate changes to the main layout
      if (onProfileUpdate) {
        onProfileUpdate({
          username: response.profile.username,
          email: response.profile.email,
          avatar_color: response.profile.avatar_color
        });
      }
    } catch (err) {
      console.error('Failed to update profile:', err);
      const errMsg = err.response?.data?.error || 'Failed to update profile. Please try again.';
      setStatusMessage({
        type: 'error',
        text: errMsg
      });
    } finally {
      setSaving(false);
    }
  };

  // Get initials for Avatar
  const getInitials = () => {
    if (profile.first_name && profile.last_name) {
      return (profile.first_name[0] + profile.last_name[0]).toUpperCase();
    }
    return (profile.username?.[0] || currentUser.username?.[0] || 'U').toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn max-w-5xl">
      {/* Title Header */}
      <div>
        <h1 className="text-3xl font-semibold text-white tracking-tight">Profile Settings</h1>
        <p className="text-sm text-[#71717a] mt-1.5">
          Manage your personal details, job role, and customize your workspace identity.
        </p>
      </div>

      {statusMessage && (
        <div className={`p-4 rounded-xl flex items-start space-x-3 border ${
          statusMessage.type === 'success' 
            ? 'bg-emerald-950/20 border-emerald-900/50 text-emerald-400' 
            : 'bg-rose-950/20 border-rose-900/50 text-rose-400'
        }`}>
          {statusMessage.type === 'success' ? (
            <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          )}
          <span className="text-sm font-medium">{statusMessage.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Avatar Card */}
        <div className="bg-[#131316] border border-[#202024] rounded-2xl p-6 flex flex-col items-center space-y-6 shadow-md h-fit">
          <h3 className="text-xs font-bold text-[#71717a] uppercase tracking-wider self-start">Workspace Avatar</h3>
          
          {/* Avatar Preview */}
          <div 
            className="w-24 h-24 rounded-2xl flex items-center justify-center text-white font-extrabold text-3xl shadow-lg border border-[#2c2c34] transition-all duration-300 transform hover:scale-105"
            style={{ backgroundColor: profile.avatar_color }}
          >
            {getInitials()}
          </div>
          
          <div className="text-center">
            <h4 className="text-sm font-semibold text-[#e4e4e7]">
              {profile.first_name || profile.last_name 
                ? `${profile.first_name} ${profile.last_name}`.trim() 
                : profile.username}
            </h4>
            <p className="text-xs text-[#71717a] mt-1">
              {profile.job_title || 'No Job Title'}
            </p>
          </div>

          <hr className="w-full border-[#202024]" />

          {/* Color Picker */}
          <div className="w-full space-y-3">
            <label className="text-xs font-semibold text-[#a1a1aa]">Avatar Theme Color</label>
            <div className="grid grid-cols-6 gap-2">
              {AVATAR_COLORS.map(color => (
                <button
                  key={color.name}
                  type="button"
                  onClick={() => handleSelectColor(color.hex)}
                  className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all ${
                    profile.avatar_color === color.hex 
                      ? 'border-white scale-110 shadow-md shadow-black' 
                      : 'border-[#2d2d35] hover:border-gray-400'
                  }`}
                  style={{ backgroundColor: color.hex }}
                  title={color.name}
                >
                  {profile.avatar_color === color.hex && (
                    <span className="block w-2 h-2 rounded-full bg-white shadow-sm" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Profile Details */}
        <div className="lg:col-span-2 bg-[#131316] border border-[#202024] rounded-2xl p-8 shadow-md space-y-6">
          <h3 className="text-xs font-bold text-[#71717a] uppercase tracking-wider">Profile Information</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Username (Read Only) */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#a1a1aa] flex items-center">
                Username <Lock className="w-3 h-3 ml-1 text-gray-500" />
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={profile.username}
                  disabled
                  className="w-full bg-[#18181b] border border-[#2b2b32] text-[#71717a] pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none cursor-not-allowed"
                />
                <User className="w-4 h-4 text-gray-500 absolute left-3.5 top-3.5" />
              </div>
            </div>

            {/* Email Address (Editable) */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#a1a1aa]">Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  name="email"
                  value={profile.email}
                  onChange={handleChange}
                  required
                  placeholder="name@company.com"
                  className="w-full bg-[#1c1c1f] border border-[#2b2b32] text-[#f3f4f6] pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none focus:border-indigo-500 transition-colors"
                />
                <Mail className="w-4 h-4 text-gray-500 absolute left-3.5 top-3.5" />
              </div>
            </div>

            {/* First Name */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#a1a1aa]">First Name</label>
              <input
                type="text"
                name="first_name"
                value={profile.first_name}
                onChange={handleChange}
                placeholder="John"
                className="w-full bg-[#1c1c1f] border border-[#2b2b32] text-[#f3f4f6] px-4 py-2.5 rounded-xl text-sm outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            {/* Last Name */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#a1a1aa]">Last Name</label>
              <input
                type="text"
                name="last_name"
                value={profile.last_name}
                onChange={handleChange}
                placeholder="Doe"
                className="w-full bg-[#1c1c1f] border border-[#2b2b32] text-[#f3f4f6] px-4 py-2.5 rounded-xl text-sm outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            {/* Job Title */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#a1a1aa]">Job Title</label>
              <div className="relative">
                <input
                  type="text"
                  name="job_title"
                  value={profile.job_title}
                  onChange={handleChange}
                  placeholder="Software Engineer"
                  className="w-full bg-[#1c1c1f] border border-[#2b2b32] text-[#f3f4f6] pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none focus:border-indigo-500 transition-colors"
                />
                <Briefcase className="w-4 h-4 text-gray-500 absolute left-3.5 top-3.5" />
              </div>
            </div>

            {/* Department */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#a1a1aa]">Department</label>
              <div className="relative">
                <input
                  type="text"
                  name="department"
                  value={profile.department}
                  onChange={handleChange}
                  placeholder="Engineering"
                  className="w-full bg-[#1c1c1f] border border-[#2b2b32] text-[#f3f4f6] pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none focus:border-indigo-500 transition-colors"
                />
                <Building className="w-4 h-4 text-gray-500 absolute left-3.5 top-3.5" />
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#a1a1aa]">Phone Number</label>
              <div className="relative">
                <input
                  type="text"
                  name="phone"
                  value={profile.phone}
                  onChange={handleChange}
                  placeholder="+1 (555) 019-2834"
                  className="w-full bg-[#1c1c1f] border border-[#2b2b32] text-[#f3f4f6] pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none focus:border-indigo-500 transition-colors"
                />
                <Phone className="w-4 h-4 text-gray-500 absolute left-3.5 top-3.5" />
              </div>
            </div>

            {/* Location */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#a1a1aa]">Location</label>
              <div className="relative">
                <input
                  type="text"
                  name="location"
                  value={profile.location}
                  onChange={handleChange}
                  placeholder="San Francisco, CA"
                  className="w-full bg-[#1c1c1f] border border-[#2b2b32] text-[#f3f4f6] pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none focus:border-indigo-500 transition-colors"
                />
                <MapPin className="w-4 h-4 text-gray-500 absolute left-3.5 top-3.5" />
              </div>
            </div>

          </div>

          {/* Bio */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-[#a1a1aa]">Bio</label>
            <div className="relative">
              <textarea
                name="bio"
                value={profile.bio}
                onChange={handleChange}
                placeholder="Tell us a little bit about yourself..."
                rows={4}
                className="w-full bg-[#1c1c1f] border border-[#2b2b32] text-[#f3f4f6] pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none focus:border-indigo-500 transition-colors resize-none"
              />
              <AlignLeft className="w-4 h-4 text-gray-500 absolute left-3.5 top-3.5" />
            </div>
          </div>

          <div className="flex justify-end pt-2 min-h-[46px]">
            {originalProfile && Object.keys(profile).some(key => profile[key] !== originalProfile[key]) && (
              <button
                type="submit"
                disabled={saving}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white font-medium text-sm px-6 py-2.5 rounded-xl transition-all shadow-md flex items-center space-x-2 animate-fadeIn cursor-pointer"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

      </form>
    </div>
  );
}
