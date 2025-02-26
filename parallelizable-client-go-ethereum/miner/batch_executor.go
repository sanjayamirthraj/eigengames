// Copyright 2014 The go-ethereum Authors
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

package miner

import (
	"sync"
	"time"

	"github.com/ethereum/go-ethereum/consensus"
	"github.com/ethereum/go-ethereum/core"
	"github.com/ethereum/go-ethereum/core/state"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/event"
	"github.com/ethereum/go-ethereum/log"
	"github.com/ethereum/go-ethereum/metrics"
	"github.com/ethereum/go-ethereum/params"
)

// BatchExecutor handles the execution of transaction batches in parallel
type BatchExecutor struct {
	config      *params.ChainConfig
	chainConfig *params.ChainConfig
	engine      consensus.Engine
	eth         core.Backend
	chain       *core.BlockChain

	gasFloor uint64
	gasCeil  uint64

	mu sync.RWMutex

	// Subscriptions
	mux    *event.TypeMux
	txsCh  chan core.NewTxsEvent
	txsSub event.Subscription

	// Metrics
	batchGauge       metrics.Gauge
	execTimeGauge    metrics.Gauge
	txCountGauge     metrics.Gauge
	successRateGauge metrics.Gauge
}

// NewBatchExecutor creates a new batch executor for parallel transaction processing
func NewBatchExecutor(chainConfig *params.ChainConfig, engine consensus.Engine, eth core.Backend) *BatchExecutor {
	executor := &BatchExecutor{
		config:           chainConfig,
		chainConfig:      chainConfig,
		engine:           engine,
		eth:              eth,
		chain:            eth.BlockChain(),
		txsCh:            make(chan core.NewTxsEvent, 4096),
		batchGauge:       metrics.NewRegisteredGauge("parallel/batches", nil),
		execTimeGauge:    metrics.NewRegisteredGauge("parallel/exectime", nil),
		txCountGauge:     metrics.NewRegisteredGauge("parallel/txcount", nil),
		successRateGauge: metrics.NewRegisteredGauge("parallel/successrate", nil),
	}

	// Subscribe to transaction pool events
	executor.txsSub = eth.TxPool().SubscribeNewTxsEvent(executor.txsCh)

	// Start the batch processing
	go executor.processTransactions()

	log.Info("Parallel batch executor initialized")
	return executor
}

// processTransactions monitors transaction events and processes them in batches
func (b *BatchExecutor) processTransactions() {
	defer b.txsSub.Unsubscribe()

	for {
		select {
		case event := <-b.txsCh:
			// Process new transactions
			b.processBatch(event.Txs)

		case <-b.txsSub.Err():
			return
		}
	}
}

// processBatch executes a batch of parallel transactions
func (b *BatchExecutor) processBatch(txs []*types.Transaction) {
	// Skip empty batches
	if len(txs) == 0 {
		return
	}

	// Update metrics
	b.txCountGauge.Update(int64(len(txs)))
	startTime := time.Now()

	// Get current state
	parent := b.chain.CurrentBlock()
	statedb, err := b.chain.StateAt(parent.Root())
	if err != nil {
		log.Error("Failed to get state for batch execution", "err", err)
		return
	}

	// Organize transactions by whether they are parallelizable
	var parallelTxs, sequentialTxs []*types.Transaction
	for _, tx := range txs {
		// Check transaction data for parallelization tag
		// Simple tag detection (in a real implementation, would use proper tag extraction)
		txData := tx.Data()
		isParallelizable := false
		if len(txData) > 8 {
			tag := string(txData[:8])
			isParallelizable = (tag == "PARALLEL")
		}

		if isParallelizable {
			parallelTxs = append(parallelTxs, tx)
		} else {
			sequentialTxs = append(sequentialTxs, tx)
		}
	}

	// Process parallel transactions
	if len(parallelTxs) > 0 {
		b.executeParallelBatch(parallelTxs, statedb)
	}

	// Process sequential transactions
	if len(sequentialTxs) > 0 {
		b.executeSequentialBatch(sequentialTxs, statedb)
	}

	// Update execution time metric
	execTime := time.Since(startTime)
	b.execTimeGauge.Update(int64(execTime))
}

// executeParallelBatch executes a batch of parallelizable transactions concurrently
func (b *BatchExecutor) executeParallelBatch(txs []*types.Transaction, statedb *state.StateDB) {
	// Create a copy of the state for each transaction
	stateCopies := make([]*state.StateDB, len(txs))
	for i := range txs {
		stateCopies[i] = statedb.Copy()
	}

	// Process transactions in parallel
	var wg sync.WaitGroup
	results := make([]error, len(txs))

	header := b.chain.CurrentBlock()
	for i, tx := range txs {
		wg.Add(1)
		go func(index int, transaction *types.Transaction, state *state.StateDB) {
			defer wg.Done()

			// Get sender
			sender, err := types.Sender(types.LatestSigner(b.chainConfig), transaction)
			if err != nil {
				results[index] = err
				return
			}

			// Apply message
			msg, err := transaction.AsMessage(types.LatestSigner(b.chainConfig), header.BaseFee)
			if err != nil {
				results[index] = err
				return
			}

			// Create a new context for the transaction
			context := core.NewEVMContext(msg, header, b.chain, &sender)
			vmenv := core.NewEVM(context, state, b.chainConfig, core.Config{})

			// Apply transaction
			_, err = core.ApplyMessage(vmenv, msg, new(core.GasPool).AddGas(transaction.Gas()))
			results[index] = err

		}(i, tx, stateCopies[i])
	}

	// Wait for all transactions to complete
	wg.Wait()

	// Count successful transactions
	successCount := 0
	for _, err := range results {
		if err == nil {
			successCount++
		}
	}

	// Update success rate metric
	if len(txs) > 0 {
		successRate := (float64(successCount) / float64(len(txs))) * 100
		b.successRateGauge.Update(int64(successRate))
	}

	// Merge state changes from parallel executions
	// This is simplified; a real implementation would need to handle conflicts
	for i, tx := range txs {
		if results[i] == nil {
			// Only apply changes from successful transactions
			sender, _ := types.Sender(types.LatestSigner(b.chainConfig), tx)
			statedb.SetNonce(sender, stateCopies[i].GetNonce(sender))
			statedb.SetBalance(sender, stateCopies[i].GetBalance(sender))

			// If it's a contract call, update contract state
			if tx.To() != nil {
				// Get the contract state
				statedb.SetCode(*tx.To(), stateCopies[i].GetCode(*tx.To()))
				statedb.SetNonce(*tx.To(), stateCopies[i].GetNonce(*tx.To()))
				statedb.SetBalance(*tx.To(), stateCopies[i].GetBalance(*tx.To()))
			}
		}
	}
}

// executeSequentialBatch executes a batch of sequential transactions
func (b *BatchExecutor) executeSequentialBatch(txs []*types.Transaction, statedb *state.StateDB) {
	// Process sequential transactions in order
	header := b.chain.CurrentBlock()
	for _, tx := range txs {
		// Get sender
		sender, err := types.Sender(types.LatestSigner(b.chainConfig), tx)
		if err != nil {
			continue
		}

		// Apply message
		msg, err := tx.AsMessage(types.LatestSigner(b.chainConfig), header.BaseFee)
		if err != nil {
			continue
		}

		// Create a new context for the transaction
		context := core.NewEVMContext(msg, header, b.chain, &sender)
		vmenv := core.NewEVM(context, statedb, b.chainConfig, core.Config{})

		// Apply transaction
		_, err = core.ApplyMessage(vmenv, msg, new(core.GasPool).AddGas(tx.Gas()))
		if err != nil {
			log.Debug("Sequential transaction failed", "hash", tx.Hash(), "err", err)
		}
	}
}

// Stop stops the batch executor and unsubscribes from events
func (b *BatchExecutor) Stop() {
	b.txsSub.Unsubscribe()
}

// SetGasLimits sets the gas floor and ceiling for transactions
func (b *BatchExecutor) SetGasLimits(gasFloor, gasCeil uint64) {
	b.mu.Lock()
	defer b.mu.Unlock()

	b.gasFloor = gasFloor
	b.gasCeil = gasCeil
}

// Pending returns the currently pending transactions
func (b *BatchExecutor) Pending() (*types.Block, *state.StateDB) {
	return b.chain.CurrentBlock(), nil
}
