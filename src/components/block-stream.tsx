"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

// Define interfaces for the block data
interface Block {
  blockNumber: number;
  transactions: string[]; // Array of transaction hashes
  totalFees: string; // Total fees in ETH
  type: 'parallel' | 'sequential';
  parallelRatio?: number; // Percentage of parallel transactions (0-100)
}

interface BlockStreamProps {
  initialBlocks?: Block[];
  autoRefresh?: boolean;
  refreshInterval?: number;
  debugMode?: boolean;
  onBlockSelect?: (block: Block) => void;
}

const BlockStream = ({
  initialBlocks = [],
  autoRefresh = true,
  refreshInterval = 5000,
  debugMode = false,
  onBlockSelect
}: BlockStreamProps) => {
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(autoRefresh);
  const [refreshTimer, setRefreshTimer] = useState<NodeJS.Timeout | null>(null);
  const [selectedBlockIndex, setSelectedBlockIndex] = useState<number | null>(null);

  // Format transaction hash for display
  const formatTxHash = (hash: string): string => {
    if (!hash || hash.length < 12) return hash;
    return `${hash.substring(0, 6)}...${hash.substring(hash.length - 4)}`;
  };

  // Process API response to create block objects
  const processApiBlocks = (apiData: any): Block[] => {
    if (!apiData || !apiData.blocks) return [];
    
    // Group blocks by their block number (if available) or create artificial grouping
    const blockGroups: Record<number, any[]> = {};
    
    apiData.blocks.forEach((block: any) => {
      // Use groupId as a way to identify which block this belongs to
      // This is a simplification - in a real implementation, you'd use actual block numbers
      const blockNumber = block.groupId || 1;
      
      if (!blockGroups[blockNumber]) {
        blockGroups[blockNumber] = [];
      }
      
      blockGroups[blockNumber].push(block);
    });
    
    // Convert each group into a Block object
    return Object.entries(blockGroups).map(([blockNumber, blockBatches], index) => {
      // Count total transactions across all batches in this block
      const allTransactions: string[] = [];
      let parallelCount = 0;
      let sequentialCount = 0;
      
      blockBatches.forEach((batch: any) => {
        allTransactions.push(...batch.transactions);
        
        if (batch.type === 'parallelizable' || batch.type === 'parallel') {
          parallelCount += batch.transactions.length;
        } else {
          sequentialCount += batch.transactions.length;
        }
      });
      
      const totalTx = allTransactions.length;
      const parallelRatio = totalTx > 0 ? Math.round((parallelCount / totalTx) * 100) : 100;
      
      // Calculate fees based on transaction count (in a real app, this would come from the API)
      const totalFees = (totalTx * 0.01).toFixed(3);
      
      // Determine block type based on majority of transactions
      const type = parallelCount >= sequentialCount ? 'parallel' : 'sequential';
      
      return {
        blockNumber: parseInt(blockNumber),
        transactions: allTransactions,
        totalFees,
        type,
        parallelRatio
      };
    }).sort((a, b) => b.blockNumber - a.blockNumber); // Sort by block number descending (newest first)
  };

  // Fetch blocks from API
  const fetchBlocks = async () => {
    setLoading(true);
    
    try {
      // In a real implementation, you would fetch from an actual API
      // const response = await fetch("/api/blocks");
      // const data = await response.json();
      
      // For demo purposes, we're using the example data structure
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
            type: "parallelizable",
            groupId: 3,
            transactions: [
              "0x2663098efc144aab1821480722d3cf1a6434bb231ad0f9b181b68c357f8fb3ad"
            ]
          },
          {
            type: "parallelizable",
            groupId: 4,
            transactions: [
              "0xc3f1d81c0813609c0c36551c8e355efb8b04e661db37caaec83ee3668e89c9a9"
            ]
          },
          {
            type: "parallelizable",
            groupId: 5,
            transactions: [
              "0x702ab202d91679195f38248c0e1a987339f640dde36c9775da61b4f089a5e0e4"
            ]
          },
          {
            type: "sequential",
            groupId: 6,
            transactions: [
              "0x9e7f101a3083152e768894c3a4269925c9949cb7b8df612494e2df5f28607cdc",
              "0x63230589a812996a26c542dd4f6aabd6635bd9af94793fd500d23ecc8d05437d",
              "0x73b3e01fc3f6e22675b726bb786441b551e47f17f78a03beae58f2fb071a97b6",
              "0xd7be0187e184186cd47dd54cbd979ee952846be77e6b0e62576a2d9bdf68203f",
              "0x2bfb037714d7eae38a8be18ad82a1c41d258dfa8d26a71ebf316b0a18e001ca2",
              "0xacb7ca7ea82e0c1e25acc8ff0da56411641e2d22e3cfcfea2a8a5cd7eb0298da",
              "0xd286b8173f1d48fc05392174d44a02e062a7d974a565dff42e5feaa06dc95fd9",
              "0xa6d63d0888017f11e8a8312d028c478f6f4b6dfa2b1563968a7c7cc66e3cda6f",
              "0x8e884c30b862216460219d5927866b14d689a7559149c954996be66dcab7826b",
              "0x22c932c263abe505e8f8761b2180f304c56325a1fc9e0ffd467fa0bb87518638"
            ]
          }
        ]
      };
      
      const newBlocks = processApiBlocks(mockApiResponse);
      setBlocks(newBlocks);
      setLastUpdated(new Date());
      
      // Store blocks in local storage
      localStorage.setItem('blockStreamData', JSON.stringify(newBlocks));
      
    } catch (error) {
      console.error("Error fetching blocks:", error);
    } finally {
      setLoading(false);
    }
  };

  // Load blocks from local storage on component mount
  useEffect(() => {
    const storedBlocks = localStorage.getItem('blockStreamData');
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

  // Handle manual refresh
  const handleRefresh = () => {
    fetchBlocks();
  };

  // Handle block selection
  const handleBlockSelect = (block: Block, index: number) => {
    setSelectedBlockIndex(index);
    
    // Call the parent component's onBlockSelect if provided
    if (onBlockSelect) {
      onBlockSelect(block);
    }
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Block Stream</h2>
        <div className="flex items-center space-x-2 text-sm">
          <span className="text-gray-500">Last updated: {lastUpdated.toLocaleTimeString()}</span>
          <Button 
            size="sm"
            variant={isAutoRefreshing ? "default" : "outline"}
            className={isAutoRefreshing ? "bg-green-600 hover:bg-green-700 text-white" : ""}
            onClick={handleAutoRefreshToggle}
          >
            {isAutoRefreshing ? (
              <>
                <span className="mr-2 h-2 w-2 rounded-full bg-green-200 animate-pulse"></span>
                Live Updates
              </>
            ) : "Live Updates"}
          </Button>
          <Button 
            size="sm"
            variant="outline"
            onClick={handleRefresh}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
          </Button>
          {debugMode && (
            <Button 
              size="sm"
              variant="outline"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Debug API
            </Button>
          )}
        </div>
      </div>
      
      <p className="text-sm text-gray-500 mb-6">Visualizing the most recent blocks</p>
      
      {/* Block grid - centered */}
      <div className="flex justify-center mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 w-full">
          {blocks.map((block, index) => (
            <Card 
              key={`block-${block.blockNumber}`}
              className={`cursor-pointer transition-all duration-200 border-2 ${
                selectedBlockIndex === index ? "border-purple-600 shadow-md" : 
                index === 0 ? "border-purple-300" : "border-gray-200"
              } hover:border-purple-400 hover:shadow-md`}
              onClick={() => handleBlockSelect(block, index)}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  handleBlockSelect(block, index);
                }
              }}
              aria-label={`Block #${block.blockNumber}`}
            >
              <div className={`p-3 ${index === 0 ? "bg-purple-600 text-white" : ""}`}>
                <div className="flex justify-between items-center">
                  <h3 className="font-medium text-sm">Block #{block.blockNumber}</h3>
                  {index === 0 && (
                    <span className="text-xs bg-white text-purple-700 px-1.5 py-0.5 rounded-full">
                      Latest
                    </span>
                  )}
                </div>
              </div>
              
              <div className="p-3 space-y-2">
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">Transactions</span>
                  <span className="text-xs font-medium">
                    {block.transactions.length} / {block.transactions.length}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">Total Fees</span>
                  <span className="text-xs font-medium">{block.totalFees} ETH</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">Type</span>
                  <span 
                    className={`text-xs px-1.5 py-0.5 rounded-full ${
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
                    <span className="text-xs text-gray-500">Parallel Ratio</span>
                    <span className="text-xs font-medium">{block.parallelRatio || 100}%</span>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
      
      {/* Fetch latest blocks button */}
      <div className="flex justify-between">
        <Button 
          variant="outline"
          onClick={fetchBlocks}
          className="text-sm"
        >
          Fetch Latest Blocks
        </Button>
        
        {isAutoRefreshing && (
          <Button 
            variant="destructive"
            onClick={handleAutoRefreshToggle}
            className="text-sm"
          >
            Stop Auto Updates
          </Button>
        )}
      </div>
    </div>
  );
};

export default BlockStream; 