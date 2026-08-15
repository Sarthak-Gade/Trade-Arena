import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateWalletBalance } from '../store/authSlice';
import api from '../utils/api';
import { PlusCircle, MinusCircle, History, Landmark, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

const Ledger = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  
  // Ledger page local state
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [ledgerLogs, setLedgerLogs] = useState([]);
  const [walletSummary, setWalletSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  useEffect(() => {
    fetchLedgerData();
  }, []);
  
  const fetchLedgerData = async () => {
    try {
      const ledgerRes = await api.get('/wallet/ledger');
      setLedgerLogs(ledgerRes.data.data);
      
      const summaryRes = await api.get('/wallet/summary');
      setWalletSummary(summaryRes.data.data);
      
      // Update global wallet balance
      if (summaryRes.data.data) {
        dispatch(updateWalletBalance(summaryRes.data.data.closingBalance));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleDeposit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (parseFloat(depositAmount) <= 0) {
      setError('Amount must be positive');
      return;
    }
    
    try {
      const res = await api.post('/wallet/deposit', { amount: depositAmount });
      setSuccess(`Successfully added ₹${parseFloat(depositAmount).toLocaleString()} virtual funds to your wallet!`);
      setDepositAmount('');
      fetchLedgerData();
    } catch (err) {
      setError(err.response?.data?.message || 'Error processing simulated deposit.');
    }
  };
  
  const handleWithdrawal = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (parseFloat(withdrawAmount) <= 0) {
      setError('Amount must be positive');
      return;
    }
    
    try {
      await api.post('/wallet/withdraw', { amount: withdrawAmount });
      setSuccess(`Simulated withdrawal of ₹${parseFloat(withdrawAmount).toLocaleString()} completed.`);
      setWithdrawAmount('');
      fetchLedgerData();
    } catch (err) {
      setError(err.response?.data?.message || 'Insufficient funds or withdrawal error.');
    }
  };
  
  if (loading) {
    return <div className="p-6 text-center text-xs text-gray-500">Loading ledger ledger...</div>;
  }
  
  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-6xl mx-auto space-y-6">
      <div className="pb-4 border-b border-gray-800">
        <h2 className="text-xl font-black text-white">Wallet & Ledger</h2>
        <p className="text-xs text-gray-400">Manage virtual funds, simulate bank deposits/withdrawals, and audit ledger logs</p>
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
      
      {/* Wallet Balance & EOD Summary card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Wallet Balance Display */}
        <div className="glass-card rounded-2xl p-6 border border-gray-800 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl"></div>
          <div>
            <Landmark className="w-8 h-8 text-blue-400 mb-2" />
            <span className="text-xs text-gray-400 font-semibold">Available margin balance</span>
            <h3 className="text-2xl font-black text-white mt-1">
              ₹{user?.walletBalance?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="text-[10px] text-gray-500 mt-4">
            Trading ID: <span className="text-white font-mono">{user?.tradingAccountNumber}</span>
          </div>
        </div>
        
        {/* Daily Summary statistics */}
        {walletSummary && (
          <div className="glass-card rounded-2xl p-6 border border-gray-800 md:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="border-r border-gray-900 p-2">
              <span className="text-gray-500">Opening Balance</span>
              <p className="font-bold text-white mt-1">₹{walletSummary.openingBalance?.toLocaleString('en-IN')}</p>
            </div>
            <div className="border-r border-gray-900 p-2">
              <span className="text-gray-500">Today's Deposits</span>
              <p className="font-bold text-emerald-400 mt-1">₹{walletSummary.deposits?.toLocaleString('en-IN')}</p>
            </div>
            <div className="border-r border-gray-900 p-2">
              <span className="text-gray-500">Today's Withdrawals</span>
              <p className="font-bold text-red-400 mt-1">₹{walletSummary.withdrawals?.toLocaleString('en-IN')}</p>
            </div>
            <div className="p-2">
              <span className="text-gray-500">Today's Fees</span>
              <p className="font-bold text-yellow-400 mt-1">₹{walletSummary.totalCharges?.toFixed(2)}</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Deposit & Withdrawal forms */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Deposit Funds */}
        <form onSubmit={handleDeposit} className="glass-card rounded-2xl p-6 border border-gray-800 space-y-4">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center">
            <PlusCircle className="w-4 h-4 mr-2 text-emerald-400" />
            Simulate Deposit (Add Funds)
          </h4>
          
          <div className="text-xs">
            <label className="block text-gray-500 mb-1.5 font-semibold">Amount (INR)</label>
            <div className="flex space-x-2">
              <input 
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="flex-1 bg-gray-950 border border-gray-800 px-3 py-2 rounded-xl text-white focus:outline-none focus:border-blue-500"
                placeholder="e.g. 50000"
                required
              />
              <button 
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl transition-colors shadow-lg shadow-emerald-500/10"
              >
                Deposit
              </button>
            </div>
          </div>
        </form>
        
        {/* Withdrawal Simulator */}
        <form onSubmit={handleWithdrawal} className="glass-card rounded-2xl p-6 border border-gray-800 space-y-4">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center">
            <MinusCircle className="w-4 h-4 mr-2 text-red-400" />
            Simulate Withdrawal (Deduct Funds)
          </h4>
          
          <div className="text-xs">
            <label className="block text-gray-500 mb-1.5 font-semibold">Amount (INR)</label>
            <div className="flex space-x-2">
              <input 
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                className="flex-1 bg-gray-950 border border-gray-800 px-3 py-2 rounded-xl text-white focus:outline-none focus:border-blue-500"
                placeholder="e.g. 10000"
                required
              />
              <button 
                type="submit"
                className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-xl transition-colors shadow-lg shadow-red-500/10"
              >
                Withdraw
              </button>
            </div>
          </div>
        </form>
      </div>
      
      {/* Ledger statement list */}
      <div className="glass-card rounded-2xl p-6 border border-gray-800">
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center">
          <History className="w-4 h-4 mr-2 text-blue-400" />
          Ledger transaction statement
        </h4>
        
        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left">
            <thead>
              <tr className="text-gray-500 border-b border-gray-850 pb-2">
                <th className="py-2">Date / Time</th>
                <th>Description</th>
                <th>Type</th>
                <th className="text-right">Transaction Amount</th>
                <th className="text-right">Running Balance</th>
              </tr>
            </thead>
            <tbody>
              {ledgerLogs.length === 0 ? (
                <tr><td colSpan="5" className="text-center text-gray-500 py-6">No wallet transactions found.</td></tr>
              ) : (
                ledgerLogs.map(log => {
                  const isCredit = log.amount >= 0;
                  return (
                    <tr key={log._id} className="border-b border-gray-900/60 hover:bg-gray-855/20 py-2">
                      <td className="py-2.5 text-gray-400">{new Date(log.createdAt).toLocaleString()}</td>
                      <td>
                        <p className="font-semibold text-white">{log.description}</p>
                        {log.referenceId && <span className="text-[10px] text-gray-500 font-mono">Ref ID: {log.referenceId.slice(-10)}</span>}
                      </td>
                      <td className="capitalize">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.type === 'deposit' ? 'bg-emerald-950/20 text-emerald-400' :
                          log.type === 'withdrawal' ? 'bg-red-950/20 text-red-400' :
                          log.type === 'charges' ? 'bg-yellow-950/20 text-yellow-400' : 'bg-gray-800 text-gray-300'
                        }`}>
                          {log.type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className={`text-right font-black ${isCredit ? 'text-emerald-400' : 'text-red-400'}`}>
                        {isCredit ? '+' : '-'} ₹{Math.abs(log.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="text-right font-bold text-white">
                        ₹{log.balanceAfter?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Ledger;
