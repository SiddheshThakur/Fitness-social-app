import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import SetupPage from './pages/SetupPage';
import DashboardPage from './pages/DashboardPage';
import DiscoverPage from './pages/DiscoverPage';
import ChatListPage from './pages/ChatListPage';
import ChatPage from './pages/ChatPage';
import ProfilePage from './pages/ProfilePage';
import UserProfilePage from './pages/UserProfilePage';
import LoadingSpinner from './components/LoadingSpinner';
import Navbar from './components/Navbar';

const ProtectedRoute = ({ children, user, showNavbar = true }) => {
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return (
    <>
      {children}
      {showNavbar && <Navbar />}
    </>
  );
};

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, []);

  if (loading) {
    return <LoadingSpinner text="Connecting to StrideSocial..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Container with bottom padding so Navbar doesn't overlap content */}
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        
        <Route path="/setup" element={
          <ProtectedRoute user={user} showNavbar={false}>
            <SetupPage />
          </ProtectedRoute>
        } />
        
        <Route path="/dashboard" element={
          <ProtectedRoute user={user}>
            <DashboardPage />
          </ProtectedRoute>
        } />
        
        <Route path="/discover" element={
          <ProtectedRoute user={user}>
            <DiscoverPage />
          </ProtectedRoute>
        } />
        
        <Route path="/profile" element={
          <ProtectedRoute user={user}>
            <ProfilePage />
          </ProtectedRoute>
        } />
        
        <Route path="/chat" element={
          <ProtectedRoute user={user}>
            <ChatListPage />
          </ProtectedRoute>
        } />
        
        <Route path="/chat/:userId" element={
          <ProtectedRoute user={user} showNavbar={false}>
            <ChatPage />
          </ProtectedRoute>
        } />

        <Route path="/user/:userId" element={
          <ProtectedRoute user={user}>
            <UserProfilePage />
          </ProtectedRoute>
        } />

        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </div>
  );
}

export default App;
