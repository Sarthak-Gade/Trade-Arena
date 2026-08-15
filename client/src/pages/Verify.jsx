import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  CheckCircle, AlertTriangle, ShieldCheck, Mail, Phone,
  RefreshCw, Copy, Check, ArrowRight, Terminal, Loader
} from 'lucide-react';
import api from '../utils/api';

// Small component to copy text to clipboard
const CopyButton = ({ text }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="ml-2 text-gray-500 hover:text-blue-400 transition-colors"
      title="Copy code"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
};

const Verify = () => {
  const [searchParams] = useSearchParams();
  const userId = searchParams.get('userId');
  const navigate = useNavigate();

  const [emailCode, setEmailCode] = useState('');
  const [mobileOtp, setMobileOtp] = useState('');

  const [emailVerified, setEmailVerified] = useState(false);
  const [mobileVerified, setMobileVerified] = useState(false);

  const [loadingEmail, setLoadingEmail] = useState(false);
  const [loadingMobile, setLoadingMobile] = useState(false);
  const [loadingResend, setLoadingResend] = useState(false);
  const [fetchingCodes, setFetchingCodes] = useState(false);

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [resendMsg, setResendMsg] = useState('');

  // Dev-mode: fetched codes from server
  const [devCodes, setDevCodes] = useState(null);
  const [userEmail, setUserEmail] = useState('');
  const [userMobile, setUserMobile] = useState('');
  const [devMode, setDevMode] = useState(false);

  // Fetch dev codes from backend (only works in dev/no-SMTP mode)
  const fetchDevCodes = useCallback(async () => {
    if (!userId) return;
    setFetchingCodes(true);
    try {
      const res = await api.get(`/auth/dev-codes/${userId}`);
      const data = res.data.data;
      setDevCodes(data);
      setDevMode(true);
      setUserEmail(data.email || '');
      setUserMobile(data.mobile || '');
      // Pre-fill codes only when in dev mode — simulates "received from email/SMS"
      if (data.emailCode) setEmailCode(data.emailCode);
      if (data.mobileOtp) setMobileOtp(data.mobileOtp);
      if (data.isEmailVerified) setEmailVerified(true);
      if (data.isMobileVerified) setMobileVerified(true);
    } catch (err) {
      // 403 means production mode (SMTP configured) — that's fine
      const status = err.response?.status;
      if (status === 403) {
        setDevMode(false);
      } else {
        setError(err.response?.data?.message || 'Could not load verification status.');
      }
    } finally {
      setFetchingCodes(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      navigate('/register');
      return;
    }
    fetchDevCodes();
  }, [userId, fetchDevCodes, navigate]);

  // Auto-redirect once both are verified
  useEffect(() => {
    if (emailVerified && mobileVerified) {
      const timer = setTimeout(() => navigate('/login'), 2200);
      return () => clearTimeout(timer);
    }
  }, [emailVerified, mobileVerified, navigate]);

  const handleVerifyEmail = async (e) => {
    e.preventDefault();
    setLoadingEmail(true);
    setError('');
    setSuccessMsg('');
    try {
      await api.post('/auth/verify-email', { userId, code: emailCode });
      setEmailVerified(true);
      setSuccessMsg('✅ Email verified successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email verification code. Please try again.');
    } finally {
      setLoadingEmail(false);
    }
  };

  const handleVerifyMobile = async (e) => {
    e.preventDefault();
    setLoadingMobile(true);
    setError('');
    setSuccessMsg('');
    try {
      await api.post('/auth/verify-mobile', { userId, otp: mobileOtp });
      setMobileVerified(true);
      setSuccessMsg(emailVerified ? '🎉 Both verifications complete! Redirecting...' : '✅ Mobile OTP verified!');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid Mobile OTP. Please try again.');
    } finally {
      setLoadingMobile(false);
    }
  };

  const handleResend = async () => {
    setLoadingResend(true);
    setResendMsg('');
    setError('');
    try {
      await api.post('/auth/resend-verification', { userId });
      setResendMsg('New verification codes have been sent!');
      // Refresh dev codes after resend
      setTimeout(() => fetchDevCodes(), 600);
      setTimeout(() => setResendMsg(''), 5000);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not resend codes. Please try again.');
    } finally {
      setLoadingResend(false);
    }
  };

  if (!userId) return null;

  const allDone = emailVerified && mobileVerified;

  return (
    <div className="min-h-screen bg-darkBg flex items-center justify-center px-4 py-10 relative overflow-hidden">
      {/* Ambient glow blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-lg glass-card rounded-2xl p-8 border border-gray-800 shadow-2xl relative z-10">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="relative inline-block mb-4">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-lg transition-all duration-500 ${
              allDone ? 'bg-emerald-600 shadow-emerald-500/30' : 'bg-blue-600/20 border border-blue-500/30'
            }`}>
              {allDone
                ? <CheckCircle className="w-8 h-8 text-white" />
                : <ShieldCheck className="w-8 h-8 text-blue-400" />
              }
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {allDone ? 'Account Verified!' : 'Security Verification'}
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            {allDone
              ? 'Redirecting you to sign in…'
              : 'Verify your email and mobile to activate your trading account'}
          </p>
        </div>

        {/* Dev mode info banner */}
        {devMode && !allDone && (
          <div className="mb-6 p-4 bg-amber-950/30 border border-amber-800/40 rounded-xl text-xs">
            <div className="flex items-center space-x-2 mb-2">
              <Terminal className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="font-bold text-amber-300 uppercase tracking-wide">Development Mode</span>
              <span className="text-amber-600">— No SMTP Configured</span>
            </div>
            <p className="text-amber-500/80 leading-relaxed">
              Codes below are auto-fetched from the server since no email provider is set up.
              In production, users would receive these via email & SMS.
            </p>
            {fetchingCodes && (
              <div className="flex items-center space-x-2 mt-2 text-amber-400">
                <Loader className="w-3.5 h-3.5 animate-spin" />
                <span>Loading codes…</span>
              </div>
            )}

            {/* Dev Code Display Cards */}
            {devCodes && !fetchingCodes && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {!emailVerified && devCodes.emailCode && (
                  <div className="bg-gray-900/60 border border-blue-900/40 rounded-xl p-3">
                    <div className="flex items-center space-x-1.5 mb-1">
                      <Mail className="w-3 h-3 text-blue-400" />
                      <span className="text-[10px] font-bold text-blue-400 uppercase">Email Code</span>
                    </div>
                    <div className="flex items-center">
                      <span className="font-mono text-lg font-black text-white tracking-[0.2em]">
                        {devCodes.emailCode}
                      </span>
                      <CopyButton text={devCodes.emailCode} />
                    </div>
                    <p className="text-[9px] text-gray-500 mt-1 truncate">→ {userEmail}</p>
                  </div>
                )}
                {!mobileVerified && devCodes.mobileOtp && (
                  <div className="bg-gray-900/60 border border-emerald-900/40 rounded-xl p-3">
                    <div className="flex items-center space-x-1.5 mb-1">
                      <Phone className="w-3 h-3 text-emerald-400" />
                      <span className="text-[10px] font-bold text-emerald-400 uppercase">Mobile OTP</span>
                    </div>
                    <div className="flex items-center">
                      <span className="font-mono text-lg font-black text-white tracking-[0.2em]">
                        {devCodes.mobileOtp}
                      </span>
                      <CopyButton text={devCodes.mobileOtp} />
                    </div>
                    <p className="text-[9px] text-gray-500 mt-1 truncate">→ +91 {userMobile}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Global error/success messages */}
        {error && (
          <div className="mb-4 p-3 bg-red-900/20 border border-red-800/40 rounded-xl flex items-start space-x-2 text-xs text-red-400">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-900/20 border border-emerald-800/40 rounded-xl text-xs text-emerald-400 font-semibold">
            {successMsg}
          </div>
        )}
        {resendMsg && (
          <div className="mb-4 p-3 bg-blue-900/20 border border-blue-800/40 rounded-xl text-xs text-blue-400">
            {resendMsg}
          </div>
        )}

        {!allDone && (
          <div className="space-y-4">

            {/* Step 1: Email Verification */}
            <div className={`p-5 border rounded-2xl transition-all duration-300 ${
              emailVerified
                ? 'bg-emerald-900/10 border-emerald-800/30'
                : 'bg-gray-900/40 border-gray-800'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    emailVerified ? 'bg-emerald-600 text-white' : 'bg-blue-900/40 text-blue-400 border border-blue-700/40'
                  }`}>
                    {emailVerified ? '✓' : '1'}
                  </div>
                  <Mail className={`w-4 h-4 ${emailVerified ? 'text-emerald-400' : 'text-blue-400'}`} />
                  <span className="text-sm font-bold text-white">Email Verification</span>
                </div>
                {emailVerified
                  ? <CheckCircle className="w-5 h-5 text-emerald-400" />
                  : <span className="text-[10px] text-orange-400 font-bold uppercase bg-orange-950/20 border border-orange-900/30 px-2 py-0.5 rounded-full">Pending</span>
                }
              </div>

              {!emailVerified ? (
                <form onSubmit={handleVerifyEmail} className="flex space-x-2">
                  <input
                    type="text"
                    value={emailCode}
                    onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="flex-1 bg-gray-950 border border-gray-700 px-3 py-2 rounded-xl text-sm font-mono font-bold text-white focus:outline-none focus:border-blue-500 tracking-[0.2em] placeholder:tracking-normal placeholder:font-normal"
                    placeholder="Enter 6-digit code"
                    maxLength={6}
                    required
                    id="email-verify-input"
                    autoComplete="one-time-code"
                  />
                  <button
                    type="submit"
                    disabled={loadingEmail || emailCode.length < 6}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors flex items-center space-x-1.5 disabled:opacity-50 disabled:cursor-not-allowed min-w-[80px] justify-center"
                  >
                    {loadingEmail
                      ? <Loader className="w-3.5 h-3.5 animate-spin" />
                      : <><span>Verify</span><ArrowRight className="w-3 h-3" /></>
                    }
                  </button>
                </form>
              ) : (
                <p className="text-xs text-emerald-400">Email address verified successfully ✓</p>
              )}
            </div>

            {/* Step 2: Mobile OTP Verification */}
            <div className={`p-5 border rounded-2xl transition-all duration-300 ${
              mobileVerified
                ? 'bg-emerald-900/10 border-emerald-800/30'
                : 'bg-gray-900/40 border-gray-800'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    mobileVerified ? 'bg-emerald-600 text-white' : 'bg-emerald-900/40 text-emerald-400 border border-emerald-700/40'
                  }`}>
                    {mobileVerified ? '✓' : '2'}
                  </div>
                  <Phone className={`w-4 h-4 ${mobileVerified ? 'text-emerald-400' : 'text-emerald-400'}`} />
                  <span className="text-sm font-bold text-white">Mobile OTP</span>
                </div>
                {mobileVerified
                  ? <CheckCircle className="w-5 h-5 text-emerald-400" />
                  : <span className="text-[10px] text-orange-400 font-bold uppercase bg-orange-950/20 border border-orange-900/30 px-2 py-0.5 rounded-full">Pending</span>
                }
              </div>

              {!mobileVerified ? (
                <form onSubmit={handleVerifyMobile} className="flex space-x-2">
                  <input
                    type="text"
                    value={mobileOtp}
                    onChange={(e) => setMobileOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="flex-1 bg-gray-950 border border-gray-700 px-3 py-2 rounded-xl text-sm font-mono font-bold text-white focus:outline-none focus:border-emerald-500 tracking-[0.2em] placeholder:tracking-normal placeholder:font-normal"
                    placeholder="Enter 6-digit OTP"
                    maxLength={6}
                    required
                    id="mobile-otp-input"
                    autoComplete="one-time-code"
                  />
                  <button
                    type="submit"
                    disabled={loadingMobile || mobileOtp.length < 6}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors flex items-center space-x-1.5 disabled:opacity-50 disabled:cursor-not-allowed min-w-[80px] justify-center"
                  >
                    {loadingMobile
                      ? <Loader className="w-3.5 h-3.5 animate-spin" />
                      : <><span>Verify</span><ArrowRight className="w-3 h-3" /></>
                    }
                  </button>
                </form>
              ) : (
                <p className="text-xs text-emerald-400">Mobile number verified successfully ✓</p>
              )}
            </div>

            {/* Resend codes button */}
            <div className="flex items-center justify-between pt-1">
              <p className="text-xs text-gray-500">Didn't receive the codes?</p>
              <button
                type="button"
                onClick={handleResend}
                disabled={loadingResend}
                className="flex items-center space-x-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingResend ? 'animate-spin' : ''}`} />
                <span>{loadingResend ? 'Sending…' : 'Resend Codes'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Success / All done state */}
        {allDone && (
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/30 animate-bounce">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <p className="text-emerald-400 font-semibold text-sm">All verifications complete!</p>
            <p className="text-gray-500 text-xs mt-1">Redirecting to sign in automatically…</p>
            <button
              onClick={() => navigate('/login')}
              className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-sm transition-colors shadow-lg shadow-blue-500/20"
            >
              Go to Sign In Now
            </button>
          </div>
        )}

        <div className="text-center text-xs mt-6 text-gray-600">
          Wrong account?{' '}
          <a href="/register" className="text-blue-500 hover:underline">
            Register again
          </a>
        </div>
      </div>
    </div>
  );
};

export default Verify;
