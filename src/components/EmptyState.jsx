import React from 'react';

const EmptyState = ({ 
  emoji = '✨', 
  title = 'Nothing here yet', 
  subtitle = '', 
  buttonText = '', 
  onButtonClick = null 
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 bg-gray-50 rounded-[32px] border-2 border-dashed border-gray-100">
      <span className="text-5xl mb-4">{emoji}</span>
      <h3 className="text-lg font-bold text-gray-800 mb-1">{title}</h3>
      {subtitle && (
        <p className="text-sm font-medium text-gray-500 max-w-[240px] leading-relaxed mb-6">
          {subtitle}
        </p>
      )}
      {buttonText && onButtonClick && (
        <button
          onClick={onButtonClick}
          className="px-6 py-3 bg-[#22c55e] text-white font-black rounded-2xl shadow-lg shadow-green-100 transform active:scale-95 transition-all text-sm uppercase tracking-wider"
        >
          {buttonText}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
