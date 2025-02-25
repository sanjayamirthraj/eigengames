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
      text: 'text-secondary-700',
      border: 'border-secondary-200',
      bg: 'bg-secondary-50'
    },
    teal: {
      text: 'text-teal-700',
      border: 'border-teal-200',
      bg: 'bg-teal-50'
    },
    purple: {
      text: 'text-primary-700',
      border: 'border-primary-200',
      bg: 'bg-primary-50'
    },
    amber: {
      text: 'text-warning-700',
      border: 'border-warning-200',
      bg: 'bg-warning-50'
    },
    emerald: {
      text: 'text-success-700',
      border: 'border-success-200',
      bg: 'bg-success-50'
    },
    slate: {
      text: 'text-neutral-700',
      border: 'border-neutral-200',
      bg: 'bg-neutral-50'
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
        <h2 className="text-2xl font-bold text-neutral-800">Transaction Parallelization Comparison</h2>
        {latestBlockId && (
          <Badge variant="outline" className="bg-primary-50 text-primary-700 border-primary-200">
            Block {latestBlockId}
          </Badge>
        )}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <Card className="bg-white border border-neutral-200 shadow-sm rounded-lg">
          <div className="p-4 border-b border-neutral-200 flex justify-between items-center">
            <h3 className="text-lg font-medium text-neutral-800">Recent Transactions</h3>
            <Badge variant="outline" className="bg-neutral-50 text-neutral-700 border-neutral-200">Sequential</Badge>
          </div>
          
          <ScrollArea className="h-[400px]">
            <div className="p-4 space-y-3">
              {currentTransactions.map((tx) => (
                <div 
                  key={tx.id}
                  className="p-3 rounded-lg border border-neutral-200 hover:border-neutral-300 bg-white hover:shadow-sm transition-all"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center">
                      <div className={`w-2 h-2 rounded-full ${tx.isParallelizable ? 'bg-success-500' : 'bg-warning-500'} mr-2`}></div>
                      <span className="text-xs font-mono text-neutral-500">{tx.id}</span>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${tx.isParallelizable 
                        ? 'bg-success-50 text-success-700 border-success-200' 
                        : 'bg-warning-50 text-warning-700 border-warning-200'}`}
                    >
                      {tx.isParallelizable ? 'Parallelizable' : 'Sequential'}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <div className="text-xs text-neutral-500">From</div>
                      <div className="font-mono text-xs text-neutral-700">{formatAddress(tx.from)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-neutral-500">To</div>
                      <div className="font-mono text-xs text-neutral-700">{formatAddress(tx.to)}</div>
                    </div>
                  </div>
                  
                  <div className="mt-2 flex justify-between text-xs text-neutral-500">
                    <span>{tx.value} ETH</span>
                    <span>{tx.gasUsed} gas</span>
                    <span>{formatTimestamp(tx.timestamp)}</span>
                  </div>
                </div>
              ))}
              
              {currentTransactions.length === 0 && (
                <div className="flex items-center justify-center h-32 text-neutral-500">
                  No transactions available
                </div>
              )}
            </div>
            <ScrollBar />
          </ScrollArea>
        </Card>
        
        {/* Batched Transactions */}
        <Card className="bg-white border border-neutral-200 shadow-sm rounded-lg">
          <div className="p-4 border-b border-neutral-200 flex justify-between items-center">
            <h3 className="text-lg font-medium text-neutral-800">Optimized Batches</h3>
            <Badge variant="outline" className="bg-success-50 text-success-700 border-success-200">Parallel</Badge>
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
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-500 mr-1">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12 6 12 12 16 14"/>
                          </svg>
                          <span className="text-xs text-neutral-600">{batch.executionTime}</span>
                        </div>
                        
                        <div className="flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-500 mr-1">
                            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
                          </svg>
                          <span className="text-xs text-neutral-600">{batch.gasEfficiency} saved</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className={cn("border rounded-lg p-3", colorClasses.border, colorClasses.bg)}>
                      <div className="text-xs text-neutral-600 mb-2">{batch.transactions.length} transactions</div>
                      
                      <div className="space-y-2">
                        {batch.transactions.slice(0, 2).map((tx) => (
                          <div key={tx.id} className="flex justify-between items-center p-2 bg-white rounded border border-neutral-200 text-xs">
                            <span className="font-mono">{formatAddress(tx.id)}</span>
                            <span>{tx.value} ETH</span>
                          </div>
                        ))}
                        
                        {batch.transactions.length > 2 && (
                          <div className="text-center text-xs text-neutral-500 py-1">
                            + {batch.transactions.length - 2} more transactions
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {batches.length === 0 && (
                <div className="flex items-center justify-center h-32 text-neutral-500">
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