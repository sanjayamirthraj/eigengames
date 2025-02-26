import React, { useState } from 'react';
import { useOperatorApi } from '../lib/useOperatorApi';
import EthereumTransactionBatching from './visualization';

const VisualizationController: React.FC = () => {
  const [apiState, apiActions] = useOperatorApi();
  const [showApiControl, setShowApiControl] = useState(false);

  // Handle server connection issues
  if (apiState.error) {
    return (
      <div className="flex flex-col w-full bg-zinc-900 text-white rounded-lg p-4">
        <h2 className="text-xl font-bold text-red-400">Server Connection Error</h2>
        <p className="text-zinc-400 mt-2">
          Could not connect to the operator server: {apiState.error}
        </p>
        <div className="mt-4">
          <button 
            onClick={() => apiActions.refresh()}
            className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  if (apiState.loading && !apiState.currentBlock) {
    return (
      <div className="flex flex-col w-full bg-zinc-900 text-white rounded-lg p-4">
        <h2 className="text-xl font-bold">Loading Data</h2>
        <p className="text-zinc-400 mt-2">
          Connecting to the operator server...
        </p>
        <div className="flex justify-center mt-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full bg-zinc-900 text-white rounded-lg">
      {showApiControl && (
        <div className="p-4 border-b border-zinc-800 bg-zinc-800/50">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-semibold">Operator Server Control Panel</h3>
              <p className="text-xs text-zinc-400">
                Server Status: <span className={`font-bold ${apiState.status?.status === 'idle' ? 'text-green-400' : apiState.status?.status === 'processing' ? 'text-yellow-400' : 'text-red-400'}`}>
                  {apiState.status?.status || 'Unknown'}
                </span>
              </p>
            </div>
            <button 
              onClick={() => setShowApiControl(false)}
              className="text-zinc-400 hover:text-white text-sm"
            >
              Hide Panel
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div className="flex flex-col bg-zinc-900 p-2 rounded">
              <div className="text-xs text-zinc-400">Current Block</div>
              <div className="text-sm font-bold">{apiState.currentBlock?.id || 'Unknown'}</div>
            </div>
            <div className="flex flex-col bg-zinc-900 p-2 rounded">
              <div className="text-xs text-zinc-400">Transactions</div>
              <div className="text-sm font-bold">
                P: {apiState.currentBlock?.transactions.parallel.length || 0} / 
                S: {apiState.currentBlock?.transactions.sequential.length || 0}
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-2">
            <button 
              onClick={() => apiActions.addMockTransactions(5)}
              className="bg-blue-600 hover:bg-blue-700 text-white py-1 px-2 text-xs rounded"
            >
              Add 5 Txs
            </button>
            <button 
              onClick={() => apiActions.triggerSimulation()}
              className="bg-green-600 hover:bg-green-700 text-white py-1 px-2 text-xs rounded"
            >
              Trigger Simulation
            </button>
            <button 
              onClick={() => apiActions.createNewBlock()}
              className="bg-purple-600 hover:bg-purple-700 text-white py-1 px-2 text-xs rounded"
            >
              New Block
            </button>
            <button 
              onClick={() => apiActions.refresh()}
              className="bg-zinc-600 hover:bg-zinc-700 text-white py-1 px-2 text-xs rounded"
            >
              Refresh
            </button>
          </div>
        </div>
      )}

      {!showApiControl && (
        <div className="flex justify-end p-2">
          <button 
            onClick={() => setShowApiControl(true)}
            className="text-zinc-500 hover:text-white text-xs"
          >
            Show Server Control
          </button>
        </div>
      )}

      {/* Pass API data to visualization component */}
      <EthereumTransactionBatching 
        serverData={{
          currentBlock: apiState.currentBlock,
          blockHistory: apiState.blockHistory,
          simulationResults: apiState.simulationResults,
          parallelGroups: apiState.parallelGroups,
          sequentialGroup: apiState.sequentialGroup,
        }}
        onRefreshRequest={apiActions.refresh}
        onAddMockTransactions={apiActions.addMockTransactions}
      />
    </div>
  );
};

export default VisualizationController; 