"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface BlockBatch {
  id: string;
  transactions: number;
  totalFees: string;
  expectedMEV: string;
  isSequential: boolean;
  sequentialCount?: number;
}

interface ParallelBlockProps {
  blocks: BlockBatch[];
}

const BlockParallelization = ({ blocks }: ParallelBlockProps) => {
  const [selectedBlockIndex, setSelectedBlockIndex] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  
  // Calculate number of parallelizable vs sequential transactions
  const getParallelizableTxCount = (block: BlockBatch) => {
    if (block.isSequential) return 0;
    return block.transactions - (block.sequentialCount || 0);
  };
  
  const getSequentialTxCount = (block: BlockBatch) => {
    if (block.isSequential) return block.transactions;
    return block.sequentialCount || 0;
  };
  
  const handleRefresh = () => {
    // Simulating refresh action
    console.log("Refreshing block data...");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-black">Most Optimal Parallelizable Block Options</h2>
        <Button 
          variant="outline"
          onClick={handleRefresh}
          aria-label="Refresh block options"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
            <path d="M21 2v6h-6"></path>
            <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
            <path d="M3 22v-6h6"></path>
            <path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
          </svg>
          Refresh
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {blocks.map((block, index) => (
          <div 
            key={block.id}
            className={`bg-zinc-900 border border-zinc-800 p-6 rounded-xl transition-all ${
              selectedBlockIndex === index ? "shadow-lg border-purple-600" : ""
            }`}
            onClick={() => setSelectedBlockIndex(index)}
          >
            {/* Visual representation of block structure */}
            <div className="border border-zinc-800 rounded-lg p-4 mb-4 bg-black">
              {/* Parallelizable batches */}
              {!block.isSequential && (
                <>
                  <div className="border border-purple-800 rounded-md p-3 bg-purple-950/20 mb-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-purple-400">Parallelizable batch #1</span>
                      <span className="text-xs text-zinc-400">
                        {Math.floor(getParallelizableTxCount(block) / 2)} transactions
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-center text-zinc-500 text-xs my-1">⋮</div>
                  
                  <div className="border border-purple-800 rounded-md p-3 bg-purple-950/20 mb-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-purple-400">Parallelizable batch #n</span>
                      <span className="text-xs text-zinc-400">
                        {Math.ceil(getParallelizableTxCount(block) / 2)} transactions
                      </span>
                    </div>
                  </div>
                </>
              )}
              
              {/* Sequential section - always present */}
              <div 
                className={`border rounded-md p-3 ${
                  block.isSequential 
                    ? "border-zinc-700 bg-zinc-800" 
                    : "border-zinc-800 bg-zinc-900"
                }`}
              >
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-zinc-300">Sequential</span>
                  <span className="text-xs text-zinc-400">
                    {getSequentialTxCount(block)} transactions
                  </span>
                </div>
              </div>
              
              {/* Clickable arrow for details */}
              {showDetails && selectedBlockIndex === index && (
                <div className="mt-4 bg-zinc-900 border border-zinc-800 p-3 rounded-md">
                  <div className="text-xs text-zinc-400 mb-2">Transaction Details:</div>
                  <div className="space-y-1">
                    {Array.from({ length: Math.min(3, block.transactions) }).map((_, i) => (
                      <div key={i} className="flex justify-between">
                        <span className="text-xs text-zinc-300">Transaction #{i+1}</span>
                        <span className="text-xs font-mono text-zinc-300">0.00{Math.floor(Math.random() * 9) + 1} ETH</span>
                      </div>
                    ))}
                    {block.transactions > 3 && (
                      <div className="text-center text-xs text-zinc-500">
                        + {block.transactions - 3} more transactions
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* Block metrics */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <div className="text-xs text-zinc-500">Expected MEV</div>
                <div className="text-lg font-medium text-white">{block.expectedMEV} ETH</div>
              </div>
              <div>
                <div className="text-xs text-zinc-500">Total Fees</div>
                <div className="text-lg font-medium text-white">{block.totalFees} ETH</div>
              </div>
            </div>
            
            {/* Public good reward */}
            <div className="flex items-center gap-2">
              <div className="text-sm text-zinc-400">Public good reward amount:</div>
              <div className="text-sm font-medium text-purple-400">X</div>
            </div>
            
            {/* Show/hide details button */}
            <div className="mt-4 flex justify-end">
              <Button 
                variant="outline"
                className="text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  if (selectedBlockIndex === index) {
                    setShowDetails(!showDetails);
                  } else {
                    setSelectedBlockIndex(index);
                    setShowDetails(true);
                  }
                }}
                aria-label={`${showDetails && selectedBlockIndex === index ? "Hide" : "Show"} transaction details`}
              >
                {showDetails && selectedBlockIndex === index ? "Hide Details" : "Show Details"}
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1">
                  <polyline points="15 10 20 15 15 20"></polyline>
                  <path d="M4 4v7a4 4 0 0 0 4 4h12"></path>
                </svg>
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl mt-8">
        <h3 className="text-lg font-medium text-purple-400 mb-4">
          Block Formation Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
            <div className="text-sm font-medium mb-2 text-purple-400">The Block Formations Are Based On:</div>
            <ul className="list-disc list-inside text-sm text-zinc-300 space-y-2">
              <li>i) Maximal parallelizability</li>
              <li>ii) Transaction fee rewards</li>
              <li>iii) MEV opportunities</li>
            </ul>
          </div>
          
          <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
            <div className="text-sm font-medium mb-2 text-purple-400">AVS Slashing Conditions:</div>
            <p className="text-sm text-zinc-300">
              The AVS ensures these block constititions are actually valid by 
              validating the transaction sequences and dependencies.
            </p>
          </div>
          
          <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
            <div className="text-sm font-medium mb-2 text-purple-400">Parallel Execution Benefits:</div>
            <p className="text-sm text-zinc-300">
              Parallel execution is successful when there's no time penalty due to 
              incorrectly formed batches, and batches are maximally parallelizable.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Default props for development
BlockParallelization.defaultProps = {
  blocks: [
    {
      id: "#1",
      transactions: 12,
      totalFees: "0.234",
      expectedMEV: "0.123",
      isSequential: false,
      sequentialCount: 2
    },
    {
      id: "#2",
      transactions: 8,
      totalFees: "0.198",
      expectedMEV: "0.087",
      isSequential: false,
      sequentialCount: 1
    }
  ]
};

export default BlockParallelization; 