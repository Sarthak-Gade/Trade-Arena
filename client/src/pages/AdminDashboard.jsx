import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { 
  Users, Activity, DollarSign, Award, Cpu, FileCheck, Check, X,
  AlertCircle, Settings, PlayCircle, Loader2
} from 'lucide-react';

const AdminDashboard = () => {
  // Admin local state
  const [metrics, setMetrics] = useState(null);
  const [kycQueue, setKycQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // IPO Form state
  const [companyName, setCompanyName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [priceRange, setPriceRange] = useState('');
  const [minQuantity, setMinQuantity] = useState(100);
  const [openDate, setOpenDate] = useState('');
  const [closeDate, setCloseDate] = useState('');
  const [listingDate, setListingDate] = useState('');
  
  // Rejection Dialog state
  const [rejectingKycId, setRejectingKycId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [runningEod, setRunningEod] = useState(false);
  const [submittingIpo, setSubmittingIpo] = useState(false);
  
  useEffect(() => {
    fetchAdminData();
  }, []);
  
  const fetchAdminData = async () => {
    try {
      const metricsRes = await api.get('/admin/metrics');
      setMetrics(metricsRes.data.data);
      
      const kycRes = await api.get('/admin/kyc');
      // filter out approved ones or show pending/under_review
      setKycQueue(kycRes.data.data.filter(k => k.status === 'under_review'));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleReviewKyc = async (kycId, status, reason = '') => {
    setError('');
    setSuccess('');
    try {
      await api.post(`/admin/kyc/${kycId}/review`, { status, rejectionReason: reason });
      setSuccess(`KYC submission has been successfully ${status}!`);
      setRejectingKycId(null);
      setRejectionReason('');
      fetchAdminData();
    } catch (err) {
      setError(err.response?.data?.message || 'Error updating KYC status.');
    }
  };
  
  const handleCreateIpo = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmittingIpo(true);
    
    try {
      await api.post('/admin/ipos', {
        companyName,
        symbol,
        priceRange,
        minQuantity: Number(minQuantity),
        openDate,
        closeDate,
        listingDate
      });
      
      setSuccess(`IPO launched successfully for ${companyName}!`);
      // Reset
      setCompanyName('');
      setSymbol('');
      setPriceRange('');
      setMinQuantity(100);
      setOpenDate('');
      setCloseDate('');
      setListingDate('');
      
      fetchAdminData();
    } catch (err) {
      setError(err.response?.data?.message || 'Error launching IPO listing.');
    } finally {
      setSubmittingIpo(false);
    }
  };
  
  const handleManualEod = async () => {
    setError('');
    setSuccess('');
    setRunningEod(true);
    
    try {
      const res = await api.post('/admin/trigger-eod');
      setSuccess(res.data.message || 'EOD Roll-up Contract Notes compiled and emailed successfully.');
      fetchAdminData();
    } catch (err) {
      setError(err.response?.data?.message || 'Error running manual EOD engine.');
    } finally {
      setRunningEod(false);
    }
  };
  
  if (loading) {
    return <div className="p-6 text-center text-xs text-gray-500">Loading admin configurations...</div>;
  }
  
  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-6xl mx-auto space-y-6">
      <div className="pb-4 border-b border-gray-800 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black text-blue-500">Admin Dashboard</h2>
          <p className="text-xs text-gray-400">Platform operations, KYC approvals, IPO launch pads, and EOD engine triggers</p>
        </div>
        
        {/* Manual EOD Trigger */}
        <button 
          onClick={handleManualEod}
          disabled={runningEod}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-800 disabled:text-gray-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all flex items-center space-x-2 shadow-lg shadow-blue-500/10"
        >
          {runningEod ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Running EOD...</span>
            </>
          ) : (
            <>
              <PlayCircle className="w-4 h-4" />
              <span>Trigger EOD Roll-up</span>
            </>
          )}
        </button>
      </div>
      
      {error && (
        <div className="p-3 bg-red-900/20 border border-red-800/40 text-red-400 text-xs rounded-xl flex items-center">
          <AlertCircle className="w-4 h-4 mr-2" />
          <span>{error}</span>
        </div>
      )}
      
      {success && (
        <div className="p-3 bg-emerald-900/20 border border-emerald-800/40 text-emerald-400 text-xs rounded-xl">
          {success}
        </div>
      )}
      
      {/* Platform Metrics Cards */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="glass-card rounded-2xl p-5 border border-gray-800">
            <Users className="w-5 h-5 text-blue-400 mb-1" />
            <span className="text-[10px] text-gray-500 font-bold uppercase">Total Traders</span>
            <h4 className="text-xl font-black text-white mt-1">{metrics.totalTraders}</h4>
          </div>
          
          <div className="glass-card rounded-2xl p-5 border border-gray-800">
            <Activity className="w-5 h-5 text-emerald-400 mb-1" />
            <span className="text-[10px] text-gray-500 font-bold uppercase">Total Trades</span>
            <h4 className="text-xl font-black text-white mt-1">{metrics.totalTrades}</h4>
          </div>
          
          <div className="glass-card rounded-2xl p-5 border border-gray-800">
            <DollarSign className="w-5 h-5 text-yellow-400 mb-1" />
            <span className="text-[10px] text-gray-500 font-bold uppercase">Virtual Brokerage</span>
            <h4 className="text-xl font-black text-white mt-1">₹{metrics.totalBrokerage?.toLocaleString()}</h4>
          </div>
          
          <div className="glass-card rounded-2xl p-5 border border-gray-800">
            <Award className="w-5 h-5 text-purple-400 mb-1" />
            <span className="text-[10px] text-gray-500 font-bold uppercase">Platform Volume</span>
            <h4 className="text-xl font-black text-white mt-1">₹{metrics.totalVolume?.toLocaleString()}</h4>
          </div>
        </div>
      )}
      
      {/* Middle Grid: KYC Review queue vs IPO creator */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* KYC Review queue (2/3 width) */}
        <div className="glass-card rounded-2xl p-5 border border-gray-800 md:col-span-2 space-y-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center mb-2">
            <FileCheck className="w-4 h-4 mr-2 text-blue-500" />
            KYC review queue ({kycQueue.length} pending)
          </h3>
          
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead>
                <tr className="text-gray-500 border-b border-gray-850 pb-2">
                  <th className="py-2">Client ID</th>
                  <th>Full Name</th>
                  <th>PAN / Aadhaar</th>
                  <th>DOB</th>
                  <th>Verification documents</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {kycQueue.length === 0 ? (
                  <tr><td colSpan="6" className="text-center text-gray-500 py-8">Review queue is empty. No pending submissions.</td></tr>
                ) : (
                  kycQueue.map(k => (
                    <tr key={k._id} className="border-b border-gray-900/60 hover:bg-gray-855/20 py-2">
                      <td className="py-2.5 font-bold text-white">{k.user?.clientID}</td>
                      <td>
                        <p className="font-semibold text-white">{k.fullName}</p>
                        <span className="text-[10px] text-gray-500">{k.user?.email}</span>
                      </td>
                      <td>
                        <p className="font-mono">{k.panNumber}</p>
                        <p className="text-[10px] text-gray-500 font-mono">{k.aadhaarNumber}</p>
                      </td>
                      <td>{new Date(k.dob).toLocaleDateString()}</td>
                      <td className="space-y-1 py-2">
                        {/* Standard clickable anchors to verify uploads */}
                        <a href={`http://localhost:5000/${k.profilePhoto}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline block text-[10px]">Photo Profile</a>
                        <a href={`http://localhost:5000/${k.panCard}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline block text-[10px]">PAN copy</a>
                        <a href={`http://localhost:5000/${k.aadhaarCard}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline block text-[10px]">Aadhaar copy</a>
                      </td>
                      <td className="text-right space-x-2.5">
                        <button 
                          onClick={() => handleReviewKyc(k._id, 'approved')}
                          className="bg-emerald-600/10 border border-emerald-800/30 text-emerald-400 hover:bg-emerald-600 hover:text-white p-1 rounded-lg transition-colors"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        
                        <button 
                          onClick={() => setRejectingKycId(k._id)}
                          className="bg-red-600/10 border border-red-800/30 text-red-400 hover:bg-red-600 hover:text-white p-1 rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Launch IPO Pane (1/3 width) */}
        <div className="glass-card rounded-2xl p-5 border border-gray-800 space-y-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center mb-2">
            <Cpu className="w-4 h-4 mr-2 text-purple-400" />
            Launch Virtual IPO
          </h3>
          
          <form onSubmit={handleCreateIpo} className="space-y-3 text-xs">
            <div>
              <label className="block text-gray-500 mb-1 font-semibold">Company Name</label>
              <input 
                type="text" 
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 px-3 py-1.5 rounded-xl text-white focus:outline-none focus:border-blue-500"
                placeholder="Nexus Technologies Ltd."
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-500 mb-1 font-semibold">Symbol</label>
                <input 
                  type="text" 
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 px-3 py-1.5 rounded-xl text-white focus:outline-none focus:border-blue-500 uppercase"
                  placeholder="NEXUS"
                  required
                />
              </div>
              
              <div>
                <label className="block text-gray-500 mb-1 font-semibold">Lot Min Qty</label>
                <input 
                  type="number" 
                  value={minQuantity}
                  onChange={(e) => setMinQuantity(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 px-3 py-1.5 rounded-xl text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-gray-500 mb-1 font-semibold">Price Range Band (₹)</label>
              <input 
                type="text" 
                value={priceRange}
                onChange={(e) => setPriceRange(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 px-3 py-1.5 rounded-xl text-white focus:outline-none focus:border-blue-500"
                placeholder="250 - 275"
                required
              />
            </div>
            
            <div>
              <label className="block text-gray-500 mb-1 font-semibold">Bidding Open Date</label>
              <input 
                type="date" 
                value={openDate}
                onChange={(e) => setOpenDate(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 px-3 py-1.5 rounded-xl text-white focus:outline-none"
                required
              />
            </div>
            
            <div>
              <label className="block text-gray-500 mb-1 font-semibold">Bidding Close Date</label>
              <input 
                type="date" 
                value={closeDate}
                onChange={(e) => setCloseDate(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 px-3 py-1.5 rounded-xl text-white focus:outline-none"
                required
              />
            </div>
            
            <div>
              <label className="block text-gray-500 mb-1 font-semibold">Listing Date</label>
              <input 
                type="date" 
                value={listingDate}
                onChange={(e) => setListingDate(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 px-3 py-1.5 rounded-xl text-white focus:outline-none"
                required
              />
            </div>
            
            <button 
              type="submit"
              disabled={submittingIpo}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 rounded-xl transition-all shadow-lg shadow-purple-500/10 mt-2"
            >
              {submittingIpo ? 'Launching...' : 'Launch IPO Listing'}
            </button>
          </form>
        </div>
      </div>
      
      {/* KYC Rejection Reason Modal */}
      {rejectingKycId && (
        <div className="fixed inset-0 bg-darkBg/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md glass-card rounded-2xl p-6 border border-gray-800 shadow-2xl space-y-4">
            <h4 className="font-bold text-white text-sm">Issue KYC Rejection Details</h4>
            <div className="text-xs">
              <label className="block text-gray-500 mb-1.5 font-semibold">Reason for rejection</label>
              <textarea 
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 px-3 py-2 rounded-xl text-white focus:outline-none h-24 resize-none"
                placeholder="e.g. Aadhaar Card copy image is blurry, please update clear document copy."
                required
              />
            </div>
            <div className="flex justify-end space-x-2 text-xs">
              <button 
                onClick={() => setRejectingKycId(null)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleReviewKyc(rejectingKycId, 'rejected', rejectionReason)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-xl text-white transition-colors"
              >
                Reject KYC
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
