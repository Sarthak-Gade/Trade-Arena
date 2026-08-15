import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import api from '../utils/api';
import { Cpu, DollarSign, Calendar, Info, CheckCircle2, XCircle } from 'lucide-react';

const IPO = () => {
  const { user } = useSelector((state) => state.auth);
  
  // IPO state details
  const [ipos, setIpos] = useState([]);
  const [applications, setApplications] = useState([]);
  const [selectedIpo, setSelectedIpo] = useState(null);
  const [bidQty, setBidQty] = useState(0);
  const [bidPrice, setBidPrice] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  useEffect(() => {
    fetchIpoData();
  }, []);
  
  const fetchIpoData = async () => {
    try {
      const ipoRes = await api.get('/ipos');
      setIpos(ipoRes.data.data);
      
      const appRes = await api.get('/ipos/applications');
      setApplications(appRes.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleApply = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!selectedIpo) return;
    
    try {
      await api.post('/ipos/apply', {
        ipoId: selectedIpo._id,
        quantity: Number(bidQty),
        price: Number(bidPrice)
      });
      
      setSuccess(`Application submitted successfully! INR ${(bidQty * bidPrice).toLocaleString()} blocked.`);
      setSelectedIpo(null);
      fetchIpoData();
    } catch (err) {
      setError(err.response?.data?.message || 'Error submitting IPO bid.');
    }
  };
  
  if (loading) {
    return <div className="p-6 text-center text-xs text-gray-500">Loading IPO data...</div>;
  }
  
  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-6xl mx-auto space-y-6">
      <div className="pb-4 border-b border-gray-800">
        <h2 className="text-xl font-black text-white">IPO Bidding Panel</h2>
        <p className="text-xs text-gray-400">Bid on upcoming listings using virtual money and track random allotments</p>
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
      
      {/* IPO grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Listings column */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center">
            <Cpu className="w-4 h-4 mr-2 text-blue-400" />
            Active IPO Listings
          </h3>
          
          {ipos.length === 0 ? (
            <div className="p-6 glass-card rounded-2xl border border-gray-800 text-center text-xs text-gray-500">
              No active IPO listings available at this time.
            </div>
          ) : (
            ipos.map(ipo => {
              const isOpen = ipo.status === 'open';
              return (
                <div key={ipo._id} className="glass-card rounded-2xl p-5 border border-gray-800 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-white text-sm">{ipo.companyName}</h4>
                      <span className="text-[10px] text-gray-400 font-mono mt-0.5 inline-block">{ipo.symbol}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                      isOpen ? 'bg-emerald-950/20 text-emerald-400 border border-emerald-900/45' : 'bg-gray-800 text-gray-400 border border-gray-700/60'
                    }`}>
                      {ipo.status}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 text-xs border-y border-gray-900 py-3">
                    <div>
                      <span className="text-gray-500 text-[10px] block">Price Band</span>
                      <span className="font-bold text-white mt-1 block">₹{ipo.priceRange}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 text-[10px] block">Lot Size</span>
                      <span className="font-bold text-white mt-1 block">{ipo.minQuantity} shares</span>
                    </div>
                    <div>
                      <span className="text-gray-500 text-[10px] block">Listing Date</span>
                      <span className="font-semibold text-gray-300 mt-1 block">{new Date(ipo.listingDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  {isOpen && (
                    <button 
                      onClick={() => {
                        setSelectedIpo(ipo);
                        setBidQty(ipo.minQuantity);
                        // set bid price to max price in band
                        const prices = ipo.priceRange.split('-').map(p => parseFloat(p.trim()));
                        setBidPrice(prices[1] || prices[0]);
                      }}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-xl text-xs transition-colors shadow-lg shadow-blue-500/10"
                    >
                      Apply Now
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
        
        {/* IPO Applications Column */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center">
            <DollarSign className="w-4 h-4 mr-2 text-emerald-400" />
            My Applications
          </h3>
          
          {applications.length === 0 ? (
            <div className="p-6 glass-card rounded-2xl border border-gray-800 text-center text-xs text-gray-500">
              You haven't applied for any IPOs.
            </div>
          ) : (
            applications.map(app => {
              const isAllotted = app.status === 'allotted';
              const isNotAllotted = app.status === 'not_allotted';
              return (
                <div key={app._id} className="glass-card rounded-2xl p-4 border border-gray-800 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-white text-xs">{app.ipo?.companyName}</h4>
                    <p className="text-[10px] text-gray-500 mt-1">
                      Bid: {app.appliedQuantity} shares @ ₹{app.appliedPrice} (Blocked: ₹{app.fundsBlocked?.toLocaleString()})
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {isAllotted && (
                      <div className="flex items-center text-emerald-400 space-x-1 bg-emerald-950/20 border border-emerald-900/40 px-2 py-0.5 rounded-full text-[9px] font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>ALLOTTED</span>
                      </div>
                    )}
                    {isNotAllotted && (
                      <div className="flex items-center text-red-400 space-x-1 bg-red-950/20 border border-red-900/40 px-2 py-0.5 rounded-full text-[9px] font-bold">
                        <XCircle className="w-3.5 h-3.5" />
                        <span>REFUNDED</span>
                      </div>
                    )}
                    {app.status === 'applied' && (
                      <span className="bg-yellow-900/20 border border-yellow-800/40 text-yellow-400 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase">
                        SUBMITTED
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
      
      {/* Apply Modal */}
      {selectedIpo && (
        <div className="fixed inset-0 bg-darkBg/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md glass-card rounded-2xl p-6 border border-gray-800 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-gray-800 pb-3">
              <h4 className="font-bold text-white text-sm">Apply for {selectedIpo.companyName}</h4>
              <button onClick={() => setSelectedIpo(null)} className="text-gray-500 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleApply} className="space-y-4 text-xs">
              <div>
                <label className="block text-gray-500 mb-1.5 font-semibold">Min Bid quantity (Lot Size): {selectedIpo.minQuantity}</label>
                <input 
                  type="number"
                  value={bidQty}
                  onChange={(e) => setBidQty(Math.max(selectedIpo.minQuantity, parseInt(e.target.value) || selectedIpo.minQuantity))}
                  className="w-full bg-gray-950 border border-gray-800 px-3 py-2 rounded-xl text-white focus:outline-none focus:border-blue-500 font-bold"
                  step={selectedIpo.minQuantity}
                  required
                />
              </div>
              
              <div>
                <label className="block text-gray-500 mb-1.5 font-semibold">Bid Price (Price Band: ₹{selectedIpo.priceRange})</label>
                <input 
                  type="number"
                  value={bidPrice}
                  onChange={(e) => setBidPrice(parseFloat(e.target.value) || 0)}
                  className="w-full bg-gray-950 border border-gray-800 px-3 py-2 rounded-xl text-white focus:outline-none focus:border-blue-500 font-bold"
                  required
                />
              </div>
              
              <div className="bg-gray-950/60 p-3 rounded-xl border border-gray-900 flex justify-between items-center">
                <span className="text-gray-500 font-semibold">Total Funds Blocked:</span>
                <span className="font-black text-white text-sm">₹{(bidQty * bidPrice).toLocaleString()}</span>
              </div>
              
              <button 
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl transition-colors shadow-lg shadow-blue-500/25 mt-2"
              >
                Submit Application Bid
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default IPO;
