import DashboardLayout from "@/components/dashboard-layout";
import TransactionCharts from "@/components/transaction-charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AnalyticsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold gradient-text">Transaction Analytics</h2>
          <div className="flex items-center gap-2">
            <select className="glass-button text-sm px-3 py-2 rounded-md focus:outline-none">
              <option value="24h">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
            </select>
          </div>
        </div>
        
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg text-slate-700">Transaction Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 mb-6">
              These charts show the performance metrics of transaction processing over time, 
              including parallelization rates, gas savings, and reward distributions.
            </p>
            
            <TransactionCharts />
          </CardContent>
        </Card>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="glass-card hover-scale">
            <CardHeader>
              <CardTitle className="text-lg text-slate-700">Top Gas Savers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex justify-between items-center p-2 bg-slate-50 rounded-md">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
                        {i+1}
                      </div>
                      <div>
                        <p className="text-sm font-medium">Validator #{1000 + i}</p>
                        <p className="text-xs text-muted-foreground">
                          {Math.floor(Math.random() * 1000) + 500} blocks processed
                        </p>
                      </div>
                    </div>
                    <div className="text-sm font-medium">{(45 - i * 2).toFixed(1)}% avg</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          <Card className="glass-card hover-scale">
            <CardHeader>
              <CardTitle className="text-lg text-slate-700">Public Good Impact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-green-50 rounded-md border border-green-100">
                <div className="flex justify-between items-center">
                  <p className="text-sm font-medium">Total ETH Distributed</p>
                  <p className="text-lg font-bold text-green-700">125.4 ETH</p>
                </div>
                <p className="text-xs text-slate-500 mt-1">To validators who optimize for parallel execution</p>
              </div>
              
              <div className="p-4 bg-blue-50 rounded-md border border-blue-100">
                <div className="flex justify-between items-center">
                  <p className="text-sm font-medium">Network Efficiency Gain</p>
                  <p className="text-lg font-bold text-blue-700">42.8%</p>
                </div>
                <p className="text-xs text-slate-500 mt-1">Average reduction in gas usage across the network</p>
              </div>
              
              <div className="p-4 bg-teal-50 rounded-md border border-teal-100">
                <div className="flex justify-between items-center">
                  <p className="text-sm font-medium">Carbon Footprint Reduction</p>
                  <p className="text-lg font-bold text-teal-700">38.2%</p>
                </div>
                <p className="text-xs text-slate-500 mt-1">Estimated environmental impact from efficiency gains</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
} 