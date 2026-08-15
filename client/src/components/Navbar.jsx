import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../store/authSlice';
import { useNavigate } from 'react-router-dom';
import { Bell, Wallet, User, LogOut, ChevronDown, Activity } from 'lucide-react';
import api from '../utils/api';

const Navbar = () => {
  const { user } = useSelector((state) => state.auth);
  const { sessionStatus } = useSelector((state) => state.market);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  
  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };
  
  // Fetch in-app notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await api.get('/orders'); // simple mock fetch of orders or notifications if route added
        // Let's create a quick local array of notifications or fetch from /api/orders
        setNotifications([
          { id: 1, title: 'KYC Required', message: 'Submit your KYC documents to activate trading.' },
          { id: 2, title: 'Welcome', message: 'Welcome to TradeArena paper trading!' }
        ]);
      } catch (err) {
        console.error(err);
      }
    };
    fetchNotifications();
  }, []);
  
  return (
    <nav className="glass-card sticky top-0 z-50 flex items-center justify-between px-6 py-3 border-b border-gray-800 bg-darkBg/80">
      {/* Branding */}
      <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/dashboard')}>
        <div className="bg-blue-600 p-2 rounded-lg text-white font-bold tracking-wider text-lg shadow-lg shadow-blue-500/20">
          TA
        </div>
        <span className="font-extrabold text-xl tracking-tight text-white hidden sm:inline-block">
          TRADE<span className="text-blue-500">ARENA</span>
        </span>
      </div>
      
      {/* Dynamic Market status */}
      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-2 bg-gray-900/60 border border-gray-800 px-3 py-1.5 rounded-full text-xs">
          <Activity className={`w-3.5 h-3.5 ${
            sessionStatus === 'OPEN' ? 'text-emerald-500' :
            sessionStatus === 'PRE_MARKET' ? 'text-yellow-500' : 'text-red-500'
          }`} />
          <span className="text-gray-400 font-semibold uppercase">Market:</span>
          <span className={`font-bold ${
            sessionStatus === 'OPEN' ? 'text-emerald-400' :
            sessionStatus === 'PRE_MARKET' ? 'text-yellow-400' : 'text-red-400'
          }`}>
            {sessionStatus === 'OPEN' ? 'OPEN' : sessionStatus === 'PRE_MARKET' ? 'PRE-OPEN' : 'CLOSED'}
          </span>
        </div>
        
        {/* Wallet Balance Display */}
        {user && (
          <div className="flex items-center space-x-2 bg-gray-900/60 border border-gray-800 px-4 py-1.5 rounded-full text-xs">
            <Wallet className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-gray-400 font-semibold">Wallet:</span>
            <span className="text-white font-bold">
              ₹{user.walletBalance?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        )}
      </div>
      
      {/* User Actions */}
      <div className="flex items-center space-x-4">
        {/* Notification Bell */}
        <div className="relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors relative"
          >
            <Bell className="w-5 h-5" />
            {notifications.length > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            )}
          </button>
          
          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 glass-card rounded-xl border border-gray-800 p-2 shadow-2xl z-50 text-xs">
              <h4 className="font-bold text-gray-200 border-b border-gray-800 pb-2 px-2">Notifications</h4>
              <div className="max-h-60 overflow-y-auto">
                {notifications.map((n) => (
                  <div key={n.id} className="p-2 border-b border-gray-900/60 hover:bg-gray-800/40 rounded transition-colors mt-1">
                    <p className="font-bold text-white">{n.title}</p>
                    <p className="text-gray-400 mt-0.5">{n.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Profile Dropdown */}
        {user && (
          <div className="relative">
            <button 
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center space-x-2 hover:bg-gray-800 px-3 py-1.5 rounded-lg text-sm transition-colors text-white"
            >
              <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xs uppercase shadow-md shadow-blue-500/20">
                {user.username.slice(0, 2)}
              </div>
              <div className="text-left hidden md:block">
                <p className="font-semibold text-xs leading-none">{user.username}</p>
                <p className="text-[10px] text-gray-400 leading-none mt-1">{user.clientID}</p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>
            
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 glass-card rounded-xl border border-gray-800 shadow-2xl overflow-hidden py-1 z-50 text-sm">
                <div className="px-4 py-2 border-b border-gray-800">
                  <p className="font-bold text-white">{user.username}</p>
                  <p className="text-xs text-gray-400">Acc: {user.tradingAccountNumber}</p>
                </div>
                
                <button 
                  onClick={() => { setDropdownOpen(false); navigate('/profile'); }}
                  className="w-full text-left px-4 py-2 text-gray-300 hover:bg-gray-800 hover:text-white flex items-center space-x-2 transition-colors"
                >
                  <User className="w-4 h-4" />
                  <span>My Profile</span>
                </button>
                
                {user.role === 'admin' && (
                  <button 
                    onClick={() => { setDropdownOpen(false); navigate('/admin'); }}
                    className="w-full text-left px-4 py-2 text-blue-400 hover:bg-gray-800 hover:text-blue-300 flex items-center space-x-2 transition-colors font-semibold"
                  >
                    <Activity className="w-4 h-4" />
                    <span>Admin Dashboard</span>
                  </button>
                )}
                
                <button 
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-red-400 hover:bg-gray-800 hover:text-red-300 flex items-center space-x-2 transition-colors border-t border-gray-800"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
