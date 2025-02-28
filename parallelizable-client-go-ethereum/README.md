
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
