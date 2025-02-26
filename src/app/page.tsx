"use client";

import { useEffect } from "react";
import DashboardLayout from "@/components/dashboard-layout";
import HeroSection from "@/components/hero-section";
import BlockStreamVisualization from "@/components/block-stream-visualization";
import TransactionComparison from "@/components/transaction-comparison";
import EthereumTransactionBatching from "@/components/visualization";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBlockStore } from "@/lib/store";

export default function Home() {
  const { addNewBlock } = useBlockStore();
  
  // Add a new block when the page loads to ensure fresh data
  useEffect(() => {
    // Add a small delay to ensure the store is initialized
    const timer = setTimeout(() => {
      addNewBlock();
    }, 500);
    
    return () => clearTimeout(timer);
  }, [addNewBlock]);
  
  return (
    <DashboardLayout>
      {/* Block Stream Visualization - Moved to top */}
      <div className="mb-8">
        <BlockStreamVisualization />
      </div>
      
      {/* Transaction Comparison - Moved to second position */}
      <div className="mb-8">
        <TransactionComparison />
      </div>
      
      {/* Hero Section - Moved down */}
      <div className="mb-8">
        <HeroSection />
      </div>
      
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-zinc-900 border border-zinc-800 shadow-sm hover:shadow-md transition-all rounded-lg">
          <CardHeader>
            <CardTitle className="text-lg text-white">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-md bg-zinc-800/50">
                  <div className="w-10 h-10 rounded-full bg-purple-900/30 flex items-center justify-center text-purple-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Block #{12345678 + i} processed</p>
                    <p className="text-xs text-zinc-400">24 transactions · {i + 1} min ago</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-zinc-900 border border-zinc-800 shadow-sm hover:shadow-md transition-all rounded-lg md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg text-white">Execution Stats Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-md bg-zinc-800/50 border border-zinc-700">
                  <p className="text-sm text-zinc-400">Last 24 Hours</p>
                  <div className="mt-1 flex items-end justify-between">
                    <p className="text-2xl font-bold text-purple-400">89.3%</p>
                    <p className="text-sm text-purple-400 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                        <path d="m5 12 7-7 7 7"/>
                        <path d="M12 19V5"/>
                      </svg>
                      +3.2%
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">Parallelization Rate</p>
                </div>
                
                <div className="p-4 rounded-md bg-zinc-800/50 border border-zinc-700">
                  <p className="text-sm text-zinc-400">Average Savings</p>
                  <div className="mt-1 flex items-end justify-between">
                    <p className="text-2xl font-bold text-purple-400">42.8%</p>
                    <p className="text-sm text-purple-400 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                        <path d="m5 12 7-7 7 7"/>
                        <path d="M12 19V5"/>
                      </svg>
                      +1.7%
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">Gas Efficiency</p>
                </div>
              </div>
              
              <div className="flex flex-col gap-2">
                <div className="flex justify-between">
                  <span className="text-sm text-zinc-400">Total Tx Processed</span>
                  <span className="text-sm font-medium text-white">3.2M+</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-zinc-400">Public Good Rewards Distributed</span>
                  <span className="text-sm font-medium text-white">125.4 ETH</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-zinc-400">Active Validators</span>
                  <span className="text-sm font-medium text-white">245</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Ethereum Transaction Batching Visualization - Added to bottom */}
      <div className="mt-8">
        <h2 className="text-white text-xl font-semibold mb-4">Transaction Batching Visualization</h2>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl overflow-hidden">
          <EthereumTransactionBatching />
        </div>
      </div>
    </DashboardLayout>
  );
}
