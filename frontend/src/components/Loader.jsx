import React from 'react';
import { Spinner } from './ui/spinner';

export default function Loader({ text = "Loading...", fullScreen = false }) {
  const containerClass = fullScreen 
    ? "fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#09090b]/80 backdrop-blur-md"
    : "absolute inset-0 z-40 flex flex-col items-center justify-center bg-[#09090b]/55 backdrop-blur-xs min-h-[300px]";

  return (
    <div className={`${containerClass} animate-fadeIn`}>
      <div className="flex flex-col items-center p-6 bg-[#0c0c0e]/95 border border-[#202024] rounded-2xl shadow-2xl max-w-[280px]">
        {/* Modern Spinning Ring */}
        <div className="relative w-12 h-12 flex items-center justify-center">
          <Spinner className="w-10 h-10 text-indigo-500" speed="normal" />
        </div>
        <p className="mt-4 text-xs font-semibold text-[#e4e4e7] animate-pulse tracking-wider text-center">
          {text}
        </p>
      </div>
    </div>
  );
}
