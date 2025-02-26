import { useState, useEffect, useCallback } from 'react';
import { 
  api, 
  ServerStatus, 
  CurrentBlock, 
  BlockHistory, 
  SimulationResults 
} from './api';

export interface OperatorApiState {
  loading: boolean;
  error: string | null;
  status: ServerStatus | null;
  currentBlock: CurrentBlock | null;
  blockHistory: BlockHistory | null;
  simulationResults: SimulationResults | null;
  parallelGroups: string[][] | null;
  sequentialGroup: string[] | null;
}

export interface OperatorApiActions {
  refresh: () => Promise<void>;
  triggerSimulation: () => Promise<void>;
  createNewBlock: () => Promise<void>;
  addMockTransactions: (count?: number) => Promise<void>;
}

const POLL_INTERVAL = 5000; // Poll every 5 seconds

export const useOperatorApi = (): [OperatorApiState, OperatorApiActions] => {
  const [state, setState] = useState<OperatorApiState>({
    loading: true,
    error: null,
    status: null,
    currentBlock: null,
    blockHistory: null,
    simulationResults: null,
    parallelGroups: null,
    sequentialGroup: null,
  });

  const fetchAllData = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      // Fetch all data concurrently for better performance
      const [
        status,
        currentBlock,
        blockHistory,
        simulationResults,
        parallelGroups,
        sequentialGroup,
      ] = await Promise.all([
        api.getStatus(),
        api.getCurrentBlock(),
        api.getBlockHistory(),
        api.getSimulationResults(),
        api.getParallelGroups(),
        api.getSequentialGroup(),
      ]);
      
      setState({
        loading: false,
        error: null,
        status,
        currentBlock,
        blockHistory,
        simulationResults,
        parallelGroups,
        sequentialGroup,
      });
    } catch (error) {
      console.error('Error fetching data from operator server:', error);
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }));
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Set up polling for real-time updates
  useEffect(() => {
    const pollInterval = setInterval(() => {
      fetchAllData();
    }, POLL_INTERVAL);
    
    return () => {
      clearInterval(pollInterval);
    };
  }, [fetchAllData]);

  // Action functions
  const triggerSimulation = async () => {
    try {
      await api.triggerSimulation();
      await fetchAllData(); // Refresh data after triggering simulation
    } catch (error) {
      console.error('Error triggering simulation:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to trigger simulation' 
      }));
    }
  };

  const createNewBlock = async () => {
    try {
      await api.createNewBlock();
      await fetchAllData(); // Refresh data after creating a new block
    } catch (error) {
      console.error('Error creating new block:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to create new block' 
      }));
    }
  };

  const addMockTransactions = async (count = 10) => {
    try {
      await api.addMockTransactions(count);
      await fetchAllData(); // Refresh data after adding mock transactions
    } catch (error) {
      console.error('Error adding mock transactions:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to add mock transactions' 
      }));
    }
  };

  return [
    state,
    {
      refresh: fetchAllData,
      triggerSimulation,
      createNewBlock,
      addMockTransactions,
    },
  ];
}; 