"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface BlockTransaction {
  hash: string;
  value?: string;
}

interface Block {
  blockNumber: number;
  transactions: string[];
  totalFees: string;
  type: 'parallel' | 'sequential';
  parallelRatio?: number;
}

interface BlockDetailsProps {
  block: Block | null;
  onClose?: () => void;
}

const BlockDetails = ({ block, onClose }: BlockDetailsProps) => {
  if (!block) {
    return null;
  }

  // Format transaction hash for display
  const formatTxHash = (hash: string): string => {
    if (!hash || hash.length < 12) return hash;
    return `${hash.substring(0, 6)}...${hash.substring(hash.length - 4)}`;
  };

  // Calculate estimated gas usage based on transaction count
  const calculateGasUsage = (txCount: number): number => {
    return txCount * 70000; // Approximate gas per transaction
  };

  // Calculate estimated execution time
  const calculateExecutionTime = (txCount: number, isSequential: boolean): string => {
    const timeInSeconds = isSequential
      ? txCount * 0.05 // Sequential execution
      : Math.ceil(txCount / 3) * 0.05; // Parallel execution (assuming 3 txs in parallel)
    
    return timeInSeconds.toFixed(2);
  };

  // Calculate MEV opportunity
  const calculateMEV = (txCount: number): string => {
    return (txCount * 0.005).toFixed(3);
  };

  return (
    <Card className="w-full mt-6 border border-gray-200">
      <CardHeader className="bg-gray-50 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">
            Block #{block.blockNumber} Details
          </CardTitle>
          {onClose && (
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
              aria-label="Close details"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <Tabs defaultValue="overview">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-md">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Block Information</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Block Number</span>
                      <span className="text-sm font-medium">{block.blockNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Block Type</span>
                      <span 
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          block.type === 'sequential' 
                            ? "bg-amber-100 text-amber-800" 
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {block.type === 'sequential' ? 'Sequential' : 'Parallel'}
                      </span>
                    </div>
                    {block.type === 'parallel' && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Parallel Ratio</span>
                        <span className="text-sm font-medium">{block.parallelRatio || 100}%</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Total Transactions</span>
                      <span className="text-sm font-medium">{block.transactions.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Approximated Total Fees</span>
                      <span className="text-sm font-medium">{block.totalFees} ETH</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-md">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Execution Summary</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Execution Type</span>
                      <span className="text-sm font-medium">
                        {block.type === 'sequential' ? 'Sequential Only' : 'Parallel Optimized'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Estimated Time</span>
                      <span className="text-sm font-medium">
                        {calculateExecutionTime(block.transactions.length, block.type === 'sequential')} seconds
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Gas Usage</span>
                      <span className="text-sm font-medium" suppressHydrationWarning={true}>
                        {calculateGasUsage(block.transactions.length).toLocaleString()} gas
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-md">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Economic Metrics</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Approximated Total Fees</span>
                      <span className="text-sm font-medium">{block.totalFees} ETH</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">MEV Opportunity</span>
                      <span className="text-sm font-medium">{calculateMEV(block.transactions.length)} ETH</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Avg Fee Per Tx</span>
                      <span className="text-sm font-medium">
                        {block.transactions.length > 0 
                          ? (parseFloat(block.totalFees) / block.transactions.length).toFixed(5) 
                          : "0.00000"} ETH
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-md">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Parallelization Benefits</h3>
                  {block.type === 'parallel' ? (
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Time Saved</span>
                        <span className="text-sm font-medium">
                          {(
                            parseFloat(calculateExecutionTime(block.transactions.length, true)) - 
                            parseFloat(calculateExecutionTime(block.transactions.length, false))
                          ).toFixed(2)} seconds
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Efficiency Gain</span>
                        <span className="text-sm font-medium">
                          {Math.round(
                            (parseFloat(calculateExecutionTime(block.transactions.length, true)) / 
                            parseFloat(calculateExecutionTime(block.transactions.length, false))) * 100 - 100
                          )}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Parallel Ratio</span>
                        <span className="text-sm font-medium">{block.parallelRatio || 100}%</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 italic">
                      This block is sequential and does not benefit from parallelization.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="transactions">
            <div className="bg-gray-50 p-4 rounded-md">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Transaction List</h3>
              <div className="max-h-80 overflow-y-auto">
                <div className="space-y-2">
                  {block.transactions.map((txHash, idx) => (
                    <div 
                      key={idx} 
                      className="flex justify-between items-center p-2 bg-white rounded-md shadow-sm"
                    >
                      <div className="flex items-center">
                        <div 
                          className={`w-2 h-2 rounded-full mr-2 ${
                            block.type === 'sequential' ? 'bg-amber-500' : 'bg-blue-500'
                          }`}
                        ></div>
                        <span className="text-sm">Tx #{idx+1}</span>
                      </div>
                      <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded">
                        {formatTxHash(txHash)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="metrics">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 p-4 rounded-md">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Performance Metrics</h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-500">Gas Usage</span>
                      <span className="text-sm font-medium" suppressHydrationWarning={true}>
                        {calculateGasUsage(block.transactions.length).toLocaleString()} gas
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${Math.min(100, block.transactions.length / 10 * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-500">Execution Time</span>
                      <span className="text-sm font-medium">
                        {calculateExecutionTime(block.transactions.length, block.type === 'sequential')} seconds
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${block.type === 'sequential' ? 'bg-amber-500' : 'bg-green-500'}`}
                        style={{ 
                          width: `${Math.min(100, parseFloat(calculateExecutionTime(block.transactions.length, block.type === 'sequential')) / 0.5 * 100)}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                  
                  {block.type === 'parallel' && (
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm text-gray-500">Parallelization Efficiency</span>
                        <span className="text-sm font-medium">{block.parallelRatio || 100}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-purple-500 h-2 rounded-full" 
                          style={{ width: `${block.parallelRatio || 100}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-md">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Economic Metrics</h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-500">Approximated Total Fees</span>
                      <span className="text-sm font-medium">{block.totalFees} ETH</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full" 
                        style={{ width: `${Math.min(100, parseFloat(block.totalFees) / 0.5 * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-500">MEV Opportunity</span>
                      <span className="text-sm font-medium">{calculateMEV(block.transactions.length)} ETH</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-purple-500 h-2 rounded-full" 
                        style={{ 
                          width: `${Math.min(100, parseFloat(calculateMEV(block.transactions.length)) / 0.25 * 100)}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-500">Transaction Count</span>
                      <span className="text-sm font-medium">{block.transactions.length}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full" 
                        style={{ width: `${Math.min(100, block.transactions.length / 25 * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-6 bg-gray-50 p-4 rounded-md">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Block JSON Data</h3>
              <pre className="bg-gray-100 p-3 rounded-md text-xs overflow-x-auto">
                {JSON.stringify({
                  blockNumber: block.blockNumber,
                  type: block.type,
                  parallelRatio: block.parallelRatio || 100,
                  transactionCount: block.transactions.length,
                  totalFees: block.totalFees + " ETH",
                  estimatedGasUsage: calculateGasUsage(block.transactions.length).toLocaleString() + " gas",
                  estimatedExecutionTime: calculateExecutionTime(block.transactions.length, block.type === 'sequential') + " seconds",
                  mevOpportunity: calculateMEV(block.transactions.length) + " ETH",
                  transactionSample: block.transactions.slice(0, 3).map(formatTxHash)
                }, null, 2)}
              </pre>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default BlockDetails; 