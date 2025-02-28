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

### Quantitative Throughput Analysis: What solving this problem could mean?
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


#### Impact on L2s and L1s

While the impact on L1 (specifically Ethreum) and its advantages may not be immediately acted upon due to Ethereum's fixed slot times (12 s), a continuous usage of parallelizable blocks (transactions) can help in reducing the slot times. The Ethereum slot times are based off propagation and execution times. Going down on the execution time still allows to help reduce the slot times, even when propagation time cannot be reduced. 

For L2s, the effects are immediately apparant. The L2 tx batches posted to DA layers like EigenDA essentially makes the L2 sequencer's transaction handling ability a limit. With parallel execution of transactions the L2 sequencer can process more transactions.

In addition, Replica Nodes, Verifiers and any node that is syncing can utilize the parallel batches and ordering info to sync faster.

## Integration with EigenLayer AVS

Our implementation integrates with EigenLayer's AVS by:

1. Using the AVS to compute the parallelizable batches through state access
2. Using multiple operators for consensus on batching algorithm outputs
3. Enabling consistent validation of the algorithm for secure results
4. Creating validator logic to verify parallel execution results

The AVS integration allows anyone to benefit from parallel execution while maintaining its core security properties and restaking mechanisms. By batching transactions based on independent state accesses, our solution significantly increases the throughput capabilities.

# Implementation of Custom Batching

Our first approach involves creating a custom client implementation that works within the existing ecosystem through an Ethereum Improvement Proposal (EIP). This implementation introduces parallel execution capabilities through specialized transaction types. This can directly be used on mainnet or any EVM compatible chain. 

The second way that protocols can use our custom batching solution is through the creation of Alt L1s!


## Components 

a) AVS deployed using Othentic stack

b) Attestation Smart Contracts supported used with the AVS

c) Parallel Execution Batcher Helper utilized by the AVS

d) UI that fetches, and displays the most parallelizable block options (with graphics to assist with understanding)

## Deployed AVS using Othentic

Deployed AVS contracts: 
```
AVS_GOVERNANCE_ADDRESS=0x874343CB2CaCf30CbbB60CF1C483D7E169230E68
ATTESTATION_CENTER_ADDRESS=0x8feb0306F8420436C0bc4054C6e670F131eAF573
```

Find AVS task submission transactions:
https://www.oklink.com/amoy/address/0x8feb0306f8420436c0bc4054c6e670f131eaf573

```
Deployer: 0x304dB28088E12DDcBec79c7e029e484Eaa9A8b0e
Attester 1: 0x43e554c2dB9671024Ba3C88b53a2D019537493eF
Attester 2: 0xa72cd1D32cf9F306D367de29F367dab68a4D094b
Attester 3: 0xd3e7483D19ecbB631B65aC7D51964cF9A85e631C
```



## Run the project locally

1. To run the project locally we first need to run the AVS (operator) services locally.

If you do not know what operators are - or are yet to deploy/register them with the project, please follow the steps listed here: https://docs.othentic.xyz/main/avs-framework/quick-start (upto step 8: Registering operator to AVS)

If you however, know the operator and have deployed the `AVS_Governance` and `Attestation_Center` contracts, please proceed with populating the .env file in `/Othentic-AVS`

```
$ cd AVS/Othentic-AVS
$ cp .env.example .env
```

Add deployer, operator 1, operator 2, operator 3 keys, AVS_GOVERNANCE_ADDRESS and ATTESTATION_CENTER_ADDRESS to the .env file


2. Now spin up the containers (AVS Execution, Validation, operator and parallel execution helper services) by running:

```
$ docker-compose up --build
```

This should spin up the AVS services along with the parallel execution helper that the AVS utilizes.
Navigate to the Attestation center contract to check attestations being posted every 5 seconds on-chain while the AVS is running. To find out about the format of these attestations and decode them, please refer (below)[#Format-of-attestations-posted-on-chain]


3. Now, to visualize things clearly and in an easier way, spin up the UI by running:

```
$ cd ../../
$ npm run dev
```


## Format of Attestations posted on-chain

Attestations are posted on-chain by the AVS in the following form:
```
  data: {
    proofOfTask: 'QmTDgBsVF2ekz7MwcXW9V5Ft5qBmmUKDJ3tFkMPC3s7wJu',
    data: 'e59b226819936f9b3aa09db8bd0dbc3c0fccdf699d319068df35290078d1171d',
    taskDefinitionId: 0
  },
```

where `proofOfTask` is the IPFS hash of the block content uploaded to IPFS. The block layout contains transactions with its custom order including parallelizable batches of transaction and sequential transactions.


`data` is the hash of the block content (the data uploaded to IPFS) which acts as a way to cross-verify block orders proposed by the operator and check their parallelizability validity when executed by the EVM.

`taskDefinitionId` is an auto-generated incremental id, since we use a cron-job it is set to a static 0


For instance,
An example of these block data posted on-chain is the tx: (https://www.oklink.com/amoy/tx/0x8632b86cab28306f13d2a442c96c130372689882b6fbe1a2cd590ba8632c7cd1)[https://www.oklink.com/amoy/tx/0x8632b86cab28306f13d2a442c96c130372689882b6fbe1a2cd590ba8632c7cd1]

decoding the input data of this tx, that is a call to submitTask(string,bytes,address,uint16)
returns(QmTDgBsVF2ekz7MwcXW9V5Ft5qBmmUKDJ3tFkMPC3s7wJu, 0x65353962323236383139393336663962336161303964623862643064626333633066636364663639396433313930363864663335323930303738643131373164, 0x43e554c2dB9671024Ba3C88b53a2D019537493eF, 0)

The block data stored at the ipfs location: (https://ipfs.io/ipfs/QmTDgBsVF2ekz7MwcXW9V5Ft5qBmmUKDJ3tFkMPC3s7wJu)[https://ipfs.io/ipfs/QmTDgBsVF2ekz7MwcXW9V5Ft5qBmmUKDJ3tFkMPC3s7wJu]

```
[{"type":"parallelizable","groupId":1,"transactions":["0xe4f9cd89034980be3cca15e58c0533d1755614abbad358a64ccf509003e7611b","0x5f46e516f06b9ad717f6346eafb47b1788b248b7682b834e026a16ab2b6c9181","0x35f5f4d883c60fcc3843eb12a49cf340097ab0cdfa0d8f2a51240268de1dc684","0x3961d79cf2e5470e9b644a80109048c09e015c681d8b0127a1ace65550b8b36f","0x2a47d09c6c45f1447fddcaaf6996eaa1f4c8fc819f24e751b24b858c97ecffcf","0x208102876156cc541b5b5139c7a10b5b2e20de83c520faefc9636d7daf7ac26b","0x36df1a295cf45f719f386e8fd6b48b025605d4f2835776696714e622dad36054","0x956e5a68c4077dc0123402a56125ed5b30b1560c1937ce0dd00679e093c60e5c","0x611f3fb6c213c7ae320144ca9548bf837c75285d5a9d362e1ee46983cab70fdb","0x8eeb24ca721f1bf80d7b287dccee3d85066dc4bb5ae7f42f14cfd61ce7643d49","0x48607e686832f2059bed1339734cfc9de1796e8bed9a192000ef39974fb3b29b","0xc4e139d302f3c001e1a193a7034f25b348255bb2b33e6e4b433ce1a048f2dfa6","0x2dd42b58dbb2af2b14a6b6ffdab30435b0462c628aaf1d02e8b035f50aa2dda1","0x5afed2d8412f2d0ed49cbf4766c2820d9fc273cad1d458288731d5ce88e5048b"]},{"type":"parallelizable","groupId":2,"transactions":["0xf1645936340a7838c93f8896882cdc40db728396eb78cb7abfb0fd173860d3ed","0xc9b29bd7a4b0600a6938236a713c468c19fe872f71113340969c1833e9146644"]},{"type":"parallelizable","groupId":3,"transactions":["0x9a249aef47a48819294006fafc24997c0ce0db436bf909bce4913f44c7b13a88"]},{"type":"parallelizable","groupId":4,"transactions":["0xabee61efa208deeb21d2cd0a0334229de310295e539d106937ae59656b913fa5"]},{"type":"parallelizable","groupId":5,"transactions":["0x7da7d79f2eba997d5d64d638456648854551010139f19e50e0b104c1d52f6dce"]},{"type":"sequential","groupId":6,"transactions":["0xb35c938f30233dfd20f4c3f9b7f4514f81a1e9a8274e9df15ee7797e44f241e5","0x2e32fd96e7d574481336ad670529d563baf0b2da14831b4a333ab55406c9f144","0x18cb33ea08de2f0b315eb7c3e6bd8049c7125676250efddc1acadcc336a44822"]}]
```

the hash of which equates to string(0x65353962323236383139393336663962336161303964623862643064626333633066636364663639396433313930363864663335323930303738643131373164) = e59b226819936f9b3aa09db8bd0dbc3c0fccdf699d319068df35290078d1171d





## Why is an AVS required? Why concurrency penalties are bad?

One of the major lines of thought around solving the sequential execution problem for the EVM has been speculative concurrency. Speculative concurrency - proposes optimistically executing transactions parallely in parallel threads. If there are collisions (common state accesses) between these transactions - they are discarded and rerun sequentially, later. 
Surprisingly, while this approach hasn't proven beneficial in practice, the reasons behind its limitations offer valuable lessons and further highlight the utility of an AVS in this context.

The reason speculative concurrency, or even an improved model(with separation of nodes) does not work well in practice - has been emphasized by Seraph et al. in their paper - ('An Empirical Study of Speculative Concurrency in Ethereum Smart Contract')[https://arxiv.org/pdf/1901.01376]:
- "When txs are optimistically executed, conflict grows as blockchain is more crowded, generally 35% clash rate"
- "Speculative techniques typically work well when conflicts are rare, but perform poorly when conflicts are common"

Overall, penalties incurred in the form of attempting to execute parallely, detecting issues and having to queue them sequentially later ends up wasting time, which in fact makes execution slower (than a sequential approach). In other words, parallel execeution only works efficiently when batches of parallelizable transactions are pre-decided and are valid (and do not have a collision) during execution. This underlines the importance of being correct when creating parallelizable batches or trusting someone who does it for you. The AVS helps in mitigating trust here - by allowing at least one EigenLayer operator to be accountable for proposing these parallelizable blocks. 

















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
## An alternative approach
### 2. Implementing our custom algorithm through an Alternative Layer 1 (Alt-L1) Implementation -- EIGENChain

Our first approach involves creating a complete alternative Layer 1 blockchain that natively supports parallel transaction execution. This implementation:

- Uses custom consensus mechanisms optimized for parallel processing
- Incorporates parallel execution directly into the block production pipeline
- Features native support for transaction dependency analysis and grouping
- Provides built-in mempool organization for efficient batching
- Includes specialized validator logic to ensure consistency across parallel executions

The Alt-L1 approach gives us complete freedom to optimize the entire blockchain stack for parallelism, from transaction submission to block production and validation.