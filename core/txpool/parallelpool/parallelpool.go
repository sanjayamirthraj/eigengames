package parallelpool

import (
	"errors"
	"math/big"
	"sync"
	"sync/atomic"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core"
	"github.com/ethereum/go-ethereum/core/state"
	"github.com/ethereum/go-ethereum/core/txpool"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/event"
	"github.com/ethereum/go-ethereum/log"
	"github.com/ethereum/go-ethereum/metrics"
	"github.com/ethereum/go-ethereum/params"
	"github.com/holiman/uint256"
)

var (
	// ErrParallelTxPoolOverflow is returned if the parallel transaction pool is full
	ErrParallelTxPoolOverflow = errors.New("parallel txpool is full")

	// Metrics for the parallel transaction pool
	pendingParallelGauge = metrics.NewRegisteredGauge("txpool/parallel/pending", nil)
	queuedParallelGauge  = metrics.NewRegisteredGauge("txpool/parallel/queued", nil)
)

// Config are the configuration parameters of the parallel transaction pool.
type Config struct {
	PriceBump uint64 // Price bump percentage to replace an already existing transaction
}

// ParallelPool is a specialized transaction pool for handling parallel transactions.
type ParallelPool struct {
	config      Config
	chainconfig *params.ChainConfig
	chain       txpool.BlockChain
	gasTip      atomic.Pointer[uint256.Int]
	signer      types.Signer

	mu sync.RWMutex

	currentState  *state.StateDB               // Current state in the blockchain head
	pendingNonces *txpool.Noncer               // Pending state tracking virtual nonces
	currentHead   atomic.Pointer[types.Header] // Current head of the blockchain

	reserve txpool.AddressReserver // Address reserver to ensure exclusivity across subpools

	pending map[common.Address]*parallelList // All currently processable transactions
	queue   map[common.Address]*parallelList // Queued but non-processable transactions
	beats   map[common.Address]time.Time     // Last heartbeat from each known account
	all     *txpool.Lookup                   // All transactions to allow lookups

	txFeed event.Feed // Notification feed for transactions
	scope  event.SubscriptionScope
}

// New creates a new parallel transaction pool.
func New(config Config, chain txpool.BlockChain) *ParallelPool {
	// Sanitize the input to ensure no vulnerable gas prices are set
	config = (&config).sanitize()

	pool := &ParallelPool{
		config:      config,
		chain:       chain,
		chainconfig: chain.Config(),
		signer:      types.LatestSigner(chain.Config()),
		pending:     make(map[common.Address]*parallelList),
		queue:       make(map[common.Address]*parallelList),
		beats:       make(map[common.Address]time.Time),
		all:         txpool.NewLookup(),
	}

	return pool
}

func (config *Config) sanitize() Config {
	if config.PriceBump < 1 {
		log.Warn("Price bump below 1%", "provided", config.PriceBump, "updated", 1)
		config.PriceBump = 1
	}
	return *config
}

// Filter returns whether the given transaction can be consumed by the parallel pool.
func (pool *ParallelPool) Filter(tx *types.Transaction) bool {
	return tx.Type() == types.ParallelTxType
}

// Init initializes the parallel transaction pool.
func (pool *ParallelPool) Init(gasTip uint64, head *types.Header, reserve txpool.AddressReserver) error {
	pool.gasTip.Store(uint256.NewInt(gasTip))
	pool.currentHead.Store(head)
	pool.reserve = reserve
	return nil
}

// validateTx checks whether a transaction is valid according to the consensus rules.
func (pool *ParallelPool) validateTx(tx *types.Transaction, local bool) error {
	// Ensure the transaction is signed properly
	from, err := types.Sender(pool.signer, tx)
	if err != nil {
		return err
	}

	// Ensure the transaction type is supported
	if !pool.Filter(tx) {
		return core.ErrTxTypeNotSupported
	}

	// Transactor should have enough funds to cover the costs
	balance := pool.currentState.GetBalance(from)
	if balance.Cmp(tx.Cost()) < 0 {
		return core.ErrInsufficientFunds
	}

	// Ensure the transaction adheres to nonce ordering
	nonce := pool.currentState.GetNonce(from)
	if nonce > tx.Nonce() {
		return core.ErrNonceTooLow
	}

	// Check if transaction is parallelizable
	if ptx, ok := tx.GetParallelTxData(); !ok || !ptx.IsParallelizable() {
		return errors.New("transaction is not parallelizable")
	}

	return nil
}

// add validates a transaction and inserts it into the non-executable queue for later
// pending promotion and execution.
func (pool *ParallelPool) add(tx *types.Transaction, local bool) error {
	hash := tx.Hash()

	pool.mu.Lock()
	defer pool.mu.Unlock()

	// Try to inject the transaction and update any state
	if err := pool.validateTx(tx, local); err != nil {
		return err
	}

	// Handle the transaction based on its parallelization type
	from, _ := types.Sender(pool.signer, tx)

	if list := pool.pending[from]; list != nil {
		inserted, old := list.Add(tx, pool.config.PriceBump)
		if !inserted {
			return errors.New("transaction underpriced")
		}
		if old != nil {
			pool.all.Remove(old.Hash())
			pool.txFeed.Send(core.NewTxsEvent{Txs: types.Transactions{tx}})
		}
		pool.all.Add(tx)
		return nil
	}

	// New transaction, inject into queue
	replaced, err := pool.enqueueTx(hash, tx, local)
	if err != nil {
		return err
	}
	if !replaced {
		pool.txFeed.Send(core.NewTxsEvent{Txs: types.Transactions{tx}})
	}
	return nil
}

// enqueueTx inserts a new transaction into the non-executable transaction queue.
func (pool *ParallelPool) enqueueTx(hash common.Hash, tx *types.Transaction, local bool) (bool, error) {
	from, _ := types.Sender(pool.signer, tx)

	if pool.queue[from] == nil {
		pool.queue[from] = newParallelList()
	}
	inserted, old := pool.queue[from].Add(tx, pool.config.PriceBump)
	if !inserted {
		return false, errors.New("transaction underpriced")
	}
	if old != nil {
		pool.all.Remove(old.Hash())
		return true, nil
	}
	pool.all.Add(tx)
	return false, nil
}

// Add adds a batch of transactions to the pool.
func (pool *ParallelPool) Add(txs []*types.Transaction, local bool) []error {
	errs := make([]error, len(txs))
	for i, tx := range txs {
		errs[i] = pool.add(tx, local)
	}
	return errs
}

// Pending returns all currently processable transactions.
func (pool *ParallelPool) Pending(filter txpool.PendingFilter) map[common.Address][]*txpool.LazyTransaction {
	pool.mu.Lock()
	defer pool.mu.Unlock()

	pending := make(map[common.Address][]*txpool.LazyTransaction)
	for addr, list := range pool.pending {
		txs := list.Flatten()
		if len(txs) == 0 {
			continue
		}

		lazies := make([]*txpool.LazyTransaction, len(txs))
		for i, tx := range txs {
			lazies[i] = &txpool.LazyTransaction{
				Pool:      pool,
				Hash:      tx.Hash(),
				Tx:        tx,
				Time:      tx.Time(),
				GasFeeCap: uint256.MustFromBig(tx.GasFeeCap()),
				GasTipCap: uint256.MustFromBig(tx.GasTipCap()),
				Gas:       tx.Gas(),
			}
		}
		pending[addr] = lazies
	}
	return pending
}

// Get returns a transaction if it is contained in the pool.
func (pool *ParallelPool) Get(hash common.Hash) *types.Transaction {
	return pool.all.Get(hash)
}

// Has returns whether the pool has a transaction.
func (pool *ParallelPool) Has(hash common.Hash) bool {
	return pool.all.Get(hash) != nil
}

// Status returns the status of a transaction.
func (pool *ParallelPool) Status(hash common.Hash) txpool.TxStatus {
	tx := pool.Get(hash)
	if tx == nil {
		return txpool.TxStatusUnknown
	}
	from, _ := types.Sender(pool.signer, tx)

	pool.mu.RLock()
	defer pool.mu.RUnlock()

	if txList := pool.pending[from]; txList != nil && txList.Get(tx.Nonce()) != nil {
		return txpool.TxStatusPending
	} else if txList := pool.queue[from]; txList != nil && txList.Get(tx.Nonce()) != nil {
		return txpool.TxStatusQueued
	}
	return txpool.TxStatusUnknown
}

// SubscribeTransactions subscribes to new transaction events.
func (pool *ParallelPool) SubscribeTransactions(ch chan<- core.NewTxsEvent, reorgs bool) event.Subscription {
	return pool.scope.Track(pool.txFeed.Subscribe(ch))
}

// Nonce returns the next nonce of an account.
func (pool *ParallelPool) Nonce(addr common.Address) uint64 {
	pool.mu.RLock()
	defer pool.mu.RUnlock()

	return pool.pendingNonces.get(addr)
}

// Stats returns current pool stats.
func (pool *ParallelPool) Stats() (int, int) {
	pool.mu.RLock()
	defer pool.mu.RUnlock()

	var pending, queued int
	for _, list := range pool.pending {
		pending += list.Len()
	}
	for _, list := range pool.queue {
		queued += list.Len()
	}
	return pending, queued
}

// Content returns the transactions contained within the pool.
func (pool *ParallelPool) Content() (map[common.Address][]*types.Transaction, map[common.Address][]*types.Transaction) {
	pool.mu.RLock()
	defer pool.mu.RUnlock()

	pending := make(map[common.Address][]*types.Transaction)
	for addr, list := range pool.pending {
		pending[addr] = list.Flatten()
	}
	queued := make(map[common.Address][]*types.Transaction)
	for addr, list := range pool.queue {
		queued[addr] = list.Flatten()
	}
	return pending, queued
}

// ContentFrom returns the transactions contained within the pool for the given address.
func (pool *ParallelPool) ContentFrom(addr common.Address) ([]*types.Transaction, []*types.Transaction) {
	pool.mu.RLock()
	defer pool.mu.RUnlock()

	var pending []*types.Transaction
	if list := pool.pending[addr]; list != nil {
		pending = list.Flatten()
	}
	var queued []*types.Transaction
	if list := pool.queue[addr]; list != nil {
		queued = list.Flatten()
	}
	return pending, queued
}

// Clear removes all transactions from the pool.
func (pool *ParallelPool) Clear() {
	pool.mu.Lock()
	defer pool.mu.Unlock()

	pool.pending = make(map[common.Address]*parallelList)
	pool.queue = make(map[common.Address]*parallelList)
	pool.all = txpool.NewLookup()
	pool.pendingNonces = txpool.NewNoncer(pool.currentState)
}

// SetGasTip updates the minimum gas tip required by the transaction pool.
func (pool *ParallelPool) SetGasTip(tip *big.Int) {
	pool.gasTip.Store(uint256.MustFromBig(tip))
}

// Reset ensures the pool content is valid with regard to the chain state.
func (pool *ParallelPool) Reset(oldHead, newHead *types.Header) {
	// Initialize the internal state to the current head
	if newHead == nil {
		newHead = pool.chain.CurrentBlock()
	}
	statedb, err := pool.chain.StateAt(newHead.Root)
	if err != nil {
		log.Error("Failed to reset txpool state", "err", err)
		return
	}
	pool.currentState = statedb
	pool.pendingNonces = txpool.NewNoncer(statedb)
	pool.currentHead.Store(newHead)
}

// Close terminates the transaction pool.
func (pool *ParallelPool) Close() error {
	pool.scope.Close()
	return nil
}
