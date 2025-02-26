"use client";

import React, { useRef, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useBlockStore } from "@/lib/store";
import { BlockBatch } from "@/types/block";

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
    <div className="space-y-6">
      <div className="flex justify-end">
        <div className="flex space-x-3">
          <Button 
            variant={isSimulating ? "destructive" : "default"}
            className={`shadow-sm ${isSimulating ? "bg-red-600 hover:bg-red-700" : "bg-purple-600 hover:bg-purple-700"} text-white`}
            onClick={handleSimulationToggle}
            aria-label={isSimulating ? "Stop simulation" : "Start simulation"}
          >
            {isSimulating ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </svg>
                Stop Simulation
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Start Simulation
              </>
            )}
          </Button>
          
          <Button 
            variant="secondary"
            className="shadow-sm bg-black hover:bg-black/80 text-white"
            onClick={handleManualNewBlock}
            aria-label="Add new block"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
              <path d="M5 12h14" />
              <path d="M12 5v14" />
            </svg>
            New Block
          </Button>
        </div>
      </div>

      <ScrollArea className="w-full whitespace-nowrap rounded-lg border border-zinc-800 bg-black shadow-sm">
        <div 
          className="flex p-4 pb-8 gap-4"
          ref={scrollContainerRef}
        >
          {blocks.map((block) => (
            <Card 
              key={block.id}
              className={`min-w-[280px] max-w-[280px] bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:shadow-md cursor-pointer transition-all ${
                selectedBlock?.id === block.id ? "shadow-md border-purple-500 ring-1 ring-purple-500" : ""
              }`}
              onClick={() => handleBlockClick(block)}
              tabIndex={0} 
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleBlockClick(block);
                }
              }}
              aria-label={`Block ${block.id}`}
            >
              <div className="p-4 space-y-4">
                <div className="flex justify-between items-center">
                  <Badge variant="outline" className="text-xs font-mono bg-black text-zinc-400 border-zinc-700">
                    {block.id}
                  </Badge>
                  <Badge 
                    variant={block.isSequential ? "outline" : "default"} 
                    className={`text-xs ${block.isSequential 
                      ? "bg-zinc-800 text-zinc-300 border-zinc-700" 
                      : "bg-purple-900 text-purple-100 border-purple-700"}`}
                  >
                    {block.isSequential ? "Sequential" : "Parallel"}
                  </Badge>
                </div>
                
                {/* Visual representation of block structure */}
                <div className="border border-zinc-800 rounded-lg p-3 space-y-2 bg-black">
                  {/* Parallelizable batches */}
                  {!block.isSequential && getParallelizableTxCount(block) > 0 && (
                    <>
                      <div className="border border-purple-800 rounded-md p-2 bg-purple-950">
                        <div className="flex justify-between">
                          <span className="text-xs font-medium text-purple-300">Parallelizable batch #1</span>
                          <span className="text-xs text-purple-400">
                            {Math.floor(getParallelizableTxCount(block) / 2)} transactions
                          </span>
                        </div>
                      </div>
                      
                      {getParallelizableTxCount(block) > 2 && (
                        <div className="text-center text-zinc-500 text-xs my-1">⋮</div>
                      )}
                      
                      <div className="border border-purple-800 rounded-md p-2 bg-purple-950">
                        <div className="flex justify-between">
                          <span className="text-xs font-medium text-purple-300">Parallelizable batch #n</span>
                          <span className="text-xs text-purple-400">
                            {Math.ceil(getParallelizableTxCount(block) / 2)} transactions
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                  
                  {/* Sequential section - always present */}
                  <div 
                    className={`border rounded-md p-2 ${
                      block.isSequential 
                        ? "border-zinc-700 bg-zinc-800" 
                        : "border-zinc-800 bg-zinc-900"
                    }`}
                  >
                    <div className="flex justify-between">
                      <span className={`text-xs font-medium ${block.isSequential ? "text-white" : "text-zinc-300"}`}>
                        Sequential
                      </span>
                      <span className={`text-xs ${block.isSequential ? "text-zinc-300" : "text-zinc-400"}`}>
                        {getSequentialTxCount(block)} transactions
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Block metrics */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-zinc-500">Expected MEV</div>
                    <div className="text-sm font-medium text-white">{block.expectedMEV} ETH</div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-500">Total Fees</div>
                    <div className="text-sm font-medium text-white">{block.totalFees} ETH</div>
                  </div>
                </div>
                
                {/* Parallelization rate */}
                {!block.isSequential && (
                  <div className="pt-2">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-zinc-500">Parallelization Rate</span>
                      <span className="text-xs font-medium text-white">
                        {Math.round((getParallelizableTxCount(block) / block.transactions) * 100)}%
                      </span>
                    </div>
                    <div className="bg-zinc-800 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-purple-600 h-full rounded-full"
                        style={{ width: `${(getParallelizableTxCount(block) / block.transactions) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {selectedBlock && showDetails && (
        <Card className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl mt-4 shadow-sm">
          <h3 className="text-lg font-medium text-white mb-4">Block {selectedBlock.id} Details</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-white mb-2">Transaction Breakdown</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-zinc-400">Total Transactions</span>
                    <span className="text-sm font-medium text-white">{selectedBlock.transactions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-zinc-400">Sequential Transactions</span>
                    <span className="text-sm font-medium text-white">{getSequentialTxCount(selectedBlock)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-zinc-400">Parallelizable Transactions</span>
                    <span className="text-sm font-medium text-white">{getParallelizableTxCount(selectedBlock)}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-white mb-2">Efficiency Metrics</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-zinc-400">Gas Efficiency Gain</span>
                    <span className="text-sm font-medium text-purple-400">
                      {selectedBlock.isSequential ? "0%" : `${Math.round((getParallelizableTxCount(selectedBlock) / selectedBlock.transactions) * 40)}%`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-zinc-400">Execution Time Saved</span>
                    <span className="text-sm font-medium text-purple-400">
                      {selectedBlock.isSequential ? "0ms" : `${Math.round((getParallelizableTxCount(selectedBlock) / selectedBlock.transactions) * 350)}ms`}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-white mb-2">Economic Impact</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-zinc-400">Total Fees</span>
                    <span className="text-sm font-medium text-white">{selectedBlock.totalFees} ETH</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-zinc-400">Expected MEV</span>
                    <span className="text-sm font-medium text-white">{selectedBlock.expectedMEV} ETH</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-zinc-400">Validator Reward</span>
                    <span className="text-sm font-medium text-white">
                      {(parseFloat(selectedBlock.totalFees) + parseFloat(selectedBlock.expectedMEV)).toFixed(3)} ETH
                    </span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-white mb-2">Optimization Potential</h4>
                <div className="p-3 rounded-md bg-purple-950 border border-purple-800">
                  <p className="text-sm text-zinc-300">
                    {selectedBlock.isSequential 
                      ? "This block is fully sequential and cannot be parallelized with the current transaction set."
                      : `This block has ${Math.round((getParallelizableTxCount(selectedBlock) / selectedBlock.transactions) * 100)}% parallelization potential, which could be further optimized with transaction reordering.`
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default BlockStreamVisualization; 