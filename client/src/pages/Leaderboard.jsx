import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Award, Trophy, TrendingUp, Sparkles, User } from 'lucide-react';

const Leaderboard = () => {
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchLeaderboard();
  }, []);
  
  const fetchLeaderboard = async () => {
    try {
      const res = await api.get('/leaderboard');
      setRankings(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return <div className="p-6 text-center text-xs text-gray-500">Loading standings...</div>;
  }
  
  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto space-y-6">
      <div className="pb-4 border-b border-gray-800">
        <h2 className="text-xl font-black text-white">Platform Leaderboard</h2>
        <p className="text-xs text-gray-400">See how you rank against top traders on the platform based on net ROI percentage</p>
      </div>
      
      {/* Top 3 Podium Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        {/* Rank 2 */}
        {rankings[1] && (
          <div className="glass-card rounded-2xl p-5 border border-gray-850 bg-gray-900/10 text-center relative overflow-hidden order-2 md:order-1 md:mt-6">
            <div className="absolute top-2 left-2 text-xs font-bold text-gray-500 font-mono">#2</div>
            <div className="w-12 h-12 bg-slate-800 border-2 border-slate-600 rounded-full flex items-center justify-center mx-auto text-slate-300 font-bold mb-3 text-sm">
              2nd
            </div>
            <h4 className="font-extrabold text-white text-xs">{rankings[1].username}</h4>
            <span className="text-[10px] text-gray-500 font-mono">{rankings[1].clientID}</span>
            <div className="mt-4 pt-3 border-t border-gray-900">
              <span className="text-[10px] text-gray-500 block">Returns Percentage</span>
              <span className="font-black text-emerald-400 text-sm">+{rankings[1].roi.toFixed(2)}%</span>
            </div>
          </div>
        )}
        
        {/* Rank 1 */}
        {rankings[0] && (
          <div className="glass-card rounded-2xl p-6 border border-blue-900/40 bg-gradient-to-b from-blue-950/10 to-transparent text-center relative overflow-hidden order-1 md:order-2 glow-blue">
            <div className="absolute top-2 left-2 text-xs font-bold text-blue-400 font-mono">#1</div>
            <Trophy className="w-10 h-10 text-yellow-500 mx-auto mb-2 animate-bounce" />
            <h4 className="font-black text-white text-sm flex items-center justify-center">
              {rankings[0].username}
              <Sparkles className="w-4 h-4 text-yellow-500 ml-1.5" />
            </h4>
            <span className="text-[10px] text-blue-400 font-mono">{rankings[0].clientID}</span>
            <div className="mt-4 pt-3 border-t border-gray-900">
              <span className="text-[10px] text-gray-500 block">Returns Percentage</span>
              <span className="font-black text-emerald-400 text-lg">+{rankings[0].roi.toFixed(2)}%</span>
            </div>
          </div>
        )}
        
        {/* Rank 3 */}
        {rankings[2] && (
          <div className="glass-card rounded-2xl p-5 border border-gray-850 bg-gray-900/10 text-center relative overflow-hidden order-3 md:mt-8">
            <div className="absolute top-2 left-2 text-xs font-bold text-gray-500 font-mono">#3</div>
            <div className="w-12 h-12 bg-amber-900/10 border-2 border-amber-800/40 rounded-full flex items-center justify-center mx-auto text-amber-500 font-bold mb-3 text-sm">
              3rd
            </div>
            <h4 className="font-extrabold text-white text-xs">{rankings[2].username}</h4>
            <span className="text-[10px] text-gray-500 font-mono">{rankings[2].clientID}</span>
            <div className="mt-4 pt-3 border-t border-gray-900">
              <span className="text-[10px] text-gray-500 block">Returns Percentage</span>
              <span className="font-black text-emerald-400 text-sm">+{rankings[2].roi.toFixed(2)}%</span>
            </div>
          </div>
        )}
      </div>
      
      {/* Scoreboard table */}
      <div className="glass-card rounded-2xl p-6 border border-gray-800">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center">
          <Award className="w-4 h-4 mr-2 text-blue-500" />
          Standings Scoreboard
        </h3>
        
        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left">
            <thead>
              <tr className="text-gray-500 border-b border-gray-850 pb-2">
                <th className="py-2.5">Rank</th>
                <th>Trader</th>
                <th>Client ID</th>
                <th className="text-right">Total Net Profit</th>
                <th className="text-right">Returns (ROI)</th>
                <th className="text-right">Valuation</th>
              </tr>
            </thead>
            <tbody>
              {rankings.map(row => {
                const isProfit = row.netProfit >= 0;
                return (
                  <tr key={row.userId} className="border-b border-gray-900/60 hover:bg-gray-855/20 py-2">
                    <td className="py-3 font-bold text-white pl-2">
                      {row.rank === 1 ? '🥇' : row.rank === 2 ? '🥈' : row.rank === 3 ? '🥉' : `#${row.rank}`}
                    </td>
                    <td className="font-bold text-white flex items-center space-x-2 py-3">
                      <User className="w-4 h-4 text-gray-500" />
                      <span>{row.username}</span>
                    </td>
                    <td className="font-mono text-gray-400">{row.clientID}</td>
                    <td className={`text-right font-semibold ${isProfit ? 'text-emerald-400' : 'text-red-400'}`}>
                      ₹{row.netProfit?.toLocaleString()}
                    </td>
                    <td className={`text-right font-black ${isProfit ? 'text-emerald-400' : 'text-red-400'}`}>
                      {isProfit ? '+' : ''}{row.roi.toFixed(2)}%
                    </td>
                    <td className="text-right font-bold text-white">
                      ₹{row.portfolioValue?.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
