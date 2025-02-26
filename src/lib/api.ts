// API client for communicating with the operator server
const API_URL = 'http://localhost:3000'; // Ensure this matches the backend port

export interface AccessList {
  address: string;
  storageKeys: string[];
}

export interface Transaction {
  hash: string;
  accessList?: AccessList[];
  simulationResult?: {
    duration: number;
    timestamp: number;
  };
  processing: 'parallel' | 'sequential';
  blockId: number;
}

export interface SimulationResult {
  txHash: string;
  duration: number;
  timestamp: number;
}

export interface BlockStats {
  gasUsed: number;
  timeToMine: number;
}

export interface Block {
  id: number;
  timestamp: number;
  finalizedAt?: number;
  transactions: string[];
  gasUsed: number;
  timeToMine: number;
}

export interface CurrentBlock {
  id: number;
  timestamp: number;
  finalizedAt?: number;
  finalized?: boolean;
  transactions: {
    parallel: string[];
    sequential: string[];
  };
  stats: {
    parallel: BlockStats;
    sequential: BlockStats;
  };
}

export interface ServerStatus {
  status: 'idle' | 'processing' | 'error';
  lastProcessed: number | null;
  transactionsInQueue: number;
  parallelGroupsCount: number;
  sequentialGroupCount: number;
  simulatedTransactionsCount: number;
  currentBlockId: number;
}

export interface BlockHistory {
  parallel: Block[];
  sequential: Block[];
}

export interface SimulationResults {
  parallel: {
    [groupIndex: string]: SimulationResult[];
  };
  sequential: {
    [groupIndex: string]: SimulationResult;
  };
}

// Updated interface for the new blocks endpoint
export interface BlocksResponse {
  blocks: {
    type: 'parallelizable' | 'sequential';
    groupId: number;
    transactions: string[];
  }[];
}

// API client functions
export const api = {
  // Get server status
  getStatus: async (): Promise<ServerStatus> => {
    const response = await fetch(`${API_URL}/status`);
    return response.json();
  },

  // Get all access lists
  getAccessLists: async (): Promise<Record<string, AccessList[]>> => {
    const response = await fetch(`${API_URL}/accesslists`);
    return response.json();
  },

  // Get parallel groups
  getParallelGroups: async (): Promise<string[][]> => {
    const response = await fetch(`${API_URL}/groups/parallel`);
    return response.json();
  },

  // Get sequential group
  getSequentialGroup: async (): Promise<string[]> => {
    const response = await fetch(`${API_URL}/groups/sequential`);
    return response.json();
  },

  // Get all simulation results
  getSimulationResults: async (): Promise<SimulationResults> => {
    const response = await fetch(`${API_URL}/simulations`);
    return response.json();
  },

  // Get current block
  getCurrentBlock: async (): Promise<CurrentBlock> => {
    const response = await fetch(`${API_URL}/blocks/current`);
    return response.json();
  },

  // Get block history
  getBlockHistory: async (): Promise<BlockHistory> => {
    const response = await fetch(`${API_URL}/blocks/history`);
    return response.json();
  },

  // Get transaction details by hash
  getTransaction: async (hash: string): Promise<Transaction> => {
    const response = await fetch(`${API_URL}/transactions/${hash}`);
    if (!response.ok) {
      throw new Error(`Transaction ${hash} not found`);
    }
    return response.json();
  },

  // Manually trigger simulations
  triggerSimulation: async (): Promise<{ message: string }> => {
    const response = await fetch(`${API_URL}/simulate`, {
      method: 'POST',
    });
    return response.json();
  },

  // Force create a new block (for testing)
  createNewBlock: async (): Promise<{ message: string; blockId: number }> => {
    const response = await fetch(`${API_URL}/blocks/new`, {
      method: 'POST',
    });
    return response.json();
  },

  // Add a transaction manually (for testing)
  addTransaction: async (txHash: string): Promise<{ message: string; txHash: string }> => {
    const response = await fetch(`${API_URL}/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ txHash }),
    });
    return response.json();
  },

  // Add many mock transactions (for testing)
  addMockTransactions: async (count: number = 10): Promise<{ message: string; count: number }> => {
    const response = await fetch(`${API_URL}/transactions/mock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ count }),
    });
    return response.json();
  },

  // New function to get blocks from the updated backend
  getBlocks: async (): Promise<BlocksResponse> => {
    console.log("API: Fetching blocks from", `${API_URL}/blocks`);
    try {
      const response = await fetch(`${API_URL}/blocks`);
      if (!response.ok) {
        throw new Error(`Failed to fetch blocks: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      console.log("API: Received blocks data:", data);
      return data;
    } catch (error) {
      console.error("API: Error fetching blocks:", error);
      throw error;
    }
  },

  // Test function to directly fetch blocks - useful for debugging
  testFetchBlocks: async (): Promise<Response> => {
    return fetch(`${API_URL}/blocks`);
  },
}; 