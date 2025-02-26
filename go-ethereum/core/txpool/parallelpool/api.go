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

package parallelpool

import (
	"context"
	"errors"
	"fmt"
	"math/big"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/common/hexutil"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/log"
)

// ParallelTxPoolAPI offers an API for working with parallel transactions
type ParallelTxPoolAPI struct {
	pool *ParallelPool
}

// NewParallelTxPoolAPI creates a new parallel transaction pool API
func NewParallelTxPoolAPI(pool *ParallelPool) *ParallelTxPoolAPI {
	return &ParallelTxPoolAPI{
		pool: pool,
	}
}

// Status returns the current status of the parallel transaction pool
type ParallelPoolStatus struct {
	Pending             int `json:"pending"`             // Count of pending transactions
	Queued              int `json:"queued"`              // Count of queued transactions
	Parallelizable      int `json:"parallelizable"`      // Count of parallelizable transactions
	Batches             int `json:"batches"`             // Count of batches
	BatchSize           int `json:"batchSize"`           // Current batch size
	TotalProcessed      int `json:"totalProcessed"`      // Total transactions processed
	SuccessfullyBatched int `json:"successfullyBatched"` // Successfully batched transactions
}

// Status returns the current status of the parallel transaction pool
func (api *ParallelTxPoolAPI) Status() ParallelPoolStatus {
	// Get batch stats
	var batchCount, txCount, batchSize int
	if api.pool != nil {
		batches := api.pool.GetBatches()
		batchCount = len(batches)

		// Count transactions in all batches
		for _, batch := range batches {
			txCount += len(batch.Transactions)
		}

		batchSize = api.pool.batchSize
	}

	return ParallelPoolStatus{
		Pending:             len(api.pool.pending),
		Queued:              len(api.pool.queue),
		Parallelizable:      txCount,
		Batches:             batchCount,
		BatchSize:           batchSize,
		TotalProcessed:      0, // Would need to track this in the pool
		SuccessfullyBatched: 0, // Would need to track this in the pool
	}
}

// TagTransactionRequest is the request for tagging a transaction
type TagTransactionRequest struct {
	From     common.Address  `json:"from"`
	To       *common.Address `json:"to"`
	Gas      *hexutil.Uint64 `json:"gas"`
	GasPrice *hexutil.Big    `json:"gasPrice"`
	Value    *hexutil.Big    `json:"value"`
	Data     hexutil.Bytes   `json:"data"`
	Nonce    *hexutil.Uint64 `json:"nonce"`
	Parallel bool            `json:"parallel"`
}

// TagTransaction adds parallelization tags to a transaction
func (api *ParallelTxPoolAPI) TagTransaction(ctx context.Context, args TagTransactionRequest) (hexutil.Bytes, error) {
	// Extract transaction data
	var (
		data  []byte
		gas   = uint64(0)
		price = big.NewInt(0)
		value = big.NewInt(0)
		nonce = uint64(0)
	)

	// Get nonce if not specified
	if args.Nonce == nil {
		// In a real implementation, would get nonce from state
		// This is a simplified version
		nonce = 0
	} else {
		nonce = uint64(*args.Nonce)
	}

	// Set gas if specified
	if args.Gas != nil {
		gas = uint64(*args.Gas)
	}

	// Set gas price if specified
	if args.GasPrice != nil {
		price = (*big.Int)(args.GasPrice)
	}

	// Set value if specified
	if args.Value != nil {
		value = (*big.Int)(args.Value)
	}

	// Add parallel tag to data
	if args.Parallel {
		data = append([]byte(ParallelizableTag), args.Data...)
	} else {
		data = append([]byte(SequentialTag), args.Data...)
	}

	// Create transaction
	var tx *types.Transaction
	if args.To == nil {
		tx = types.NewContractCreation(nonce, value, gas, price, data)
	} else {
		tx = types.NewTransaction(nonce, *args.To, value, gas, price, data)
	}

	// Return raw transaction - it still needs to be signed
	return tx.MarshalBinary()
}

// SetBatchSize updates the batch size for parallel processing
func (api *ParallelTxPoolAPI) SetBatchSize(size int) error {
	if size <= 0 {
		return errors.New("batch size must be greater than zero")
	}

	if size > MaxBatchSize {
		return fmt.Errorf("batch size cannot exceed %d", MaxBatchSize)
	}

	api.pool.SetBatchSize(size)
	return nil
}

// ExecuteBatches triggers execution of all current batches
func (api *ParallelTxPoolAPI) ExecuteBatches() ([]common.Hash, error) {
	batches := api.pool.GetBatches()
	if len(batches) == 0 {
		return nil, nil
	}

	var allExecuted []common.Hash
	for _, batch := range batches {
		executed, err := api.pool.ExecuteBatch(batch)
		if err != nil {
			log.Error("Failed to execute batch", "batchID", batch.BatchID, "error", err)
			continue
		}

		allExecuted = append(allExecuted, executed...)
	}

	return allExecuted, nil
}

// IsParallelizable checks if a transaction is tagged as parallelizable
func (api *ParallelTxPoolAPI) IsParallelizable(txHash common.Hash) (bool, error) {
	tx := api.pool.all[txHash]
	if tx == nil {
		return false, errors.New("transaction not found")
	}

	// Check transaction data for tag
	txData := tx.Data()
	if len(txData) > 8 {
		tag := string(txData[:8])
		return tag == ParallelizableTag, nil
	}

	return false, nil
}
