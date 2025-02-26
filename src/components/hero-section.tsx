"use client";

import React from "react";
import { useBlockStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const HeroSection = () => {
  const { addNewBlock, startSimulation, stopSimulation, isSimulating } = useBlockStore();
  
  const handleSimulationToggle = () => {
    if (isSimulating) {
      stopSimulation();
    } else {
      startSimulation(5000); // 5 seconds interval
    }
  };
  
  return (
    <div className="relative w-full overflow-hidden bg-zinc-900 border border-zinc-800 rounded-2xl p-8 mb-8 shadow-sm">
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-purple-500/10 to-purple-900/10 z-0"></div>
      
      {/* Animated circles */}
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl animate-pulse-slow"></div>
      <div className="absolute -bottom-32 -left-20 w-80 h-80 bg-purple-800/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: "1s" }}></div>
      
      <div className="relative z-10 max-w-4xl">
        <h1 className="text-4xl font-bold mb-4 text-white">
          Ethereum Parallel Execution Dashboard
        </h1>
        <p className="text-lg text-zinc-300 mb-6 max-w-3xl">
          Visualize and optimize transaction batches for parallel execution on Ethereum. Increase block efficiency, maximize rewards, 
          and contribute to scaling the network through parallelization.
        </p>
      </div>
      
      {/* Parallelization explanation */}
      <div className="mt-8 pt-8 border-t border-zinc-800 grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
        <div>
          <h3 className="text-lg font-medium text-purple-400 mb-2">How Parallel Execution Works</h3>
          <p className="text-sm text-zinc-400">
            A new Ethereum (EVM) client tries following the parallelization batches specified to execute certain transactions in a block in parallel. If there is an error in these block formations and a collision is encountered, the client has to execute everything sequentially and incurs a time penalty.
          </p>
        </div>
        
        <div>
          <h3 className="text-lg font-medium text-purple-400 mb-2">AVS Slashing Conditions</h3>
          <p className="text-sm text-zinc-400">
            The AVS (Attestation Verification Service) with its slashing conditions ensures these block constitutions are actually valid by validating the transaction sequences and dependencies, preventing invalid parallelization attempts.
          </p>
        </div>
        
        <div>
          <h3 className="text-lg font-medium text-purple-400 mb-2">Successful Parallel Execution</h3>
          <p className="text-sm text-zinc-400">
            Parallel execution can only be successful if:
          </p>
          <ul className="text-sm text-zinc-400 space-y-1 list-disc list-inside mt-2">
            <li>There's no time penalty due to incorrectly formed batches</li>
            <li>The batches are maximally parallelizable</li>
            <li>Transaction dependencies are properly analyzed</li>
            <li>Block proposers follow optimal parallelization strategies</li>
          </ul>
        </div>
      </div>
      
      <div className="mt-8 pt-8 border-t border-zinc-800 grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
        <div>
          <Badge className="bg-zinc-900/80 border-zinc-700 text-zinc-300 mb-2">
            EigenLayer Visualization
          </Badge>
          <h3 className="text-lg font-medium text-purple-400 mb-2">Simulation Controls</h3>
          <div className="mt-8 flex flex-wrap gap-4">
            <Button 
              onClick={handleSimulationToggle}
              className={`${isSimulating ? 'bg-red-600 hover:bg-red-700' : 'bg-purple-600 hover:bg-purple-700'} text-white`}
            >
              {isSimulating ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                    <rect x="6" y="4" width="4" height="16" />
                    <rect x="14" y="4" width="4" height="16" />
                  </svg>
                  Stop Simulation
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  Start Simulation
                </>
              )}
            </Button>
            <Button 
              onClick={() => addNewBlock()}
              variant="outline"
              className="bg-transparent text-white border-white/20 hover:bg-white/10"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
              Add New Block
            </Button>
          </div>
        </div>
        <div className="bg-black/50 p-4 rounded-lg border border-white/10">
          <div className="text-center mb-2">
            <div className="text-xs text-zinc-500 uppercase">Simulation Status</div>
            <div className="flex items-center justify-center mt-1">
              {isSimulating && (
                <span className="relative flex h-2 w-2 mr-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
              )}
              <span className="text-sm font-medium text-white">
                {isSimulating ? 'Running' : 'Stopped'}
              </span>
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-zinc-500 uppercase">Update Interval</div>
            <ToggleGroup type="single" defaultValue="5" className="mt-1">
              <ToggleGroupItem 
                value="2" 
                onClick={() => {
                  if (isSimulating) {
                    stopSimulation();
                    startSimulation(2000);
                  }
                }}
                className="text-xs h-7"
              >
                2s
              </ToggleGroupItem>
              <ToggleGroupItem 
                value="5" 
                onClick={() => {
                  if (isSimulating) {
                    stopSimulation();
                    startSimulation(5000);
                  }
                }}
                className="text-xs h-7"
              >
                5s
              </ToggleGroupItem>
              <ToggleGroupItem 
                value="10" 
                onClick={() => {
                  if (isSimulating) {
                    stopSimulation();
                    startSimulation(10000);
                  }
                }}
                className="text-xs h-7"
              >
                10s
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection; 