"use client";

import React, { useRef, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useBlockStore } from "@/lib/store";
import { BlockBatch } from "@/types/block";
import { motion, AnimatePresence } from "framer-motion";

interface BlockStreamProps {
  autoScroll?: boolean;
  onBlockSelect?: (block: BlockBatch) => void;
}

const BlockStreamVisualization = ({ 
  autoScroll = true, 
  onBlockSelect 
}: BlockStreamProps) => {
  const { blocks, addNewBlock, startSimulation, stopSimulation, isSimulating } = useBlockStore();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [selectedBlock, setSelectedBlock] = useState<BlockBatch | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Auto-scroll to the end when new blocks arrive
  useEffect(() => {
    if (autoScroll && scrollContainerRef.current && blocks.length > 0) {
      const scrollContainer = scrollContainerRef.current;
      // Smooth scroll to the end after a small delay to ensure new blocks rendered
      setTimeout(() => {
        scrollContainer.scrollTo({
          left: 0, // Scroll to the start since newest blocks are at the beginning
          behavior: 'smooth'
        });
      }, 100);
    }
  }, [blocks, autoScroll]);

  // Update the last updated timestamp whenever blocks change
  useEffect(() => {
    if (blocks.length > 0) {
      setLastUpdated(new Date());
    }
  }, [blocks]);

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
  
  const getSequentialTxCount = (block: BlockBatch) => {
    if (block.isSequential) return block.transactions;
    return block.sequentialCount || 0;
  };

  const handleSimulationToggle = () => {
    if (isSimulating) {
      stopSimulation();
    } else {
      startSimulation(5000); // New block every 5 seconds
    }
  };

  const handleManualNewBlock = () => {
    addNewBlock();
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
        </div>
      </CardHeader>
      
      <CardContent className="p-6">
        <div 
          className="flex items-stretch gap-4 overflow-x-auto pb-4 hide-scrollbar"
          ref={scrollContainerRef}
        >
          <AnimatePresence mode="popLayout">
            {blocks.map((block, index) => (
              <motion.div
                key={block.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.3 }}
                className={`flex-shrink-0 w-48 p-4 rounded-lg border ${
                  index === 0 
                    ? "bg-purple-900/20 border-purple-700" 
                    : "bg-zinc-800/50 border-zinc-700"
                }`}
                onClick={() => handleBlockClick(block)}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className={`font-medium ${index === 0 ? "text-purple-300" : "text-zinc-300"}`}>
                    Block {block.id}
                  </h3>
                  {index === 0 && (
                    <Badge className="bg-purple-600/50 text-purple-300 border-purple-500 text-xs">Latest</Badge>
                  )}
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Transactions</span>
                    <span className={index === 0 ? "text-purple-300" : "text-zinc-300"}>{block.transactions}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Total Fees</span>
                    <span className={index === 0 ? "text-purple-300" : "text-zinc-300"}>{block.totalFees} ETH</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Type</span>
                    <Badge className={`
                      text-xs px-1.5 py-0.5 
                      ${block.isSequential 
                        ? "bg-orange-500/20 text-orange-300 border-orange-400" 
                        : "bg-blue-500/20 text-blue-300 border-blue-400"}
                    `}>
                      {block.isSequential ? "Sequential" : "Parallel"}
                    </Badge>
                  </div>
                  
                  {!block.isSequential && (
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Parallel Txs</span>
                      <span className={index === 0 ? "text-purple-300" : "text-zinc-300"}>
                        {block.transactions - (block.sequentialCount || 0)} of {block.transactions}
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
};

export default BlockStreamVisualization; 