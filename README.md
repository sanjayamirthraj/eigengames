# Implementing Parallel Transaction Processing on using EigenLayer AVS

## Parallel Transaction Pool for EigenLayer AVS: Enabling Concurrent Transaction Processing

<!-- ## Table of Contents -->
<!-- - [Introduction](#introduction)
- [Implementation Overview](#implementation-overview)
  - [1. Implementing our custom algorithm through an Alternative Layer 1 (Alt-L1) Implementation -- EIGENChain](#1-implementing-our-custom-algorithm-through-an-alternative-layer-1-alt-l1-implementation----eigenchain)
  - [2. Custom Client Implementation](#2-custom-client-implementation)
- [Solution](#solution)
  - [Quantitative Throughput Analysis](#quantitative-throughput-analysis)
- [Custom Client Implementation Details](#custom-client-implementation-details)
  - [Core Components](#core-components)
  - [Key Architectural Elements](#key-architectural-elements)
    - [Transaction Tagging System](#1-transaction-tagging-system)
    - [The ParallelPool Architecture](#2-the-parallelpool-architecture)
    - [Batch Processing System](#3-batch-processing-system)
    - [Enhanced API for Parallel Transaction Management](#4-enhanced-api-for-parallel-transaction-management)
  - [Transaction Processing Flow](#transaction-processing-flow)
- [Integration with EigenLayer AVS](#integration-with-eigenlayer-avs)
- [Performance Improvements](#performance-improvements)
  - [Performance Monitoring](#performance-monitoring)
- [Future Research Directions](#future-research-directions) -->


## Introduction

Ethereum is a state machine, and the EVM executes transactions sequentially, one by one. It doesn’t execute other transactions until the execution of the current transaction is completed and the resulting state is computed. This is to avoid state/storage collisions and preserve atomicity of transactions. In other words, this ensures that each transaction is a self-contained, atomic unit of operation that changes the system’s state without interference from or interference to any other concurrent transactions. The execution, however, is still sequential, even with a set of completely independent transactions, because the EVM isn’t designed to be able to execute them at the same time.

So how do you change this?

## Solution

Our solution to the parallel transaction execution challenge focuses on intelligently batching transactions from the mempool based on independent state accesses. By identifying which transactions can safely be executed in parallel without state conflicts, we can significantly increase overall throughput while preserving blockchain consistency.

Using Eigenlayer AVS, we have created a new way to parallelize the EVM. Our implementaiton uses a state access batching algorithm to figure out which transactions can be processed simultaneously and which ones need to wait. It's similar to how web servers handle multiple requests concurrently while making sure related operations still happen in the right sequence.

Our solution solves parallel execution by intelligently batching transactions from the mempool based on independent state accesses, allowing us to propose more efficient blocks. We've developed two possible implementation paths:

Our first approach involves creating a custom client implementation that works within the existing ecosystem through an Ethereum Improvement Proposal (EIP). This implementation introduces parallel execution capabilities through specialized transaction types. This can directly be used on mainnet or any EVM compatible chain. 

The second way that protocols can use our custom batching solution is through the creation of Alt L1s!

We have the brains of the operation with our custom algorithms, and we look to speed up ETH and Layer 2s and really -- anyone who wants to use our product!

## The Batching Algorithm: The Heart of Our Innovation

What makes our solution truly groundbreaking is our custom batching algorithm - the most challenging and intellectually demanding component of the entire system. This algorithm represents the culmination of cutting-edge research in blockchain parallelization that has been at the forefront of Ethereum and EVM chain discussions in recent years.

The batching algorithm is the true intellectual property and "secret sauce" of our system. It's what enables us to:

1. **Accurately simulate state access patterns** of transactions before execution
2. **Identify independent transaction groups** that can safely run in parallel
3. **Maximize parallelization opportunities** without compromising blockchain consistency

While Ethereum core developers and researchers have been exploring parallel execution for a while now, our implementation brings this concept to practical reality. 

The actual theoretical implementation once the algorithmic brains into real world chains becomes relatively straightforward. The hard part is the batching logic - determining which transactions can safely execute in parallel. After that, the mechanical aspects of implementing the execution environment are theoretically trivial; we have proposed and began developing an execution client and proposed an easy implementation of how anyone can use our product to develop custom Alt-L1s later in this README. 

Our batching algorithm's efficiency is what enables the significant throughput improvements demonstrated in our analysis, and it's what positions our solution as a transformative technology for EVM-compatible blockchains. How much faster can our batching make ETH L1?

### Quantitative Throughput Analysis
Our perspective:

The goal of parallelization is to increase execution speed, translating into higher throughput for blockchain networks. This benefits users through reduced transaction fees and benefits proposers by enabling them to process more transactions per second. Proposers can afford to accept smaller fees per transaction while earning higher total fees due to the increased transaction volume.

Our analysis indicates that the median sustainable number of parallel groups per block (containing 109 transactions) is 32. With this configuration, the degree of parallelization is approximately 109 / 32 ≈ 3.4. To quantify the throughput improvement, we model the total block time as the sum of block propagation time (p) and block computation time (c):

```
Total block time = p + c seconds
```

The throughput is given by:

```
Throughput = Block size / (p + c)
```

With computation reduced by a median factor of 3.4 through parallelization, the new throughput becomes:

```
New Throughput = Block size / (p + c/3.4)
```

Assuming a total block time of 12 seconds split evenly among p = c = 6 seconds, the new throughput improves from 9.08 to 14.04 transactions per second, representing a 1.54x increase. This substantial improvement demonstrates the real-world impact of our parallel transaction processing approach.

## Integration with EigenLayer AVS

Our implementation integrates with EigenLayer's AVS by:

1. Using the AVS to compute the parallelizable batches through state access
2. Using multiple operators for consensus on batching algorithm outputs
3. Enabling consistent validation of the algorithm for secure results
4. Creating validator logic to verify parallel execution results

The AVS integration allows anyone to benefit from parallel execution while maintaining its core security properties and restaking mechanisms. By batching transactions based on independent state accesses, our solution significantly increases the throughput capabilities.

# Implementation of Custom Batching

### 1. Custom Client Implementation 

## Custom Client Implementation Details

Our custom client, which is currently in work, introduces parallel transaction processing. The technical implementation includes:

### Core Components

Our implementation is spread across these main modules:

- `core/txpool/parallelpool/parallelpool.go`: Main implementation of the parallel transaction pool
- `core/txpool/parallelpool/list.go`: Handles transaction storage and organization
- `core/txpool/parallelpool/interfaces.go`: Defines interfaces for tracking nonces and looking up transactions
- `core/txpool/parallelpool/api.go`: Provides enhanced API for tagging transactions and managing batches

### Key Architectural Elements

#### Transaction Tagging System

We decided to use a simple but effective tagging system to identify which transactions can run in parallel:

```go
const (
    // Tag identifiers within transaction data
    ParallelizableTag = "PARALLEL"
    SequentialTag     = "SEQUENTIAL"
)
```

Transactions get these tags prefixed to their data field, which makes them super easy to identify without having to do complex dependency analysis. This approach really simplifies parallelization while staying compatible with existing transaction processing.

#### The ParallelPool Architecture

The `ParallelPool` is the heart of our implementation. It:

- Keeps track of pending transactions that are ready to go
- Maintains a queue of transactions waiting to be processed
- Groups parallelizable transactions into batches for efficient execution
- Uses smart prioritization to determine optimal execution order

This design is pretty similar to resource management systems you'd find in distributed computing, where you need to maintain global state while still allowing some operations to happen concurrently.

#### Batch Processing System

We came up with a batch processing system that looks like this:

```go
type TxBatch struct {
    Transactions []*types.Transaction
    BatchID      uint64
}
```

This structure groups compatible transactions that can be processed in parallel, with configurable batch sizes (default is 64, max is 256). The batch system automatically:

- Groups transactions from different accounts that can safely run in parallel
- Assigns unique batch IDs so we can track and monitor them
- Optimizes how batches are composed to maximize throughput

#### Enhanced API for Parallel Transaction Management

We've built a comprehensive API for working with parallel transactions:

```go
// ParallelTxPoolAPI offers an API for working with parallel transactions
type ParallelTxPoolAPI struct {
    pool *ParallelPool
}
```

This API lets you:
- Tag transactions as parallelizable or sequential
- Configure batch sizes to suit your needs
- Trigger batch execution when you want
- Get detailed stats about your transactions and batches
- Analyze transaction data to see if it's suitable for parallelization

### Transaction Processing Flow

#### Transaction Type Definition

We defined a new transaction type identifier (`0x05`) for parallel-capable transactions, which ensures backward compatibility with existing transaction types:

```go
const (
    // ParallelTxType is the transaction type for parallel transactions
    ParallelTxType = 0x05
    
    // Configuration constants
    txPoolGlobalSlots = 4096            // Maximum transaction capacity
    txMaxSize         = 4 * 1024 * 1024 // Maximum transaction size (4MB)
)
```

#### Transaction Tagging and Validation

When we get a transaction for parallel processing, it goes through a tagging process:

```go
// TagTransaction adds parallelization tags to a transaction
func (api *ParallelTxPoolAPI) TagTransaction(ctx context.Context, args TagTransactionRequest) (hexutil.Bytes, error) {
    // ...
    
    // Add parallel tag to data
    if args.Parallel {
        data = append([]byte(ParallelizableTag), args.Data...)
        log.Debug("Tagged transaction as parallelizable", "from", args.From, "to", args.To)
    } else {
        data = append([]byte(SequentialTag), args.Data...)
        log.Debug("Tagged transaction as sequential", "from", args.From, "to", args.To)
    }
    
    // ...
}
```

This tagging approach has several advantages:
1. It makes detecting parallelizable transactions really simple
2. It saves us from having to do complex dependency analysis at runtime by using the AVS to offload all computation!

#### Batch Preparation and Execution

The system automatically organizes parallelizable transactions into batches for efficient execution:

```go
// prepareBatches organizes parallelizable transactions into execution batches
func (p *ParallelPool) prepareBatches() {
    // ...
    
    // Create new batches
    p.batchedTxs = nil
    var currentBatch TxBatch
    currentBatch.Transactions = make([]*types.Transaction, 0, p.batchSize)
    currentBatch.BatchID = uint64(time.Now().UnixNano())

    // Collect transactions from all accounts
    txCount := 0
    for addr, txs := range p.parallelizableTxs {
        for _, tx := range txs {
            currentBatch.Transactions = append(currentBatch.Transactions, tx)
            txCount++

            // When batch is full, add it and create a new one
            if txCount >= p.batchSize {
                p.batchedTxs = append(p.batchedTxs, currentBatch)
                currentBatch.Transactions = make([]*types.Transaction, 0, p.batchSize)
                currentBatch.BatchID = uint64(time.Now().UnixNano())
                txCount = 0
            }
        }
    }
    
    // ...
}
```

### 2. Implementing our custom algorithm through an Alternative Layer 1 (Alt-L1) Implementation -- EIGENChain

Our first approach involves creating a complete alternative Layer 1 blockchain that natively supports parallel transaction execution. This implementation:

- Uses custom consensus mechanisms optimized for parallel processing
- Incorporates parallel execution directly into the block production pipeline
- Features native support for transaction dependency analysis and grouping
- Provides built-in mempool organization for efficient batching
- Includes specialized validator logic to ensure consistency across parallel executions

The Alt-L1 approach gives us complete freedom to optimize the entire blockchain stack for parallelism, from transaction submission to block production and validation.