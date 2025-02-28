"use client";

import React, { ReactNode } from "react";

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  return (
    <div className="min-h-screen bg-black">
      <header className="bg-zinc-900/80 backdrop-blur-md border-b border-zinc-800 fixed top-0 left-0 right-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 rounded-md bg-gradient-to-r from-purple-600 to-purple-800 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5l6.74-6.76z"></path>
                <line x1="16" y1="8" x2="2" y2="22"></line>
                <line x1="17.5" y1="15" x2="9" y2="15"></line>
              </svg>
            </div>
            <h1 className="text-xl font-bold text-white">Batch'd</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <a 
              href="/visualizations" 
              className="flex items-center space-x-2 text-sm font-medium text-zinc-300 hover:text-white bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 transition-all duration-200 px-3 py-1.5 rounded-md"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400">
                <path d="M3 3v18h18"></path>
                <path d="M18 17V9"></path>
                <path d="M13 17V5"></path>
                <path d="M8 17v-3"></path>
              </svg>
              <span>Visualizations</span>
            </a>
            <div className="text-sm text-zinc-400 hidden md:block">
              <span className="font-medium text-purple-400">Network:</span> Mainnet
            </div>
            <div className="flex items-center space-x-1 text-sm text-zinc-300 bg-zinc-800 px-3 py-1 rounded-full border border-zinc-700">
              <span className="w-2 h-2 rounded-full bg-purple-500"></span>
              <span>Connected</span>
            </div>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-6 mt-16">
        {children}
      </main>
      
      <footer className="bg-zinc-900 border-t border-zinc-800 py-4 mt-12 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-sm text-zinc-500 mb-4 md:mb-0">
              © 2025 Batch'd - Made at Eigen Games
            </div>
            <div className="flex space-x-6">
              <a href="https://github.com/sanjayamirthraj/eigengames/blob/main/README.md" className="text-sm text-zinc-400 hover:text-purple-400 transition-colors">Documentation</a>
              <a href="https://github.com/sanjayamirthraj/eigengames" className="text-sm text-zinc-400 hover:text-purple-400 transition-colors">GitHub</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default DashboardLayout; 