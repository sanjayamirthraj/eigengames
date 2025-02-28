'use client'
import { init, OpacityEnvironment, get as opacityGet } from '@opacity-labs/react-native-opacity'
import { useEffect, useState } from 'react'
import { Button } from 'react-native'
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { motion, AnimatePresence } from "framer-motion"

interface TransactionBatch {
  id: string;
  transactions: number;
  totalFees: string;
  isSequential: boolean;
  timestamp: string;
}

function Home(): React.JSX.Element {
  const [result, setResult] = useState("")
  const [batches, setBatches] = useState<TransactionBatch[]>([])
  const [flashingBatches, setFlashingBatches] = useState<{[key: string]: boolean}>({})
  
  useEffect(() => {
    init({
      apiKey: "eigengames-15f3b854-8e7f-41a8-8f02-8503537ef1ac", 
      dryRun: false, 
      environment: OpacityEnvironment.Production, 
      shouldShowErrorsInWebView: true
    })

    // Generate some mock transaction batches
    generateMockBatches()
  }, [])

  const generateMockBatches = () => {
    const mockBatches: TransactionBatch[] = [];
    
    for (let i = 1; i <= 6; i++) {
      const txCount = Math.floor(Math.random() * 200) + 20;
      mockBatches.push({
        id: `#${i}`,
        transactions: txCount,
        totalFees: (txCount * 0.003).toFixed(3),
        isSequential: i % 3 === 0, // Every third batch is sequential
        timestamp: new Date().toISOString()
      });
    }
    
    setBatches(mockBatches);
  }

  const getGitHubProfile = async (evt:any) => {
    try {
      const profile = await opacityGet('flow:github:profile');
      setResult(JSON.stringify(profile, null, 2));
      
      // Flash a random batch to simulate update
      const randomBatchId = batches[Math.floor(Math.random() * batches.length)]?.id;
      if (randomBatchId) {
        setFlashingBatches({ [randomBatchId]: true });
        setTimeout(() => setFlashingBatches({}), 2000);
      }
    } catch (error) {
      setResult(JSON.stringify({error: "Failed to fetch profile"}, null, 2));
    }
  }

  // Calculate color based on transaction percentage - same logic as block-stream-visualization
  const getColorStyles = (batch: TransactionBatch) => {
    // Calculate total transactions
    const totalTxs = batches.reduce((acc, curr) => acc + curr.transactions, 0);
    // Calculate percentage of this batch's transactions
    const txPercentage = totalTxs > 0 ? Math.round((batch.transactions / totalTxs) * 100) : 0;
    
    // Background color logic
    const getBackgroundColor = (percent: number, isSequential: boolean) => {
      // For sequential blocks - use orange palette
      if (isSequential) {
        if (percent >= 40) return "bg-orange-800/50"; 
        if (percent >= 30) return "bg-orange-700/45";
        if (percent >= 20) return "bg-orange-600/40";
        if (percent >= 10) return "bg-orange-500/35";
        return "bg-orange-400/30";
      }
      
      // For parallel blocks - use purple palette
      if (percent >= 40) return "bg-purple-800/50"; 
      if (percent >= 30) return "bg-purple-700/45";
      if (percent >= 20) return "bg-purple-600/40";
      if (percent >= 10) return "bg-purple-500/35";
      return "bg-purple-400/30";
    };
    
    // Border color logic
    const getBorderColor = (percent: number, isSequential: boolean) => {
      // For sequential blocks - use orange palette
      if (isSequential) {
        if (percent >= 40) return "border-orange-600";
        if (percent >= 30) return "border-orange-500"; 
        if (percent >= 20) return "border-orange-400";
        if (percent >= 10) return "border-orange-300";
        return "border-orange-200";
      }
      
      // For parallel blocks - use purple palette
      if (percent >= 40) return "border-purple-600";
      if (percent >= 30) return "border-purple-500"; 
      if (percent >= 20) return "border-purple-400";
      if (percent >= 10) return "border-purple-300";
      return "border-purple-200";
    };
    
    return {
      backgroundClass: getBackgroundColor(txPercentage, batch.isSequential),
      borderClass: getBorderColor(txPercentage, batch.isSequential),
      isFlashing: flashingBatches[batch.id] === true
    };
  };

  return (
    <div className="relative py-8 px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 mx-auto">
      {/* Main content wrapper with visible border */}
      <div className="relative z-10 border-2 border-purple-500/30 rounded-xl overflow-hidden shadow-[0_0_24px_-5px_rgba(168,85,247,0.3)]">
        {/* Header */}
        <div className="relative z-10 mb-4 bg-black/50 border-b border-purple-500/50 px-4 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <div className="h-6 w-1 bg-purple-500 rounded-full"></div>
              <h2 className="text-lg font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">Opacity SDK Integration</h2>
            </div>
          </div>
        </div>
        
        <div className="relative z-10 px-4 pb-4">
          <Card className="w-full border-0 shadow-[0_0_40px_-10px_rgba(168,85,247,0.25)] overflow-hidden relative bg-gradient-to-br from-black to-zinc-900/95">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMyMjIiIGZpbGwtb3BhY2l0eT0iMC4wNDUiPjxwYXRoIGQ9Ik0zNiAxOGMxLjIyOCAwIDIuNDM4LjMgMy41MzIuODkxYTE3LjA1IDE3LjA1IDAgMCAxIDIuOTMyIDEuNjQ1Yy44OS42MzUgMS43NDQgMS4zNiAyLjU2MSAyLjE3N2E5OS4xODMgOTkuMTgzIDAgMCAxIDIuMTc4IDIuNTZjLjYzNS44OS0uODkxIDIuOTE4LTEuNjQ1IDIuOTMyQTguMDk1IDguMDk1IDAgMCAwIDQyIDM2YTggOCAwIDEgMC0xNiAwIDguMDk1IDguMDk1IDAgMCAwIDMuNTU5IDYuNjg4Yy43NTQuMDE0IDIuMzE2LTEuNiAyLjk1MS0yLjQ5YTk5LjMwNCA5OS4zMDQgMCAwIDEgMi4xNzgtMi41NjEgMjAuNzkzIDIwLjc5MyAwIDAgMSAyLjU2LTIuMTc3IDE3LjA1IDE3LjA1IDAgMCAxIDIuOTMzLTEuNjQ1QTcuOTQgNy45NCAwIDAgMSAzNiAxOHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-20"></div>
            
            {/* Title Section */}
            <div className="relative z-10 border-b border-purple-800/60 bg-black/40 px-4 py-3">
              <h1 className="text-xl font-bold text-white flex items-center">
                <span className="bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">Transaction Batches</span>
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 ml-2 animate-pulse"></div>
              </h1>
            </div>

            <CardContent className="relative z-10 p-4 bg-black/30">
              {/* Actions */}
              <div className="mb-4 flex justify-start">
                <Button
                  title="Get GitHub Profile"
                  onPress={getGitHubProfile}
                  color="#9333ea"
                />
              </div>

              {/* Result display */}
              {result && (
                <div className="mb-4 p-3 border border-purple-500/30 rounded-lg bg-black/40">
                  <pre className="text-xs text-white overflow-auto">{result}</pre>
                </div>
              )}
              
              {/* Transaction Batches Grid */}
              <div className="rounded-xl border-2 border-purple-800/50 bg-black/60 p-4 backdrop-blur-sm">
                <div className="absolute -top-2 left-6 px-3 py-0.5 bg-black rounded-full border-2 border-purple-800/50 shadow-lg">
                  <div className="flex items-center space-x-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500/80 animate-pulse"></div>
                    <div className="text-[10px] font-mono text-purple-400">TRANSACTION BATCHES</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                  <AnimatePresence mode="popLayout">
                    {batches.map((batch) => {
                      const { backgroundClass, borderClass, isFlashing } = getColorStyles(batch);
                      const flashClass = isFlashing 
                        ? "ring-4 ring-white shadow-[0_0_40px_rgba(255,255,255,0.7)]" 
                        : "";
                        
                      return (
                        <motion.div
                          key={batch.id}
                          initial={{ opacity: 0, y: 16 }}
                          animate={{ 
                            opacity: 1, 
                            y: 0,
                            scale: isFlashing ? [1, 1.1, 1] : 1,
                          }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ 
                            duration: 0.3,
                            scale: {
                              duration: 0.7,
                              repeat: isFlashing ? 2 : 0,
                              ease: "easeInOut"
                            }
                          }}
                          className={`relative rounded-lg border-2 p-3 backdrop-blur-sm cursor-pointer transform transition-all duration-200 hover:scale-[1.02] ${backgroundClass} ${borderClass} ${
                            "shadow-[0_0_20px_-12px_rgba(168,85,247,0.5)]"
                          } ${flashClass}`}
                        >
                          {isFlashing && (
                            <div className="absolute inset-0 rounded-lg animate-pulse bg-white opacity-20 pointer-events-none" />
                          )}
                          
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-sm text-white">
                              Batch {batch.id}
                            </h3>
                            <Badge className="bg-purple-700/50 text-purple-100 border-purple-500/30 text-[10px] px-1.5 py-0.5">
                              {batch.transactions} Transactions
                            </Badge>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex justify-between items-center py-0.5">
                              <span className="text-zinc-300 text-xs">Total Fees</span>
                              <span className="text-white font-semibold text-xs">{batch.totalFees} ETH</span>
                            </div>
                            
                            <div className="flex items-center justify-between py-0.5">
                              <span className="text-zinc-300 text-xs">Type</span>
                              <Badge className={`
                                px-2 py-0.5 text-xs
                                ${batch.isSequential 
                                  ? "bg-orange-500/30 text-orange-100 border-orange-400" 
                                  : "bg-blue-500/30 text-blue-100 border-blue-400"}
                              `}>
                                {batch.isSequential ? "Sequential" : "Parallel"}
                              </Badge>
                            </div>
                            
                            <div className="flex justify-between items-center py-0.5">
                              <span className="text-zinc-300 text-xs">Percent of Total</span>
                              <div className="flex items-center">
                                <div className="w-14 h-1 rounded-full bg-zinc-700 mr-1.5 overflow-hidden">
                                  <div 
                                    className="h-full bg-purple-500 rounded-full"
                                    style={{ 
                                      width: `${Math.round((batch.transactions / batches.reduce((acc, curr) => acc + curr.transactions, 0)) * 100)}%`,
                                      transition: 'width 0.3s ease-in-out'
                                    }}
                                  />
                                </div>
                                <span className="text-white font-semibold text-xs">
                                  {Math.round((batch.transactions / batches.reduce((acc, curr) => acc + curr.transactions, 0)) * 100)}%
                                </span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>
            </CardContent>
            
            {/* Bottom border decoration */}
            <div className="relative h-1.5 w-full bg-gradient-to-r from-purple-900/50 via-blue-800/50 to-purple-900/50"></div>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default Home;