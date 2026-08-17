import React, { useState, useEffect } from 'react';
import { authAPI } from '../api/api';
import { KeyRound, User, Mail, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';

export default function Login({ onLoginSuccess }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      console.error("Google Client ID is missing in frontend env!");
      return;
    }

    const handleGoogleResponse = async (response) => {
      setLoading(true);
      setError('');
      try {
        const data = await authAPI.googleLogin(response.credential);
        onLoginSuccess(data.user);
      } catch (err) {
        console.error("Google Auth API Error:", err);
        setError(err.response?.data?.error || 'Google authentication failed. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    const initializeGoogleSignIn = () => {
      if (typeof window.google === 'undefined') {
        // Retry in 100ms if script is not loaded yet
        setTimeout(initializeGoogleSignIn, 100);
        return;
      }

      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleResponse,
        });

        window.google.accounts.id.renderButton(
          document.getElementById('googleSignInDiv'),
          { 
            theme: 'filled_black', 
            size: 'large', 
            width: '320', 
            text: 'continue_with',
            shape: 'rectangular',
            logo_alignment: 'center'
          }
        );
      } catch (e) {
        console.error("Error initializing Google Sign-In", e);
      }
    };

    initializeGoogleSignIn();
  }, [onLoginSuccess]);

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
      console.error("Login/Register Error:", err);
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err.response?.data?.non_field_errors) {
        setError(err.response.data.non_field_errors[0]);
      } else if (err.response?.data?.username) {
        setError("Username error: " + err.response.data.username[0]);
      } else if (err.response?.data?.email) {
        setError("Email error: " + err.response.data.email[0]);
      } else if (err.response?.data?.password) {
        setError("Password error: " + err.response.data.password[0]);
      } else {
        setError('Authentication failed. Please verify your connection and check your credentials.');
      }
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
    setShowPassword(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#09090b] text-[#f3f4f6] px-4">
      <div className="w-full max-w-md bg-[#0d0d0f] border border-[#202024] rounded-2xl shadow-2xl p-8 animate-slideUp">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#18181c] text-indigo-400 mb-4 border border-[#2a2a35]">
            <KeyRound className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            {isSignUp ? 'Create an Account' : 'Welcome to Spacess'}
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
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 bg-[#131316] border border-[#202024] rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-300 focus:outline-none cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
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

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#202024]"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-[#0d0d0f] px-2 text-[#71717a]">Or continue with</span>
          </div>
        </div>

        <div className="w-full flex justify-center mb-6">
          <div className="relative w-full max-w-[320px] h-10 select-none">
            {/* Custom Styled Button (visual background) */}
            <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-[#131316] border border-[#202024] hover:bg-[#18181c] hover:border-[#2e2e36] text-white font-semibold text-xs rounded-2xl transition-all pointer-events-none">
              <svg className="w-4 h-4 mr-2.5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </div>
            
            {/* Invisible real Google Button on top */}
            <div 
              id="googleSignInDiv" 
              className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer [&_iframe]:w-full [&_iframe]:h-full [&_iframe]:cursor-pointer rounded-2xl"
            ></div>
          </div>
        </div>

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
