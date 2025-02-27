import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Interface for API response
interface BlockFromAPI {
  type: 'parallelizable' | 'sequential';
  groupId: number;
  transactions: string[]; // Array of transaction hashes/IDs
}

interface APIResponse {
  blocks: BlockFromAPI[];
}

interface TransactionBatch {
  id: string;
  transactions: number;
  txHashes: string[]; // Store actual transaction hashes
  totalFees: string;
  expectedMEV: string;
  isSequential: boolean;
  type: 'parallelizable' | 'sequential';
  groupId: number;
}

interface ParallelizationVisualizationProps {
  initialBatches?: TransactionBatch[];
  initialPublicGoodReward?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

const ParallelizationVisualization = ({
  initialBatches,
  initialPublicGoodReward = "0.325",
  autoRefresh = true,
  refreshInterval = 5000
}: ParallelizationVisualizationProps) => {
  const [selectedBatchIndex, setSelectedBatchIndex] = React.useState(0);
  const [showDetails, setShowDetails] = React.useState(false);
  
  // Add state to track which batches have expanded transaction lists
  const [expandedBatches, setExpandedBatches] = useState<Record<string, boolean>>({});
  
  // State for API data
  const [batches, setBatches] = useState<TransactionBatch[]>(initialBatches || []);
  const [publicGoodReward, setPublicGoodReward] = useState<string>(initialPublicGoodReward);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isAutoRefreshing, setIsAutoRefreshing] = useState<boolean>(autoRefresh);
  const [refreshTimer, setRefreshTimer] = useState<NodeJS.Timeout | null>(null);

  const handleDetailClick = () => {
    setShowDetails(!showDetails);
  };

  const handleBatchSelect = (index: number) => {
    setSelectedBatchIndex(index);
    setShowDetails(false);
  };

  // Add function to toggle transaction expansion for a specific batch
  const toggleBatchTransactions = (batchId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent triggering batch selection
    setExpandedBatches(prev => ({
      ...prev,
      [batchId]: !prev[batchId]
    }));
  };

  // Function to format a transaction hash for display
  const formatTxHash = (hash: string): string => {
    if (!hash || hash.length < 12) return hash;
    return hash;
  };

  // Function to fetch blocks from the API
  const fetchBlocks = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log("Fetching blocks for parallelization visualization");
      
      const response = await fetch("http://localhost:3000/blocks", {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        cache: 'no-store',
        mode: 'cors',
      }).catch(err => {
        console.error("Network error connecting to server:", err);
        throw new Error("Cannot connect to the backend server. Please ensure it's running on port 3000.");
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json() as APIResponse;
      console.log("Blocks API response:", data);
      
      if (!data || !data.blocks || !Array.isArray(data.blocks)) {
        throw new Error("Invalid data format from API");
      }
      
      // Convert the API data to the format expected by the component
      const newBatches: TransactionBatch[] = data.blocks.map(block => {
        const txCount = block.transactions.length;
        const totalFees = (txCount * 0.003).toFixed(3);
        const expectedMEV = (0.05 + (txCount * 0.01)).toFixed(3);
        
        return {
          id: `#${block.groupId}`,
          groupId: block.groupId,
          transactions: txCount,
          txHashes: block.transactions, // Store the actual transaction hashes
          totalFees: totalFees,
          expectedMEV: expectedMEV,
          isSequential: block.type === 'sequential',
          type: block.type
        };
      });
      
      console.log("Transformed batches:", newBatches);
      setBatches(newBatches);
      
      // Also update the public good reward (using a deterministic value)
      const totalTransactions = newBatches.reduce((sum, batch) => sum + batch.transactions, 0);
      const parallelizableTxCount = newBatches.reduce((sum, batch) => {
        return sum + (batch.isSequential ? 0 : batch.transactions);
      }, 0);
      
      // Calculate total fees across all batches
      const totalFees = newBatches.reduce((sum, batch) => {
        return sum + parseFloat(batch.totalFees);
      }, 0).toFixed(3);
      
      // Calculate public good reward based on the ratio of parallelizable to total transactions
      const newReward = totalTransactions > 0 
        ? ((parallelizableTxCount / totalTransactions) * (parseFloat(totalFees) / 10)).toFixed(3)
        : "0.000";
      
      setPublicGoodReward(newReward);
      
      setLastUpdated(new Date());
      
      // Reset selection if needed
      if (selectedBatchIndex >= newBatches.length) {
        setSelectedBatchIndex(0);
      }
    } catch (err) {
      console.error("Error fetching blocks:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };
  
  // Initial fetch on component mount
  useEffect(() => {
    fetchBlocks();
    
    // Setup auto-refresh if enabled
    if (autoRefresh) {
      const timer = setInterval(fetchBlocks, refreshInterval);
      setRefreshTimer(timer);
    }
    
    // Cleanup on unmount
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

  // Get the currently selected batch
  const selectedBatch = batches.length > 0 && selectedBatchIndex < batches.length 
    ? batches[selectedBatchIndex] 
    : null;

  // Calculate total transaction fees across all batches
  const totalTransactionFees = batches.reduce((sum, batch) => {
    return sum + parseFloat(batch.totalFees);
  }, 0).toFixed(3);

  // Calculate total transactions across all batches
  const totalTransactions = batches.reduce((sum, batch) => sum + batch.transactions, 0);
  
  // Calculate total parallelizable transactions
  const parallelizableTxCount = batches.reduce((sum, batch) => {
    return sum + (batch.isSequential ? 0 : batch.transactions);
  }, 0);
  
  // Calculate public good reward based on the ratio of parallelizable to total transactions
  // multiplied by 1/10 of the total transaction fees
  const calculatedPublicGoodReward = totalTransactions > 0 
    ? ((parallelizableTxCount / totalTransactions) * (parseFloat(totalTransactionFees) / 10)).toFixed(3)
    : "0.000";

  return (
    <div className="space-y-6">
      {/* Removed header section with "Active Known Crowdsourced Mempool", timestamp, and Chain Selector */}
      
      {/* Removed block number row */}

      {error && (
        <div className="rounded-md bg-red-500/10 border border-red-500/20 p-3 mb-4 text-red-400 text-sm">
          <h3 className="font-bold">Error loading data</h3>
          <p>{error}</p>
          <div className="mt-2">
            <Button 
              size="sm" 
              variant="outline"
              className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border-red-500/30 text-xs mt-2"
              onClick={fetchBlocks}
            >
              Retry
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-6">
        {/* Transaction Batches Section - 3/4 width */}
        <div className="col-span-3">
          <Card className="glass-card overflow-hidden h-full border-0 shadow-[0_0_50px_-12px_rgba(168,85,247,0.25)] bg-gradient-to-br from-black to-zinc-900/95">
            <CardHeader className="relative z-10 border-b border-purple-800/60 bg-black/40 px-6 py-4">
              <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-white flex items-center">
                  <span className="bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">Transaction Batches</span>
                  <div className="w-2 h-2 rounded-full bg-emerald-500 ml-3 animate-pulse"></div>
                </h1>
                {loading && <Loader2 className="h-4 w-4 animate-spin text-purple-500" />}
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {loading && batches.length === 0 ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="h-8 w-8 text-purple-500 animate-spin mr-2" />
                  <p className="text-muted-foreground">Loading transaction batches...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {batches.length > 0 ? (
                    batches.map((batch, index) => (
                      <div
                        key={batch.id}
                        className={`relative rounded-xl border-2 p-6 backdrop-blur-sm cursor-pointer transform transition-all duration-200 hover:scale-[1.02] ${
                          index < -1
                            ? "bg-purple-900/40 border-purple-600 shadow-[0_0_30px_-12px_rgba(168,85,247,0.5)]" 
                            : "bg-zinc-800/90 border-zinc-600 hover:border-purple-600/50"
                        }`}
                        tabIndex={0}
                        aria-label={`Batch ${batch.id}`}
                      >
                        <div className="flex flex-col space-y-3">
                          <div className="flex justify-between items-center mb-4">
                            <h3 className={`font-semibold text-xl ${index === 0 ? "text-purple-200" : "text-white"}`}>
                              Batch {batch.id}
                            </h3>
                            <div className="flex items-center space-x-2">
                              {batch.isSequential ? (
                                <Badge className="bg-orange-500/30 text-orange-100 border-orange-400 px-3 py-1">
                                  Sequential
                                </Badge>
                              ) : (
                                <Badge className="bg-blue-500/30 text-blue-100 border-blue-400 px-3 py-1">
                                  Parallelizable
                                </Badge>
                              )}
                              <button
                                onClick={(e) => toggleBatchTransactions(batch.id, e)}
                                className="rounded-full p-1 hover:bg-zinc-700 transition-colors"
                                aria-label={`${expandedBatches[batch.id] ? 'Collapse' : 'Expand'} transactions`}
                              >
                                <svg 
                                  xmlns="http://www.w3.org/2000/svg" 
                                  width="16" 
                                  height="16" 
                                  viewBox="0 0 24 24" 
                                  fill="none" 
                                  stroke="currentColor" 
                                  strokeWidth="2" 
                                  strokeLinecap="round" 
                                  strokeLinejoin="round" 
                                  className={`transition-transform ${expandedBatches[batch.id] ? 'rotate-180' : ''}`}
                                >
                                  <polyline points="6 9 12 15 18 9"></polyline>
                                </svg>
                              </button>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <span className="text-zinc-300">Transactions</span>
                              <p className={index === 0 ? "text-purple-200 font-semibold" : "text-white font-semibold"}>{batch.transactions}</p>
                            </div>
                            <div>
                              <span className="text-zinc-300">Total Fees</span>
                              <p className={index === 0 ? "text-purple-200 font-semibold" : "text-white font-semibold"}>{batch.totalFees} ETH</p>
                            </div>
                            <div>
                              <span className="text-zinc-300">Expected MEV</span>
                              <p className={index === 0 ? "text-purple-200 font-semibold" : "text-white font-semibold"}>{batch.expectedMEV} ETH</p>
                            </div>
                          </div>
                          
                          {/* Collapsible transaction list for this batch */}
                          {expandedBatches[batch.id] && (
                            <div className="mt-3 pt-3 border-t border-purple-800/30">
                              <div className="text-sm font-medium mb-2 text-purple-300">Transactions in this batch:</div>
                              <div className="space-y-2 max-h-60 overflow-y-auto">
                                {batch.txHashes.map((txHash, i) => (
                                  <div key={i} className="flex justify-between items-center p-2 bg-black/40 border border-purple-800/20 rounded-md">
                                    <div className="flex items-center">
                                      <div className={`w-2 h-2 rounded-full ${batch.isSequential ? 'bg-orange-500' : 'bg-blue-500'} mr-2`}></div>
                                      <span className="text-zinc-300">Tx #{i+1}</span>
                                    </div>
                                    <span className="text-xs font-mono bg-zinc-800/80 text-zinc-300 px-2 py-0.5 rounded">{formatTxHash(txHash)}</span>
                                  </div>
                                ))}
                                {batch.transactions === 0 && (
                                  <div className="text-center text-zinc-500 text-xs py-1">
                                    No transactions in this batch
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-zinc-500">
                      No transaction batches available
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Metrics Panel - 1/4 width */}
        <div className="col-span-1">
          <Card className="glass-card overflow-hidden h-full border-0 shadow-[0_0_50px_-12px_rgba(168,85,247,0.25)] bg-gradient-to-br from-black to-zinc-900/95">
            <CardHeader className="relative z-10 border-b border-purple-800/60 bg-black/40 px-6 py-4">
              <h1 className="text-2xl font-bold text-white flex items-center">
                <span className="bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">Metrics</span>
                <div className="w-2 h-2 rounded-full bg-emerald-500 ml-3 animate-pulse"></div>
              </h1>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="px-3 py-2 bg-purple-900/20 rounded-lg border border-purple-800/30">
                <div className="text-xs font-mono text-purple-300 mb-1">Public Good Reward</div>
                <div className="text-sm font-mono text-white font-medium flex items-center">
                  <span className="text-emerald-400 mr-1">+</span>
                  {calculatedPublicGoodReward} ETH
                </div>
                <div className="text-xs text-zinc-500 mt-1">Rewards block proposers for including suggested blocks</div>
              </div>

              <div className="px-3 py-2 bg-purple-900/20 rounded-lg border border-purple-800/30">
                <div className="text-xs font-mono text-purple-300 mb-1">Total Transaction Fees</div>
                <div className="text-sm font-mono text-white font-medium">
                  {totalTransactionFees} ETH
                </div>
                <div className="text-xs text-zinc-500 mt-1">Combined fees across all batches</div>
              </div>

              <div className="px-3 py-2 bg-purple-900/20 rounded-lg border border-purple-800/30">
                <div className="text-xs font-mono text-purple-300 mb-1">Total Transactions</div>
                <div className="text-sm font-mono text-white font-medium">
                  {totalTransactions}
                </div>
                <div className="text-xs text-zinc-500 mt-1">Combined transactions across all batches</div>
              </div>

              <div className="text-sm text-zinc-400 border border-zinc-800 bg-black/30 px-3 py-2 rounded-md text-center">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex justify-between">
        <Button 
          className={`text-base backdrop-blur-sm ${isAutoRefreshing ? 
            "bg-red-600/90 hover:bg-red-700" : 
            "bg-purple-600/90 hover:bg-purple-700"} text-white`}
          onClick={handleAutoRefreshToggle}
          aria-label={isAutoRefreshing ? "Stop auto-refresh" : "Start auto-refresh"}
        >
          {isAutoRefreshing ? (
            <div className="flex items-center">
              <div className="mr-2 relative">
                <div className="w-2 h-2 bg-red-400 rounded-full animate-ping absolute"></div>
                <div className="w-2 h-2 bg-red-500 rounded-full relative"></div>
              </div>
              Stop Auto Updates
            </div>
          ) : (
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                <path d="M21 2v6h-6"></path>
                <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
                <path d="M3 22v-6h6"></path>
                <path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
              </svg>
              Start Auto Updates
            </div>
          )}
        </Button>
        
        <Button
          size="lg"
          variant="outline"
          className="text-base bg-zinc-800/80 border-zinc-700/80 text-zinc-300 hover:bg-zinc-700 px-6 backdrop-blur-sm"
          onClick={fetchBlocks}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
              Loading...
            </>
          ) : (
            'Fetch Latest Batches'
          )}
        </Button>
      </div>
    </div>
  );
};

export default ParallelizationVisualization; 