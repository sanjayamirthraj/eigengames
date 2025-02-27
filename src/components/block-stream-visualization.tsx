"use client";

import React, { useRef, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BlockBatch } from "@/types/block";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";


interface BlockStreamProps {
  autoScroll?: boolean;
  onBlockSelect?: (block: BlockBatch) => void;
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

const BlockStreamVisualization = ({ 
  autoScroll = true, 
  onBlockSelect 
}: BlockStreamProps) => {
  const [blocks, setBlocks] = useState<BlockBatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationInterval, setSimulationInterval] = useState<NodeJS.Timeout | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [selectedBlock, setSelectedBlock] = useState<BlockBatch | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Function to fetch blocks directly from the API
  const fetchBlocks = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log("Making direct GET request to http://localhost:3000/blocks");
      
      // Debug check - log all request details
      console.log("Request details:", {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        cache: 'no-store',
        timestamp: new Date().toISOString()
      });
      
      // Simple GET request - as direct as possible
      const response = await fetch("http://localhost:3000/blocks", {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        cache: 'no-store', // Ensure we don't use cached data
        mode: 'cors', // Explicitly set CORS mode
      }).catch(err => {
        // This catches network errors like server not running
        console.error("Network error connecting to server:", err);
        throw new Error("Cannot connect to the server at http://localhost:3000/blocks. Ensure the server is running.");
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
      }
      
      // Parse the JSON response
      const data = await response.json();
      console.log("Raw API response:", data);
      
      if (!data || !data.blocks || !Array.isArray(data.blocks)) {
        throw new Error("Invalid data format from API: Expected { blocks: [...] }");
      }
      
      // Convert API blocks to our format - sorting to ensure proper organization
      // Put parallelizable blocks first, then sequential
      const sortedBlocks = [...data.blocks].sort((a, b) => {
        // Sort by type (parallelizable first)
        if (a.type === 'parallelizable' && b.type === 'sequential') return -1;
        if (a.type === 'sequential' && b.type === 'parallelizable') return 1;
        
        // Then by groupId
        return a.groupId - b.groupId;
      });
      
      // Map to our format
      const formattedBlocks: BlockBatch[] = sortedBlocks.map(block => {
        const isSequential = block.type === 'sequential';
        const txCount = block.transactions.length;

        return {
          id: `#${block.groupId}`,
          transactions: txCount,
          totalFees: (txCount * 0.003).toFixed(3), // Calculate fees based on tx count and type
          expectedMEV: (Math.random() * 0.3 + 0.05).toFixed(3),
          isSequential: isSequential,
          sequentialCount: isSequential ? txCount : 0,
          timestamp: new Date().toISOString()
        };
      });
      
      console.log("Organized blocks:", formattedBlocks);
      setBlocks(formattedBlocks);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Error fetching blocks:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch on component mount and setup auto-refresh
  useEffect(() => {
    fetchBlocks();
    
    // Auto-start live updates if autoScroll is enabled
    if (autoScroll) {
      const interval = setInterval(() => {
        fetchBlocks();
      }, 5000); // Fetch every 5 seconds
      
      setSimulationInterval(interval);
      setIsSimulating(true);
    }
    
    // Cleanup on unmount
    return () => {
      if (simulationInterval) {
        clearInterval(simulationInterval);
      }
    };
  }, []);

  // Auto-scroll to the end when new blocks arrive
  useEffect(() => {
    if (autoScroll && scrollContainerRef.current && blocks.length > 0) {
      const scrollContainer = scrollContainerRef.current;
      // Smooth scroll to the end after a small delay to ensure new blocks rendered
      setTimeout(() => {
        // Scroll to the rightmost end to show the newest blocks
        scrollContainer.scrollTo({
          left: scrollContainer.scrollWidth, // Scroll to rightmost end, not the start
          behavior: 'smooth'
        });
      }, 100);
    }
  }, [blocks, autoScroll]);

  const handleBlockClick = (block: BlockBatch) => {
    if (selectedBlock?.id === block.id) {
      setShowDetails(!showDetails);
    } else {
      setSelectedBlock(block);
      setShowDetails(true);
    }
    if (onBlockSelect) onBlockSelect(block);
  };

  // Calculate number of parallelizable vs sequential transactions
  const getParallelizableTxCount = (block: BlockBatch) => {
    if (block.isSequential) return 0;
    return block.transactions - (block.sequentialCount || 0);
  };

  const handleSimulationToggle = () => {
    if (isSimulating) {
      // Stop simulation
      if (simulationInterval) {
        clearInterval(simulationInterval);
        setSimulationInterval(null);
      }
      setIsSimulating(false);
    } else {
      // Start simulation
      const interval = setInterval(() => {
        fetchBlocks();
      }, 5000); // Fetch every 5 seconds as required
      setSimulationInterval(interval);
      setIsSimulating(true);
    }
  };

  return (
    <Card className="w-full bg-zinc-900 border border-zinc-800 shadow-md rounded-lg overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2 px-6">
        <div>
          <CardTitle className="text-xl text-white">Block Stream</CardTitle>
          <p className="text-sm text-zinc-400 mt-1">Visualizing the most recent blocks</p>
        </div>
        
        {/* Real-time update indicator */}
        <div className="flex items-center space-x-3">
          <div className="text-xs text-zinc-400">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
          <Badge 
            variant={isSimulating ? "default" : "outline"} 
            className={`${isSimulating ? 'bg-green-500/20 text-green-400 hover:bg-green-500/20' : 'bg-zinc-800 text-zinc-400'} px-2 py-1 flex items-center`}
          >
            {isSimulating && (
              <span className="relative flex h-2 w-2 mr-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
            )}
            {isSimulating ? 'Live Updates' : 'Paused'}
          </Badge>
          <Button 
            size="sm" 
            variant="outline" 
            className="text-xs bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700"
            onClick={fetchBlocks}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-3 w-3 animate-spin" /> 
                Loading...
              </>
            ) : (
              'Refresh'
            )}
          </Button>
          {/* <Button
            size="sm"
            variant="secondary"
            className="text-xs bg-blue-800/50 border-blue-700 text-blue-300 hover:bg-blue-700/50"
            onClick={() => {
              // Attempt direct fetch with detailed debugging
              console.log("MANUAL DEBUG: Testing API connection...");
              
              const testAPI = async () => {
                try {
                  console.log("MANUAL DEBUG: Fetch started");
                  const startTime = performance.now();
                  
                  const response = await fetch("http://localhost:3000/blocks", {
                    method: 'GET',
                    headers: {
                      'Accept': 'application/json',
                    },
                    mode: 'cors',
                    cache: 'no-store',
                  });
                  
                  const endTime = performance.now();
                  console.log(`MANUAL DEBUG: Fetch completed in ${(endTime - startTime).toFixed(2)}ms`);
                  console.log("MANUAL DEBUG: Response status:", response.status, response.statusText);
                  console.log("MANUAL DEBUG: Response headers:", [...response.headers.entries()]);
                  
                  if (!response.ok) {
                    throw new Error(`Status: ${response.status}`);
                  }
                  
                  const contentType = response.headers.get("content-type");
                  console.log("MANUAL DEBUG: Content-Type:", contentType);
                  
                  const data = await response.json();
                  console.log("MANUAL DEBUG: API response data:", data);
                  
                  if (data && data.blocks && Array.isArray(data.blocks)) {
                    console.log("MANUAL DEBUG: Valid data structure received");
                    
                    // Count transactions
                    let totalTxs = 0;
                    data.blocks.forEach((block: BlockFromAPI) => {
                      totalTxs += block.transactions.length;
                    });
                    
                    console.log(`MANUAL DEBUG: Received ${data.blocks.length} blocks with ${totalTxs} total transactions`);
                    alert(`Success! Received ${data.blocks.length} blocks with ${totalTxs} total transactions. Check console for details.`);
                  } else {
                    console.error("MANUAL DEBUG: Invalid data structure");
                    alert("API responded but with invalid data structure");
                  }
                } catch (err) {
                  console.error("MANUAL DEBUG: Error occurred:", err);
                  alert(`API test failed: ${err instanceof Error ? err.message : String(err)}`);
                }
              };
              
              testAPI();
            }}
          >
            Debug API
          </Button> */}
        </div>
      </CardHeader>
      
      <CardContent className="p-6">
        {error && (
          <div className="rounded-md bg-red-500/10 border border-red-500/20 p-3 mb-4 text-red-400 text-sm">
            <h3 className="font-bold">Error</h3>
            <p>{error}</p>
            
            {/* Debug info */}
            <div className="mt-2 pt-2 border-t border-red-500/20">
              <h4 className="font-semibold">Debug Information:</h4>
              <p>API URL: http://localhost:3000/blocks</p>
              <p>Make sure the backend is running on port 3000.</p>
              <div className="flex space-x-2 mt-2">
                <button 
                  onClick={() => {
                    console.log("TEST: Direct API fetch attempt...");
                    fetch('http://localhost:3000/blocks', {
                      method: 'GET',
                      headers: { 'Accept': 'application/json' },
                      mode: 'cors',
                      cache: 'no-store'
                    })
                    .then(res => {
                      console.log("TEST: Response status:", res.status, res.statusText);
                      console.log("TEST: Response headers:", [...res.headers.entries()]);
                      if (!res.ok) throw new Error(`Status: ${res.status}`);
                      return res.json();
                    })
                    .then(data => {
                      console.log("TEST: Direct fetch result:", data);
                      alert("API fetch successful! Check console for data.");
                    })
                    .catch(err => {
                      console.error("TEST: Direct fetch error:", err);
                      alert(`API fetch failed: ${err.message}`);
                    });
                  }}
                  className="bg-red-600/30 hover:bg-red-600/50 text-red-300 text-xs px-2 py-1 rounded"
                >
                  Test API Connection
                </button>
                
                <button
                  onClick={() => {
                    console.log("TEST: Checking if server is reachable via proxy...");
                    
                    // Create a simple image ping - this can bypass some CORS issues for testing
                    const img = new Image();
                    
                    img.onload = () => { 
                      console.log("TEST: Server appears to be reachable (ping successful)");
                      alert("Server appears to be reachable!"); 
                    };
                    
                    img.onerror = () => { 
                      console.log("TEST: Server cannot be reached (ping failed)");
                      alert("Cannot reach server - check if it's running!"); 
                    };
                    
                    // Set source to trigger request (timestamp to prevent caching)
                    img.src = `http://localhost:3000/status?nocache=${Date.now()}`; 
                  }}
                  className="bg-yellow-600/30 hover:bg-yellow-600/50 text-yellow-300 text-xs px-2 py-1 rounded"
                >
                  Check Server
                </button>
              </div>
            </div>
          </div>
        )}
        
        <div 
          ref={scrollContainerRef}
          className="flex items-stretch gap-4 overflow-x-auto pb-4 hide-scrollbar"
          style={{ direction: 'rtl' }} // Display newest blocks on the left by reversing direction
        >
          {loading && blocks.length === 0 ? (
            <div className="flex items-center justify-center w-full py-12">
              <Loader2 className="h-8 w-8 text-purple-500 animate-spin mr-2" />
              <p className="text-zinc-400">Loading blocks...</p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {blocks.map((block, index) => (
                <motion.div
                  key={block.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.3 }}
                  className={`flex-shrink-0 w-48 p-4 rounded-lg border cursor-pointer shadow-lg ${
                    index === 0 
                      ? "bg-purple-900/40 border-purple-600" 
                      : "bg-zinc-800/90 border-zinc-600"
                  }`}
                  onClick={() => handleBlockClick(block)}
                  style={{ direction: 'ltr' }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className={`font-medium ${index === 0 ? "text-purple-200" : "text-white"}`}>
                      Block {block.id}
                    </h3>
                    {index === 0 && (
                      <Badge className="bg-purple-600/70 text-purple-100 border-purple-500 text-xs">Latest</Badge>
                    )}
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    {!block.isSequential ? (
                      <div className="flex justify-between">
                        <span className="text-zinc-300">Transactions</span>
                        <span className={index === 0 ? "text-purple-200" : "text-white"}>
                          <span className="text-blue-200">{getParallelizableTxCount(block)}</span> / {block.transactions}
                        </span>
                      </div>
                    ) : (
                      <div className="flex justify-between">
                        <span className="text-zinc-300">Transactions</span>
                        <span className={index === 0 ? "text-purple-200" : "text-white"}>{block.transactions}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between">
                      <span className="text-zinc-300">Approximated Total Fees</span>
                      <span className={index === 0 ? "text-purple-200" : "text-white"}>{block.totalFees} ETH</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-300">Type</span>
                      <Badge className={`
                        text-xs px-1.5 py-0.5 
                        ${block.isSequential 
                          ? "bg-orange-500/30 text-orange-100 border-orange-400" 
                          : "bg-blue-500/30 text-blue-100 border-blue-400"}
                      `}>
                        {block.isSequential ? "Sequential" : "Parallel"}
                      </Badge>
                    </div>
                    
                    {!block.isSequential && (
                      <div className="flex justify-between">
                        <span className="text-zinc-300">Parallel Ratio</span>
                        <span className={index === 0 ? "text-purple-200" : "text-white"}>
                          {Math.round((getParallelizableTxCount(block) / block.transactions) * 100)}%
                        </span>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
        
        {/* Actions row */}
        <div className="flex justify-between mt-6">
          <Button
            size="sm"
            variant="outline"
            className="text-sm bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700"
            onClick={fetchBlocks}
            disabled={loading}
          >
            Fetch Latest Blocks
          </Button>
          
          <Button
            size="sm"
            variant={isSimulating ? "destructive" : "default"}
            className={`text-sm ${isSimulating ? "bg-red-600 hover:bg-red-700" : "bg-purple-600 hover:bg-purple-700"}`}
            onClick={handleSimulationToggle}
          >
            {isSimulating ? 'Stop Auto Updates' : 'Start Auto Updates'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default BlockStreamVisualization; 