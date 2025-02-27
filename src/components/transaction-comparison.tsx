"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useBlockStore } from "@/lib/store";
import { Transaction, BatchedTransaction } from "@/types/transaction";

// Generate batched transactions from a list of transactions
const generateBatchesFromTransactions = (transactions: Transaction[]): BatchedTransaction[] => {
  const colors = ["blue", "teal", "purple", "amber", "emerald"] as const;
  const batches: BatchedTransaction[] = [];
  let remainingTxs = [...transactions];
  
  // Create 3-5 batches
  const batchCount = Math.floor(Math.random() * 3) + 3;
  
  for (let i = 0; i < batchCount && remainingTxs.length > 0; i++) {
    // Take a random number of transactions for this batch
    const batchSize = Math.min(
      Math.floor(Math.random() * 5) + 2,
      remainingTxs.length
    );
    
    const batchTxs = remainingTxs.slice(0, batchSize).filter(tx => tx.isParallelizable);
    remainingTxs = remainingTxs.slice(batchSize);
    
    if (batchTxs.length > 0) {
      batches.push({
        batchId: `Batch #${i + 1}`,
        transactions: batchTxs,
        executionTime: `${(Math.random() * 0.5 + 0.1).toFixed(2)}s`,
        gasEfficiency: `${Math.floor(Math.random() * 30 + 20)}%`,
        color: colors[i % colors.length]
      });
    }
  }
  
  // Add remaining non-parallelizable transactions as a sequential batch
  const sequentialTxs = remainingTxs.filter(tx => !tx.isParallelizable);
  if (sequentialTxs.length > 0) {
    batches.push({
      batchId: "Sequential",
      transactions: sequentialTxs,
      executionTime: `${(Math.random() * 1 + 0.5).toFixed(2)}s`,
      gasEfficiency: "0%",
      color: "slate"
    });
  }
  
  return batches;
};

// Helper function to get color classes based on batch color
const getBatchColorClasses = (color: BatchedTransaction['color']) => {
  const colorMap = {
    blue: {
      text: 'text-purple-400',
      border: 'border-zinc-700',
      bg: 'bg-zinc-800'
    },
    teal: {
      text: 'text-purple-300',
      border: 'border-zinc-700',
      bg: 'bg-zinc-800'
    },
    purple: {
      text: 'text-purple-400',
      border: 'border-purple-800',
      bg: 'bg-purple-900/20'
    },
    amber: {
      text: 'text-purple-300',
      border: 'border-zinc-700',
      bg: 'bg-zinc-800'
    },
    emerald: {
      text: 'text-purple-400',
      border: 'border-zinc-700',
      bg: 'bg-zinc-800'
    },
    slate: {
      text: 'text-zinc-400',
      border: 'border-zinc-700',
      bg: 'bg-zinc-900'
    }
  };
  
  return colorMap[color];
};

const TransactionComparison = () => {
  const { currentTransactions, blocks } = useBlockStore();
  const [batches, setBatches] = useState<BatchedTransaction[]>([]);
  const [latestBlockId, setLatestBlockId] = useState<string | null>(null);
  
  // Update batches when transactions change
  useEffect(() => {
    if (currentTransactions.length > 0) {
      setBatches(generateBatchesFromTransactions(currentTransactions));
      
      // Update latest block ID if available
      if (blocks.length > 0) {
        setLatestBlockId(blocks[0].id);
      }
    }
  }, [currentTransactions, blocks]);
  
  // Format address for display
  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };
  
  // Format timestamp for display
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffSeconds < 60) {
      return `${diffSeconds}s ago`;
    } else if (diffSeconds < 3600) {
      return `${Math.floor(diffSeconds / 60)}m ago`;
    } else {
      return `${Math.floor(diffSeconds / 3600)}h ago`;
    }
  };
  
  return (
    <div className="space-y-6 mt-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Transaction Parallelization Comparison</h2>
        {latestBlockId && (
          <Badge variant="outline" className="bg-purple-900/20 text-purple-400 border-purple-800">
            Block {latestBlockId}
          </Badge>
        )}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <Card className="bg-zinc-900 border border-zinc-800 shadow-sm rounded-lg">
          <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
            <h3 className="text-lg font-medium text-white">Recent Transactions</h3>
            <Badge variant="outline" className="bg-zinc-800 text-zinc-400 border-zinc-700">Sequential</Badge>
          </div>
          
          <ScrollArea className="h-[400px]">
            <div className="p-4 space-y-3">
              {currentTransactions.map((tx) => (
                <div 
                  key={tx.id}
                  className="p-3 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-900 hover:shadow-sm transition-all"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center">
                      <div className={`w-2 h-2 rounded-full ${tx.isParallelizable ? 'bg-purple-500' : 'bg-zinc-500'} mr-2`}></div>
                      <span className="text-xs font-mono text-zinc-400">{tx.id}</span>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${tx.isParallelizable 
                        ? 'bg-purple-900/20 text-purple-400 border-purple-800' 
                        : 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}
                    >
                      {tx.isParallelizable ? 'Parallelizable' : 'Sequential'}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <div className="text-xs text-zinc-500">From</div>
                      <div className="font-mono text-xs text-zinc-300">{formatAddress(tx.from)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-zinc-500">To</div>
                      <div className="font-mono text-xs text-zinc-300">{formatAddress(tx.to)}</div>
                    </div>
                  </div>
                  
                  <div className="mt-2 flex justify-between text-xs text-zinc-500">
                    <span>{tx.value} ETH</span>
                    <span>{tx.gasUsed} gas</span>
                    <span suppressHydrationWarning={true}>{formatTimestamp(tx.timestamp)}</span>
                  </div>
                </div>
              ))}
              
              {currentTransactions.length === 0 && (
                <div className="flex items-center justify-center h-32 text-zinc-500">
                  No transactions available
                </div>
              )}
            </div>
            <ScrollBar />
          </ScrollArea>
        </Card>
        
        {/* Batched Transactions */}
        <Card className="bg-zinc-900 border border-zinc-800 shadow-sm rounded-lg">
          <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
            <h3 className="text-lg font-medium text-white">Optimized Batches</h3>
            <Badge variant="outline" className="bg-purple-900/20 text-purple-400 border-purple-800">Parallel</Badge>
          </div>
          
          <ScrollArea className="h-[400px]">
            <div className="p-4 space-y-4">
              {batches.map((batch) => {
                const colorClasses = getBatchColorClasses(batch.color);
                
                return (
                  <div key={batch.batchId} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <h4 className={cn("text-sm font-medium", colorClasses.text)}>{batch.batchId}</h4>
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500 mr-1">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12 6 12 12 16 14"/>
                          </svg>
                          <span className="text-xs text-zinc-400">{batch.executionTime}</span>
                        </div>
                        
                        <div className="flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500 mr-1">
                            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
                          </svg>
                          <span className="text-xs text-zinc-400">{batch.gasEfficiency} saved</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className={cn("border rounded-lg p-3", colorClasses.border, colorClasses.bg)}>
                      <div className="text-xs text-zinc-400 mb-2">{batch.transactions.length} transactions</div>
                      
                      <div className="space-y-2">
                        {batch.transactions.slice(0, 2).map((tx) => (
                          <div key={tx.id} className="flex justify-between items-center p-2 bg-zinc-900 rounded border border-zinc-800 text-xs">
                            <span className="font-mono text-zinc-300">{formatAddress(tx.id)}</span>
                            <span className="text-zinc-300">{tx.value} ETH</span>
                          </div>
                        ))}
                        
                        {batch.transactions.length > 2 && (
                          <div className="text-center text-xs text-zinc-500 py-1">
                            + {batch.transactions.length - 2} more transactions
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {batches.length === 0 && (
                <div className="flex items-center justify-center h-32 text-zinc-500">
                  No batches available
                </div>
              )}
            </div>
            <ScrollBar />
          </ScrollArea>
        </Card>
      </div>
      
      <div className="flex justify-center">
        <div className="text-sm text-neutral-500 bg-neutral-50 px-4 py-2 rounded-md border border-neutral-200">
          Transactions are automatically batched for optimal parallel execution
        </div>
      </div>
    </div>
  );
};

export default TransactionComparison; 