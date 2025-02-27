"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

// Define interfaces based on the API response format
interface BlockTransaction {
  hash: string;
  value?: string; // Transaction value in ETH (if available)
}

interface Block {
  blockNumber: number;
  type: 'parallel' | 'sequential';
  transactions: string[]; // Array of transaction hashes
  totalFees: string; // Calculated from transactions
  groupId?: number;
}

interface BlockParallelizationProps {
  initialBlocks?: Block[];
  autoRefresh?: boolean;
  refreshInterval?: number;
}

const BlockParallelization = ({
  initialBlocks = [],
  autoRefresh = false,
  refreshInterval = 5000
}: BlockParallelizationProps) => {
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
  const [selectedBlockIndex, setSelectedBlockIndex] = useState<number | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(autoRefresh);
  const [refreshTimer, setRefreshTimer] = useState<NodeJS.Timeout | null>(null);
  
  // Format transaction hash for display
  const formatTxHash = (hash: string): string => {
    if (!hash || hash.length < 12) return hash;
    return `${hash.substring(0, 6)}...${hash.substring(hash.length - 4)}`;
  };
  
  // Calculate total transactions in a block
  const getTotalTransactions = (block: Block): number => {
    return block.transactions.length;
  };
  
  // Calculate estimated ETH value based on transaction count
  const calculateETHValue = (txCount: number, multiplier: number = 0.01): string => {
    return (txCount * multiplier).toFixed(3);
  };

  // Process blocks from API response
  const processApiBlocks = (apiData: any): Block[] => {
    if (!apiData || !apiData.blocks) return [];
    
    return apiData.blocks.map((block: any, index: number) => {
      const txCount = block.transactions.length;
      // Generate deterministic values based on transaction count
      const totalFees = calculateETHValue(txCount, 0.01);
      
      return {
        blockNumber: index + 1,
        type: block.type === 'sequential' ? 'sequential' : 'parallel',
        transactions: block.transactions,
        totalFees,
        groupId: block.groupId
      };
    });
  };
  
  // Fetch blocks from API
  const fetchBlocks = async () => {
    setLoading(true);
    
    try {
      // For testing purposes, we're using mock data
      // In production, you'd fetch from an actual API endpoint
      // const response = await fetch("/api/blocks");
      // const data = await response.json();
      
      // Mock API response using the structure from exampledata.json
      const mockApiResponse = {
        blocks: [
          {
            type: "parallelizable",
            groupId: 1,
            transactions: [
              "0x2946018d361c6825c64c35c1421f3d80b16c3262dd01234a65dbf6bdb4422121",
              "0xd62efd7ad1ff8a3e844a5d4498eb8e2d5d4e20f9b1cef7285b4d48c4976e8a39",
              "0xcb51130118008f69ec4bd42dcc2fada3b1e7fcef79b9e3faca1eee722e4b34a6",
              "0x0a885e8a3a5cb03e0540e7ef65734c46189f17a65596009570a227d3abb6d466",
              "0x23b771f247803397fb47f9effdd772af79d761813513d14344b5f03e2e387997"
            ]
          },
          {
            type: "parallelizable",
            groupId: 2,
            transactions: [
              "0xbddc3393194d87c8f0a84e9ada7fef1169eb4bca343e5312f8dd03be74a1fc04",
              "0x844e54dbd51c8422c80f43ce30ddf3c99de9101c3bc46ccc610445e680adf6ff"
            ]
          },
          {
            type: "sequential",
            groupId: 3,
            transactions: [
              "0x9e7f101a3083152e768894c3a4269925c9949cb7b8df612494e2df5f28607cdc",
              "0x63230589a812996a26c542dd4f6aabd6635bd9af94793fd500d23ecc8d05437d"
            ]
          }
        ]
      };
      
      const newBlocks = processApiBlocks(mockApiResponse);
      setBlocks(newBlocks);
      setLastUpdated(new Date());
      
      // Store blocks in local storage
      localStorage.setItem('blockData', JSON.stringify(newBlocks));
      
    } catch (error) {
      console.error("Error fetching blocks:", error);
    } finally {
      setLoading(false);
    }
  };
  
  // Load blocks from local storage on component mount
  useEffect(() => {
    const storedBlocks = localStorage.getItem('blockData');
    if (storedBlocks) {
      try {
        const parsedBlocks = JSON.parse(storedBlocks);
        setBlocks(parsedBlocks);
      } catch (e) {
        console.error("Error parsing stored blocks:", e);
      }
    }
    
    // Initial fetch
    fetchBlocks();
    
    // Setup auto-refresh if enabled
    if (autoRefresh) {
      const timer = setInterval(fetchBlocks, refreshInterval);
      setRefreshTimer(timer);
    }
    
    // Cleanup
    return () => {
      if (refreshTimer) {
        clearInterval(refreshTimer);
      }
    };
  }, [autoRefresh, refreshInterval]);
  
  // Toggle auto-refresh
  const handleAutoRefreshToggle = () => {
    if (isAutoRefreshing) {
      // Stop auto-refresh
      if (refreshTimer) {
        clearInterval(refreshTimer);
        setRefreshTimer(null);
      }
    } else {
      // Start auto-refresh
      const timer = setInterval(fetchBlocks, refreshInterval);
      setRefreshTimer(timer);
      fetchBlocks(); // Fetch immediately when turning on
    }
    
    setIsAutoRefreshing(!isAutoRefreshing);
  };
  
  // Handle block selection
  const handleBlockSelect = (index: number) => {
    if (selectedBlockIndex === index) {
      setShowDetails(!showDetails);
    } else {
      setSelectedBlockIndex(index);
      setShowDetails(true);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-black">Block Stream</h2>
        <div className="flex items-center gap-4">
          <p className="text-sm text-gray-500">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
          <Button 
            variant={isAutoRefreshing ? "default" : "outline"}
            onClick={handleAutoRefreshToggle}
            className={isAutoRefreshing ? "bg-green-600 hover:bg-green-700 text-white" : ""}
            aria-label={isAutoRefreshing ? "Stop auto-refresh" : "Start auto-refresh"}
          >
            {isAutoRefreshing ? (
              <>
                <span className="mr-2 h-2 w-2 rounded-full bg-green-200 animate-pulse"></span>
                Live Updates
              </>
            ) : (
              "Live Updates"
            )}
          </Button>
          <Button 
            variant="outline"
            onClick={fetchBlocks}
            disabled={loading}
            aria-label="Refresh block data"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                  <path d="M21 2v6h-6"></path>
                  <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
                  <path d="M3 22v-6h6"></path>
                  <path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
                </svg>
                Refresh
              </>
            )}
          </Button>
        </div>
      </div>
      
      {/* Centered blocks grid */}
      <div className="flex justify-center">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-6xl">
          {blocks.map((block, index) => (
            <Card 
              key={`block-${block.blockNumber}`}
              className={`w-full cursor-pointer transition-all duration-200 border-2 overflow-hidden ${
                selectedBlockIndex === index 
                  ? "border-purple-600 shadow-lg shadow-purple-100" 
                  : "border-gray-200 hover:border-purple-300 hover:shadow-md"
              }`}
              onClick={() => handleBlockSelect(index)}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  handleBlockSelect(index);
                }
              }}
              aria-label={`Block #${block.blockNumber}`}
            >
              {/* Block header with number */}
              <div className={`p-4 ${
                index === 0 ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white" : "bg-gray-100"
              }`}>
                <div className="flex justify-between items-center">
                  <h3 className={`font-bold ${index === 0 ? "text-white" : "text-gray-800"}`}>
                    Block #{block.blockNumber}
                  </h3>
                  {index === 0 && (
                    <span className="text-xs bg-white text-purple-700 px-2 py-0.5 rounded-full font-medium">
                      Latest
                    </span>
                  )}
                </div>
              </div>
              
              {/* Block content */}
              <div className="p-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Transactions</span>
                    <span className="text-sm font-medium">{getTotalTransactions(block)}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Approximated Total Fees</span>
                    <span className="text-sm font-medium">{block.totalFees} ETH</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Type</span>
                    <span 
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        block.type === 'sequential' 
                          ? "bg-amber-100 text-amber-800" 
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {block.type === 'sequential' ? 'Sequential' : 'Parallel'}
                    </span>
                  </div>
                  
                  {block.type === 'parallel' && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Parallel Ratio</span>
                      <span className="text-sm font-medium">100%</span>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
      
      {/* Block details panel - shows when a block is selected */}
      {selectedBlockIndex !== null && showDetails && (
        <Card className="mt-6 border border-gray-200">
          <div className="p-6">
            <h3 className="text-xl font-bold mb-4">
              Block #{blocks[selectedBlockIndex].blockNumber} Details
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Block Information</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Block Type</span>
                    <span className="text-sm font-medium">
                      {blocks[selectedBlockIndex].type === 'sequential' ? 'Sequential' : 'Parallel'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Group ID</span>
                    <span className="text-sm font-medium">{blocks[selectedBlockIndex].groupId || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Total Transactions</span>
                    <span className="text-sm font-medium">{getTotalTransactions(blocks[selectedBlockIndex])}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Approximated Total Fees</span>
                    <span className="text-sm font-medium">{blocks[selectedBlockIndex].totalFees} ETH</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Execution Metrics</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Expected Gas Usage</span>
                    <span className="text-sm font-medium">
                      {getTotalTransactions(blocks[selectedBlockIndex]) * 70000} gas
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Estimated Execution Time</span>
                    <span className="text-sm font-medium">
                      {blocks[selectedBlockIndex].type === 'sequential'
                        ? (getTotalTransactions(blocks[selectedBlockIndex]) * 0.05).toFixed(2)
                        : (Math.ceil(getTotalTransactions(blocks[selectedBlockIndex]) / 3) * 0.05).toFixed(2)
                      } seconds
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">MEV Opportunity</span>
                    <span className="text-sm font-medium">
                      {calculateETHValue(getTotalTransactions(blocks[selectedBlockIndex]), 0.005)} ETH
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">Transactions</h4>
              <div className="bg-gray-50 rounded-md p-4 max-h-60 overflow-y-auto">
                <div className="space-y-2">
                  {blocks[selectedBlockIndex].transactions.slice(0, 10).map((txHash, idx) => (
                    <div key={idx} className="flex justify-between items-center p-2 bg-white rounded-md shadow-sm">
                      <div className="flex items-center">
                        <div className="w-2 h-2 rounded-full bg-blue-500 mr-2"></div>
                        <span className="text-sm">Tx #{idx+1}</span>
                      </div>
                      <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded">
                        {formatTxHash(txHash)}
                      </span>
                    </div>
                  ))}
                  {getTotalTransactions(blocks[selectedBlockIndex]) > 10 && (
                    <div className="text-center text-gray-500 text-xs py-1">
                      +{getTotalTransactions(blocks[selectedBlockIndex]) - 10} more transactions
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default BlockParallelization; 