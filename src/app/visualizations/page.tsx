"use client"
import VisualizationController from "@/components/VisualizationController";
import Link from "next/link";

export default function Visualizations() {
  return (
    <div className="px-12 mx-12">
      <div className="flex items-center pt-6">
        <Link 
          href="/" 
          className="flex items-center space-x-2 text-sm font-medium text-zinc-300 hover:text-white bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 transition-all duration-200 px-3 py-1.5 rounded-md"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400">
            <path d="M19 12H5"></path>
            <path d="M12 19l-7-7 7-7"></path>
          </svg>
          <span>Back to Home</span>
        </Link>
      </div>

      <div className="mt-8">
        <h2 className="text-white text-xl font-semibold mb-4">Transaction Batching Visualization</h2>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl overflow-hidden">
          <VisualizationController />
        </div>
      </div>
    </div>
  );
}