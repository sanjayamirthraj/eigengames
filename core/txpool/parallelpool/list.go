package parallelpool

import (
	"sort"
	"sync"

	"github.com/ethereum/go-ethereum/core/types"
)

// parallelList is a data structure to store parallel transactions.
type parallelList struct {
	txs   map[uint64]*types.Transaction // Hash map storing the transaction data
	items []*types.Transaction          // Sorted transactions
	mu    sync.RWMutex                  // Mutex for protecting the list
	dirty bool                          // Whether the items need to be resorted
}

// newParallelList creates a new parallel transaction list.
func newParallelList() *parallelList {
	return &parallelList{
		txs:   make(map[uint64]*types.Transaction),
		items: make([]*types.Transaction, 0),
	}
}

// Add adds a new transaction to the list, returning whether it was inserted
// and if an old transaction was removed.
func (l *parallelList) Add(tx *types.Transaction, priceBump uint64) (bool, *types.Transaction) {
	l.mu.Lock()
	defer l.mu.Unlock()

	nonce := tx.Nonce()
	if old := l.txs[nonce]; old != nil {
		// Check if the new transaction is better than the old one
		if old.GasFeeCapCmp(tx) >= 0 {
			return false, nil
		}
		l.txs[nonce] = tx
		l.dirty = true
		return true, old
	}

	l.txs[nonce] = tx
	l.dirty = true
	return true, nil
}

// Get returns a transaction if it exists in the list.
func (l *parallelList) Get(nonce uint64) *types.Transaction {
	l.mu.RLock()
	defer l.mu.RUnlock()
	return l.txs[nonce]
}

// Remove removes a transaction from the list.
func (l *parallelList) Remove(nonce uint64) {
	l.mu.Lock()
	defer l.mu.Unlock()

	delete(l.txs, nonce)
	l.dirty = true
}

// Ready returns a list of transactions that are ready for execution.
// The returned transactions will be sorted by:
// 1. Dependencies (transactions with no dependencies first)
// 2. Gas price (higher gas price first)
func (l *parallelList) Ready() []*types.Transaction {
	l.mu.Lock()
	defer l.mu.Unlock()

	if !l.dirty {
		return l.items
	}

	// Convert map to slice
	items := make([]*types.Transaction, 0, len(l.txs))
	for _, tx := range l.txs {
		items = append(items, tx)
	}

	// Sort transactions by dependencies and gas price
	sort.SliceStable(items, func(i, j int) bool {
		tx1 := items[i]
		tx2 := items[j]

		// Get parallel transaction data
		ptx1, ok1 := tx1.GetParallelTxData()
		ptx2, ok2 := tx2.GetParallelTxData()

		// If either transaction is not a parallel transaction, sort by gas price
		if !ok1 || !ok2 {
			return tx1.GasFeeCapCmp(tx2) > 0
		}

		// Independent transactions come first
		if ptx1.IsParallelizable() != ptx2.IsParallelizable() {
			return ptx1.IsParallelizable()
		}

		// If both are independent or both are dependent, sort by gas price
		return tx1.GasFeeCapCmp(tx2) > 0
	})

	l.items = items
	l.dirty = false
	return items
}

// Len returns the length of the transaction list.
func (l *parallelList) Len() int {
	l.mu.RLock()
	defer l.mu.RUnlock()
	return len(l.txs)
}

// Empty returns whether the list is empty.
func (l *parallelList) Empty() bool {
	l.mu.RLock()
	defer l.mu.RUnlock()
	return len(l.txs) == 0
}

// Flatten returns a slice of all transactions in the list.
func (l *parallelList) Flatten() []*types.Transaction {
	return l.Ready()
}

// Clear removes all transactions from the list.
func (l *parallelList) Clear() {
	l.mu.Lock()
	defer l.mu.Unlock()

	l.txs = make(map[uint64]*types.Transaction)
	l.items = make([]*types.Transaction, 0)
	l.dirty = false
}
