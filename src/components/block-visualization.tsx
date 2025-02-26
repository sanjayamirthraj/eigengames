"use client";

import React, { useState } from "react";
import BlockStream from "./block-stream";
import BlockDetails from "./block-details";

interface Block {
  blockNumber: number;
  transactions: string[];
  totalFees: string;
  type: 'parallel' | 'sequential';
  parallelRatio?: number;
}

interface BlockVisualizationProps {
  autoRefresh?: boolean;
  refreshInterval?: number;
  debugMode?: boolean;
}

const BlockVisualization = ({
  autoRefresh = true,
  refreshInterval = 5000,
  debugMode = false
}: BlockVisualizationProps) => {
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);

  // Handle block selection from BlockStream
  const handleBlockSelect = (block: Block) => {
    setSelectedBlock(block);
    // Scroll to the details section if on mobile
    if (window.innerWidth < 768) {
      setTimeout(() => {
        const detailsElement = document.getElementById('block-details');
        if (detailsElement) {
          detailsElement.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
  };

  // Handle closing the details panel
  const handleCloseDetails = () => {
    setSelectedBlock(null);
  };

  return (
    <div className="space-y-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Block Stream</h1>
        <p className="text-sm text-gray-500">Visualizing the most recent blocks with parallelization information</p>
      </div>
      
      {/* Block Stream Component */}
      <BlockStream 
        autoRefresh={autoRefresh}
        refreshInterval={refreshInterval}
        debugMode={debugMode}
        onBlockSelect={handleBlockSelect}
      />
      
      {/* Block Details Component - shown when a block is selected */}
      <div id="block-details">
        {selectedBlock && (
          <BlockDetails 
            block={selectedBlock}
            onClose={handleCloseDetails}
          />
        )}
      </div>
    </div>
  );
};

export default BlockVisualization; 