import React from 'react';

export default function ConfirmDialog({ isOpen, title, message, onConfirm, onCancel }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0d0d0f] border border-[#202024] rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-scaleUp">
        <h3 className="text-base font-bold text-white">{title || 'Confirm Action'}</h3>
        <p className="text-xs text-[#a1a1aa] leading-relaxed">{message || 'Are you sure you want to proceed?'}</p>
        <div className="flex justify-end space-x-3 pt-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-[#2b2b32] hover:bg-[#1c1c1f] text-[#a1a1aa] hover:text-white rounded-lg text-xs font-bold transition-all cursor-pointer focus:outline-none"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer focus:outline-none shadow-lg shadow-indigo-600/10"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
