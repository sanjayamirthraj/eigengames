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
  const { addNewBlock, startSimulation: startquery, stopSimulation: stopquery, isSimulating: isquerying } = useBlockStore();
  
  useEffect(() => {
    const timer = setTimeout(() => {
      addNewBlock();
      
      if (!isquerying) {
        startquery(5000);
      }
    }, 500);
    
    return () => {
      clearTimeout(timer);
      stopquery();
    };
  }, [addNewBlock, startquery, stopquery, isquerying]);
  
  return (
    <DashboardLayout>
      <div suppressHydrationWarning={true}>
        <HeroSection />
      </div>
      <div className="mb-8">
        <BlockStreamVisualization />
      </div>
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
      
    </DashboardLayout>
  );
}
