import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Verify from './pages/Verify';
import Dashboard from './pages/Dashboard';
import Terminal from './pages/Terminal';
import Portfolio from './pages/Portfolio';
import Ledger from './pages/Ledger';
import KYC from './pages/KYC';
import IPO from './pages/IPO';
import Journal from './pages/Journal';
import Leaderboard from './pages/Leaderboard';
import Reports from './pages/Reports';
import AdminDashboard from './pages/AdminDashboard';

// Dashboard layout wrapping sub-panes
const DashboardLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-darkBg text-gray-200 flex flex-col">
      <Navbar />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-darkBg to-slate-950">
          {children}
        </main>
      </div>
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify" element={<Verify />} />
        
        {/* Protected Dashboard layout routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <DashboardLayout><Dashboard /></DashboardLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/terminal" element={
          <ProtectedRoute>
            <DashboardLayout><Terminal /></DashboardLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/portfolio" element={
          <ProtectedRoute>
            <DashboardLayout><Portfolio /></DashboardLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/ledger" element={
          <ProtectedRoute>
            <DashboardLayout><Ledger /></DashboardLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/kyc" element={
          <ProtectedRoute>
            <DashboardLayout><KYC /></DashboardLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/ipo" element={
          <ProtectedRoute>
            <DashboardLayout><IPO /></DashboardLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/journal" element={
          <ProtectedRoute>
            <DashboardLayout><Journal /></DashboardLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/leaderboard" element={
          <ProtectedRoute>
            <DashboardLayout><Leaderboard /></DashboardLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/reports" element={
          <ProtectedRoute>
            <DashboardLayout><Reports /></DashboardLayout>
          </ProtectedRoute>
        } />
        
        {/* Admin protected routing */}
        <Route path="/admin" element={
          <AdminRoute>
            <DashboardLayout><AdminDashboard /></DashboardLayout>
          </AdminRoute>
        } />
        
        {/* Default redirects */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
