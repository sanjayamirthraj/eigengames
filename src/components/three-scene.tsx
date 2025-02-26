"use client";

import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Line, Html } from '@react-three/drei';
import * as THREE from 'three';
import { Transaction } from '@/types/transaction';

// Define the structure for a transaction in the visualization
interface VisTransaction {
  id: string;
  position: THREE.Vector3;
  targetPosition: THREE.Vector3;
  color: string;
  size: number;
  address: string;
  stateAccess: string[];
  batch: number | null;
  isMoving: boolean;
}

// Define the structure for a batch in the visualization
interface VisBatch {
  id: number;
  position: THREE.Vector3;
  color: string;
  transactions: VisTransaction[];
}

// Colors for different batches
const batchColors = [
  '#7c3aed', // primary-600
  '#0d9488', // secondary-600
  '#16a34a', // success-600
  '#ea580c', // warning-600
  '#6366f1', // indigo-500
  '#8b5cf6', // purple-500
  '#ec4899', // pink-500
  '#14b8a6', // teal-500
];

// Generate mock state access patterns for transactions
const generateStateAccess = () => {
  const states = ['balance', 'nonce', 'storage', 'code', 'logs'];
  const count = Math.floor(Math.random() * 3) + 1;
  const result: string[] = [];
  
  for (let i = 0; i < count; i++) {
    const stateIndex = Math.floor(Math.random() * states.length);
    if (!result.includes(states[stateIndex])) {
      result.push(states[stateIndex]);
    }
  }
  
  return result;
};

// Check if two transactions can be in the same batch
const canBatchTogether = (tx1: VisTransaction, tx2: VisTransaction) => {
  // Check if they interact with the same address
  if (tx1.address === tx2.address) return false;
  
  // Check if they access the same state
  for (const state of tx1.stateAccess) {
    if (tx2.stateAccess.includes(state)) return false;
  }
  
  return true;
};

// Batch transactions using a simple algorithm
const batchTransactions = (transactions: VisTransaction[]): VisBatch[] => {
  const batches: VisBatch[] = [];
  const unbatchedTxs = [...transactions];
  
  // Create batches until all transactions are assigned
  while (unbatchedTxs.length > 0) {
    const batchId = batches.length;
    const batchColor = batchColors[batchId % batchColors.length];
    
    // Create a new batch with the first unbatched transaction
    const newBatch: VisBatch = {
      id: batchId,
      position: new THREE.Vector3(5, 0, -5 - batchId * 3),
      color: batchColor,
      transactions: [unbatchedTxs[0]],
    };
    
    // Update the transaction's batch assignment
    unbatchedTxs[0].batch = batchId;
    unbatchedTxs[0].targetPosition = new THREE.Vector3().copy(newBatch.position).add(new THREE.Vector3(0, 0, Math.random() * 2 - 1));
    unbatchedTxs[0].isMoving = true;
    
    // Remove the first transaction from unbatched list
    unbatchedTxs.splice(0, 1);
    
    // Try to add compatible transactions to this batch
    for (let i = unbatchedTxs.length - 1; i >= 0; i--) {
      let canAdd = true;
      
      // Check if this transaction can be batched with all transactions in the current batch
      for (const batchedTx of newBatch.transactions) {
        if (!canBatchTogether(unbatchedTxs[i], batchedTx)) {
          canAdd = false;
          break;
        }
      }
      
      if (canAdd) {
        // Add to batch
        newBatch.transactions.push(unbatchedTxs[i]);
        unbatchedTxs[i].batch = batchId;
        unbatchedTxs[i].targetPosition = new THREE.Vector3().copy(newBatch.position).add(new THREE.Vector3(0, 0, Math.random() * 2 - 1));
        unbatchedTxs[i].isMoving = true;
        
        // Remove from unbatched list
        unbatchedTxs.splice(i, 1);
      }
    }
    
    batches.push(newBatch);
  }
  
  return batches;
};

// Transaction sphere component
const TransactionSphere = ({ transaction }: { transaction: VisTransaction }) => {
  const ref = useRef<THREE.Mesh>(null);
  
  useFrame(() => {
    if (ref.current && transaction.isMoving) {
      // Move towards target position
      ref.current.position.lerp(transaction.targetPosition, 0.05);
      
      // Update the actual position in the transaction object
      transaction.position.copy(ref.current.position);
      
      // Check if we've reached the target
      if (ref.current.position.distanceTo(transaction.targetPosition) < 0.1) {
        transaction.isMoving = false;
      }
    }
  });
  
  return (
    <mesh 
      ref={ref} 
      position={transaction.position}
    >
      <sphereGeometry args={[transaction.size, 16, 16]} />
      <meshStandardMaterial color={transaction.color} />
      <Html distanceFactor={10}>
        <div className="bg-white/80 px-1 py-0.5 rounded text-xs whitespace-nowrap">
          {transaction.id.substring(0, 6)}
        </div>
      </Html>
    </mesh>
  );
};

// Batch container component
const BatchContainer = ({ batch }: { batch: VisBatch }) => {
  return (
    <group position={batch.position}>
      {/* Batch label */}
      <Text
        position={[0, 1.5, 0]}
        color="black"
        fontSize={0.5}
        anchorX="center"
        anchorY="middle"
      >
        {`Batch #${batch.id + 1}`}
      </Text>
      
      {/* Batch platform */}
      <mesh position={[0, -0.1, 0]}>
        <cylinderGeometry args={[2, 2, 0.1, 32]} />
        <meshStandardMaterial color={batch.color} opacity={0.3} transparent />
      </mesh>
    </group>
  );
};

// Connection lines between transactions that access the same state
const StateConnections = ({ transactions }: { transactions: VisTransaction[] }) => {
  // Group transactions by state access
  const stateMap: Record<string, VisTransaction[]> = {};
  
  transactions.forEach(tx => {
    tx.stateAccess.forEach(state => {
      if (!stateMap[state]) stateMap[state] = [];
      stateMap[state].push(tx);
    });
  });
  
  return (
    <>
      {Object.entries(stateMap).map(([state, txs]) => (
        txs.length > 1 && txs.map((tx, i) => (
          txs.slice(i + 1).map((otherTx, j) => (
            <Line
              key={`${tx.id}-${otherTx.id}-${state}`}
              points={[tx.position, otherTx.position]}
              color="#9ca3af" // neutral-400
              lineWidth={1}
              dashed
              dashSize={0.2}
              dashOffset={0}
              dashScale={1}
            />
          ))
        ))
      ))}
    </>
  );
};

// Main 3D scene component
const BatchingScene = ({ transactions }: { transactions: VisTransaction[] }) => {
  const [batches, setBatches] = useState<VisBatch[]>([]);
  const [isBatched, setIsBatched] = useState(false);
  
  // Initialize batches
  useEffect(() => {
    if (transactions.length > 0 && !isBatched) {
      const newBatches = batchTransactions(transactions);
      setBatches(newBatches);
      setIsBatched(true);
    }
  }, [transactions, isBatched]);
  
  // Set up scene lighting
  const { scene } = useThree();
  useEffect(() => {
    scene.background = new THREE.Color('#f5f3ff'); // primary-50
  }, [scene]);
  
  return (
    <>
      {/* Ambient light */}
      <ambientLight intensity={0.5} />
      
      {/* Directional light */}
      <directionalLight position={[10, 10, 5]} intensity={1} />
      
      {/* Transaction spheres */}
      {transactions.map((tx) => (
        <TransactionSphere key={tx.id} transaction={tx} />
      ))}
      
      {/* State access connections */}
      <StateConnections transactions={transactions} />
      
      {/* Batch containers */}
      {batches.map((batch) => (
        <BatchContainer key={batch.id} batch={batch} />
      ))}
      
      {/* Controls */}
      <OrbitControls 
        enableZoom={true}
        enablePan={true}
        enableRotate={true}
        minDistance={5}
        maxDistance={20}
      />
    </>
  );
};

// Main component that converts regular transactions to visual transactions
const ThreeScene = ({ transactions }: { transactions: Transaction[] }) => {
  const [visTransactions, setVisTransactions] = useState<VisTransaction[]>([]);
  
  // Generate visual transactions from store transactions
  useEffect(() => {
    if (transactions.length > 0) {
      const newVisTransactions = transactions.map((tx, index) => {
        // Generate a random position in a circle
        const angle = (index / transactions.length) * Math.PI * 2;
        const radius = 3;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        
        return {
          id: tx.id,
          position: new THREE.Vector3(x, 0, z),
          targetPosition: new THREE.Vector3(x, 0, z),
          color: tx.isParallelizable ? '#22c55e' : '#f97316', // success-500 or warning-500
          size: 0.3,
          address: tx.from,
          stateAccess: generateStateAccess(),
          batch: null,
          isMoving: false,
        };
      });
      
      setVisTransactions(newVisTransactions);
    }
  }, [transactions]);
  
  if (visTransactions.length === 0) {
    return null;
  }
  
  return (
    <Canvas camera={{ position: [0, 5, 10], fov: 50 }}>
      <BatchingScene transactions={visTransactions} />
    </Canvas>
  );
};

export default ThreeScene; 