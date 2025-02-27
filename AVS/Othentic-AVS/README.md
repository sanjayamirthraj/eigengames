# Parallel Execution Smart Batching AVS

This repository demonstrates contains a parallel execution batching helper AVS intended to be deployed using the Othentic Stack.

## Overview

This parallel execution batching AVS reads transactions from Ethereum's mempool and batches transaction together in smart batches that can be executed in parallel using Othentic Stack.

The operator (and this AVS) utilizes a script that is used to fetch mempool transaction state accesses, and group transactions together that do not have state access collisions. Find the local server that needs to be run in the root of this repo. (/parallel-exec-helper)


## Prerequisites

- Node.js (v 22.6.0 )
- Foundry
- [Yarn](https://yarnpkg.com/)
- [Docker](https://docs.docker.com/engine/install/)

## Installation

1. Clone the repository:

2. Install Othentic CLI:

   ```bash
   npm i -g @othentic/othentic-cli
   ```

## Execution/Validation Services

The Execution service exposes an /execute endpoint that utilizes the server (/parallel-exec-helper) to compute the batches and fetch the latest valid one. The actual blocks (combination of parallelizable and sequential transactions, with indications/demarcation for each) are then posted to IPFS and their hash is used as data while sending the task to the Othentic RPC client. 
For Validation, the actual block content data is cross-checked with the submitted block hash (when the block is actually submitted by a sequencer/proposer). This helps keep the operator(s) accountable for producing valid parallelizable blocks.

This is important since blocks with incorrect parallelizable batches (transactions that cannot be actually executed in parallel) has adverse effects on the chain. Referencing - ‘An Empirical Study of Speculative Concurrency in Ethereum Smart Contracts’ by Seraph et al (https://arxiv.org/pdf/1901.01376.pdf) which states
a) When txs are optimistically executed, conflict grows as blockchain is more crowded, generally 35% clash rate
b) “Speculative techniques typically work well when conflicts are rare, but perform poorly when conflicts are common”

Hence, valid ordering is essential for any parallel execution approach and using an AVS helps guarantee that by keeping things accountable.

