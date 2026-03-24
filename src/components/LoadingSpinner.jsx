import React from 'react';

const LoadingSpinner = ({ text = 'Loading...' }) => {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
      <div className="relative">
        <div className="w-12 h-12 rounded-full border-4 border-gray-100"></div>
        <div className="absolute top-0 left-0 w-12 h-12 rounded-full border-4 border-green-500 border-t-transparent animate-spin"></div>
      </div>
      {text && (
        <p className="mt-4 text-xs font-black text-gray-400 uppercase tracking-widest animate-pulse">
          {text}
        </p>
      )}
    </div>
  );
};

export default LoadingSpinner;
