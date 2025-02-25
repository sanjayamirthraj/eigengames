"use client";

import React from "react";

const HeroSection = () => {
  return (
    <div className="relative w-full overflow-hidden bg-white border border-slate-200 rounded-2xl p-8 mb-8 shadow-sm">
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-500/5 to-teal-500/5 z-0"></div>
      
      {/* Animated circles */}
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl animate-pulse-slow"></div>
      <div className="absolute -bottom-32 -left-20 w-80 h-80 bg-teal-500/5 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: "1s" }}></div>
      
      <div className="relative z-10 max-w-4xl">
        <h1 className="text-4xl font-bold mb-4 text-slate-800">
          Ethereum Parallel Execution Dashboard
        </h1>
        <p className="text-lg text-slate-600 mb-6 max-w-3xl">
          Visualize and optimize transaction batches for parallel execution on Ethereum. Increase block efficiency, maximize rewards, 
          and contribute to scaling the network through parallelization.
        </p>
      </div>
      
      {/* Parallelization explanation */}
      <div className="mt-8 pt-8 border-t border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
        <div>
          <h3 className="text-lg font-medium text-blue-700 mb-2">How Parallel Execution Works</h3>
          <p className="text-sm text-slate-700">
            A new Ethereum (EVM) client tries following the parallelization batches specified to execute certain transactions in a block in parallel. If there is an error in these block formations and a collision is encountered, the client has to execute everything sequentially and incurs a time penalty.
          </p>
        </div>
        
        <div>
          <h3 className="text-lg font-medium text-purple-700 mb-2">AVS Slashing Conditions</h3>
          <p className="text-sm text-slate-700">
            The AVS (Attestation Verification Service) with its slashing conditions ensures these block constitutions are actually valid by validating the transaction sequences and dependencies, preventing invalid parallelization attempts.
          </p>
        </div>
        
        <div>
          <h3 className="text-lg font-medium text-emerald-700 mb-2">Successful Parallel Execution</h3>
          <p className="text-sm text-slate-700">
            Parallel execution can only be successful if:
          </p>
          <ul className="text-sm text-slate-700 space-y-1 list-disc list-inside mt-2">
            <li>There's no time penalty due to incorrectly formed batches</li>
            <li>The batches are maximally parallelizable</li>
            <li>Transaction dependencies are properly analyzed</li>
            <li>Block proposers follow optimal parallelization strategies</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default HeroSection; 