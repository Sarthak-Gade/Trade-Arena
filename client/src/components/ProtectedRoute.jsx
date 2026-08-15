import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  // Not logged in at all
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Logged in but not verified — redirect to verification
  if (!user.isEmailVerified || !user.isMobileVerified) {
    return <Navigate to={`/verify?userId=${user._id}`} replace />;
  }

  return children;
};

export default ProtectedRoute;
