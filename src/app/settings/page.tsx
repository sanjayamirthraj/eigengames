"use client";

import { useState } from "react";
import DashboardLayout from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  const [walletConnected, setWalletConnected] = useState(false);
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h2 className="text-2xl font-bold gradient-text">Settings</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg text-slate-700">Connection Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Network</label>
                      <select className="w-full glass-button px-3 py-2 rounded-md focus:outline-none">
                        <option value="mainnet">Ethereum Mainnet</option>
                        <option value="goerli">Goerli Testnet</option>
                        <option value="sepolia">Sepolia Testnet</option>
                        <option value="holesky">Holesky Testnet</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">RPC Endpoint</label>
                      <input 
                        type="text" 
                        placeholder="https://mainnet.infura.io/v3/your-api-key" 
                        className="w-full glass-button px-3 py-2 rounded-md focus:outline-none"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Wallet Connection</label>
                    <div className="flex items-center gap-3">
                      <div className={`h-3 w-3 rounded-full ${walletConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <span className="text-sm">{walletConnected ? 'Connected' : 'Disconnected'}</span>
                      <Button 
                        className={walletConnected ? 
                          "bg-red-100 hover:bg-red-200 text-red-700" : 
                          "bg-blue-500 hover:bg-blue-600 text-white"}
                        onClick={() => setWalletConnected(!walletConnected)}
                      >
                        {walletConnected ? 'Disconnect' : 'Connect Wallet'}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg text-slate-700">Block Processing Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Parallelization Strategy</label>
                    <select className="w-full glass-button px-3 py-2 rounded-md focus:outline-none">
                      <option value="optimal">Optimal Balance</option>
                      <option value="maxParallel">Maximize Parallelization</option>
                      <option value="maxFees">Maximize Fee Revenue</option>
                      <option value="maxMEV">Maximize MEV</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Transaction Analysis Depth</label>
                    <div className="flex items-center gap-3">
                      <input 
                        type="range" 
                        min="1" 
                        max="5" 
                        defaultValue="3"
                        className="w-full"
                      />
                      <span className="text-sm font-medium">3</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Higher values provide more accurate parallelization but require more computation.</p>
                  </div>
                  
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="autoRefresh" className="rounded" />
                      <label htmlFor="autoRefresh" className="text-sm text-slate-700">Auto-refresh data</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="showAdvanced" className="rounded" />
                      <label htmlFor="showAdvanced" className="text-sm text-slate-700">Show advanced options</label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="space-y-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg text-slate-700">Appearance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Theme</label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="border border-blue-500 rounded-md p-2 text-center text-sm cursor-pointer bg-white">
                        Light
                      </div>
                      <div className="border border-gray-200 rounded-md p-2 text-center text-sm cursor-pointer">
                        Dark
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Accent Color</label>
                    <div className="grid grid-cols-5 gap-2">
                      {['bg-blue-500', 'bg-teal-500', 'bg-purple-500', 'bg-amber-500', 'bg-rose-500'].map((color, i) => (
                        <div key={i} className={`${color} h-6 rounded-full cursor-pointer ${i === 0 ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}></div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg text-slate-700">Notifications</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-slate-700">Block Processing</label>
                    <div className="relative inline-block w-10 align-middle select-none">
                      <input type="checkbox" id="blockNotif" className="sr-only" defaultChecked />
                      <div className="block h-6 bg-gray-200 rounded-full w-10"></div>
                      <div className="dot absolute left-1 top-1 h-4 w-4 bg-white rounded-full transition"></div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-slate-700">Rewards</label>
                    <div className="relative inline-block w-10 align-middle select-none">
                      <input type="checkbox" id="rewardsNotif" className="sr-only" defaultChecked />
                      <div className="block h-6 bg-gray-200 rounded-full w-10"></div>
                      <div className="dot absolute left-1 top-1 h-4 w-4 bg-white rounded-full transition"></div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-slate-700">System Alerts</label>
                    <div className="relative inline-block w-10 align-middle select-none">
                      <input type="checkbox" id="systemNotif" className="sr-only" defaultChecked />
                      <div className="block h-6 bg-gray-200 rounded-full w-10"></div>
                      <div className="dot absolute left-1 top-1 h-4 w-4 bg-white rounded-full transition"></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <div className="flex justify-end pt-4">
              <Button className="bg-blue-500 text-white">Save Settings</Button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
} 