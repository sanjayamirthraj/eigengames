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
	"sort"
	"sync"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
)

// parallelList is a data structure to store parallel transactions.
type parallelList struct {
	items map[uint64]*types.Transaction // Transactions indexed by nonce
	txs   map[common.Hash]*types.Transaction
	mu    sync.RWMutex
}

// newParallelList creates a new list to store parallel transactions
func newParallelList() *parallelList {
	return &parallelList{
		items: make(map[uint64]*types.Transaction),
		txs:   make(map[common.Hash]*types.Transaction),
	}
}

// Add adds a new transaction to the list, returning whether the transaction was
// added and if an old was removed
func (l *parallelList) Add(tx *types.Transaction) bool {
	hash := tx.Hash()
	nonce := tx.Nonce()

	l.mu.Lock()
	defer l.mu.Unlock()

	if _, ok := l.txs[hash]; ok {
		return false
	}

	if old, ok := l.items[nonce]; ok {
		// There's already a transaction with this nonce
		// Replace if the new one has a higher gas price
		if tx.GasPrice().Cmp(old.GasPrice()) > 0 {
			l.items[nonce] = tx
			l.txs[hash] = tx
			delete(l.txs, old.Hash())
			return true
		}
		return false
	}

	l.items[nonce] = tx
	l.txs[hash] = tx
	return true
}

// Get returns a transaction if it exists in the list
func (l *parallelList) Get(nonce uint64) *types.Transaction {
	l.mu.RLock()
	defer l.mu.RUnlock()

	return l.items[nonce]
}

// GetByHash returns a transaction if it exists in the list by hash
func (l *parallelList) GetByHash(hash common.Hash) *types.Transaction {
	l.mu.RLock()
	defer l.mu.RUnlock()

	return l.txs[hash]
}

// Remove deletes a transaction from the list
func (l *parallelList) Remove(hash common.Hash) {
	l.mu.Lock()
	defer l.mu.Unlock()

	tx, ok := l.txs[hash]
	if !ok {
		return
	}
	delete(l.items, tx.Nonce())
	delete(l.txs, hash)
}

// Ready returns a nonce-sorted slice of transactions that are ready to be executed.
// For parallel transactions, we prioritize by:
// 1. Transactions with no dependencies
// 2. Transactions with dependencies that have been executed
// 3. Gas price (higher gas prices first)
func (l *parallelList) Ready() []*types.Transaction {
	l.mu.RLock()
	defer l.mu.RUnlock()

	if len(l.items) == 0 {
		return nil
	}

	// First, get all transactions
	txs := make([]*types.Transaction, 0, len(l.items))
	for _, tx := range l.items {
		txs = append(txs, tx)
	}

	// Sort transactions by nonce, then by parallelizability, then by gas price
	sort.SliceStable(txs, func(i, j int) bool {
		// First check nonce for execution order
		if txs[i].Nonce() != txs[j].Nonce() {
			return txs[i].Nonce() < txs[j].Nonce()
		}

		// Second check if the transactions are parallelizable
		txDataI := extractParallelTxData(txs[i])
		txDataJ := extractParallelTxData(txs[j])

		isParallelI := isParallelizableTx(txs[i], txDataI)
		isParallelJ := isParallelizableTx(txs[j], txDataJ)

		if isParallelI != isParallelJ {
			return isParallelI // Parallelizable transactions come first
		}

		// Finally, sort by gas price
		return txs[i].GasPrice().Cmp(txs[j].GasPrice()) > 0
	})

	// Group transactions by whether they have dependencies
	var independent, dependent []*types.Transaction

	for _, tx := range txs {
		txData := extractParallelTxData(tx)
		if len(txData.Dependencies) == 0 {
			independent = append(independent, tx)
		} else {
			dependent = append(dependent, tx)
		}
	}

	// Return independent transactions first, then dependent transactions
	return append(independent, dependent...)
}

// extractParallelTxData extracts the parallel transaction data from a transaction
// This is a helper function used internally by Ready()
func extractParallelTxData(tx *types.Transaction) *ParallelTxData {
	// In a real implementation, this would decode the transaction data
	// For this implementation, we return a simple structure
	return &ParallelTxData{
		Dependencies: []common.Hash{},
	}
}

// isParallelizableTx checks if a transaction can be executed in parallel
// This is a helper function used internally by Ready()
func isParallelizableTx(tx *types.Transaction, txData *ParallelTxData) bool {
	return len(txData.Dependencies) == 0
}

// Flatten returns a nonce-sorted slice of transactions
func (l *parallelList) Flatten() []*types.Transaction {
	l.mu.RLock()
	defer l.mu.RUnlock()

	if len(l.items) == 0 {
		return nil
	}

	txs := make([]*types.Transaction, 0, len(l.items))
	for _, tx := range l.items {
		txs = append(txs, tx)
	}

	sort.Slice(txs, func(i, j int) bool {
		return txs[i].Nonce() < txs[j].Nonce()
	})

	return txs
}

// Len returns the length of the transaction list
func (l *parallelList) Len() int {
	l.mu.RLock()
	defer l.mu.RUnlock()

	return len(l.items)
}

// Empty returns true if there are no transactions in the list
func (l *parallelList) Empty() bool {
	l.mu.RLock()
	defer l.mu.RUnlock()

	return len(l.items) == 0
}
