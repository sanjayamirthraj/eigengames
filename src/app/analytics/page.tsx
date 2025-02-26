import DashboardLayout from "@/components/dashboard-layout";
import TransactionCharts from "@/components/transaction-charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AnalyticsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Transaction Analytics</h2>
          <div className="flex items-center gap-2">
            <select className="bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500">
              <option value="24h">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
            </select>
          </div>
        </div>
        
        <Card className="bg-zinc-900 border border-zinc-800 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-white">Transaction Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-400 mb-6">
              These charts show the performance metrics of transaction processing over time, 
              including parallelization rates, gas savings, and reward distributions.
            </p>
            
            <TransactionCharts />
          </CardContent>
        </Card>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-zinc-900 border border-zinc-800 shadow-sm transition-all hover:shadow-md">
            <CardHeader>
              <CardTitle className="text-lg text-white">Top Gas Savers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex justify-between items-center p-2 bg-zinc-800/50 rounded-md">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-purple-900/30 flex items-center justify-center text-purple-400 font-medium">
                        {i+1}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">Validator #{1000 + i}</p>
                        <p className="text-xs text-zinc-400">
                          {Math.floor(Math.random() * 1000) + 500} blocks processed
                        </p>
                      </div>
                    </div>
                    <div className="text-sm font-medium text-purple-400">{(45 - i * 2).toFixed(1)}% avg</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-zinc-900 border border-zinc-800 shadow-sm transition-all hover:shadow-md">
            <CardHeader>
              <CardTitle className="text-lg text-white">Public Good Impact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-zinc-800/50 rounded-md border border-zinc-700">
                <div className="flex justify-between items-center">
                  <p className="text-sm font-medium text-zinc-300">Total ETH Distributed</p>
                  <p className="text-lg font-bold text-purple-400">125.4 ETH</p>
                </div>
                <p className="text-xs text-zinc-500 mt-1">To validators who optimize for parallel execution</p>
              </div>
              
              <div className="p-4 bg-zinc-800/50 rounded-md border border-zinc-700">
                <div className="flex justify-between items-center">
                  <p className="text-sm font-medium text-zinc-300">Network Efficiency Gain</p>
                  <p className="text-lg font-bold text-purple-400">42.8%</p>
                </div>
                <p className="text-xs text-zinc-500 mt-1">Average reduction in gas usage across the network</p>
              </div>
              
              <div className="p-4 bg-zinc-800/50 rounded-md border border-zinc-700">
                <div className="flex justify-between items-center">
                  <p className="text-sm font-medium text-zinc-300">Carbon Footprint Reduction</p>
                  <p className="text-lg font-bold text-purple-400">38.2%</p>
                </div>
                <p className="text-xs text-zinc-500 mt-1">Estimated environmental impact from efficiency gains</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
} 