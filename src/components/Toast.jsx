import React, { useEffect } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

const Toast = ({ message, type = 'success', visible, onClose }) => {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [visible, onClose]);

  if (!visible) return null;

  const bgColors = {
    success: 'bg-[#22c55e]',
    error: 'bg-red-500',
    info: 'bg-blue-500',
  };

  const Icons = {
    success: CheckCircle,
    error: XCircle,
    info: Info,
  };

  const Icon = Icons[type] || Icons.success;

  return (
    <div className="fixed top-6 left-0 right-0 z-[100] flex justify-center pointer-events-none px-4">
      <div 
        className={`${bgColors[type]} text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 pointer-events-auto animate-in slide-in-from-top-full duration-300 min-w-[280px] max-w-sm`}
      >
        <Icon className="w-6 h-6 shrink-0" />
        <p className="flex-1 font-black text-sm">{message}</p>
        <button onClick={onClose} className="p-1 hover:bg-black/10 rounded-full transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default Toast;
