import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateRandomTransactions(count: number) {
  return Array.from({ length: count }).map((_, i) => ({
    id: `tx_${Math.random().toString(36).substring(2, 8)}`,
    value: (Math.random() * 0.02).toFixed(4),
    gas: Math.floor(Math.random() * 250000),
    sender: `0x${Math.random().toString(16).substring(2, 12)}...${Math.random().toString(16).substring(2, 6)}`,
    receiver: `0x${Math.random().toString(16).substring(2, 12)}...${Math.random().toString(16).substring(2, 6)}`,
  }))
}

export function formatEth(value: string) {
  return parseFloat(value).toFixed(4) + " ETH"
}

export function generateBlockData() {
  const now = Date.now()
  return Array.from({ length: 7 }).map((_, i) => ({
    number: 12345678 + i,
    transactions: Math.floor(Math.random() * 100) + 50,
    timestamp: new Date(now - i * 12000).toISOString(),
    gasUsed: Math.floor(Math.random() * 15000000) + 5000000,
  }))
}

export function generateChartData() {
  return Array.from({ length: 24 }).map((_, i) => ({
    time: `${i}:00`,
    parallelTx: Math.floor(Math.random() * 2000) + 1000,
    sequentialTx: Math.floor(Math.random() * 500) + 100,
  }))
}

export function generateTxTypeData() {
  return [
    { name: "Parallelizable", value: 75 },
    { name: "Sequential", value: 25 },
  ]
} 