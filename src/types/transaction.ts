export interface Transaction {
  id: string;
  from: string;
  to: string;
  value: string;
  gasUsed: string;
  timestamp: string;
  isParallelizable: boolean;
  blockId: string | null;
}

export interface BatchedTransaction {
  batchId: string;
  transactions: Transaction[];
  executionTime: string;
  gasEfficiency: string;
  color: 'blue' | 'teal' | 'purple' | 'amber' | 'emerald' | 'slate';
} 