import React, { useState, useEffect } from 'react';
import { useBlockStore } from '../lib/store';
import EthereumTransactionBatching from './visualization';

const VisualizationController: React.FC = () => {
  const { 
    blocks, 
    currentTransactions, 
    loading, 
    error, 
    fetchBlocksFromAPI, 
    startSimulation, 
    stopSimulation, 
    isSimulating 
  } = useBlockStore();
  const [showControl, setShowControl] = useState(false);

  // Initial fetch
  useEffect(() => {
    console.log("VisualizationController: Fetching blocks from API");
    fetchBlocksFromAPI().then(() => {
      console.log("VisualizationController: Blocks fetched successfully");
    }).catch(err => {
      console.error("VisualizationController: Error fetching blocks:", err);
    });
  }, [fetchBlocksFromAPI]);

  // Handle server connection issues
  if (error) {
    return (
      <div className="flex flex-col w-full bg-zinc-900 text-white rounded-lg p-4">
        <h2 className="text-xl font-bold text-red-400">Server Connection Error</h2>
        <p className="text-zinc-400 mt-2">
          Could not connect to the backend server: {error}
        </p>
        <div className="mt-4">
          <button 
            onClick={() => fetchBlocksFromAPI()}
            className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  if (loading && blocks.length === 0) {
    return (
      <div className="flex flex-col w-full bg-zinc-900 text-white rounded-lg p-4">
        <h2 className="text-xl font-bold">Loading Data</h2>
        <p className="text-zinc-400 mt-2">
          Connecting to the backend server...
        </p>
        <div className="flex justify-center mt-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
        </div>
      </div>
    );
  }

  // Prepare data format for visualization component
  const adaptedData = {
    currentBlock: blocks[0] ? {
      id: blocks[0].id,
      transactions: {
        parallel: blocks[0].isSequential ? [] : Array(blocks[0].transactions - (blocks[0].sequentialCount || 0)).fill('placeholder-tx'),
        sequential: blocks[0].isSequential ? Array(blocks[0].transactions).fill('placeholder-tx') : Array(blocks[0].sequentialCount || 0).fill('placeholder-tx')
      }
    } : null,
    blockHistory: {
      parallel: blocks.filter(block => !block.isSequential).map(block => ({
        id: block.id,
        transactions: Array(block.transactions - (block.sequentialCount || 0)).fill('placeholder-tx'),
        gasUsed: parseInt((Math.random() * 1000000).toFixed(0)),
        timeToMine: parseInt((Math.random() * 100).toFixed(0)),
        timestamp: new Date().getTime()
      })),
      sequential: blocks.filter(block => block.isSequential).map(block => ({
        id: block.id,
        transactions: Array(block.transactions).fill('placeholder-tx'),
        gasUsed: parseInt((Math.random() * 2000000).toFixed(0)),
        timeToMine: parseInt((Math.random() * 200).toFixed(0)),
        timestamp: new Date().getTime()
      }))
    }
  };

  return (
    <div className="flex flex-col w-full bg-zinc-900 text-white rounded-lg">
      {showControl && (
        <div className="p-4 border-b border-zinc-800 bg-zinc-800/50">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-semibold">Block Server Control Panel</h3>
              <p className="text-xs text-zinc-400">
                Server Status: <span className={`font-bold ${loading ? 'text-yellow-400' : 'text-green-400'}`}>
                  {loading ? 'Loading' : 'Connected'}
                </span>
              </p>
            </div>
            <button 
              onClick={() => setShowControl(false)}
              className="text-zinc-400 hover:text-white text-sm"
            >
              Hide Panel
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div className="flex flex-col bg-zinc-900 p-2 rounded">
              <div className="text-xs text-zinc-400">Latest Block</div>
              <div className="text-sm font-bold">{blocks[0]?.id || 'Unknown'}</div>
            </div>
            <div className="flex flex-col bg-zinc-900 p-2 rounded">
              <div className="text-xs text-zinc-400">Transactions</div>
              <div className="text-sm font-bold">
                Total: {blocks.reduce((sum, block) => sum + block.transactions, 0)}
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-2">
            <button 
              onClick={() => fetchBlocksFromAPI()}
              className="bg-zinc-600 hover:bg-zinc-700 text-white py-1 px-2 text-xs rounded"
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Refresh Blocks'}
            </button>
            <button 
              onClick={() => isSimulating ? stopSimulation() : startSimulation(5000)}
              className={`${isSimulating ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} text-white py-1 px-2 text-xs rounded`}
            >
              {isSimulating ? 'Stop Auto Updates' : 'Start Auto Updates'}
            </button>
          </div>
        </div>
      )}

      {!showControl && (
        <div className="flex justify-end p-2">
          <button 
            onClick={() => setShowControl(true)}
            className="text-zinc-500 hover:text-white text-xs"
          >
            Show Server Control
          </button>
        </div>
      )}

      {/* Pass adapted data to visualization component */}
      <EthereumTransactionBatching 
        serverData={adaptedData}
        onRefreshRequest={fetchBlocksFromAPI}
        onAddMockTransactions={() => fetchBlocksFromAPI()}
      />
    </div>
  );
};

export default VisualizationController; 