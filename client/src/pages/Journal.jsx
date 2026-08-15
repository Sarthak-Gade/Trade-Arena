import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { BookOpen, Tag, Calendar, PlusCircle, ArrowUpRight, MessageSquareCode } from 'lucide-react';

const Journal = () => {
  const [journals, setJournals] = useState([]);
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [tradeId, setTradeId] = useState('');
  const [symbol, setSymbol] = useState('');
  const [entryReason, setEntryReason] = useState('');
  const [exitReason, setExitReason] = useState('');
  const [strategy, setStrategy] = useState('');
  const [notes, setNotes] = useState('');
  const [learnings, setLearnings] = useState('');
  
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  
  useEffect(() => {
    fetchJournalData();
  }, []);
  
  const fetchJournalData = async () => {
    try {
      const journalRes = await api.get('/journal');
      setJournals(journalRes.data.data);
      
      const tradeRes = await api.get('/orders/history/trades');
      setTrades(tradeRes.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleAddEntry = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    // Auto-detect symbol from selected trade
    let resolvedSymbol = symbol;
    if (tradeId) {
      const selectedTrade = trades.find(t => t._id === tradeId);
      if (selectedTrade) resolvedSymbol = selectedTrade.symbol;
    }
    
    try {
      await api.post('/journal', {
        tradeId: tradeId || undefined,
        symbol: resolvedSymbol || undefined,
        entryReason,
        exitReason,
        strategy,
        notes,
        learnings
      });
      
      setSuccess('Trading Journal entry added successfully!');
      setShowAddForm(false);
      // Reset
      setTradeId('');
      setSymbol('');
      setEntryReason('');
      setExitReason('');
      setStrategy('');
      setNotes('');
      setLearnings('');
      
      fetchJournalData();
    } catch (err) {
      setError(err.response?.data?.message || 'Error submitting journal entry.');
    }
  };
  
  if (loading) {
    return <div className="p-6 text-center text-xs text-gray-500">Loading journal records...</div>;
  }
  
  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center pb-4 border-b border-gray-800">
        <div>
          <h2 className="text-xl font-black text-white">Trading Journal</h2>
          <p className="text-xs text-gray-400">Document entry/exit logic, notes, and lessons to refine your edge</p>
        </div>
        
        <button 
          onClick={() => setShowAddForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors shadow-lg shadow-blue-500/20 flex items-center space-x-1.5"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Write Entry</span>
        </button>
      </div>
      
      {error && (
        <div className="p-3 bg-red-900/20 border border-red-800/40 text-red-400 text-xs rounded-xl">
          {error}
        </div>
      )}
      
      {success && (
        <div className="p-3 bg-emerald-900/20 border border-emerald-800/40 text-emerald-400 text-xs rounded-xl">
          {success}
        </div>
      )}
      
      {/* Journal list */}
      <div className="space-y-4">
        {journals.length === 0 ? (
          <div className="p-12 glass-card rounded-2xl border border-gray-800 text-center text-xs text-gray-500">
            <BookOpen className="w-8 h-8 mx-auto mb-2 text-gray-600 animate-pulse" />
            No journal entries recorded. Write your first log to review performance!
          </div>
        ) : (
          journals.map(entry => (
            <div key={entry._id} className="glass-card rounded-2xl p-5 border border-gray-800 space-y-4">
              <div className="flex justify-between items-start border-b border-gray-900 pb-3">
                <div className="flex items-center space-x-2">
                  <span className="font-extrabold text-white text-sm">
                    {entry.symbol || (entry.trade ? entry.trade.symbol : 'GENERAL NOTES')}
                  </span>
                  {entry.strategy && (
                    <span className="text-[10px] bg-blue-900/20 text-blue-400 border border-blue-800/30 px-2 py-0.5 rounded font-bold uppercase flex items-center">
                      <Tag className="w-3 h-3 mr-1" />
                      {entry.strategy}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-gray-500 flex items-center">
                  <Calendar className="w-3.5 h-3.5 mr-1" />
                  {new Date(entry.createdAt).toLocaleDateString()}
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {entry.entryReason && (
                  <div className="bg-gray-950/40 p-3 rounded-xl border border-gray-900/50">
                    <span className="text-[10px] text-gray-500 block font-bold uppercase mb-1">Entry Rationale:</span>
                    <p className="text-gray-300">{entry.entryReason}</p>
                  </div>
                )}
                {entry.exitReason && (
                  <div className="bg-gray-950/40 p-3 rounded-xl border border-gray-900/50">
                    <span className="text-[10px] text-gray-500 block font-bold uppercase mb-1">Exit Rationale:</span>
                    <p className="text-gray-300">{entry.exitReason}</p>
                  </div>
                )}
              </div>
              
              {entry.notes && (
                <div className="text-xs">
                  <span className="text-[10px] text-gray-500 block font-bold uppercase mb-1">Trade Observations:</span>
                  <p className="text-gray-300">{entry.notes}</p>
                </div>
              )}
              
              {entry.learnings && (
                <div className="text-xs bg-emerald-950/10 border border-emerald-900/20 p-3 rounded-xl text-emerald-400">
                  <span className="text-[10px] text-emerald-500 block font-bold uppercase mb-1 flex items-center">
                    <MessageSquareCode className="w-3.5 h-3.5 mr-1" />
                    Key Lessons / Takeaways:
                  </span>
                  <p className="mt-1">{entry.learnings}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
      
      {/* Add Entry Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-darkBg/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg glass-card rounded-2xl p-6 border border-gray-800 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-800 pb-3">
              <h4 className="font-bold text-white text-sm">Write Journal Log</h4>
              <button onClick={() => setShowAddForm(false)} className="text-gray-500 hover:text-white">
                ✕
              </button>
            </div>
            
            <form onSubmit={handleAddEntry} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-500 mb-1.5 font-semibold">Link executed Trade (Optional)</label>
                  <select 
                    value={tradeId}
                    onChange={(e) => setTradeId(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 px-3 py-2 rounded-xl text-white focus:outline-none"
                  >
                    <option value="">No Trade Link (General Note)</option>
                    {trades.map(t => (
                      <option key={t._id} value={t._id}>
                        {t.symbol} - {t.direction.toUpperCase()} ({t.executionQuantity} @ ₹{t.executionPrice})
                      </option>
                    ))}
                  </select>
                </div>
                
                {!tradeId && (
                  <div>
                    <label className="block text-gray-500 mb-1.5 font-semibold">Symbol / Ticker</label>
                    <input 
                      type="text"
                      value={symbol}
                      onChange={(e) => setSymbol(e.target.value)}
                      className="w-full bg-gray-950 border border-gray-800 px-3 py-2 rounded-xl text-white focus:outline-none"
                      placeholder="e.g. RELIANCE"
                    />
                  </div>
                )}
                
                <div className="md:col-span-2">
                  <label className="block text-gray-500 mb-1.5 font-semibold">Strategy Used</label>
                  <input 
                    type="text"
                    value={strategy}
                    onChange={(e) => setStrategy(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 px-3 py-2 rounded-xl text-white focus:outline-none"
                    placeholder="e.g. Support Bounce, Breakout, Intraday Scalp"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-500 mb-1.5 font-semibold">Entry Reasoning</label>
                  <textarea 
                    value={entryReason}
                    onChange={(e) => setEntryReason(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 px-3 py-2 rounded-xl text-white focus:outline-none h-20 resize-none"
                    placeholder="Why did you enter this trade?"
                  />
                </div>
                <div>
                  <label className="block text-gray-500 mb-1.5 font-semibold">Exit Reasoning</label>
                  <textarea 
                    value={exitReason}
                    onChange={(e) => setExitReason(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 px-3 py-2 rounded-xl text-white focus:outline-none h-20 resize-none"
                    placeholder="Why did you close this trade?"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-gray-500 mb-1.5 font-semibold">Observations & General Notes</label>
                <textarea 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 px-3 py-2 rounded-xl text-white focus:outline-none h-20 resize-none"
                  placeholder="Market behavior, emotions, details..."
                />
              </div>
              
              <div>
                <label className="block text-emerald-500 mb-1.5 font-semibold">Key Lessons / Learnings</label>
                <textarea 
                  value={learnings}
                  onChange={(e) => setLearnings(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 px-3 py-2 rounded-xl text-white focus:outline-none h-20 resize-none"
                  placeholder="What would you change next time?"
                />
              </div>
              
              <button 
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl transition-colors shadow-lg shadow-blue-500/25"
              >
                Submit Journal Entry
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Journal;
