import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

export default function AppLayout({ children, onNavigateToIssue, onNavigateToSpace, onCreateSpaceClick, onEditSpaceClick }) {
  return (
    <div className="flex h-screen bg-[#09090b] overflow-hidden text-[#f3f4f6] font-sans">
      <Sidebar 
        onCreateSpaceClick={onCreateSpaceClick}
        onEditSpaceClick={onEditSpaceClick}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          onNavigateToIssue={onNavigateToIssue}
          onNavigateToSpace={onNavigateToSpace}
        />
        <main className="flex-1 overflow-y-auto p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
