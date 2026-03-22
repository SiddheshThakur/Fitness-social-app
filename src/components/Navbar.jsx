import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Navbar() {
  const location = useLocation();

  const navItems = [
    { label: 'Home', path: '/dashboard', icon: '🏠' },
    { label: 'Discover', path: '/discover', icon: '🔍' },
    { label: 'Chat', path: '/chat', icon: '💬' },
    { label: 'Profile', path: '/profile', icon: '👤' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto">
        {navItems.map((item) => {
          // Check if current path starts with item.path (e.g. /chat/123 should highlight Chat tab)
          const isActive = location.pathname.startsWith(item.path);
          return (
            <Link 
              key={item.label} 
              to={item.path}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${isActive ? 'text-[#22c55e]' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <span className={`text-xl transition-transform ${isActive ? 'transform scale-110' : ''}`}>{item.icon}</span>
              <span className={`text-xs font-bold ${isActive ? 'text-[#22c55e]' : 'text-gray-500'}`}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
