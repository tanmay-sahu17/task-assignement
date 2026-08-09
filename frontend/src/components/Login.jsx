import React, { useState } from 'react';
import { authAPI } from '../api/api';
import { KeyRound, User, Mail, Loader2 } from 'lucide-react';

export default function Login({ onLoginSuccess }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password || (isSignUp && !email)) {
      setError('Please fill in all required fields.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      if (isSignUp) {
        const data = await authAPI.register(username, email, password);
        onLoginSuccess(data.user);
      } else {
        const data = await authAPI.login(username, password);
        onLoginSuccess(data.user);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.username?.[0] || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setError('');
    setUsername('');
    setEmail('');
    setPassword('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#09090b] text-[#f3f4f6] px-4">
      <div className="w-full max-w-md bg-[#0d0d0f] border border-[#202024] rounded-2xl shadow-2xl p-8 animate-slideUp">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#18181c] text-indigo-400 mb-4 border border-[#2a2a35]">
            <KeyRound className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            {isSignUp ? 'Create an Account' : 'Welcome to JiraClone'}
          </h2>
          <p className="text-xs text-[#71717a] mt-2">
            {isSignUp ? 'Sign up to collaborate with developers' : 'Sign in to manage your projects and tasks'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-950/20 border border-red-900/50 text-red-400 text-xs rounded-xl flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#71717a] uppercase tracking-wider mb-2">
              Username *
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[#131316] border border-[#202024] rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                placeholder="Enter username"
              />
            </div>
          </div>

          {isSignUp && (
            <div>
              <label className="block text-xs font-semibold text-[#71717a] uppercase tracking-wider mb-2">
                Email Address *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#131316] border border-[#202024] rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                  placeholder="name@example.com"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#71717a] uppercase tracking-wider mb-2">
              Password *
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                <KeyRound className="w-4 h-4" />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[#131316] border border-[#202024] rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center mt-6 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold text-sm rounded-xl transition-all shadow-sm focus:outline-none"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                {isSignUp ? 'Creating Account...' : 'Signing in...'}
              </>
            ) : (
              isSignUp ? 'Sign Up' : 'Sign In'
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-[#202024] text-center">
          <button
            onClick={toggleMode}
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors focus:outline-none"
          >
            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
}
