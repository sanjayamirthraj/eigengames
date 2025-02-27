"use client";

import { useEffect } from "react";
import DashboardLayout from "@/components/dashboard-layout";
import HeroSection from "@/components/hero-section";
import BlockStreamVisualization from "@/components/block-stream-visualization";
import TransactionComparison from "@/components/transaction-comparison";
import ParallelizationVisualization from "@/components/parallelization-visualization";
import VisualizationController from "@/components/VisualizationController";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBlockStore } from "@/lib/store";

export default function Home() {
  const { addNewBlock, startSimulation, stopSimulation, isSimulating } = useBlockStore();
  
  // Add a new block when the page loads and start the simulation for continuous updates
  useEffect(() => {
    // Add a small delay to ensure the store is initialized
    const timer = setTimeout(() => {
      addNewBlock();
      
      // Start the simulation for continuous updates every 5 seconds
      if (!isSimulating) {
        startSimulation(5000); // Update every 5 seconds
      }
    }, 500);
    
    // Clean up on unmount
    return () => {
      clearTimeout(timer);
      stopSimulation(); // Stop the simulation when the component unmounts
    };
  }, [addNewBlock, startSimulation, stopSimulation, isSimulating]);
  
  return (
    <DashboardLayout>
      {/* Hero Section - Moved down */}
      <div>
        <HeroSection />
      </div>
      {/* Block Stream Visualization - Moved to top */}
      <div className="mb-8">
        <BlockStreamVisualization />
      </div>
      
      {/* Parallelization Visualization - Added after Block Stream */}
      <div className="mb-8">
        <Card className="bg-zinc-900 border border-zinc-800 shadow-sm rounded-lg overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg text-white">Transaction Batches of Recent Block</CardTitle>
          </CardHeader>
          <CardContent>
            <ParallelizationVisualization />
          </CardContent>
        </Card>
      </div>
      
      {/* Transaction Comparison - Moved to third position
      <div className="mb-8">
        <TransactionComparison />
      </div> */}
    
      
      
      {/* Ethereum Transaction Batching Visualization - Added to bottom */}
      
    </DashboardLayout>
  );
}
