"use client";

import React, { useRef, useState, useEffect, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useBlockStore } from '@/lib/store';
import { Transaction } from '@/types/transaction';

// Dynamically import Three.js components with no SSR
const ThreeScene = dynamic(() => import('./three-scene'), { ssr: false });

// Main component
const TransactionBatchingVisualization = () => {
  const { currentTransactions } = useBlockStore();
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-neutral-800">Transaction Batching Algorithm Visualization</h2>
      </div>
      
      <div className="bg-white border border-neutral-200 rounded-lg shadow-sm p-4">
        <div className="mb-4">
          <p className="text-neutral-600">
            This visualization demonstrates how transactions are batched based on state access patterns and address interactions.
            Transactions that access the same state or interact with the same address cannot be in the same batch.
          </p>
          <div className="mt-2 flex flex-wrap gap-4">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-success-500 mr-2"></div>
              <span className="text-sm text-neutral-600">Parallelizable Transaction</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-warning-500 mr-2"></div>
              <span className="text-sm text-neutral-600">Sequential Transaction</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-0.5 bg-neutral-400 mr-2 border-dashed"></div>
              <span className="text-sm text-neutral-600">Shared State Access</span>
            </div>
          </div>
        </div>
        
        <div className="h-[500px] w-full">
          {currentTransactions.length > 0 ? (
            <Suspense fallback={<div className="h-full flex items-center justify-center"><p>Loading visualization...</p></div>}>
              <ThreeScene transactions={currentTransactions} />
            </Suspense>
          ) : (
            <div className="h-full flex items-center justify-center">
              <p className="text-neutral-500">No transactions available for visualization</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TransactionBatchingVisualization; 