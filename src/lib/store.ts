import { create } from 'zustand';
import { BlockBatch } from '@/types/block';
import { Transaction } from '@/types/transaction';
import { api } from './api';

// Generate a new block with random transactions
const generateNewBlock = (): BlockBatch => {
  const blockNumber = Math.floor(17000000 + Math.random() * 1000);
  const txCount = Math.floor(Math.random() * 100) + 30;
  const sequentialCount = Math.floor(txCount * (Math.random() * 0.3));
  const isSequential = Math.random() > 0.8; // 20% chance of sequential block
  const timestamp = Date.now(); // Add timestamp for uniqueness
  
  return {
    id: `#${blockNumber}-${timestamp}`, // Add timestamp to make each ID unique
    transactions: txCount,
    totalFees: (Math.random() * 0.5 + 0.1).toFixed(3),
    expectedMEV: (Math.random() * 0.3 + 0.05).toFixed(3),
    isSequential,
    sequentialCount: isSequential ? txCount : sequentialCount,
    timestamp: new Date().toISOString()
  };
};

// Generate random transactions for a block
const generateTransactionsForBlock = (count: number): Transaction[] => {
  const addresses = [
    "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    "0x8Ba1f109551bD432803012645Ac136ddd64DBA72",
    "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
    "0xBE0eB53F46cd790Cd13851d5EFf43D12404d33E8",
    "0x5d38b4e4783e34e2301a2a36c39a03c45798c4dd"
  ];
  
  return Array(count).fill(null).map((_, i) => {
    const isParallelizable = Math.random() > 0.3;
    
    return {
      id: `0x${Math.random().toString(16).substring(2, 10)}`,
      from: addresses[Math.floor(Math.random() * addresses.length)],
      to: addresses[Math.floor(Math.random() * addresses.length)],
      value: (Math.random() * 0.5).toFixed(4),
      gasUsed: (Math.random() * 100000).toFixed(0),
      timestamp: new Date().toISOString(),
      isParallelizable,
      blockId: null // Will be set when added to a block
    };
  });
};

// Generate initial blocks
const generateInitialBlocks = (count: number = 10): BlockBatch[] => {
  return Array(count).fill(null).map(() => generateNewBlock());
};

interface BlockStore {
  blocks: BlockBatch[];
  currentTransactions: Transaction[];
  isSimulating: boolean;
  simulationInterval: number | null;
  simulationSpeed: number; // Speed in milliseconds
  lastUpdated: Date;
  loading: boolean;
  error: string | null;
  
  // Actions
  addNewBlock: () => void;
  startSimulation: (intervalMs?: number) => void;
  stopSimulation: () => void;
  resetBlocks: () => void;
  setSimulationSpeed: (speed: number) => void;
  fetchBlocksFromAPI: () => Promise<void>;
}

// Generate a simple random value between min and max
const randomValue = (min: number, max: number) => {
  return (Math.random() * (max - min) + min).toFixed(3);
};

export const useBlockStore = create<BlockStore>((set, get) => ({
  blocks: generateInitialBlocks(),
  currentTransactions: generateTransactionsForBlock(15),
  isSimulating: false,
  simulationInterval: null,
  simulationSpeed: 5000, // Default: 5 seconds
  lastUpdated: new Date(),
  loading: false,
  error: null,
  
  // Fetch blocks from the API
  fetchBlocksFromAPI: async () => {
    try {
      set({ loading: true, error: null });
      
      const data = await api.getBlocks();
      console.log("Fetched data from API:", data); // Log the data for debugging
      
      if (!data || !data.blocks || !Array.isArray(data.blocks)) {
        throw new Error('Invalid data format received from the API');
      }
      
      // Convert the API response to our BlockBatch format
      const convertedBlocks: BlockBatch[] = data.blocks.map(block => {
        const isSequential = block.type === 'sequential';
        const txCount = block.transactions.length;
        
        return {
          id: `#${block.groupId}`,
          transactions: txCount,
          totalFees: randomValue(0.1, 0.6), // Generate random fees since API doesn't provide this
          expectedMEV: randomValue(0.05, 0.35), // Generate random MEV since API doesn't provide this
          isSequential: isSequential,
          sequentialCount: isSequential ? txCount : 0, // In sequential blocks, all txs are sequential
          timestamp: new Date().toISOString()
        };
      });
      
      console.log("Converted blocks:", convertedBlocks); // Log the converted blocks
      
      set({
        blocks: convertedBlocks,
        lastUpdated: new Date(),
        loading: false
      });
    } catch (error) {
      console.error('Error fetching blocks from API:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch blocks', 
        loading: false 
      });
    }
  },
  
  addNewBlock: () => {
    // Try to fetch from API first, fallback to generating if it fails
    get().fetchBlocksFromAPI().catch(() => {
      const newBlock = generateNewBlock();
      const newTransactions = generateTransactionsForBlock(newBlock.transactions);
      
      // Assign block ID to transactions
      newTransactions.forEach(tx => {
        tx.blockId = newBlock.id;
      });
      
      set(state => ({
        blocks: [newBlock, ...state.blocks.slice(0, 9)], // Keep only the 10 most recent blocks
        currentTransactions: newTransactions,
        lastUpdated: new Date() // Update timestamp
      }));
    });
  },
  
  startSimulation: (intervalMs?: number) => {
    // First stop any existing simulation
    const { simulationInterval } = get();
    if (simulationInterval) {
      clearInterval(simulationInterval);
    }
    
    // Set speed if provided
    if (intervalMs) {
      set({ simulationSpeed: intervalMs });
    }
    
    // Get the current (possibly updated) speed
    const speed = intervalMs || get().simulationSpeed;
    
    // Create new interval with the speed
    const interval = setInterval(() => {
      get().addNewBlock();
    }, speed) as unknown as number;
    
    set({
      isSimulating: true,
      simulationInterval: interval
    });
  },
  
  stopSimulation: () => {
    const { simulationInterval } = get();
    if (simulationInterval) {
      clearInterval(simulationInterval);
    }
    
    set({
      isSimulating: false,
      simulationInterval: null
    });
  },
  
  resetBlocks: () => {
    set({
      blocks: generateInitialBlocks(),
      currentTransactions: generateTransactionsForBlock(15),
      lastUpdated: new Date()
    });
  },
  
  setSimulationSpeed: (speed: number) => {
    const isCurrentlySimulating = get().isSimulating;
    
    // Stop current simulation if running
    if (isCurrentlySimulating) {
      get().stopSimulation();
    }
    
    // Set new speed
    set({ simulationSpeed: speed });
    
    // Restart if it was running
    if (isCurrentlySimulating) {
      get().startSimulation(speed);
    }
  }
})); 