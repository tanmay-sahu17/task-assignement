import React, { useEffect, useState } from 'react';
import { invitationAPI } from '../api/api';
import { Loader2, AlertCircle, KeyRound, User, CheckCircle } from 'lucide-react';

export default function AcceptInvite({ token, onLoginSuccess, onCancel }) {
  const [loading, setLoading] = useState(true);
  const [inviteDetails, setInviteDetails] = useState(null);
  const [error, setError] = useState('');

  // Sign up form
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    const validateToken = async () => {
      try {
        const details = await invitationAPI.validate(token);
        setInviteDetails(details);
      } catch (err) {
        setError('This invitation link is invalid, expired, or has already been accepted.');
      } finally {
        setLoading(false);
      }
    };
    validateToken();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setSubmitError('Username and password are required.');
      return;
    }
    setSubmitError('');
    setSubmitLoading(true);
    try {
      const data = await invitationAPI.accept(token, username, password);
      // Store token & user just like standard login/register
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      onLoginSuccess(data.user);
    } catch (err) {
      setSubmitError(err.response?.data?.error || 'Failed to complete registration.');
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fcfcfc] flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mx-auto" />
          <p className="text-xs text-gray-500 font-medium">Validating invitation link...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#fcfcfc] flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white border border-[#eaeaea] rounded-2xl shadow-xl p-8 text-center space-y-6 animate-fadeIn">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-gray-900">Expired Invitation</h2>
            <p className="text-sm text-gray-500 leading-relaxed">{error}</p>
          </div>
          <button
            onClick={onCancel}
            className="w-full py-2.5 bg-gray-100 hover:bg-gray-150 text-gray-700 text-sm font-semibold rounded-xl transition-all"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fcfcfc] flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white border border-[#eaeaea] rounded-2xl shadow-xl p-8 space-y-6 animate-slideUp">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto">
            <CheckCircle className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Join Workspace</h2>
          <p className="text-xs text-gray-500">
            You've been invited to join {inviteDetails.project_name ? `the "${inviteDetails.project_name}" project` : 'our workspace'}!
          </p>
        </div>

        {submitError && (
          <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{submitError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email (Read Only) */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
              Email Address (Verified)
            </label>
            <input
              type="email"
              readOnly
              value={inviteDetails.email}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-500 cursor-not-allowed outline-none"
            />
          </div>

          {/* Username */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
              Choose Username
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                placeholder="Choose username"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
              Set Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                <KeyRound className="w-4 h-4" />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                placeholder="Choose strong password"
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitLoading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold text-sm rounded-xl transition-all shadow-sm flex items-center justify-center focus:outline-none"
          >
            {submitLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Joining...
              </>
            ) : (
              'Accept Invite & Log In'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
