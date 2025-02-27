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
    return `${hash.substring(0, 6)}...${hash.substring(hash.length - 4)}`;
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
          <Card className="glass-card overflow-hidden h-full">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-500">
              <div className="flex justify-between items-center">
                <Badge className="inline-flex items-center w-auto px-2.5 py-1 text-sm font-semibold bg-white/90 text-indigo-800 hover:bg-white/95 border-none">Transaction Batches & Transactions</Badge>
                {loading && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {loading && batches.length === 0 ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="h-8 w-8 text-blue-500 animate-spin mr-2" />
                  <p className="text-muted-foreground">Loading transaction batches...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {batches.length > 0 ? (
                    batches.map((batch, index) => (
                      <div
                        key={batch.id}
                        className={`p-4 rounded-xl transition-all ${
                          selectedBatchIndex === index
                            ? "glass-panel shadow-md"
                            : "glass-card hover:shadow-sm"
                        }`}
                        tabIndex={0}
                        aria-label={`Batch ${batch.id}`}
                      >
                        <div className="flex flex-col space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">Batch {batch.id}</span>
                            <div className="flex items-center space-x-2">
                              {batch.isSequential ? (
                                <span className="text-xs bg-gradient-to-r from-amber-100 to-amber-200 text-amber-800 px-3 py-1 rounded-full">
                                  Sequential
                                </span>
                              ) : (
                                <span className="text-xs bg-gradient-to-r from-emerald-100 to-emerald-200 text-emerald-800 px-3 py-1 rounded-full">
                                  Parallelizable
                                </span>
                              )}
                              <button
                                onClick={(e) => toggleBatchTransactions(batch.id, e)}
                                className="rounded-full p-1 hover:bg-gray-100 transition-colors"
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
                              <p className="text-xs text-muted-foreground">
                                Transactions
                              </p>
                              <p className="font-medium">{batch.transactions}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Approximated Total Fees</p>
                              <p className="font-medium">{batch.totalFees} ETH</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Expected MEV
                              </p>
                              <p className="font-medium">{batch.expectedMEV} ETH</p>
                            </div>
                          </div>
                          
                          {/* Collapsible transaction list for this batch */}
                          {expandedBatches[batch.id] && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <div className="text-sm font-medium mb-2">Transactions in this batch:</div>
                              <div className="space-y-2 max-h-60 overflow-y-auto">
                                {batch.txHashes.map((txHash, i) => (
                                  <div key={i} className="flex justify-between items-center p-2 glass-card rounded-md">
                                    <div className="flex items-center">
                                      <div className={`w-2 h-2 rounded-full ${batch.isSequential ? 'bg-amber-500' : 'bg-emerald-500'} mr-2`}></div>
                                      <span>Tx #{i+1}</span>
                                    </div>
                                    <span className="text-xs text-black font-mono bg-gray-100 px-2 py-0.5 rounded">{formatTxHash(txHash)}</span>
                                  </div>
                                ))}
                                {batch.transactions === 0 && (
                                  <div className="text-center text-muted-foreground text-xs py-1">
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
                    <div className="text-center py-8 text-muted-foreground">
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
          <Card className="glass-card overflow-hidden h-full">
            <CardHeader className="bg-gradient-to-r from-purple-500 to-blue-500">
              <Badge className="inline-flex items-center w-auto px-2.5 py-1 text-sm font-semibold bg-white/90 text-indigo-800 hover:bg-white/95 border-none">Metrics</Badge>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="glass-panel p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-500">
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                  </svg>
                  <p className="text-sm font-medium text-indigo-600">Public Good Reward</p>
                </div>
                <p className="text-xl font-bold">{calculatedPublicGoodReward} ETH</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Rewards block proposers for including suggested blocks
                </p>
              </div>

              <div className="glass-panel p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-500">
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                  </svg>
                  <p className="text-sm font-medium text-purple-600">Total Transaction Fees</p>
                </div>
                <p className="text-xl font-bold">{totalTransactionFees} ETH</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Combined fees across all batches
                </p>
              </div>

              <div className="glass-panel p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500">
                    <path d="M20.91 8.84 8.56 2.23a1.93 1.93 0 0 0-1.81 0L3.1 4.13a2.12 2.12 0 0 0-.05 3.69l12.22 6.93a2 2 0 0 0 1.94 0L21 12.51a2.12 2.12 0 0 0-.09-3.67Z"></path>
                    <path d="m3.09 8.84 12.35-6.61a1.93 1.93 0 0 1 1.81 0l3.65 1.9a2.12 2.12 0 0 1 .1 3.69L8.73 14.75a2 2 0 0 1-1.94 0L3 12.51a2.12 2.12 0 0 1 .09-3.67Z"></path>
                    <line x1="12" y1="22" x2="12" y2="13"></line>
                    <path d="M20 13.5v3.37a2.06 2.06 0 0 1-1.11 1.83l-6 3.08a1.93 1.93 0 0 1-1.78 0l-6-3.08A2.06 2.06 0 0 1 4 16.87V13.5"></path>
                  </svg>
                  <p className="text-sm font-medium text-blue-600">Total Transactions</p>
                </div>
                <p className="text-xl font-bold">{totalTransactions}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Combined transactions across all batches
                </p>
              </div>

              <div className="pt-4 text-center text-xs text-muted-foreground">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex justify-between">
        <Button 
          className={`${isAutoRefreshing ? 
            "bg-green-600 hover:bg-green-700" : 
            "bg-blue-600 hover:bg-blue-700"} text-white`}
          onClick={handleAutoRefreshToggle}
          aria-label={isAutoRefreshing ? "Stop auto-refresh" : "Start auto-refresh"}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
            {isAutoRefreshing ? (
              <>
                <path d="M21 12a9 9 0 0 1-9 9"></path>
                <path d="M12 21a9 9 0 0 1-9-9"></path>
                <path d="M3 12a9 9 0 0 1 9-9"></path>
                <path d="M12 3a9 9 0 0 1 9 9"></path>
              </>
            ) : (
              <>
                <path d="M21 2v6h-6"></path>
                <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
                <path d="M3 22v-6h6"></path>
                <path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
              </>
            )}
          </svg>
          {isAutoRefreshing ? 'Auto-Refreshing' : 'Start Auto-Refresh'}
        </Button>
        
        <Button 
          className="bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700"
          aria-label="Refresh data"
          onClick={fetchBlocks}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Loading...
            </>
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
  );
};

export default ParallelizationVisualization; 