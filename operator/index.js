import { ethers } from "ethers";
import express from "express";
import cors from "cors";

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

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
const BLOCK_CREATION_INTERVAL_MS = 15000; // Create a new block every 15 seconds
let isProcessing = false; // Flag to prevent overlapping processing

const transactionQueue = [];
const accessListMap = new Map();
// Track simulation status
const simulatedTransactions = new Set();
const simulationResults = {
    parallel: {},
    sequential: {}
};

// Block data for visualization
const blocks = {
    parallel: [],
    sequential: []
};

// Current block being mined
let currentBlock = {
    id: 1,
    timestamp: Date.now(),
    transactions: {
        parallel: [],
        sequential: []
    },
    stats: {
        parallel: {
            gasUsed: 0,
            timeToMine: 0
        },
        sequential: {
            gasUsed: 0,
            timeToMine: 0
        }
    }
};

const MAX_PARALLELIZABLE_GROUPS = 5; // Maximum number of parallelizable groups
let parallelizableGroups = [];
let sequentialGroup = [];

// Track last processed time for status endpoint
let lastProcessedTime = null;
let processingStatus = "idle";

// Generate a mock transaction if no real ones are available
function generateMockTransaction() {
    const id = Math.random().toString(36).substring(2, 15);
    return {
        hash: `0x${id}${Math.random().toString(36).substring(2, 15)}`,
        from: `0x${Math.random().toString(36).substring(2, 42)}`,
        to: `0x${Math.random().toString(36).substring(2, 42)}`,
        value: ethers.parseEther((Math.random() * 10).toFixed(4)),
        gasPrice: ethers.parseUnits((Math.random() * 100).toFixed(2), "gwei"),
        data: `0x${Math.random().toString(36).substring(2, 42)}`,
        state: Math.floor(Math.random() * 5) // 0-4 for different states
    };
}

// Create mock access list for a transaction
function generateMockAccessList(txHash) {
    const accessListLength = Math.floor(Math.random() * 5) + 1;
    const accessList = [];
    
    for (let i = 0; i < accessListLength; i++) {
        const address = `0x${Math.random().toString(36).substring(2, 42)}`;
        const storageKeysLength = Math.floor(Math.random() * 3) + 1;
        const storageKeys = [];
        
        for (let j = 0; j < storageKeysLength; j++) {
            storageKeys.push(`0x${Math.random().toString(36).substring(2, 66)}`);
        }
        
        accessList.push({
            address,
            storageKeys
        });
    }
    
    accessListMap.set(txHash, accessList);
    return accessList;
}

// Ensure we have some data for visualization
function ensureTransactionsAvailable() {
    // If no transactions are available, generate some mock ones
    if (transactionQueue.length === 0 && parallelizableGroups.length === 0 && sequentialGroup.length === 0) {
        const mockCount = Math.floor(Math.random() * 10) + 5; // 5-15 transactions
        
        for (let i = 0; i < mockCount; i++) {
            const mockTx = generateMockTransaction();
            const mockAccessList = generateMockAccessList(mockTx.hash);
            transactionQueue.push(mockTx.hash);
        }
        
        processTransactionQueue();
    }
}

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
        // Fallback to mock access list if real one fails
        generateMockAccessList(tx.hash);
        transactionQueue.push(tx.hash);
        
        if (!isProcessing) {
            processTransactionQueue();
        }
    }
}

async function processTransactionQueue() {
    if (isProcessing || transactionQueue.length === 0) {
        return;
    }

    isProcessing = true;
    processingStatus = "processing";
    lastProcessedTime = Date.now();

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
        
        // Add transactions to current block
        for (const group of parallelizableGroups) {
            currentBlock.transactions.parallel = currentBlock.transactions.parallel.concat(group);
        }
        currentBlock.transactions.sequential = currentBlock.transactions.sequential.concat(sequentialGroup);
        
        // Run simulations concurrently
        runSimulations();
    } catch (error) {
        console.error("Error processing transaction queue:", error);
        processingStatus = "error";
    } finally {
        // Clear the queue and reset the processing flag
        transactionQueue.length = 0;
        isProcessing = false;

        // Introduce a delay before processing the next batch
        await new Promise((resolve) => setTimeout(resolve, QUERY_DELAY_MS));
        processingStatus = "idle";
    }
}

function hasCollision(txHash, group) {
    const txAccessList = accessListMap.get(txHash);
    if (!txAccessList) return false;
    
    const txSlots = new Set();

    for (const access of txAccessList) {
        const storageKeys = access.storageKeys || [];
        for (const key of storageKeys) {
            txSlots.add(key);
        }
    }

    for (const groupTxHash of group) {
        const groupTxAccessList = accessListMap.get(groupTxHash);
        if (!groupTxAccessList) continue;
        
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
            updateBlockStats();
        })
        .catch(error => {
            console.error("Error in simulations:", error);
        });
}

// Update block statistics after simulation
function updateBlockStats() {
    // Calculate total gas used and time for parallel transactions
    let parallelGasUsed = 0;
    let parallelTime = 0;
    let maxParallelGroupTime = 0;
    
    // For parallel, we need the maximum time across groups since they run concurrently
    for (const groupIndex in simulationResults.parallel) {
        let groupTime = 0;
        for (const tx of simulationResults.parallel[groupIndex]) {
            parallelGasUsed += Math.floor(Math.random() * 100000) + 50000; // Mock gas usage
            groupTime += tx.duration;
        }
        maxParallelGroupTime = Math.max(maxParallelGroupTime, groupTime);
    }
    
    parallelTime = maxParallelGroupTime;
    
    // Calculate total gas used and time for sequential transactions
    let sequentialGasUsed = 0;
    let sequentialTime = 0;
    
    // Sequential transactions run one after another, so times are additive
    for (const groupIndex in simulationResults.sequential) {
        const tx = simulationResults.sequential[groupIndex];
        sequentialGasUsed += Math.floor(Math.random() * 100000) + 50000; // Mock gas usage
        sequentialTime += tx.duration;
    }
    
    // Update current block stats
    currentBlock.stats.parallel.gasUsed = parallelGasUsed;
    currentBlock.stats.parallel.timeToMine = parallelTime;
    currentBlock.stats.sequential.gasUsed = sequentialGasUsed;
    currentBlock.stats.sequential.timeToMine = sequentialTime;
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
        const groupSimulations = group.map(txHash => simulateTransaction(txHash, true, i));
        
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
    
    for (let i = 0; i < txsToSimulate.length; i++) {
        const txHash = txsToSimulate[i];
        await simulateTransaction(txHash, false, i);
    }
    
    console.log("All sequential simulations completed");
}

// Simulate a single transaction
async function simulateTransaction(txHash, isParallel, groupIndex) {
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
        
        // Store simulation result
        if (isParallel) {
            if (!simulationResults.parallel[groupIndex]) {
                simulationResults.parallel[groupIndex] = [];
            }
            simulationResults.parallel[groupIndex].push({
                txHash,
                duration,
                timestamp: Date.now()
            });
        } else {
            simulationResults.sequential[groupIndex] = {
                txHash,
                duration,
                timestamp: Date.now()
            };
        }
    } catch (error) {
        console.error(`Error simulating transaction ${txHash}:`, error);
    }
}

// Function to finalize a block and create a new one
function finalizeBlock() {
    // Update timestamps and state
    currentBlock.finalized = true;
    currentBlock.finalizedAt = Date.now();
    
    // Add to blocks history
    blocks.parallel.push({
        id: currentBlock.id,
        timestamp: currentBlock.timestamp,
        finalizedAt: currentBlock.finalizedAt,
        transactions: [...currentBlock.transactions.parallel],
        gasUsed: currentBlock.stats.parallel.gasUsed,
        timeToMine: currentBlock.stats.parallel.timeToMine
    });
    
    blocks.sequential.push({
        id: currentBlock.id,
        timestamp: currentBlock.timestamp,
        finalizedAt: currentBlock.finalizedAt,
        transactions: [...currentBlock.transactions.sequential],
        gasUsed: currentBlock.stats.sequential.gasUsed,
        timeToMine: currentBlock.stats.sequential.timeToMine
    });
    
    // Limit blocks history to 10 blocks
    if (blocks.parallel.length > 10) {
        blocks.parallel.shift();
    }
    if (blocks.sequential.length > 10) {
        blocks.sequential.shift();
    }
    
    // Create a new block
    currentBlock = {
        id: currentBlock.id + 1,
        timestamp: Date.now(),
        transactions: {
            parallel: [],
            sequential: []
        },
        stats: {
            parallel: {
                gasUsed: 0,
                timeToMine: 0
            },
            sequential: {
                gasUsed: 0,
                timeToMine: 0
            }
        }
    };
    
    console.log(`Block ${currentBlock.id - 1} finalized, created new block ${currentBlock.id}`);
    
    // Reset simulation results for the next block
    simulationResults.parallel = {};
    simulationResults.sequential = {};
    
    // Ensure we have transactions for the next block
    ensureTransactionsAvailable();
}

// Function to clean parallelizableGroups and sequentialGroup
function cleanGroups() {
    parallelizableGroups = []; // Reset parallelizable groups
    sequentialGroup = []; // Reset sequential group
    simulatedTransactions.clear(); // Clear the set of simulated transactions
    console.log("Cleaned parallelizableGroups and sequentialGroup.");
    
    // Ensure we always have transactions available for visualization
    ensureTransactionsAvailable();
}

// Set up a 15-second interval to create new blocks
setInterval(finalizeBlock, BLOCK_CREATION_INTERVAL_MS);

// Set up a cleanup interval
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

// Define API endpoints

// Get server status
app.get('/api/status', (req, res) => {
    res.json({
        status: processingStatus,
        lastProcessed: lastProcessedTime,
        transactionsInQueue: transactionQueue.length,
        parallelGroupsCount: parallelizableGroups.length,
        sequentialGroupCount: sequentialGroup.length,
        simulatedTransactionsCount: simulatedTransactions.size,
        currentBlockId: currentBlock.id
    });
});

// Get all access lists
app.get('/api/accesslists', (req, res) => {
    const accessLists = {};
    for (const [txHash, accessList] of accessListMap.entries()) {
        accessLists[txHash] = accessList;
    }
    res.json(accessLists);
});

// Get parallel groups
app.get('/api/groups/parallel', (req, res) => {
    res.json(parallelizableGroups);
});

// Get sequential group
app.get('/api/groups/sequential', (req, res) => {
    res.json(sequentialGroup);
});

// Get all simulation results
app.get('/api/simulations', (req, res) => {
    res.json(simulationResults);
});

// Get current block
app.get('/api/blocks/current', (req, res) => {
    res.json(currentBlock);
});

// Get block history
app.get('/api/blocks/history', (req, res) => {
    res.json(blocks);
});

// Get transaction details by hash
app.get('/api/transactions/:hash', (req, res) => {
    const { hash } = req.params;
    
    // Check if transaction is in current block
    const inParallel = currentBlock.transactions.parallel.includes(hash);
    const inSequential = currentBlock.transactions.sequential.includes(hash);
    
    if (!inParallel && !inSequential) {
        return res.status(404).json({ error: "Transaction not found" });
    }
    
    // Get access list for the transaction
    const accessList = accessListMap.get(hash) || [];
    
    // Get simulation results
    let simulationResult = null;
    
    if (inParallel) {
        for (const groupIndex in simulationResults.parallel) {
            for (const result of simulationResults.parallel[groupIndex]) {
                if (result.txHash === hash) {
                    simulationResult = result;
                    break;
                }
            }
        }
    } else {
        for (const groupIndex in simulationResults.sequential) {
            if (simulationResults.sequential[groupIndex].txHash === hash) {
                simulationResult = simulationResults.sequential[groupIndex];
                break;
            }
        }
    }
    
    res.json({
        hash,
        accessList,
        simulationResult,
        processing: inParallel ? "parallel" : "sequential",
        blockId: currentBlock.id
    });
});

// Manually trigger simulations
app.post('/api/simulate', (req, res) => {
    if (isProcessing) {
        return res.status(409).json({ error: "Already processing transactions" });
    }
    
    runSimulations();
    res.json({ message: "Simulations started" });
});

// Force create a new block (for testing)
app.post('/api/blocks/new', (req, res) => {
    finalizeBlock();
    res.json({ message: "New block created", blockId: currentBlock.id });
});

// Add a transaction manually (for testing)
app.post('/api/transactions', async (req, res) => {
    const { txHash } = req.body;
    
    if (!txHash) {
        return res.status(400).json({ error: "Transaction hash required" });
    }
    
    try {
        const tx = await provider.getTransaction(txHash);
        
        if (!tx) {
            return res.status(404).json({ error: "Transaction not found" });
        }
        
        await generateAccessList(tx);
        res.json({ message: "Transaction added for processing", txHash });
    } catch (error) {
        console.error("Error processing manual transaction:", error);
        res.status(500).json({ error: "Failed to process transaction" });
    }
});

// Add many mock transactions (for testing)
app.post('/api/transactions/mock', (req, res) => {
    const { count = 10 } = req.body;
    const limitedCount = Math.min(count, 50); // Limit to 50 for safety
    
    for (let i = 0; i < limitedCount; i++) {
        const mockTx = generateMockTransaction();
        generateMockAccessList(mockTx.hash);
        transactionQueue.push(mockTx.hash);
    }
    
    if (!isProcessing) {
        processTransactionQueue();
    }
    
    res.json({ 
        message: `Generated ${limitedCount} mock transactions`,
        count: limitedCount
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log("Listening for new pending transactions...");
    
    // Generate initial transactions for visualization
    ensureTransactionsAvailable();
});