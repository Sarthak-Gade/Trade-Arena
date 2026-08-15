import React from 'react';
import { NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { 
  TrendingUp, 
  Briefcase, 
  Database, 
  FileText, 
  UserCheck, 
  Award, 
  BookOpen, 
  FileSpreadsheet, 
  Cpu, 
  Settings 
} from 'lucide-react';

const Sidebar = () => {
  const { user } = useSelector((state) => state.auth);
  
  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: Database },
    { name: 'Trading Terminal', path: '/terminal', icon: TrendingUp },
    { name: 'My Portfolio', path: '/portfolio', icon: Briefcase },
    { name: 'Wallet & Ledger', path: '/ledger', icon: FileSpreadsheet },
    { name: 'KYC Verification', path: '/kyc', icon: UserCheck },
    { name: 'IPO Bidding', path: '/ipo', icon: Cpu },
    { name: 'Trading Journal', path: '/journal', icon: BookOpen },
    { name: 'Leaderboard', path: '/leaderboard', icon: Award },
    { name: 'Contract Reports', path: '/reports', icon: FileText }
  ];
  
  return (
    <aside className="w-64 bg-darkBg border-r border-gray-800 flex flex-col justify-between py-6 px-4 hidden md:flex shrink-0 h-[calc(100vh-62px)] sticky top-[62px]">
      <div className="space-y-6">
        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider px-3">Navigation Dashboard</span>
        
        <nav className="space-y-1.5">
          {menuItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) => 
                `flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  isActive 
                    ? 'bg-blue-600/10 text-blue-400 border-l-4 border-blue-500 pl-2 bg-gradient-to-r from-blue-900/10 to-transparent' 
                    : 'text-gray-400 hover:bg-gray-800/40 hover:text-white'
                }`
              }
            >
              <item.icon className="w-4 h-4" />
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>
      </div>
      
      {/* Footer Settings details */}
      {user && (
        <div className="pt-4 border-t border-gray-800 px-3">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center font-bold text-xs text-gray-300">
              {user.role === 'admin' ? 'AD' : 'TR'}
            </div>
            <div>
              <p className="text-xs font-semibold text-white truncate max-w-[130px]">{user.username}</p>
              <span className="text-[9px] bg-blue-900/30 text-blue-400 border border-blue-800/40 px-1.5 py-0.5 rounded font-bold uppercase mt-1 inline-block">
                {user.role}
              </span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
