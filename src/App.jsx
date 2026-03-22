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
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <svg className="animate-spin h-10 w-10 text-[#22c55e]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
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
          <ProtectedRoute user={user}>
            <ChatPage />
          </ProtectedRoute>
        } />

        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </div>
  );
}

export default App;
