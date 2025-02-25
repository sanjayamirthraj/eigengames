"use client";

import React, { ReactNode } from "react";

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 rounded-md bg-gradient-to-r from-primary-600 to-secondary-600 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5l6.74-6.76z"></path>
                <line x1="16" y1="8" x2="2" y2="22"></line>
                <line x1="17.5" y1="15" x2="9" y2="15"></line>
              </svg>
            </div>
            <h1 className="text-xl font-bold text-neutral-900">Ethereum Parallel Execution</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-sm text-neutral-600 hidden md:block">
              <span className="font-medium text-primary-600">Network:</span> Mainnet
            </div>
            <div className="flex items-center space-x-1 text-sm text-neutral-600 bg-success-50 px-3 py-1 rounded-full border border-success-200">
              <span className="w-2 h-2 rounded-full bg-success-500"></span>
              <span>Connected</span>
            </div>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
      
      {/* Footer */}
      <footer className="bg-white border-t border-neutral-200 py-4 mt-12 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-sm text-neutral-500 mb-4 md:mb-0">
              © 2023 Ethereum Parallel Execution Dashboard
            </div>
            <div className="flex space-x-6">
              <a href="#" className="text-sm text-neutral-600 hover:text-primary-600 transition-colors">Documentation</a>
              <a href="#" className="text-sm text-neutral-600 hover:text-primary-600 transition-colors">GitHub</a>
              <a href="#" className="text-sm text-neutral-600 hover:text-primary-600 transition-colors">Support</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default DashboardLayout; 