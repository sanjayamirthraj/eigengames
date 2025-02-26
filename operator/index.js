import { ethers } from "ethers";

const infuraWebSocketUrl = "wss://mainnet.infura.io/ws/v3/2f5d6db982034db29ae3fe106541e435";

// For ethers v6, we use WebSocketProvider directly from ethers
const provider = new ethers.WebSocketProvider(infuraWebSocketUrl);

// Add error handling
provider.on("error", (error) => {
    console.error("WebSocket Error:", error);
});

// Test the connection
async function testConnection() {
    try {
        const blockNumber = await provider.getBlockNumber();
        console.log("Current block number:", blockNumber);
    } catch (error) {
        console.error("Connection error:", error);
    }
}

testConnection();

// Delay configuration
const QUERY_DELAY_MS = 2000; // 2-second delay between querying for new transactions
const CLEANUP_INTERVAL_MS = 200000; // 200-second interval to clean groups
const SIMULATION_TIME_MS = 1000; // Time to simulate each transaction (1 second)
let isProcessing = false; // Flag to prevent overlapping processing

const transactionQueue = [];
const accessListMap = new Map();
// Track simulation status
const simulatedTransactions = new Set();

const MAX_PARALLELIZABLE_GROUPS = 5; // Maximum number of parallelizable groups
let parallelizableGroups = [];
let sequentialGroup = [];

async function generateAccessList(tx) {
    try {
        const accessList = await provider.send("eth_createAccessList", [{
            from: tx.from,
            to: tx.to,
            data: tx.data,
            value: tx.value ? ethers.toQuantity(tx.value) : undefined,
            gas: tx.gasLimit ? ethers.toQuantity(tx.gasLimit) : undefined,
            gasPrice: tx.gasPrice ? ethers.toQuantity(tx.gasPrice) : undefined,
        }]);

        console.log("Access List generated for transaction:", tx.hash);
        console.log(accessList);

        // Store the access list in the map
        accessListMap.set(tx.hash, accessList.accessList);

        // Add the transaction to the queue
        transactionQueue.push(tx.hash);

        // Process the queue if it's not already being processed
        if (!isProcessing) {
            processTransactionQueue();
        }
    } catch (error) {
        console.error("Error generating access list:", error);
    }
}

async function processTransactionQueue() {
    if (isProcessing || transactionQueue.length === 0) {
        return;
    }

    isProcessing = true;

    try {
        // Assign transactions to parallelizable or sequential groups
        for (const txHash of transactionQueue) {
            const accessList = accessListMap.get(txHash);

            // Try to assign the transaction to an existing parallelizable group
            let assigned = false;
            for (const group of parallelizableGroups) {
                if (!hasCollision(txHash, group)) {
                    group.push(txHash);
                    assigned = true;
                    break;
                }
            }

            // If not assigned to any parallelizable group, add to sequential group
            if (!assigned) {
                if (parallelizableGroups.length < MAX_PARALLELIZABLE_GROUPS) {
                    // Create a new parallelizable group if we haven't reached the limit
                    parallelizableGroups.push([txHash]);
                } else {
                    // Add to sequential group if all parallelizable groups are full or have collisions
                    sequentialGroup.push(txHash);
                }
            }
        }

        console.log("Updated Parallelizable Groups:");
        console.log(parallelizableGroups);
        console.log("Updated Sequential Group:");
        console.log(sequentialGroup);
        
        // Run simulations concurrently
        runSimulations();
    } catch (error) {
        console.error("Error processing transaction queue:", error);
    } finally {
        // Clear the queue and reset the processing flag
        transactionQueue.length = 0;
        isProcessing = false;

        // Introduce a delay before processing the next batch
        await new Promise((resolve) => setTimeout(resolve, QUERY_DELAY_MS));
    }
}

function hasCollision(txHash, group) {
    const txAccessList = accessListMap.get(txHash);
    const txSlots = new Set();

    for (const access of txAccessList) {
        const storageKeys = access.storageKeys || [];
        for (const key of storageKeys) {
            txSlots.add(key);
        }
    }


    for (const groupTxHash of group) {
        const groupTxAccessList = accessListMap.get(groupTxHash);
        for (const access of groupTxAccessList) {
            const storageKeys = access.storageKeys || [];
            for (const key of storageKeys) {
                if (txSlots.has(key)) {
                    return true; // Collision detected
                }
            }
        }
    }

    return false; // No collision
}

// Function to run both types of simulations concurrently
function runSimulations() {
    // Run both simulations without awaiting them
    const parallelSimulationPromise = simulateParallelizableGroups();
    const sequentialSimulationPromise = simulateSequentialGroup();
    
    // Optional: Handle when both simulations are done
    Promise.all([parallelSimulationPromise, sequentialSimulationPromise])
        .then(() => {
            console.log("All simulations completed");
        })
        .catch(error => {
            console.error("Error in simulations:", error);
        });
}

// Simulate transactions in parallelizable groups
async function simulateParallelizableGroups() {
    console.log("Starting parallel simulations...");
    
    const simulations = [];
    
    // For each group, simulate all transactions in the group concurrently
    for (let i = 0; i < parallelizableGroups.length; i++) {
        const group = parallelizableGroups[i];
        if (group.length === 0) continue;
        
        console.log(`Running parallel group ${i + 1} with ${group.length} transactions`);
        
        // Simulate all transactions in this group concurrently
        const groupSimulations = group.map(txHash => simulateTransaction(txHash, true));
        
        simulations.push(Promise.all(groupSimulations));
    }
    
    // Wait for all group simulations to complete
    await Promise.all(simulations);
    console.log("All parallel simulations completed");
}

// Simulate transactions in the sequential group
async function simulateSequentialGroup() {
    console.log("Starting sequential simulations...");
    
    // Create a copy of the sequential group to avoid issues if it's modified during simulation
    const txsToSimulate = [...sequentialGroup];
    
    for (const txHash of txsToSimulate) {
        await simulateTransaction(txHash, false);
    }
    
    console.log("All sequential simulations completed");
}

// Simulate a single transaction
async function simulateTransaction(txHash, isParallel) {
    // Skip if already simulated
    if (simulatedTransactions.has(txHash)) {
        return;
    }
    
    const startTime = Date.now();
    console.log(`[${isParallel ? 'PARALLEL' : 'SEQUENTIAL'}] Simulating transaction: ${txHash}`);
    
    try {
        // Simulate transaction execution by waiting
        await new Promise(resolve => setTimeout(resolve, SIMULATION_TIME_MS));
        
        // Mark as simulated
        simulatedTransactions.add(txHash);
        
        const duration = Date.now() - startTime;
        console.log(`[${isParallel ? 'PARALLEL' : 'SEQUENTIAL'}] Completed transaction: ${txHash} in ${duration}ms`);
    } catch (error) {
        console.error(`Error simulating transaction ${txHash}:`, error);
    }
}

// Function to clean parallelizableGroups and sequentialGroup
function cleanGroups() {
    parallelizableGroups = []; // Reset parallelizable groups
    sequentialGroup = []; // Reset sequential group
    simulatedTransactions.clear(); // Clear the set of simulated transactions
    console.log("Cleaned parallelizableGroups and sequentialGroup.");
}

// Set up a 20-second interval to clean groups
setInterval(cleanGroups, CLEANUP_INTERVAL_MS);

let isDebounced = false;

provider.on("pending", async (txHash) => {
    if (isDebounced) {
        console.log("Skipping transaction: Waiting for delay...");
        return;
    }

    isDebounced = true;

    try {
        // Fetch the transaction details using the transaction hash
        const tx = await provider.getTransaction(txHash);

        if (!tx) {
            console.log("Transaction not found in the mempool.");
            return;
        }

        console.log("New pending transaction detected:", tx.hash);

        // Generate the access list for the transaction
        await generateAccessList(tx);
    } catch (error) {
        console.error("Error processing transaction:", error);
    } finally {
        // Introduce a delay before allowing the next transaction
        await new Promise((resolve) => setTimeout(resolve, QUERY_DELAY_MS));
        isDebounced = false;
    }
});

console.log("Listening for new pending transactions...");