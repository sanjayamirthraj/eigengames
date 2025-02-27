"use client"
import VisualizationController from "@/components/VisualizationController";

export default function Visualizations() {
  return (
    <div className="px-12 mx-12">
      <div className="mt-8">
        <h2 className="text-white text-xl font-semibold mb-4">Transaction Batching Visualization</h2>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl overflow-hidden">
          <VisualizationController />
        </div>
      </div>
    </div>
  );
}