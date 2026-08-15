import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, User, Phone, Lock, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import api from '../utils/api';

const Register = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();
  
  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await api.post('/auth/register', {
        username,
        email,
        mobile,
        password
      });
      
      const { userId } = res.data.data;
      // Only pass userId — codes are fetched securely by the Verify page
      navigate(`/verify?userId=${userId}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please check your details.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-darkBg flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[100px]"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-[100px]"></div>
      
      <div className="w-full max-w-md glass-card rounded-2xl p-8 border border-gray-800 shadow-2xl relative z-10">
        <div className="text-center mb-8">
          <div className="bg-blue-600 w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-xl mx-auto shadow-lg shadow-blue-500/20 mb-3">
            TA
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Create your Account</h2>
          <p className="text-gray-400 text-xs mt-1">Get 10 Lakhs Virtual Funds and start paper trading</p>
        </div>
        
        {error && (
          <div className="mb-6 p-3 bg-red-900/20 border border-red-800/40 rounded-xl flex items-start space-x-2 text-xs text-red-400">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-400 font-semibold mb-1.5">Username</label>
            <div className="relative">
              <User className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-gray-900/60 border border-gray-800 pl-10 pr-4 py-2.5 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="john_doe"
                required
              />
            </div>
          </div>
          
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
            <label className="block text-xs text-gray-400 font-semibold mb-1.5">Mobile Number</label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
              <input 
                type="tel" 
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                className="w-full bg-gray-900/60 border border-gray-800 pl-10 pr-4 py-2.5 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="9876543210"
                maxLength="10"
                required
              />
            </div>
          </div>
          
          <div>
            <label className="block text-xs text-gray-400 font-semibold mb-1.5">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
              <input 
                type={showPassword ? 'text' : 'password'} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-900/60 border border-gray-800 pl-10 pr-12 py-2.5 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="At least 6 characters"
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
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
          
          <div className="text-center text-xs mt-6 text-gray-400">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-500 hover:underline font-semibold">
              Sign In
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
