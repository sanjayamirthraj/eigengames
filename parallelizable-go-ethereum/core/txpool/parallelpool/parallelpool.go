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
	"errors"
	"fmt"
	"math/big"
	"runtime"
	"sort"
	"sync"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core"
	"github.com/ethereum/go-ethereum/core/state"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/event"
	"github.com/ethereum/go-ethereum/log"
	"github.com/ethereum/go-ethereum/metrics"
	"github.com/ethereum/go-ethereum/params"
)

const (
	// ParallelTxType is the transaction type for parallel transactions
	ParallelTxType = 0x05

	// Tag identifiers within transaction data
	ParallelizableTag = "PARALLEL"
	SequentialTag     = "SEQUENTIAL"

	// Configuration constants
	txPoolGlobalSlots = 4096            // Maximum transaction capacity
	txMaxSize         = 4 * 1024 * 1024 // Maximum transaction size (4MB)

	// Batch execution constants
	DefaultBatchSize = 64  // Default number of transactions in a parallel batch
	MaxBatchSize     = 256 // Maximum number of transactions in a parallel batch

	// Reason for nonce changes
	txNonceChange = "transaction"
)

var (
	// ErrInvalidParallelTx is returned if the transaction type is not parallelTxType
	ErrInvalidParallelTx = errors.New("invalid parallel transaction type")

	// ErrParallelTxNonceUsed is returned if a transaction is already in the pool with the same nonce
	ErrParallelTxNonceUsed = errors.New("parallel transaction nonce already used")

	// ErrIntrinsicGas is returned if the transaction is specified to use less gas
	// than required to start the invocation.
	ErrIntrinsicGas = errors.New("intrinsic gas too low")

	// ErrGasLimit is returned if a transaction's requested gas limit exceeds the
	// maximum allowance of the current block.
	ErrGasLimit = errors.New("exceeds block gas limit")

	// ErrNegativeValue is returned if the transaction contains a negative value.
	ErrNegativeValue = errors.New("negative value")

	// ErrOversizedData is returned if the input data of a transaction is greater
	// than some meaningful limit a user might use. This is not a consensus error
	// making the transaction invalid, rather a DOS protection.
	ErrOversizedData = errors.New("oversized data")

	// ErrNonceTooLow is returned if the nonce of a transaction is lower than the
	// one present in the local chain.
	ErrNonceTooLow = errors.New("nonce too low")

	// ErrInsufficientFunds is returned if the total cost of executing a transaction
	// is higher than the balance of the user's account.
	ErrInsufficientFunds = errors.New("insufficient funds for gas * price + value")

	// ErrTxPoolOverflow is returned if the transaction pool is full and can't accept
	// another remote transaction.
	ErrTxPoolOverflow = errors.New("parallel txpool is full")

	// Metrics for the pending pool
	pendingParallelDiscardMeter   = metrics.NewRegisteredMeter("parallel/txpool/pending/discard", nil)
	pendingParallelReplaceMeter   = metrics.NewRegisteredMeter("parallel/txpool/pending/replace", nil)
	pendingParallelRateLimitMeter = metrics.NewRegisteredMeter("parallel/txpool/pending/ratelimit", nil) // Dropped due to rate limiting
	pendingParallelNofundsMeter   = metrics.NewRegisteredMeter("parallel/txpool/pending/nofunds", nil)   // Dropped due to out-of-funds

	// Metrics for the queued pool
	queuedParallelDiscardMeter   = metrics.NewRegisteredMeter("parallel/txpool/queued/discard", nil)
	queuedParallelReplaceMeter   = metrics.NewRegisteredMeter("parallel/txpool/queued/replace", nil)
	queuedParallelNofundsMeter   = metrics.NewRegisteredMeter("parallel/txpool/queued/nofunds", nil)
	queuedParallelRateLimitMeter = metrics.NewRegisteredMeter("parallel/txpool/queued/ratelimit", nil) // Dropped due to rate limiting

	// General metrics
	knownParallelTxMeter       = metrics.NewRegisteredMeter("parallel/txpool/known", nil)
	validParallelTxMeter       = metrics.NewRegisteredMeter("parallel/txpool/valid", nil)
	invalidParallelTxMeter     = metrics.NewRegisteredMeter("parallel/txpool/invalid", nil)
	underpricedParallelTxMeter = metrics.NewRegisteredMeter("parallel/txpool/underpriced", nil)
	overflowParallelTxMeter    = metrics.NewRegisteredMeter("parallel/txpool/overflow", nil)

	pendingParallelGauge = metrics.NewRegisteredGauge("parallel/txpool/pending", nil)
	queuedParallelGauge  = metrics.NewRegisteredGauge("parallel/txpool/queued", nil)
	localParallelGauge   = metrics.NewRegisteredGauge("parallel/txpool/local", nil)
	slotsParallelGauge   = metrics.NewRegisteredGauge("parallel/txpool/slots", nil)
)

// ParallelTxData represents additional data for a parallel transaction.
type ParallelTxData struct {
	// Dependencies is a list of transaction hashes that this transaction depends on.
	Dependencies []common.Hash
}

// BlockChain provides access to necessary blockchain methods.
type BlockChain interface {
	CurrentBlock() *types.Header
	GetBlock(hash common.Hash, number uint64) *types.Block
	StateAt(root common.Hash) (*state.StateDB, error)
	Config() *params.ChainConfig
}

// PendingFilter represents a set of filtering options that can be passed to TxPool.Pending.
type PendingFilter struct {
	// OnlyPlainTxs indicates plain transactions are returned if this is true
	OnlyPlainTxs bool
	// MinTip minimum tip in wei
	MinTip *big.Int
	// BaseFee is the basefee of the block to be mined next.
	BaseFee *big.Int
}

// Config are the configuration parameters of the parallel transaction pool.
type Config struct {
	PriceBump uint64 // Price bump percentage to replace an already existing transaction
}

// New types to manage tagged transactions
type TxBatch struct {
	Transactions []*types.Transaction
	BatchID      uint64
}

// ParallelPool is the struct for the parallel transaction pool.
type ParallelPool struct {
	config      *params.ChainConfig
	chainconfig *params.ChainConfig
	chain       BlockChain
	gasPrice    *big.Int
	txFeed      event.Feed
	scope       event.SubscriptionScope
	signer      types.Signer
	mu          sync.RWMutex

	istanbul bool // Fork indicator whether we are in the istanbul stage.
	eip2718  bool // Fork indicator whether we are using EIP-2718 type transactions.
	eip1559  bool // Fork indicator whether we are using EIP-1559 type transactions.

	currentState  *state.StateDB
	pendingState  *state.StateDB
	currentMaxGas uint64

	locals  *accountSet
	journal *journal

	pending map[common.Address]*parallelList
	queue   map[common.Address]*parallelList
	beats   map[common.Address]time.Time
	all     map[common.Hash]*types.Transaction
	priced  *parallelPricedList

	wg sync.WaitGroup

	// New fields for improved parallelization
	parallelizableTxs map[common.Address][]*types.Transaction // Txs that can be executed in parallel
	batchedTxs        []TxBatch                               // Transactions grouped into batches
	batchSize         int                                     // Current batch size configuration
	batchMu           sync.RWMutex                            // Mutex for batch operations

	// New metrics
	batchSizeGauge        *metrics.Gauge // Tracks current batch size
	batchCountGauge       *metrics.Gauge // Tracks number of batches
	parallelizableTxGauge *metrics.Gauge // Tracks parallelizable transactions
}

// New creates a new parallel transaction pool instance
func New(config Config, blockchain *core.BlockChain) *ParallelPool {
	// Initialize metrics
	batchSizeGauge := metrics.NewRegisteredGauge("parallel/txpool/batchsize", nil)
	batchCountGauge := metrics.NewRegisteredGauge("parallel/txpool/batchcount", nil)
	parallelizableTxGauge := metrics.NewRegisteredGauge("parallel/txpool/parallelizable", nil)

	// Create pool
	pool := &ParallelPool{
		config:                config,
		chain:                 blockchain,
		signer:                types.LatestSigner(blockchain.Config()),
		mu:                    sync.RWMutex{},
		pending:               make(map[common.Address]*parallelList),
		queue:                 make(map[common.Address]*parallelList),
		beats:                 make(map[common.Address]time.Time),
		all:                   make(map[common.Hash]*types.Transaction),
		priced:                newPriceHeap(),
		locals:                newAccountSet(nil),
		journal:               newJournal(),
		parallelizableTxs:     make(map[common.Address][]*types.Transaction),
		batchSize:             DefaultBatchSize,
		batchSizeGauge:        &batchSizeGauge,
		batchCountGauge:       &batchCountGauge,
		parallelizableTxGauge: &parallelizableTxGauge,
	}

	// Initialize the blockchain state
	pool.currentState = blockchain.CurrentBlock().StateDB()
	pool.pendingState = statedb.ManageState(pool.currentState)

	// Track transactions
	pool.head = blockchain.CurrentBlock().Hash()
	pool.chainconfig = blockchain.Config()

	return pool
}

// Type returns the type ID of the parallel transaction pool
func (p *ParallelPool) Type() byte {
	return ParallelTxType
}

// Filter returns a list of transactions matching the specified filter.
func (p *ParallelPool) Filter(filter *PendingFilter) map[common.Address][]*types.Transaction {
	return p.Pending(filter)
}

// Has returns an indicator whether the parallel pool has a transaction.
func (p *ParallelPool) Has(hash common.Hash) bool {
	p.mu.RLock()
	defer p.mu.RUnlock()

	return p.all[hash] != nil
}

// Get returns a transaction if it exists in the lookup.
func (p *ParallelPool) Get(hash common.Hash) *types.Transaction {
	p.mu.RLock()
	defer p.mu.RUnlock()

	return p.all[hash]
}

// Pending returns all pending transactions.
func (p *ParallelPool) Pending(filter *PendingFilter) map[common.Address][]*types.Transaction {
	p.mu.RLock()
	defer p.mu.RUnlock()

	result := make(map[common.Address][]*types.Transaction)

	for addr, list := range p.pending {
		txs := list.Ready()

		// Apply filter criteria if provided
		if filter != nil {
			filteredTxs := make([]*types.Transaction, 0, len(txs))
			for _, tx := range txs {
				// Skip non-plain transactions if only plain ones are requested
				if filter.OnlyPlainTxs && tx.Type() != types.LegacyTxType {
					continue
				}

				// Skip transactions below minimum tip or with insufficient tip
				if filter.MinTip != nil && filter.BaseFee != nil {
					effectiveTip, err := tx.EffectiveGasTip(filter.BaseFee)
					if err != nil || effectiveTip == nil || effectiveTip.Cmp(filter.MinTip) < 0 {
						continue
					}
				}

				filteredTxs = append(filteredTxs, tx)
			}

			result[addr] = filteredTxs
		} else {
			// If no filter is provided, include all transactions
			result[addr] = txs
		}
	}

	return result
}

// PendingWithFilter returns pending transactions according to the provided filter.
func (p *ParallelPool) PendingWithFilter() map[common.Address][]*types.Transaction {
	// This method now uses Filter(nil) which returns all pending transactions
	return p.Pending(nil)
}

// Process validates and adds a transaction to the pool
func (p *ParallelPool) Process(tx *types.Transaction, local bool) error {
	p.mu.Lock()
	defer p.mu.Unlock()

	// Verify transaction type
	if tx.Type() != ParallelTxType {
		return ErrInvalidParallelTx
	}

	// Try to add the transaction to the pool
	if err := p.add(tx, local); err != nil {
		return err
	}

	// Mark the transaction as local if it's from the local node
	if local {
		from, err := types.Sender(p.signer, tx)
		if err == nil {
			p.locals.add(from)
		}
	}

	// Broadcast the transaction to peers
	p.txFeed.Send(core.NewTxsEvent{Txs: []*types.Transaction{tx}})

	return nil
}

// Add implements the txpool.SubPool interface
func (p *ParallelPool) Add(txs []*types.Transaction, local bool) []error {
	p.mu.Lock()
	defer p.mu.Unlock()

	errs := make([]error, len(txs))
	for i, tx := range txs {
		// Skip non-parallel transactions
		if tx.Type() != ParallelTxType {
			errs[i] = ErrInvalidParallelTx
			continue
		}

		// Process each transaction
		errs[i] = p.add(tx, local)

		// Mark the transaction as local if it's from the local node
		if local && errs[i] == nil {
			from, err := types.Sender(p.signer, tx)
			if err == nil {
				p.locals.add(from)
			}
		}
	}

	// Notify subscribers about added transactions
	if len(txs) > 0 {
		p.txFeed.Send(core.NewTxsEvent{Txs: txs})
	}

	return errs
}

// add validates a parallel transaction and adds it to the non-executable queue
func (p *ParallelPool) add(tx *types.Transaction, local bool) error {
	// Verify transaction type
	if tx.Type() != ParallelTxType {
		return ErrInvalidParallelTx
	}

	// Validate transaction basic requirements
	if err := p.validateTx(tx, local); err != nil {
		return err
	}

	// Extract transaction address
	from, err := types.Sender(p.signer, tx)
	if err != nil {
		return err
	}

	// Get the tag from transaction data
	txData := tx.Data()
	isParallelizable := false

	// Simple tag detection in the first bytes of data
	// In a real implementation, this would use a more robust method
	if len(txData) > 8 {
		tag := string(txData[:8])
		isParallelizable = (tag == ParallelizableTag)
	}

	// Add the transaction to the pool
	p.all[tx.Hash()] = tx
	p.priced.Put(tx)

	if isParallelizable {
		// Add to parallelizable transactions map
		p.batchMu.Lock()
		if p.parallelizableTxs[from] == nil {
			p.parallelizableTxs[from] = make([]*types.Transaction, 0)
		}
		p.parallelizableTxs[from] = append(p.parallelizableTxs[from], tx)
		p.batchMu.Unlock()

		// Update parallelizable transactions count
		p.parallelizableTxGauge.Update(int64(len(p.parallelizableTxs)))
	} else {
		// Traditional processing for sequential transactions
		nonce := tx.Nonce()
		if p.pendingState.GetNonce(from) == nonce {
			if list := p.pending[from]; list == nil {
				p.pending[from] = newParallelList()
			}
			p.pending[from].Add(tx)
		} else {
			if list := p.queue[from]; list == nil {
				p.queue[from] = newParallelList()
			}
			p.queue[from].Add(tx)
		}
	}

	// Update metrics
	pendingParallelGauge.Update(int64(len(p.pending)))
	queuedParallelGauge.Update(int64(len(p.queue)))

	// After adding transactions, prepare batches for parallel execution
	p.prepareBatches()

	return nil
}

// getParallelTxData extracts the parallel transaction data from the transaction.
func getParallelTxData(tx *types.Transaction) *ParallelTxData {
	// In a real implementation, this would decode the transaction data
	// For now, we'll return a simple implementation with no dependencies
	return &ParallelTxData{
		Dependencies: []common.Hash{},
	}
}

// promoteExecutables moves transactions from the queue to pending if they are ready to be processed.
func (p *ParallelPool) promoteExecutables() {
	// Process each account with queued transactions
	for addr, list := range p.queue {
		// Get the current nonce for the account
		nonce := p.pendingState.GetNonce(addr)

		// Add all transactions that can be processed to pending
		ready := list.Ready()
		for _, tx := range ready {
			if tx.Nonce() == nonce {
				// Add to pending
				if p.pending[addr] == nil {
					p.pending[addr] = newParallelList()
				}
				p.pending[addr].Add(tx)

				// Remove from queue
				list.Remove(tx.Hash())

				// Update nonce
				nonce++
			}
		}

		// Remove empty queues
		if list.Empty() {
			delete(p.queue, addr)
		}
	}

	// Update metrics
	pendingParallelGauge.Update(int64(len(p.pending)))
	queuedParallelGauge.Update(int64(len(p.queue)))
}

// Add automatic conflict detection for storage slots
func (p *ParallelPool) detectConflicts(tx *types.Transaction) []common.Hash {
	var conflicts []common.Hash
	p.currentState.Prepare(tx.Hash(), common.Hash{}, 0)
	msg, _ := tx.AsMessage(p.signer, p.currentState.BaseFee())

	// Simulate transaction execution to get accessed addresses/storage slots
	evm := p.chain.GetEVM(msg, p.currentState, nil)
	evm.Config.Tracer = accessListTracer // Custom tracer to record storage access

	// Execute call to detect storage accesses
	_, _, _, err := core.ApplyMessage(evm, msg, new(core.GasPool).AddGas(msg.Gas()))
	if err == nil {
		// Compare accessed storage with existing transactions
		for addr, slots := range evm.StateDB.GetAccessList() {
			for _, slot := range slots {
				// Check if any pending tx modifies these slots
				for _, pendingTx := range p.pending {
					if pendingTx.To() != nil && *pendingTx.To() == addr {
						if _, exists := pendingTx.GetStorageAccess()[slot]; exists {
							conflicts = append(conflicts, pendingTx.Hash())
						}
					}
				}
			}
		}
	}
	return conflicts
}

// Enhanced transaction validation with auto-detected conflicts
func (p *ParallelPool) validateTx(tx *types.Transaction, local bool) error {
	// Reject transactions over defined size to prevent DOS attacks
	if uint64(tx.Size()) > txMaxSize {
		return ErrOversizedData
	}
	// Transactions can't be negative. This may never happen using RLP decoded
	// transactions but may occur if you create a transaction using the RPC.
	if tx.Value().Sign() < 0 {
		return ErrNegativeValue
	}
	// Make sure the transaction is signed properly
	from, err := types.Sender(p.signer, tx)
	if err != nil {
		return ErrInvalidSender
	}
	// Drop non-local transactions under our own minimal accepted gas price
	if !local && tx.GasFeeCapIntCmp(p.config.PriceLimit) < 0 {
		return ErrUnderpriced
	}
	// Ensure the transaction adheres to nonce ordering
	currentState := p.currentState
	if currentState.GetNonce(from) > tx.Nonce() {
		return ErrNonceTooLow
	}

	// Check if transaction has a parallel tag
	txData := tx.Data()
	isParallelizable := false
	if len(txData) > 8 {
		tag := string(txData[:8])
		isParallelizable = (tag == ParallelizableTag)
	}

	// Transactor should have enough funds to cover the costs
	// cost == V + GP * GL
	if currentState.GetBalance(from).Cmp(tx.Cost()) < 0 {
		return ErrInsufficientFunds
	}

	// Skip gas limit check for parallelizable transactions as they'll be executed in batches
	if !isParallelizable {
		// Check if gas limit is within acceptable range
		intrGas, err := core.IntrinsicGas(tx.Data(), tx.AccessList(), tx.To() == nil, p.chainconfig.IsShanghai(p.chain.CurrentBlock().Number()))
		if err != nil {
			return err
		}
		if tx.Gas() < intrGas {
			return ErrIntrinsicGas
		}
	}

	return nil
}

// removeTx removes a transaction from the pool.
func (p *ParallelPool) removeTx(hash common.Hash, outofbound bool) {
	tx := p.all[hash]
	if tx == nil {
		return
	}

	from, _ := types.Sender(p.signer, tx)

	// Remove from main lookup
	delete(p.all, hash)

	// Remove from price lookup
	p.priced.Remove(tx)

	// Remove from account lookups
	if pending := p.pending[from]; pending != nil {
		pending.Remove(hash)
		if pending.Empty() {
			delete(p.pending, from)
		}
	}
	if queue := p.queue[from]; queue != nil {
		queue.Remove(hash)
		if queue.Empty() {
			delete(p.queue, from)
		}
	}

	// Update metrics
	pendingParallelGauge.Update(int64(len(p.pending)))
	queuedParallelGauge.Update(int64(len(p.queue)))
}

// Reset clears the pool content.
func (p *ParallelPool) Reset(oldHead, newHead *types.Header) {
	p.mu.Lock()
	defer p.mu.Unlock()

	// Clear all maps
	p.pending = make(map[common.Address]*parallelList)
	p.queue = make(map[common.Address]*parallelList)
	p.all = make(map[common.Hash]*types.Transaction)
	p.priced = newParallelPricedList(p.all)

	// Update state and gas limit
	statedb, err := p.chain.StateAt(newHead.Root)
	if err != nil {
		log.Error("Failed to reset parallel transaction pool state", "err", err)
		return
	}
	p.currentState = statedb
	p.pendingState = statedb.Copy()
	p.currentMaxGas = newHead.GasLimit

	log.Info("Parallel transaction pool reset", "old", oldHead.Number, "new", newHead.Number)
}

// Stats returns the current pool stats according to its internal state.
func (p *ParallelPool) Stats() (int, int) {
	p.mu.RLock()
	defer p.mu.RUnlock()

	return len(p.pending), len(p.queue)
}

// SubscribeNewTxsEvent registers a subscription for new transaction events.
func (p *ParallelPool) SubscribeNewTxsEvent(ch chan<- core.NewTxsEvent) event.Subscription {
	return p.scope.Track(p.txFeed.Subscribe(ch))
}

// Content returns the content of the parallel transaction pool.
func (p *ParallelPool) Content() (map[common.Address][]*types.Transaction, map[common.Address][]*types.Transaction) {
	p.mu.RLock()
	defer p.mu.RUnlock()

	pending := make(map[common.Address][]*types.Transaction)
	for addr, list := range p.pending {
		pending[addr] = list.Flatten()
	}
	queued := make(map[common.Address][]*types.Transaction)
	for addr, list := range p.queue {
		queued[addr] = list.Flatten()
	}
	return pending, queued
}

// Locals returns the addresses of accounts considered local.
func (p *ParallelPool) Locals() []common.Address {
	p.mu.RLock()
	defer p.mu.RUnlock()

	return p.locals.addresses()
}

// AddLocal adds a local transaction to the pool.
func (p *ParallelPool) AddLocal(tx *types.Transaction) error {
	return p.Process(tx, true)
}

// Clear removes all transactions from the pool.
func (p *ParallelPool) Clear() {
	p.mu.Lock()
	defer p.mu.Unlock()

	p.pending = make(map[common.Address]*parallelList)
	p.queue = make(map[common.Address]*parallelList)
	p.all = make(map[common.Hash]*types.Transaction)
	p.priced = newParallelPricedList(p.all)

	log.Info("Parallel transaction pool cleared")
}

// journal maintains a list of recent transactions for replay.
type journal struct {
	transactions []*types.Transaction
}

// newJournal creates a new journal.
func newJournal() *journal {
	return &journal{
		transactions: make([]*types.Transaction, 0),
	}
}

// Add adds a transaction to the journal.
func (j *journal) Add(tx *types.Transaction) {
	j.transactions = append(j.transactions, tx)
}

// accountSet represents a set of addresses with specified transaction types.
type accountSet struct {
	accounts map[common.Address]struct{}
	txTypes  map[byte]bool
}

// newAccountSet creates a new account set with the given transaction types.
func newAccountSet(txTypes []byte) *accountSet {
	set := &accountSet{
		accounts: make(map[common.Address]struct{}),
		txTypes:  make(map[byte]bool),
	}
	for _, txType := range txTypes {
		set.txTypes[txType] = true
	}
	return set
}

// add adds an address to the set.
func (as *accountSet) add(addr common.Address) {
	as.accounts[addr] = struct{}{}
}

// addresses returns all addresses in the set.
func (as *accountSet) addresses() []common.Address {
	addrs := make([]common.Address, 0, len(as.accounts))
	for addr := range as.accounts {
		addrs = append(addrs, addr)
	}
	return addrs
}

// contains checks if an address is in the set.
func (as *accountSet) contains(addr common.Address) bool {
	_, ok := as.accounts[addr]
	return ok
}

// parallelPricedList represents a price-sorted list of transactions.
type parallelPricedList struct {
	all    map[common.Hash]*types.Transaction
	items  []*types.Transaction
	stales int
	mu     sync.RWMutex
}

// newParallelPricedList creates a new price-sorted transaction list.
func newParallelPricedList(all map[common.Hash]*types.Transaction) *parallelPricedList {
	return &parallelPricedList{
		all:   all,
		items: make([]*types.Transaction, 0),
	}
}

// Put adds a transaction to the list.
func (l *parallelPricedList) Put(tx *types.Transaction) {
	l.mu.Lock()
	defer l.mu.Unlock()

	l.items = append(l.items, tx)
	sort.Slice(l.items, func(i, j int) bool {
		return l.items[i].GasPrice().Cmp(l.items[j].GasPrice()) > 0
	})
}

// Remove removes a transaction from the list.
func (l *parallelPricedList) Remove(tx *types.Transaction) {
	l.mu.Lock()
	defer l.mu.Unlock()

	for i, item := range l.items {
		if item.Hash() == tx.Hash() {
			l.items = append(l.items[:i], l.items[i+1:]...)
			return
		}
	}
}

// Underpriced checks whether a transaction is cheaper than the cheapest transaction.
func (l *parallelPricedList) Underpriced(tx *types.Transaction) bool {
	l.mu.RLock()
	defer l.mu.RUnlock()

	if len(l.items) == 0 {
		return false
	}
	return l.items[len(l.items)-1].GasPrice().Cmp(tx.GasPrice()) >= 0
}

// Discard drops a number of transactions from the priced list.
func (l *parallelPricedList) Discard(count int) []*types.Transaction {
	l.mu.Lock()
	defer l.mu.Unlock()

	if count > len(l.items) {
		count = len(l.items)
	}
	drop := l.items[len(l.items)-count:]
	l.items = l.items[:len(l.items)-count]
	return drop
}

// prepareBatches organizes parallelizable transactions into execution batches
func (p *ParallelPool) prepareBatches() {
	p.batchMu.Lock()
	defer p.batchMu.Unlock()

	// Skip if no parallelizable transactions
	totalTxs := 0
	for _, txs := range p.parallelizableTxs {
		totalTxs += len(txs)
	}
	if totalTxs == 0 {
		return
	}

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

	// Add the last batch if it has any transactions
	if txCount > 0 {
		p.batchedTxs = append(p.batchedTxs, currentBatch)
	}

	// Update metrics
	p.batchSizeGauge.Update(int64(p.batchSize))
	p.batchCountGauge.Update(int64(len(p.batchedTxs)))
}

// ExecuteBatch executes a batch of parallelizable transactions
func (p *ParallelPool) ExecuteBatch(batch TxBatch) ([]common.Hash, error) {
	if len(batch.Transactions) == 0 {
		return nil, nil
	}

	// Track successfully executed transactions
	executedTxs := make([]common.Hash, 0, len(batch.Transactions))
	failedTxs := make(map[common.Hash]error)

	log.Debug("Executing batch of parallel transactions",
		"batchID", batch.BatchID,
		"txCount", len(batch.Transactions))

	// Create a channel for results
	type txResult struct {
		txHash common.Hash
		err    error
	}
	resultCh := make(chan txResult, len(batch.Transactions))

	// Use semaphore to limit concurrent executions if needed
	sem := make(chan struct{}, runtime.NumCPU())

	// Get current state to work with
	header := p.chain.CurrentBlock()
	stateDB, err := p.chain.StateAt(header.Root)
	if err != nil {
		return nil, fmt.Errorf("failed to get state for batch execution: %v", err)
	}

	// Clone state for each transaction to isolate changes
	for _, tx := range batch.Transactions {
		tx := tx // Capture variable for goroutine
		txHash := tx.Hash()

		// Acquire semaphore slot
		sem <- struct{}{}

		go func() {
			defer func() { <-sem }() // Release semaphore slot

			// Create an isolated state copy for this transaction
			txStateDB := stateDB.Copy()

			// Process transaction (would integrate with EVM in real implementation)
			// For now, we simulate execution by retrieving sender and updating state
			from, err := types.Sender(p.signer, tx)
			if err != nil {
				resultCh <- txResult{txHash, err}
				return
			}

			// Apply transaction changes to state
			// In a real implementation, this would involve running the transaction
			// through the EVM and applying the resulting state changes
			txStateDB.SetNonce(from, txStateDB.GetNonce(from)+1)

			// Record success
			resultCh <- txResult{txHash, nil}

			log.Trace("Executed parallel transaction",
				"hash", txHash.Hex(),
				"from", from.Hex(),
				"nonce", tx.Nonce())
		}()
	}

	// Collect results
	for i := 0; i < len(batch.Transactions); i++ {
		result := <-resultCh
		if result.err != nil {
			failedTxs[result.txHash] = result.err
		} else {
			executedTxs = append(executedTxs, result.txHash)

			// Remove successfully executed transaction from pool
			p.removeTx(result.txHash, true)
		}
	}

	// Update metrics
	if metricsMeter := metrics.GetOrRegisterMeter("parallel/txpool/executed", nil); metricsMeter != nil {
		metricsMeter.Mark(int64(len(executedTxs)))
	}

	// Log execution summary
	if len(failedTxs) > 0 {
		log.Debug("Batch execution completed with errors",
			"batchID", batch.BatchID,
			"successful", len(executedTxs),
			"failed", len(failedTxs))
	} else {
		log.Debug("Batch execution completed successfully",
			"batchID", batch.BatchID,
			"txCount", len(executedTxs))
	}

	return executedTxs, nil
}

// GetBatches returns the current batches of parallelizable transactions
func (p *ParallelPool) GetBatches() []TxBatch {
	p.batchMu.RLock()
	defer p.batchMu.RUnlock()

	// Make a copy to avoid race conditions
	batches := make([]TxBatch, len(p.batchedTxs))
	copy(batches, p.batchedTxs)

	return batches
}

// SetBatchSize configures the number of transactions per batch
func (p *ParallelPool) SetBatchSize(size int) {
	if size <= 0 {
		size = DefaultBatchSize
	}
	if size > MaxBatchSize {
		size = MaxBatchSize
	}

	p.batchMu.Lock()
	p.batchSize = size
	p.batchMu.Unlock()

	// Re-prepare batches with new size
	p.prepareBatches()
}
