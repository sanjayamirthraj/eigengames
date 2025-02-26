import { ethers } from "ethers";

const infuraWebSocketUrl = "wss://mainnet.infura.io/ws/v3/2f5d6db982034db29ae3fe106541e435";
const provider = new ethers.WebSocketProvider(infuraWebSocketUrl);

// Delay configuration
const QUERY_DELAY_MS = 2000; // 2-second delay between querying for new transactions
const CLEANUP_INTERVAL_MS = 200000; // 200-second interval to clean groups
let isProcessing = false; // Flag to prevent overlapping processing

const transactionQueue = [];
const accessListMap = new Map();


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

// Function to clean parallelizableGroups and sequentialGroup
function cleanGroups() {
    parallelizableGroups = []; // Reset parallelizable groups
    sequentialGroup = []; // Reset sequential group
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