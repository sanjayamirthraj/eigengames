import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";

interface TransactionBatch {
  id: string;
  transactions: number;
  totalFees: string;
  expectedMEV: string;
  isSequential: boolean;
}

// Interface for API response
interface BlockFromAPI {
  type: 'parallelizable' | 'sequential';
  groupId: number;
  transactions: string[]; // Array of transaction hashes/IDs
}

interface APIResponse {
  blocks: BlockFromAPI[];
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
  const [selectedChain, setSelectedChain] = React.useState("Mainnet");
  
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
      const newBatches: TransactionBatch[] = data.blocks.map(block => ({
        id: `#${block.groupId}`,
        transactions: block.transactions.length,
        totalFees: (Math.random() * 0.5 + 0.1).toFixed(3), // Randomized for visualization
        expectedMEV: (Math.random() * 0.3 + 0.05).toFixed(3), // Randomized for visualization
        isSequential: block.type === 'sequential'
      }));
      
      console.log("Transformed batches:", newBatches);
      setBatches(newBatches);
      
      // Also update the public good reward (using a randomized value)
      const newReward = (Math.random() * 0.3 + 0.2).toFixed(3);
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-white drop-shadow-md">
          Active Known Crowdsourced Mempool
        </h2>
        <div className="flex items-center gap-3">
          <div className="text-xs text-zinc-300">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
          <div className="glass-panel px-4 py-2 rounded-full">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Chain Selector</span>
              <select 
                className="bg-transparent border-none text-sm font-medium focus:outline-none"
                value={selectedChain}
                onChange={(e) => setSelectedChain(e.target.value)}
                aria-label="Select blockchain network"
              >
                <option value="Mainnet">Mainnet</option>
                <option value="Goerli">Goerli</option>
                <option value="Sepolia">Sepolia</option>
                <option value="Holesky">Holesky</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-panel p-4 rounded-xl overflow-hidden">
        <div className="flex justify-between items-center gap-4 overflow-x-auto py-2 px-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div 
              key={i} 
              className="min-w-[120px] h-[60px] glass-card rounded-lg flex items-center justify-center p-2 cursor-pointer hover:shadow-md transition-all"
              tabIndex={0}
              aria-label={`Block ${12345678 + i}`}
            >
              <div className="text-center">
                <div className="text-xs text-muted-foreground">Block</div>
                <div className="font-medium">{12345678 + i}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="glass-card overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg text-black">Most Optimal Parallelizable Block Options</CardTitle>
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
                      className={`p-4 rounded-xl cursor-pointer transition-all ${
                        selectedBatchIndex === index
                          ? "glass-panel shadow-md"
                          : "glass-card hover:shadow-sm"
                      }`}
                      onClick={() => handleBatchSelect(index)}
                      tabIndex={0}
                      aria-label={`Select batch ${batch.id}`}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          handleBatchSelect(index);
                        }
                      }}
                    >
                      <div className="flex flex-col space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">Batch {batch.id}</span>
                          {batch.isSequential ? (
                            <span className="text-xs bg-gradient-to-r from-amber-100 to-amber-200 text-amber-800 px-3 py-1 rounded-full">
                              Sequential
                            </span>
                          ) : (
                            <span className="text-xs bg-gradient-to-r from-emerald-100 to-emerald-200 text-emerald-800 px-3 py-1 rounded-full">
                              Parallelizable
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Transactions
                            </p>
                            <p className="font-medium">{batch.transactions}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Total Fees</p>
                            <p className="font-medium">{batch.totalFees} ETH</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Expected MEV
                            </p>
                            <p className="font-medium">{batch.expectedMEV} ETH</p>
                          </div>
                        </div>
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
            <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground">
                Public Good Reward Amount: <span className="font-medium">{publicGoodReward} ETH</span>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg text-black">Block Formations</CardTitle>
              <Button 
                className="glass-button"
                onClick={handleDetailClick}
                aria-label={`${showDetails ? "Hide" : "Show"} transaction details`}
              >
                {showDetails ? "Hide Details" : "Show Details"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {batches.length > 0 ? (
              <Tabs defaultValue="visualization" className="w-full">
                <TabsList className="grid w-full grid-cols-2 glass-panel">
                  <TabsTrigger value="visualization">Visualization</TabsTrigger>
                  <TabsTrigger value="data">Data</TabsTrigger>
                </TabsList>
                <TabsContent value="visualization">
                  <div className="mt-4 space-y-4">
                    <div className="glass-panel p-4 rounded-xl">
                      <h3 className="text-md font-medium mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        {batches[selectedBatchIndex]?.isSequential ? "Sequential Execution" : "Parallel Execution"}
                      </h3>
                      <div className="space-y-2">
                        {batches[selectedBatchIndex] && !batches[selectedBatchIndex].isSequential && (
                          <>
                            <div className="border-2 border-emerald-400 rounded-md p-3 bg-gradient-to-r from-emerald-50 to-teal-50">
                              <div className="flex justify-between">
                                <span className="text-sm font-medium">Parallelizable batch #1</span>
                                <span className="text-xs text-muted-foreground">
                                  {Math.floor(batches[selectedBatchIndex].transactions / 2)} transactions
                                </span>
                              </div>
                            </div>
                            <div className="text-center text-muted-foreground text-xs">⋮</div>
                            <div className="border-2 border-emerald-400 rounded-md p-3 bg-gradient-to-r from-emerald-50 to-teal-50">
                              <div className="flex justify-between">
                                <span className="text-sm font-medium">Parallelizable batch #n</span>
                                <span className="text-xs text-muted-foreground">
                                  {Math.ceil(batches[selectedBatchIndex].transactions / 2)} transactions
                                </span>
                              </div>
                            </div>
                          </>
                        )}
                        <div className={`border-2 rounded-md p-3 ${
                          batches[selectedBatchIndex]?.isSequential 
                            ? "border-amber-400 bg-gradient-to-r from-amber-50 to-yellow-50" 
                            : "border-gray-300 bg-gray-50/50"
                        }`}>
                          <div className="flex justify-between">
                            <span className="text-sm font-medium">Sequential</span>
                            <span className="text-xs text-muted-foreground">
                              {batches[selectedBatchIndex]?.isSequential 
                                ? batches[selectedBatchIndex].transactions 
                                : "0"} transactions
                            </span>
                          </div>
                        </div>
                      </div>

                      {showDetails && (
                        <div className="mt-4 p-3 glass-panel rounded-md text-sm">
                          <div className="flex justify-between items-center mb-2">
                            <h4 className="font-medium">Transaction Details</h4>
                            <div className="flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                                <polyline points="15 10 20 15 15 20"></polyline>
                                <path d="M4 4v7a4 4 0 0 0 4 4h12"></path>
                              </svg>
                              <span className="text-xs text-muted-foreground">Detailed view</span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            {batches[selectedBatchIndex] && Array.from({ length: Math.min(5, batches[selectedBatchIndex].transactions) }).map((_, i) => (
                              <div key={i} className="flex justify-between items-center p-2 glass-card rounded-md">
                                <div className="flex items-center">
                                  <div className="w-2 h-2 rounded-full bg-blue-500 mr-2"></div>
                                  <span>Tx #{i+1}</span>
                                </div>
                                <span className="text-xs font-medium">0.00{Math.floor(Math.random() * 9) + 1} ETH</span>
                              </div>
                            ))}
                            {batches[selectedBatchIndex]?.transactions > 5 && (
                              <div className="text-center text-muted-foreground text-xs py-1">
                                +{batches[selectedBatchIndex].transactions - 5} more transactions
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="glass-panel p-4 rounded-xl">
                        <p className="text-sm font-medium mb-2 text-blue-600">Expected MEV</p>
                        <p className="text-2xl font-bold">{batches[selectedBatchIndex]?.expectedMEV || "0.000"} ETH</p>
                      </div>
                      <div className="glass-panel p-4 rounded-xl">
                        <p className="text-sm font-medium mb-2 text-purple-600">Total Fees</p>
                        <p className="text-2xl font-bold">{batches[selectedBatchIndex]?.totalFees || "0.000"} ETH</p>
                      </div>
                    </div>

                    <div className="glass-panel p-4 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-500">
                          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                        </svg>
                        <p className="text-sm font-medium text-indigo-600">Public Good Reward</p>
                      </div>
                      <p className="text-xl font-bold">{publicGoodReward} ETH</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Rewards block proposers for including suggested blocks
                      </p>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="data">
                  <div className="mt-4 space-y-4">
                    <div className="glass-panel p-4 rounded-xl">
                      <h3 className="text-md font-medium mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        Block Formation Data
                      </h3>
                      <pre className="text-xs bg-white/50 p-3 rounded-md overflow-x-auto">
                        {batches[selectedBatchIndex] ? JSON.stringify(
                          {
                            batchId: batches[selectedBatchIndex].id,
                            transactionCount: batches[selectedBatchIndex].transactions,
                            isParallelizable: !batches[selectedBatchIndex].isSequential,
                            metrics: {
                              totalFees: batches[selectedBatchIndex].totalFees + " ETH",
                              expectedMEV: batches[selectedBatchIndex].expectedMEV + " ETH",
                              publicGoodReward: publicGoodReward + " ETH",
                              estimatedGasUsage: "12,456,789 gas",
                              estimatedTimeToExecute: "1.23 seconds",
                              maximalParallelizability: "i) tx fee rewards, ii) MEV opp"
                            },
                            blockFormation: {
                              basedOn: [
                                "Maximal parallelizability",
                                "Transaction fee rewards",
                                "Public good incentives"
                              ]
                            }
                          },
                          null,
                          2
                        ) : "No batch selected"}
                      </pre>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="flex justify-center items-center py-12">
                <p className="text-muted-foreground">Select a transaction batch to view details</p>
              </div>
            )}
          </CardContent>
        </Card>
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