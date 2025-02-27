"use client";

import React, { useRef, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BlockBatch } from "@/types/block";
import { motion, AnimatePresence, transform } from "framer-motion";
import { Loader2, Database, Link2 } from "lucide-react";

// Generate hash-like string for visual effect

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
  const [blockHash, setBlockHash] = useState<string>((() => {
      return `Sanjay Amirthraj and Souradeep Das`;
    })());
  const [blockNonce, setBlockNonce] = useState<number>(Math.floor(Math.random() * 1000000));
  const [blockHeight, setBlockHeight] = useState<number>(Math.floor(Math.random() * 10000) + 20000000);

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
      
      setBlocks(formattedBlocks);
      setLastUpdated(new Date());
      // Generate new hash for visual block effect
      setBlockHash((() => {
          return `Sanjay Amirthraj and Souradeep Das`;
        })());
      // Update other blockchain metadata
      setBlockNonce(Math.floor(Math.random() * 1000000));
      setBlockHeight(prev => prev + 1);
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
    // Outer compartment wrapper with background effect - MAKING WIDER
    <div className="relative py-8 px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 mx-auto max-w-screen-2xl">
      {/* Background effect for compartmentalization */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Removing the first background layer (dark zinc) but keeping second layer */}
        {/* Radial gradient decoration */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/20 via-zinc-950 to-zinc-950"></div>
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMyMjIiIGZpbGwtb3BhY2l0eT0iMC4wNDUiPjxwYXRoIGQ9Ik0zNiAxOGMxLjIyOCAwIDIuNDM4LjMgMy41MzIuODkxYTE3LjA1IDE3LjA1IDAgMCAxIDIuOTMyIDEuNjQ1Yy44OS42MzUgMS43NDQgMS4zNiAyLjU2MSAyLjE3N2E5OS4xODMgOTkuMTgzIDAgMCAxIDIuMTc4IDIuNTZjLjYzNS44OS0uODkxIDIuOTE4LTEuNjQ1IDIuOTMyQTguMDk1IDguMDk1IDAgMCAwIDQyIDM2YTggOCAwIDEgMC0xNiAwIDguMDk1IDguMDk1IDAgMCAwIDMuNTU5IDYuNjg4Yy43NTQuMDE0IDIuMzE2LTEuNiAyLjk1MS0yLjQ5YTk5LjMwNCA5OS4zMDQgMCAwIDEgMi4xNzgtMi41NjEgMjAuNzkzIDIwLjc5MyAwIDAgMSAyLjU2LTIuMTc3IDE3LjA1IDE3LjA1IDAgMCAxIDIuOTMzLTEuNjQ1QTcuOTQgNy45NCAwIDAgMSAzNiAxOHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-10"></div>
        
        {/* Edge highlight effect - ENHANCED TO BE MORE VISIBLE */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-purple-500 to-transparent shadow-[0_0_6px_0_rgba(168,85,247,0.7)]"></div>
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-purple-500 to-transparent shadow-[0_0_6px_0_rgba(168,85,247,0.7)]"></div>
        <div className="absolute top-0 bottom-0 left-0 w-[2px] bg-gradient-to-b from-transparent via-purple-500 to-transparent shadow-[0_0_6px_0_rgba(168,85,247,0.7)]"></div>
        <div className="absolute top-0 bottom-0 right-0 w-[2px] bg-gradient-to-b from-transparent via-purple-500 to-transparent shadow-[0_0_6px_0_rgba(168,85,247,0.7)]"></div>
        
        {/* Corner accent decorations - NEW - MADE SMALLER */}
        <div className="absolute top-0 left-0 w-6 h-6 border-t-3 border-l-3 border-purple-500 opacity-80 rounded-tl-md"></div>
        <div className="absolute top-0 right-0 w-6 h-6 border-t-3 border-r-3 border-purple-500 opacity-80 rounded-tr-md"></div>
        <div className="absolute bottom-0 left-0 w-6 h-6 border-b-3 border-l-3 border-purple-500 opacity-80 rounded-bl-md"></div>
        <div className="absolute bottom-0 right-0 w-6 h-6 border-b-3 border-r-3 border-purple-500 opacity-80 rounded-br-md"></div>
      </div>
      
      {/* Main content wrapper with visible border */}
      <div className="relative z-10 border-2 border-purple-500/30 rounded-xl overflow-hidden shadow-[0_0_24px_-5px_rgba(168,85,247,0.3)]">
        {/* Header for compartment - REDUCED PADDING */}
        <div className="relative z-10 mb-4 bg-black/50 border-b border-purple-500/50 px-4 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <div className="h-6 w-1 bg-purple-500 rounded-full"></div>
              <h2 className="text-lg font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">Proposed Block Batched </h2>
            </div>
            <div className="flex items-center space-x-3">
              <div className="px-3 py-1 rounded-full border border-purple-500/50 bg-purple-500/10 backdrop-blur-sm">
                <div className="text-xs font-mono text-purple-200 flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse"></span>
                  <span>LIVE VISUALIZATION</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      
        {/* Main Card - SMALLER PADDING */}
        <div className="relative z-10 px-4 pb-4">
          <Card className="w-full border-0 shadow-[0_0_40px_-10px_rgba(168,85,247,0.25)] overflow-hidden relative bg-gradient-to-br from-black to-zinc-900/95">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMyMjIiIGZpbGwtb3BhY2l0eT0iMC4wNDUiPjxwYXRoIGQ9Ik0zNiAxOGMxLjIyOCAwIDIuNDM4LjMgMy41MzIuODkxYTE3LjA1IDE3LjA1IDAgMCAxIDIuOTMyIDEuNjQ1Yy44OS42MzUgMS43NDQgMS4zNiAyLjU2MSAyLjE3N2E5OS4xODMgOTkuMTgzIDAgMCAxIDIuMTc4IDIuNTZjLjYzNS44OS0uODkxIDIuOTE4LTEuNjQ1IDIuOTMyQTguMDk1IDguMDk1IDAgMCAwIDQyIDM2YTggOCAwIDEgMC0xNiAwIDguMDk1IDguMDk1IDAgMCAwIDMuNTU5IDYuNjg4Yy43NTQuMDE0IDIuMzE2LTEuNiAyLjk1MS0yLjQ5YTk5LjMwNCA5OS4zMDQgMCAwIDEgMi4xNzgtMi41NjEgMjAuNzkzIDIwLjc5MyAwIDAgMSAyLjU2LTIuMTc3IDE3LjA1IDE3LjA1IDAgMCAxIDIuOTMzLTEuNjQ1QTcuOTQgNy45NCAwIDAgMSAzNiAxOHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-20"></div>
            
            {/* Title Section - SMALLER TEXT AND PADDING */}
            <div className="relative z-10 border-b border-purple-800/60 bg-black/40 px-4 py-3">
              <h1 className="text-xl font-bold text-white flex items-center">
                <span className="bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">Proposed Block</span>
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 ml-2 animate-pulse"></div>
              </h1>
            </div>

            {/* Blockchain node connectors */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute w-full h-full">
                {[...Array(8)].map((_, i) => (
                  <div 
                    key={`connector-${i}`} 
                    className="absolute w-px h-full bg-gradient-to-b from-transparent via-purple-500/20 to-transparent"
                    style={{ left: `${(i + 1) * 12.5}%` }}
                  />
                ))}
                {[...Array(6)].map((_, i) => (
                  <div 
                    key={`h-connector-${i}`} 
                    className="absolute h-px w-full bg-gradient-to-r from-transparent via-purple-500/20 to-transparent"
                    style={{ top: `${(i + 1) * 16.66}%` }}
                  />
                ))}
              </div>
            </div>

            {/* Block metadata header with Public Good Reward metrics - SMALLER PADDING AND TEXT */}
            <div className="relative z-10 bg-black/60 py-2 px-4 border-b border-purple-800/30">
              <div className="grid grid-cols-3 gap-3">
                <div className="px-2 py-1.5 bg-purple-900/20 rounded-lg border border-purple-800/30">
                  <div className="text-xs font-mono text-purple-300 mb-0.5">Public Good Reward</div>
                  <div className="text-xs font-mono text-white font-medium flex items-center">
                    <span className="text-emerald-400 mr-1">+</span>
                    {blocks.reduce((acc, block) => acc + parseFloat(block.expectedMEV), 0).toFixed(3)} ETH
                  </div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">Rewards block proposers</div>
                </div>
                <div className="px-2 py-1.5 bg-purple-900/20 rounded-lg border border-purple-800/30">
                  <div className="text-xs font-mono text-purple-300 mb-0.5">Total Transaction Fees</div>
                  <div className="text-xs font-mono text-white font-medium">
                    {blocks.reduce((acc, block) => acc + parseFloat(block.totalFees), 0).toFixed(3)} ETH
                  </div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">Combined fees across batches</div>
                </div>
                <div className="px-2 py-1.5 bg-purple-900/20 rounded-lg border border-purple-800/30">
                  <div className="text-xs font-mono text-purple-300 mb-0.5">Total Transactions</div>
                  <div className="text-xs font-mono text-white font-medium">
                    {blocks.reduce((acc, block) => acc + block.transactions, 0).toLocaleString()}
                  </div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">Combined across all batches</div>
                </div>
              </div>
            </div>

            <CardContent className="relative z-10 p-4 bg-black/30">
              {error && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 mb-4 text-red-400 text-xs">
                  <h3 className="font-bold flex items-center">
                    <span className="mr-1">⚠️</span> Error
                  </h3>
                  <p>{error}</p>
                </div>
              )}
              
              {/* Blocks container with blockchain styling - SMALLER PADDING */}
              <div className="relative rounded-xl border-2 border-purple-800/50 bg-black/60 p-4 backdrop-blur-sm">
                {/* Decorative hash header - SMALLER */}
                <div className="absolute -top-2 left-6 px-3 py-0.5 bg-black rounded-full border-2 border-purple-800/50 shadow-lg">
                  <div className="flex items-center space-x-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500/80 animate-pulse"></div>
                    <div className="text-[10px] font-mono text-purple-400">BLOCK CONTENTS</div>
                  </div>
                </div>

                {/* Corner decorations - SMALLER */}
                <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-purple-600/50 -translate-x-1/2 -translate-y-1/2"></div>
                <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-purple-600/50 translate-x-1/2 -translate-y-1/2"></div>
                <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-purple-600/50 -translate-x-1/2 translate-y-1/2"></div>
                <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-purple-600/50 translate-x-1/2 translate-y-1/2"></div>

                {/* Side decorations - SMALLER */}
                <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1.5">
                  <div className="w-0.5 h-14 bg-gradient-to-b from-transparent via-purple-500/20 to-transparent rounded"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-500/50"></div>
                  <div className="w-0.5 h-14 bg-gradient-to-b from-transparent via-purple-500/20 to-transparent rounded"></div>
                </div>
                <div className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1.5">
                  <div className="w-0.5 h-14 bg-gradient-to-b from-transparent via-purple-500/20 to-transparent rounded"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-500/50"></div>
                  <div className="w-0.5 h-14 bg-gradient-to-b from-transparent via-purple-500/20 to-transparent rounded"></div>
                </div>

                {/* Background grid pattern with animation */}
                <div className="absolute inset-0 grid grid-cols-6 gap-px pointer-events-none overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/[0.05] to-transparent opacity-50"></div>
                  {[...Array(36)].map((_, i) => (
                    <div 
                      key={i} 
                      className="bg-purple-500/[0.02] border border-purple-500/[0.05] relative overflow-hidden"
                    >
                      <div 
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/10 to-transparent -translate-x-full animate-shimmer"
                        style={{
                          animationDelay: `${i * 0.1}s`
                        }}
                      ></div>
                    </div>
                  ))}
                </div>

                {/* Content wrapper with inner border - SMALLER PADDING */}
                <div className="relative border border-purple-500/10 rounded-lg p-3">
                  {/* Grid layout for blocks - SMALLER GAP */}
                  <div className="grid grid-cols-3 gap-3 relative">
                    {loading && blocks.length === 0 ? (
                      <div className="col-span-3 flex items-center justify-center py-10">
                        <Loader2 className="h-8 w-8 text-purple-500 animate-spin mr-2" />
                        <p className="text-zinc-400 text-base">Loading blocks...</p>
                      </div>
                    ) : (
                      <AnimatePresence mode="popLayout">
                        {blocks.map((block, index) => {
                          // Calculate the percentage of total transactions this block represents
                          const totalTxs = blocks.reduce((acc, curr) => acc + curr.transactions, 0);
                          const txPercentage = Math.round((block.transactions / totalTxs) * 100);
                          
                          // Generate a color based on transaction percentage
                          // Higher percentages get deeper color, lower get lighter
                          const getBackgroundColor = (percent: number, isSequential: boolean) => {
                            if (index === 0) return isSequential ? "bg-orange-900/60" : "bg-purple-900/60"; // Latest block
                            
                            // For sequential blocks - use orange palette
                            if (isSequential) {
                              if (percent >= 40) return "bg-orange-800/50"; 
                              if (percent >= 30) return "bg-orange-700/45";
                              if (percent >= 20) return "bg-orange-600/40";
                              if (percent >= 10) return "bg-orange-500/35";
                              return "bg-orange-400/30";
                            }
                            
                            // For parallel blocks - use purple palette
                            if (percent >= 40) return "bg-purple-800/50"; 
                            if (percent >= 30) return "bg-purple-700/45";
                            if (percent >= 20) return "bg-purple-600/40";
                            if (percent >= 10) return "bg-purple-500/35";
                            return "bg-purple-400/30";
                          };
                          
                          // Generate a border color that matches the background intensity
                          const getBorderColor = (percent: number, isSequential: boolean) => {
                            if (index === 0) return isSequential ? "border-orange-600" : "border-purple-600"; // Latest block
                            
                            // For sequential blocks - use orange palette
                            if (isSequential) {
                              if (percent >= 40) return "border-orange-600";
                              if (percent >= 30) return "border-orange-500"; 
                              if (percent >= 20) return "border-orange-400";
                              if (percent >= 10) return "border-orange-300";
                              return "border-orange-200";
                            }
                            
                            // For parallel blocks - use purple palette
                            if (percent >= 40) return "border-purple-600";
                            if (percent >= 30) return "border-purple-500"; 
                            if (percent >= 20) return "border-purple-400";
                            if (percent >= 10) return "border-purple-300";
                            return "border-purple-200";
                          };
                          
                          const backgroundClass = getBackgroundColor(txPercentage, block.isSequential);
                          const borderClass = getBorderColor(txPercentage, block.isSequential);
                          
                          return (
                            <motion.div
                              key={block.id}
                              initial={{ opacity: 0, y: 16 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.9 }}
                              transition={{ duration: 0.3 }}
                              className={`relative rounded-lg border-2 p-3 backdrop-blur-sm cursor-pointer transform transition-all duration-200 hover:scale-[1.02] ${backgroundClass} ${borderClass} ${
                                index === 0 
                                  ? "shadow-[0_0_20px_-12px_rgba(168,85,247,0.5)]" 
                                  : "hover:border-purple-600/50"
                              }`}
                              onClick={() => handleBlockClick(block)}
                            >
                              {/* Top connector */}
                              <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-px h-2 bg-purple-500/50"></div>
                              
                              <div className="flex items-center justify-between mb-2">
                                <h3 className={`font-semibold text-sm ${index === 0 ? "text-purple-200" : "text-white"}`}>
                                  Batch {block.id}
                                </h3>
                                <div className="flex space-x-1">
                                  {index === 0 && (
                                    <Badge className="bg-purple-600/70 text-purple-100 border-purple-500 text-xs px-2 py-0.5">Latest</Badge>
                                  )}
                                  <Badge className="bg-purple-700/50 text-purple-100 border-purple-500/30 text-[10px] px-1.5 py-0.5">
                                    {txPercentage}% Total
                                  </Badge>
                                </div>
                              </div>
                              
                              <div className="space-y-2">
                                {!block.isSequential ? (
                                  <div className="flex justify-between items-center">
                                    <span className="text-zinc-300 text-xs">Transactions</span>
                                    <span className={index === 0 ? "text-purple-200 text-xs" : "text-white text-xs"}>
                                      <span className="text-blue-200 font-semibold">{getParallelizableTxCount(block)}</span>
                                      <span className="mx-1">/</span> 
                                      <span className="font-semibold">{block.transactions}</span>
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex justify-between items-center">
                                    <span className="text-zinc-300 text-xs">Transactions</span>
                                    <span className={`${index === 0 ? "text-purple-200" : "text-white"} font-semibold text-xs`}>{block.transactions}</span>
                                  </div>
                                )}
                                
                                <div className="flex justify-between items-center py-0.5">
                                  <span className="text-zinc-300 text-xs">Total Fees</span>
                                  <span className={index === 0 ? "text-purple-200 font-semibold text-xs" : "text-white font-semibold text-xs"}>{block.totalFees} ETH</span>
                                </div>
                                
                                <div className="flex items-center justify-between py-0.5">
                                  <span className="text-zinc-300 text-xs">Type</span>
                                  <Badge className={`
                                    px-2 py-0.5 text-xs
                                    ${block.isSequential 
                                      ? "bg-orange-500/30 text-orange-100 border-orange-400" 
                                      : "bg-blue-500/30 text-blue-100 border-blue-400"}
                                  `}>
                                    {block.isSequential ? "Sequential" : "Parallel"}
                                  </Badge>
                                </div>
                                
                                {!block.isSequential && (
                                  <div className="flex justify-between items-center py-0.5">
                                    <span className="text-zinc-300 text-xs">Percent Tx in Batch</span>
                                    <div className="flex items-center">
                                      <div className="w-14 h-1 rounded-full bg-zinc-700 mr-1.5 overflow-hidden">
                                        <div 
                                          className="h-full bg-blue-500 rounded-full"
                                          style={{ 
                                            width: `${Math.round((getParallelizableTxCount(block) / block.transactions) * 100)}%`,
                                            transition: 'width 0.3s ease-in-out'
                                          }}
                                        />
                                      </div>
                                      <span className={index === 0 ? "text-purple-200 font-semibold text-xs" : "text-white font-semibold text-xs"}>
                                        {Math.round((getParallelizableTxCount(block) / blocks.reduce((acc, curr) => acc + curr.transactions, 0)) * 100)}%
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                              
                              {/* Bottom connector */}
                              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-px h-2 bg-purple-500/50"></div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    )}
                  </div>
                </div>

                {/* Decorative hash footer - SMALLER */}
                <div className="absolute -bottom-2 right-6 px-3 py-0.5 bg-black rounded-full border-2 border-purple-800/50 shadow-lg">
                  <div className="flex items-center space-x-1.5">
                    <div className="text-[10px] font-mono text-purple-400/60 w-800">{(() => {
                      return `By Sanjay Amirthraj and Souradeep Das`;
                    })()}</div>
                    <div className="w-1 h-1 rounded-full bg-purple-500/80 animate-pulse"></div>
                  </div>
                </div>
              </div>
              
              {/* Actions row with enhanced styling - SMALLER BUTTONS */}
              <div className="flex justify-between mt-4">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-sm bg-zinc-800/80 border-zinc-700/80 text-zinc-300 hover:bg-zinc-700 px-3 backdrop-blur-sm"
                  onClick={fetchBlocks}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> 
                      Loading...
                    </>
                  ) : (
                    'Fetch Latest Blocks'
                  )}
                </Button>
                
                <div className="flex items-center gap-2">
                  <div className="text-xs text-zinc-400 border border-zinc-800 bg-black/30 px-2 py-1 rounded-md">
                    Last updated: {lastUpdated.toLocaleTimeString()}
                  </div>
                  <Button
                    size="sm"
                    variant={isSimulating ? "destructive" : "default"}
                    className={`text-sm px-3 backdrop-blur-sm ${isSimulating ? "bg-red-600/90 hover:bg-red-700" : "bg-purple-600/90 hover:bg-purple-700"}`}
                    onClick={handleSimulationToggle}
                  >
                    {isSimulating ? (
                      <div className="flex items-center">
                        <div className="mr-1.5 relative">
                          <div className="w-1.5 h-1.5 bg-red-400 rounded-full animate-ping absolute"></div>
                          <div className="w-1.5 h-1.5 bg-red-500 rounded-full relative"></div>
                        </div>
                        Stop Auto Updates
                      </div>
                    ) : (
                      'Start Auto Updates'
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
            
            {/* Bottom border decoration */}
            <div className="relative h-1.5 w-full bg-gradient-to-r from-purple-900/50 via-blue-800/50 to-purple-900/50"></div>
          </Card>
        </div>
      </div>
      
      {/* Outer border indication with animated glow - SMALLER */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500/20 via-purple-600/40 to-purple-500/20 rounded-xl blur-sm group-hover:opacity-100 animate-pulse-slow pointer-events-none"></div>
      
      {/* Complementary accent lights - SMALLER */}
      <div className="absolute top-8 left-8 w-0.5 h-8 bg-purple-500/30 rounded-full blur-sm"></div>
      <div className="absolute bottom-8 right-8 w-0.5 h-8 bg-purple-500/30 rounded-full blur-sm"></div>
    </div>
  );
};

export default BlockStreamVisualization; 

// Add some custom CSS keyframes animations to global style
// NOTE: You'll need to add this to your globals.css or equivalent
/*
@keyframes marquee-slow {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}

.animate-marquee-slow {
  animation: marquee-slow 20s linear infinite;
}

@keyframes shimmer {
  100% { transform: translateX(200%); }
}

.animate-shimmer {
  animation: shimmer 3s infinite;
}
*/ 