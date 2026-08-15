import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { loginStart, loginSuccess, loginFailure } from '../store/authSlice';
import { Lock, Mail, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import api from '../utils/api';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetFlow, setResetFlow] = useState(false);
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((state) => state.auth);
  
  const handleLogin = async (e) => {
    e.preventDefault();
    dispatch(loginStart());
    
    try {
      const res = await api.post('/auth/login', { email, password });
      const user = res.data.data;
      dispatch(loginSuccess(user));
      
      // If user has not verified email or mobile, redirect to verify
      if (!user.isEmailVerified || !user.isMobileVerified) {
        navigate(`/verify?userId=${user._id}`);
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      dispatch(loginFailure(err.response?.data?.message || 'Login failed. Please check credentials.'));
    }
  };

  
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    try {
      await api.post('/auth/forgot-password', { email });
      setResetSent(true);
      setSuccessMsg('Reset code sent to your email. Please check your inbox.');
    } catch (err) {
      dispatch(loginFailure(err.response?.data?.message || 'Error requesting reset code.'));
    }
  };
  
  const handleResetPassword = async (e) => {
    e.preventDefault();
    try {
      await api.post('/auth/reset-password', { email, code: resetCode, newPassword });
      setResetFlow(false);
      setResetSent(false);
      setSuccessMsg('Password reset successfully. You can now log in.');
    } catch (err) {
      dispatch(loginFailure(err.response?.data?.message || 'Invalid code or password requirements not met.'));
    }
  };
  
  return (
    <div className="min-h-screen bg-darkBg flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background blobs for aesthetics */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[100px]"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-[100px]"></div>
      
      <div className="w-full max-w-md glass-card rounded-2xl p-8 border border-gray-800 shadow-2xl relative z-10">
        <div className="text-center mb-8">
          <div className="bg-blue-600 w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-xl mx-auto shadow-lg shadow-blue-500/20 mb-3">
            TA
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            {resetFlow ? 'Reset Password' : 'Welcome to TradeArena'}
          </h2>
          <p className="text-gray-400 text-xs mt-1">
            {resetFlow ? 'Enter reset code sent to your mail' : 'Complete virtual Paper Trading Brokerage platform'}
          </p>
        </div>
        
        {error && (
          <div className="mb-6 p-3 bg-red-900/20 border border-red-800/40 rounded-xl flex items-start space-x-2 text-xs text-red-400">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        
        {successMsg && (
          <div className="mb-6 p-3 bg-emerald-900/20 border border-emerald-800/40 rounded-xl text-xs text-emerald-400">
            {successMsg}
          </div>
        )}
        
        {/* Reset flow toggle check */}
        {resetFlow ? (
          <form onSubmit={resetSent ? handleResetPassword : handleForgotPassword} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 font-semibold mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                <input 
                  type="email" 
                  value={email}
                  disabled={resetSent}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-gray-900/60 border border-gray-800 pl-10 pr-4 py-2.5 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="name@email.com"
                  required
                />
              </div>
            </div>
            
            {resetSent && (
              <>
                <div>
                  <label className="block text-xs text-gray-400 font-semibold mb-1.5">Reset Code</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                    <input 
                      type="text" 
                      value={resetCode}
                      onChange={(e) => setResetCode(e.target.value)}
                      className="w-full bg-gray-900/60 border border-gray-800 pl-10 pr-4 py-2.5 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                      placeholder="Enter 6-digit code"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 font-semibold mb-1.5">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                    <input 
                      type="password" 
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-gray-900/60 border border-gray-800 pl-10 pr-4 py-2.5 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                      placeholder="At least 6 characters"
                      required
                    />
                  </div>
                </div>
              </>
            )}
            
            <button 
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-sm transition-colors mt-2 shadow-lg shadow-blue-500/20"
            >
              {resetSent ? 'Update Password' : 'Send Reset Code'}
            </button>
            
            <div className="text-center text-xs mt-4">
              <button 
                type="button" 
                onClick={() => { setResetFlow(false); setResetSent(false); }}
                className="text-blue-500 hover:underline"
              >
                Back to Login
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 font-semibold mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-gray-900/60 border border-gray-800 pl-10 pr-4 py-2.5 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="name@email.com"
                  required
                />
              </div>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs text-gray-400 font-semibold">Password</label>
                <button 
                  type="button" 
                  onClick={() => setResetFlow(true)}
                  className="text-xs text-blue-500 hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-900/60 border border-gray-800 pl-10 pr-12 py-2.5 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-gray-500 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-sm transition-colors mt-2 shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Logging in...' : 'Sign In'}
            </button>
            
            <div className="text-center text-xs mt-6 text-gray-400">
              Don't have an account?{' '}
              <Link to="/register" className="text-blue-500 hover:underline font-semibold">
                Sign Up
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;
