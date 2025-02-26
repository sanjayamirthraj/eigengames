"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar
} from "recharts";
import { generateChartData, generateTxTypeData } from "@/lib/utils";

interface TransactionChartsProps {
  className?: string;
}

const TransactionCharts = ({ className }: TransactionChartsProps) => {
  const chartData = React.useMemo(() => generateChartData(), []);
  const txTypeData = React.useMemo(() => generateTxTypeData(), []);
  const COLORS = ["#a855f7", "#3f3f46"]; // purple-500, zinc-700

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 ${className}`}>
      <Card className="bg-zinc-900 border border-zinc-800 shadow-sm overflow-hidden">
        <CardHeader>
          <CardTitle className="text-lg text-white">Transaction Types (24h)</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{
                  top: 10,
                  right: 30,
                  left: 0,
                  bottom: 0,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" /> {/* zinc-800 */}
                <XAxis 
                  dataKey="time" 
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: "#a1a1aa" }} {/* zinc-400 */}
                />
                <YAxis 
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: "#a1a1aa" }} {/* zinc-400 */}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "rgba(24, 24, 27, 0.8)", // zinc-900
                    borderRadius: "8px",
                    backdropFilter: "blur(8px)",
                    border: "1px solid rgba(63, 63, 70, 1)", // zinc-700
                    color: "#ffffff"
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="parallelTx" 
                  stackId="1"
                  stroke="#a855f7" /* purple-500 */
                  fill="url(#colorParallel)" 
                  name="Parallelizable Tx"
                />
                <Area 
                  type="monotone" 
                  dataKey="sequentialTx" 
                  stackId="1"
                  stroke="#3f3f46" /* zinc-700 */
                  fill="url(#colorSequential)" 
                  name="Sequential Tx"
                />
                <defs>
                  <linearGradient id="colorParallel" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.8}/> {/* purple-500 */}
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0.1}/> {/* purple-500 */}
                  </linearGradient>
                  <linearGradient id="colorSequential" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3f3f46" stopOpacity={0.8}/> {/* zinc-700 */}
                    <stop offset="95%" stopColor="#3f3f46" stopOpacity={0.1}/> {/* zinc-700 */}
                  </linearGradient>
                </defs>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-zinc-900 border border-zinc-800 shadow-sm overflow-hidden">
        <CardHeader>
          <CardTitle className="text-lg text-white">Current Transaction Distribution</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center h-[300px]">
            <div className="w-full max-w-[300px]">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={txTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={90}
                    innerRadius={60}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {txTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend verticalAlign="bottom" height={36} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "rgba(24, 24, 27, 0.8)", // zinc-900
                      borderRadius: "8px",
                      backdropFilter: "blur(8px)",
                      border: "1px solid rgba(63, 63, 70, 1)", // zinc-700
                      color: "#ffffff"
                    }}
                    formatter={(value) => [`${value}%`, "Percentage"]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-zinc-900 border border-zinc-800 shadow-sm overflow-hidden lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-lg text-white">Public Good Rewards (Last 30 Days)</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={Array.from({ length: 30 }).map((_, i) => ({
                  day: i + 1,
                  amount: Math.random() * 1.5 + 0.5
                }))}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" /> {/* zinc-800 */}
                <XAxis 
                  dataKey="day" 
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: "#a1a1aa" }} {/* zinc-400 */}
                />
                <YAxis 
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: "#a1a1aa" }} {/* zinc-400 */}
                  tickFormatter={(value) => `${value.toFixed(1)} ETH`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "rgba(24, 24, 27, 0.8)", // zinc-900
                    borderRadius: "8px",
                    backdropFilter: "blur(8px)",
                    border: "1px solid rgba(63, 63, 70, 1)", // zinc-700
                    color: "#ffffff"
                  }}
                  formatter={(value) => [`${value.toFixed(4)} ETH`, "Reward"]}
                  labelFormatter={(value) => `Day ${value}`}
                />
                <Bar 
                  dataKey="amount" 
                  fill="url(#colorBar)" 
                  radius={[4, 4, 0, 0]}
                  name="ETH Rewards"
                />
                <defs>
                  <linearGradient id="colorBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#9333ea" stopOpacity={0.8}/> {/* purple-600 */}
                    <stop offset="100%" stopColor="#6b21a8" stopOpacity={0.8}/> {/* purple-800 */}
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TransactionCharts; 