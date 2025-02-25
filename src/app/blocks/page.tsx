import DashboardLayout from "@/components/dashboard-layout";
import BlockParallelization from "@/components/block-parallelization";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function BlocksPage() {
  // Sample data for the dashboard
  const blocks = [
    {
      id: "#1",
      transactions: 12,
      totalFees: "0.234",
      expectedMEV: "0.123",
      isSequential: false,
      sequentialCount: 2
    },
    {
      id: "#2",
      transactions: 8,
      totalFees: "0.198",
      expectedMEV: "0.087",
      isSequential: false,
      sequentialCount: 1
    },
    {
      id: "#3",
      transactions: 15,
      totalFees: "0.167",
      expectedMEV: "0.065",
      isSequential: true,
      sequentialCount: 15
    }
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold gradient-text">Parallelizable Block Options</h2>
          <div className="flex items-center gap-2">
            <select className="glass-button text-sm px-3 py-2 rounded-md focus:outline-none">
              <option value="recent">Recent Blocks</option>
              <option value="optimal">Optimal Efficiency</option>
              <option value="maxFees">Maximum Fees</option>
            </select>
          </div>
        </div>
        
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg text-slate-700">Block Processing Options</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 mb-6">
              The following block options show different ways transactions can be organized for parallel execution. 
              Each option optimizes for different parameters like maximum parallelization, expected MEV, or total fees.
            </p>
            
            <BlockParallelization blocks={blocks} />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
} 