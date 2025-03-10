## Parallel Execution Blueprint for Eigenlayer

A simple AVS blueprint that fetches block data from an API, hashes the concatenated block hashes, and aggregates BLS signatures before submitting onchain.

## Notes
*** Important ***
While the blueprint hasn't been renamed to parallel-exec, the code has been updated to utilize the parallel-exec-helper to form block responses (with batches), hash and submit them to the contract


## Screenshots

![Tangle 1](/screenshots/tangle1.png)
![Tangle 2](/screenshots/tangle2.png)


## Prerequisites

Before you begin, ensure you have the following installed:

- [Anvil](https://book.getfoundry.sh/anvil/)
- [Docker](https://www.docker.com/get-started)

## Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/tangle-network/gadget.git
   cd gadget
   ```
   
2. Install Anvil:
   ```bash
   curl -L https://foundry.paradigm.xyz | bash
   foundryup
   ```

## Building the Blueprint

- To build the blueprint, run the following command:

```bash
cargo build --release -p incredible-squaring-blueprint-eigenlayer
```

## Running the AVS on a Testnet

- We have a test for running this AVS Blueprint on a local Anvil Testnet. You can run the test with the following:

```bash
RUST_LOG=gadget=trace cargo test --package incredible-squaring-blueprint-eigenlayer test_eigenlayer_incredible_squaring_blueprint -- --nocapture
```