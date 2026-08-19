import React from 'react';
import { HelpCircle } from 'lucide-react';

export default function ConfirmDialog({ isOpen, title, message, onConfirm, onCancel }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-[#09090b]/85 border border-indigo-500/20 rounded-2xl max-w-md w-full p-6 shadow-[0_0_50px_rgba(99,102,241,0.18)] backdrop-blur-md space-y-5 animate-scaleUp">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 rounded-xl">
            <HelpCircle className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-white tracking-wide">{title || 'Confirm Action'}</h3>
        </div>
        
        <p className="text-xs text-[#a1a1aa] leading-relaxed pl-1">{message || 'Are you sure you want to proceed?'}</p>
        
        <div className="flex justify-end space-x-3 pt-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-[#2b2b32] hover:bg-white/5 text-[#a1a1aa] hover:text-white rounded-xl text-xs font-semibold transition-all cursor-pointer focus:outline-none hover:scale-[1.02] active:scale-[0.98]"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer focus:outline-none hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-indigo-600/30 hover:shadow-indigo-500/50"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
