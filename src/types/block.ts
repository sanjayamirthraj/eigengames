export interface BlockBatch {
  id: string;
  transactions: number;
  totalFees: string;
  expectedMEV: string;
  isSequential: boolean;
  sequentialCount?: number;
  timestamp?: string;
} 