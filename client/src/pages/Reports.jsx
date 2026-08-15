import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { FileText, Download, Mail, ExternalLink, Calendar, CheckCircle2, ShieldAlert } from 'lucide-react';

const Reports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  useEffect(() => {
    fetchReports();
  }, []);
  
  const fetchReports = async () => {
    try {
      const res = await api.get('/reports');
      setReports(res.data.data);
    } catch (err) {
      setError('Failed to load contract notes statement history.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDownload = (pdfUrl) => {
    // Construct full backend path
    const baseURL = api.defaults.baseURL.replace('/api', '');
    const fullURL = `${baseURL}${pdfUrl}`;
    
    // Open in new window or trigger download via browser
    window.open(fullURL, '_blank');
  };
  
  if (loading) {
    return <div className="p-6 text-center text-xs text-gray-500">Loading statement history...</div>;
  }
  
  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto space-y-6">
      <div className="pb-4 border-b border-gray-800">
        <h2 className="text-xl font-black text-white">Contract Notes Statement History</h2>
        <p className="text-xs text-gray-400">Download officially generated digital EOD Contract Notes statements (PDF format)</p>
      </div>
      
      {error && (
        <div className="p-3 bg-red-900/20 border border-red-800/40 text-red-400 text-xs rounded-xl">
          {error}
        </div>
      )}
      
      {/* Statement list */}
      <div className="space-y-4">
        {reports.length === 0 ? (
          <div className="p-12 glass-card rounded-2xl border border-gray-800 text-center text-xs text-gray-500">
            <FileText className="w-10 h-10 mx-auto mb-2 text-gray-600 animate-pulse" />
            No Contract Notes generated yet. Statements are only generated on days you execute trades.
          </div>
        ) : (
          reports.map(rep => {
            const fileName = rep.pdfUrl.split('/').pop();
            return (
              <div key={rep._id} className="glass-card rounded-2xl p-4 border border-gray-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center space-x-3.5">
                  <div className="bg-red-600/10 text-red-400 p-2.5 rounded-xl border border-red-900/20">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-white text-sm">Contract Note - {rep.date}</h4>
                    <p className="text-[10px] text-gray-500 font-mono mt-0.5">{fileName}</p>
                    <div className="flex items-center space-x-4 mt-2 text-[10px] text-gray-400">
                      <span className="flex items-center">
                        <Calendar className="w-3.5 h-3.5 mr-1" />
                        Generated: {new Date(rep.createdAt).toLocaleDateString()}
                      </span>
                      <span className="flex items-center">
                        {rep.emailSent ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                            <span className="text-emerald-400 font-semibold">Emailed</span>
                          </>
                        ) : (
                          <>
                            <ShieldAlert className="w-3.5 h-3.5 mr-1 text-yellow-400" />
                            <span className="text-yellow-400 font-semibold">Mail Failed/Local</span>
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex space-x-2 text-xs w-full md:w-auto">
                  <button 
                    onClick={() => handleDownload(rep.pdfUrl)}
                    className="flex-1 md:flex-initial bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl transition-colors shadow-lg shadow-blue-500/10 flex items-center justify-center space-x-1.5"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download PDF</span>
                  </button>
                  
                  <button 
                    onClick={() => handleDownload(rep.pdfUrl)}
                    className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold p-2.5 rounded-xl transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Reports;
