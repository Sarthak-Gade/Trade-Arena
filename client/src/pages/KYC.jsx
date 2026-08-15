import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateKycStatus } from '../store/authSlice';
import api from '../utils/api';
import { UserCheck, AlertTriangle, CheckCircle, ShieldAlert, Upload } from 'lucide-react';

const KYC = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  
  // KYC Form fields
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [occupation, setOccupation] = useState('');
  
  // File fields
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [panCard, setPanCard] = useState(null);
  const [aadhaarCard, setAadhaarCard] = useState(null);
  
  // Statuses
  const [kycDetails, setKycDetails] = useState(null);
  const [completion, setCompletion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  useEffect(() => {
    fetchKycStatus();
  }, []);
  
  const fetchKycStatus = async () => {
    try {
      const res = await api.get('/kyc/status');
      const data = res.data.data;
      setCompletion(data.completionPercentage);
      setKycDetails(data.kycDetails);
      if (data.kycDetails) {
        setFullName(data.kycDetails.fullName || '');
        setDob(data.kycDetails.dob ? new Date(data.kycDetails.dob).toISOString().split('T')[0] : '');
        setPanNumber(data.kycDetails.panNumber || '');
        setAadhaarNumber(data.kycDetails.aadhaarNumber || '');
        setAddress(data.kycDetails.address || '');
        setCity(data.kycDetails.city || '');
        setState(data.kycDetails.state || '');
        setPincode(data.kycDetails.pincode || '');
        setOccupation(data.kycDetails.occupation || '');
      }
      
      // Update global store status if it changed
      dispatch(updateKycStatus(data.kycStatus));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSubmitKyc = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);
    
    if (!profilePhoto || !panCard || !aadhaarCard) {
      setError('Please upload all requested file documents (Profile photo, PAN copy, Aadhaar copy)');
      setSubmitting(false);
      return;
    }
    
    try {
      const formData = new FormData();
      formData.append('fullName', fullName);
      formData.append('dob', dob);
      formData.append('panNumber', panNumber);
      formData.append('aadhaarNumber', aadhaarNumber);
      formData.append('address', address);
      formData.append('city', city);
      formData.append('state', state);
      formData.append('pincode', pincode);
      formData.append('occupation', occupation);
      formData.append('profilePhoto', profilePhoto);
      formData.append('panCard', panCard);
      formData.append('aadhaarCard', aadhaarCard);
      
      await api.post('/kyc/submit', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setSuccess('KYC documents submitted successfully for administrative review!');
      fetchKycStatus();
    } catch (err) {
      setError(err.response?.data?.message || 'Error submitting KYC files.');
    } finally {
      setSubmitting(false);
    }
  };
  
  if (loading) {
    return <div className="p-6 text-center text-xs text-gray-500">Loading profile configuration...</div>;
  }
  
  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center pb-4 border-b border-gray-800">
        <div>
          <h2 className="text-xl font-black text-white">KYC Verification</h2>
          <p className="text-xs text-gray-400">Indian SEBI regulatory requirements for activating trading accounts</p>
        </div>
        
        {user && (
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-400 font-bold">Profile Completion:</span>
            <span className="text-sm font-black text-blue-500 bg-blue-900/10 border border-blue-800/20 px-2 py-1 rounded-xl">{completion}%</span>
          </div>
        )}
      </div>
      
      {/* Current status Alerts */}
      {user?.kycStatus === 'approved' && (
        <div className="bg-emerald-950/20 border border-emerald-800/40 p-4 rounded-2xl flex items-start space-x-3 text-emerald-400">
          <CheckCircle className="w-6 h-6 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-white text-sm">KYC Approved & Verified</h4>
            <p className="text-xs mt-1">Your brokerage simulator account is active. You have full access to the trading terminal, IPO panels, and wallet options.</p>
          </div>
        </div>
      )}
      
      {user?.kycStatus === 'under_review' && (
        <div className="bg-blue-950/20 border border-blue-800/40 p-4 rounded-2xl flex items-start space-x-3 text-blue-400">
          <UserCheck className="w-6 h-6 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-white text-sm">KYC Under Review</h4>
            <p className="text-xs mt-1">Your profile details are currently being reviewed by administrators. This usually takes under 24 hours. Trading remains blocked until approved.</p>
          </div>
        </div>
      )}
      
      {user?.kycStatus === 'rejected' && (
        <div className="bg-red-950/20 border border-red-800/40 p-4 rounded-2xl flex items-start space-x-3 text-red-400">
          <ShieldAlert className="w-6 h-6 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-white text-sm">KYC Rejected / Deficient</h4>
            <p className="text-xs mt-1">Reason: <strong className="text-white">{kycDetails?.rejectionReason}</strong>. Please update correct details and resubmit docs.</p>
          </div>
        </div>
      )}
      
      {error && (
        <div className="p-3 bg-red-900/20 border border-red-800/40 text-red-400 text-xs rounded-xl flex items-center">
          <AlertTriangle className="w-4 h-4 mr-2" />
          <span>{error}</span>
        </div>
      )}
      
      {success && (
        <div className="p-3 bg-emerald-900/20 border border-emerald-800/40 text-emerald-400 text-xs rounded-xl">
          {success}
        </div>
      )}
      
      {/* Form Submission */}
      {(user?.kycStatus === 'pending' || user?.kycStatus === 'rejected') && (
        <form onSubmit={handleSubmitKyc} className="glass-card rounded-2xl p-6 border border-gray-800 space-y-6">
          <h3 className="text-sm font-bold text-white border-b border-gray-800 pb-2">1. Personal Details</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div>
              <label className="block text-gray-400 font-semibold mb-1.5">Full Name (as per PAN Card)</label>
              <input 
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 px-3 py-2.5 rounded-xl text-white focus:outline-none focus:border-blue-500"
                placeholder="Johnathan Doe"
                required
              />
            </div>
            
            <div>
              <label className="block text-gray-400 font-semibold mb-1.5">Date of Birth</label>
              <input 
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 px-3 py-2.5 rounded-xl text-white focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-gray-400 font-semibold mb-1.5">PAN Card Number (10 character code)</label>
              <input 
                type="text"
                value={panNumber}
                onChange={(e) => setPanNumber(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 px-3 py-2.5 rounded-xl text-white focus:outline-none focus:border-blue-500 uppercase"
                placeholder="ABCDE1234F"
                maxLength="10"
                required
              />
            </div>
            
            <div>
              <label className="block text-gray-400 font-semibold mb-1.5">Aadhaar Card Number (12 digits)</label>
              <input 
                type="text"
                value={aadhaarNumber}
                onChange={(e) => setAadhaarNumber(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 px-3 py-2.5 rounded-xl text-white focus:outline-none focus:border-blue-500"
                placeholder="123456789012"
                maxLength="12"
                required
              />
            </div>
            
            <div>
              <label className="block text-gray-400 font-semibold mb-1.5">Occupation</label>
              <select 
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 px-3 py-2.5 rounded-xl text-white focus:outline-none focus:border-blue-500"
                required
              >
                <option value="">Select Occupation</option>
                <option value="Salaried">Salaried Employee</option>
                <option value="Self-Employed">Self Employed</option>
                <option value="Business">Business Owner</option>
                <option value="Student">Student</option>
                <option value="Retired">Retired</option>
              </select>
            </div>
          </div>
          
          <h3 className="text-sm font-bold text-white border-b border-gray-800 pb-2 pt-4">2. Address Specifications</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-xs">
            <div className="md:col-span-2">
              <label className="block text-gray-400 font-semibold mb-1.5">Permanent Address</label>
              <input 
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 px-3 py-2.5 rounded-xl text-white focus:outline-none focus:border-blue-500"
                placeholder="Flat No, Apartment, Street name"
                required
              />
            </div>
            
            <div>
              <label className="block text-gray-400 font-semibold mb-1.5">City</label>
              <input 
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 px-3 py-2.5 rounded-xl text-white focus:outline-none focus:border-blue-500"
                placeholder="Mumbai"
                required
              />
            </div>
            
            <div>
              <label className="block text-gray-400 font-semibold mb-1.5">State</label>
              <input 
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 px-3 py-2.5 rounded-xl text-white focus:outline-none focus:border-blue-500"
                placeholder="Maharashtra"
                required
              />
            </div>
            
            <div>
              <label className="block text-gray-400 font-semibold mb-1.5">Pincode</label>
              <input 
                type="text"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 px-3 py-2.5 rounded-xl text-white focus:outline-none focus:border-blue-500"
                placeholder="400001"
                maxLength="6"
                required
              />
            </div>
          </div>
          
          <h3 className="text-sm font-bold text-white border-b border-gray-800 pb-2 pt-4">3. Document Uploads</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
            {/* Profile Photo */}
            <div className="border border-gray-800/80 rounded-2xl p-4 text-center hover:border-blue-500 transition-colors">
              <Upload className="w-8 h-8 text-gray-500 mx-auto mb-2" />
              <p className="font-bold text-white">Profile Photo</p>
              <p className="text-[10px] text-gray-500 mt-1">Only PNG/JPG, max 5MB</p>
              <input 
                type="file"
                onChange={(e) => setProfilePhoto(e.target.files[0])}
                className="mt-3 w-full text-[10px] text-gray-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-blue-600/10 file:text-blue-400 hover:file:bg-blue-600/20"
                required
              />
            </div>
            
            {/* PAN Card copy */}
            <div className="border border-gray-800/80 rounded-2xl p-4 text-center hover:border-blue-500 transition-colors">
              <Upload className="w-8 h-8 text-gray-500 mx-auto mb-2" />
              <p className="font-bold text-white">PAN Card Document</p>
              <p className="text-[10px] text-gray-500 mt-1">Image copy or PDF, max 5MB</p>
              <input 
                type="file"
                onChange={(e) => setPanCard(e.target.files[0])}
                className="mt-3 w-full text-[10px] text-gray-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-blue-600/10 file:text-blue-400 hover:file:bg-blue-600/20"
                required
              />
            </div>
            
            {/* Aadhaar Copy */}
            <div className="border border-gray-800/80 rounded-2xl p-4 text-center hover:border-blue-500 transition-colors">
              <Upload className="w-8 h-8 text-gray-500 mx-auto mb-2" />
              <p className="font-bold text-white">Aadhaar Card copy</p>
              <p className="text-[10px] text-gray-500 mt-1">Image copy or PDF, max 5MB</p>
              <input 
                type="file"
                onChange={(e) => setAadhaarCard(e.target.files[0])}
                className="mt-3 w-full text-[10px] text-gray-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-blue-600/10 file:text-blue-400 hover:file:bg-blue-600/20"
                required
              />
            </div>
          </div>
          
          <button 
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-sm transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
          >
            {submitting ? 'Submitting Documents...' : 'Submit Profile KYC Verification'}
          </button>
        </form>
      )}
    </div>
  );
};

export default KYC;
