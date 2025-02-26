// Copyright 2023 The go-ethereum Authors
// This file is part of the go-ethereum library.
//
// The go-ethereum library is free software: you can redistribute it and/or modify
// it under the terms of the GNU Lesser General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// The go-ethereum library is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU Lesser General Public License for more details.
//
// You should have received a copy of the GNU Lesser General Public License
// along with the go-ethereum library. If not, see <http://www.gnu.org/licenses/>.

package parallelpool

import (
	"sync"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
)

// Noncer defines the required functions to track nonces for accounts
type Noncer interface {
	// Get returns the current nonce of an account.
	Get(addr common.Address) uint64
}

// Lookup defines the methods needed to access the transaction metadata.
type Lookup interface {
	// Get returns a transaction if it exists in the lookup, or nil if not
	Get(hash common.Hash) *types.Transaction
}

// txLookup is used internally by TxPool to track transactions while allowing
// lookup by hash and sender.
type txLookup struct {
	all map[common.Hash]*types.Transaction
	mu  sync.RWMutex
}

// newTxLookup creates a new lookup structure.
func newTxLookup() *txLookup {
	return &txLookup{
		all: make(map[common.Hash]*types.Transaction),
	}
}

// Get returns a transaction if it exists in the lookup
func (t *txLookup) Get(hash common.Hash) *types.Transaction {
	t.mu.RLock()
	defer t.mu.RUnlock()

	return t.all[hash]
}

// Count returns the current number of transactions in the lookup
func (t *txLookup) Count() int {
	t.mu.RLock()
	defer t.mu.RUnlock()

	return len(t.all)
}

// Add adds a transaction to the lookup
func (t *txLookup) Add(tx *types.Transaction) {
	t.mu.Lock()
	defer t.mu.Unlock()

	t.all[tx.Hash()] = tx
}

// Remove removes a transaction from the lookup
func (t *txLookup) Remove(hash common.Hash) {
	t.mu.Lock()
	defer t.mu.Unlock()

	delete(t.all, hash)
}

// ParallelAPI provides an API for submitting transactions with parallelization tags
type ParallelAPI interface {
	// SubmitParallelTx submits a transaction with parallelization tag
	SubmitParallelTx(tx *types.Transaction) (common.Hash, error)

	// ExecuteBatches executes all available batches of parallelizable transactions
	ExecuteBatches() ([]common.Hash, error)

	// GetBatchStats returns statistics about current batches
	GetBatchStats() (batchCount int, txCount int, batchSize int)

	// SetBatchSize configures the size of transaction batches
	SetBatchSize(size int) error
}

// ParallelTagsGenerator creates transaction tags based on their properties
type ParallelTagsGenerator interface {
	// TagAsParallelizable marks a transaction as parallelizable
	TagAsParallelizable(tx *types.Transaction) (*types.Transaction, error)

	// TagAsSequential marks a transaction as requiring sequential execution
	TagAsSequential(tx *types.Transaction) (*types.Transaction, error)

	// IsParallelizable checks if a transaction is tagged as parallelizable
	IsParallelizable(tx *types.Transaction) bool
}

// ParallelExecutor provides an interface for executing batches of transactions in parallel
type ParallelExecutor interface {
	// ExecuteBatch executes a batch of transactions in parallel
	ExecuteBatch(txs []*types.Transaction) ([]common.Hash, error)

	// EstimateParallelGas estimates the gas usage for a batch of parallel transactions
	EstimateParallelGas(txs []*types.Transaction) (uint64, error)
}

// ParallelStateFetcher provides an interface for fetching state for parallel execution
type ParallelStateFetcher interface {
	// FinalState returns the final state after executing all transactions
	FinalState() (common.Hash, error)

	// GetBatchState returns the state after executing a specific batch
	GetBatchState(batchID uint64) (common.Hash, error)
}
