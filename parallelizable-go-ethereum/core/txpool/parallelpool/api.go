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
	"sort"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/common/hexutil"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/log"
	"github.com/ethereum/go-ethereum/params"
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
		// Get the current state for nonce lookup
		currentBlock := api.pool.chain.CurrentBlock()
		if currentBlock == nil {
			return nil, errors.New("current block not available")
		}

		stateDB, err := api.pool.chain.StateAt(currentBlock.Root)
		if err != nil {
			return nil, fmt.Errorf("failed to get state: %v", err)
		}
		nonce = stateDB.GetNonce(args.From)
		log.Debug("Retrieved nonce from state", "address", args.From, "nonce", nonce)
	} else {
		nonce = uint64(*args.Nonce)
	}

	// Set gas if specified
	if args.Gas != nil {
		gas = uint64(*args.Gas)
	} else {
		// Use default gas limit if not specified
		gas = params.TxGas
		log.Debug("Using default gas limit", "gas", gas)
	}

	// Set gas price if specified
	if args.GasPrice != nil {
		price = (*big.Int)(args.GasPrice)
	} else {
		// Use current gas price from the pool
		price = api.pool.gasPrice
		if price == nil {
			price = big.NewInt(params.InitialBaseFee)
		}
		log.Debug("Using suggested gas price", "price", price)
	}

	// Set value if specified
	if args.Value != nil {
		value = (*big.Int)(args.Value)
	}

	// Add parallel tag to data
	if args.Parallel {
		data = append([]byte(ParallelizableTag), args.Data...)
		log.Debug("Tagged transaction as parallelizable", "from", args.From, "to", args.To)
	} else {
		data = append([]byte(SequentialTag), args.Data...)
		log.Debug("Tagged transaction as sequential", "from", args.From, "to", args.To)
	}

	// Create transaction with the parallel transaction type
	var tx *types.Transaction
	if args.To == nil {
		// Contract creation
		tx = types.NewTx(&types.LegacyTx{
			Nonce:    nonce,
			GasPrice: price,
			Gas:      gas,
			Value:    value,
			Data:     data,
		})
	} else {
		// Regular transaction
		tx = types.NewTx(&types.LegacyTx{
			Nonce:    nonce,
			GasPrice: price,
			Gas:      gas,
			To:       args.To,
			Value:    value,
			Data:     data,
		})
	}

	// Return raw transaction - it still needs to be signed
	txBytes, err := tx.MarshalBinary()
	if err != nil {
		return nil, fmt.Errorf("failed to marshal transaction: %v", err)
	}

	return txBytes, nil
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
func (api *ParallelTxPoolAPI) IsParallelizable(txHash common.Hash) (map[string]interface{}, error) {
	tx := api.pool.all[txHash]
	if tx == nil {
		return nil, errors.New("transaction not found")
	}

	// Check transaction data for tag
	txData := tx.Data()
	result := make(map[string]interface{})
	result["hash"] = txHash.Hex()

	if len(txData) > 8 {
		tag := string(txData[:8])
		isParallel := tag == ParallelizableTag
		result["isParallelizable"] = isParallel
		result["tag"] = tag

		// Get additional info
		from, err := types.Sender(api.pool.signer, tx)
		if err == nil {
			result["from"] = from.Hex()
		}

		if tx.To() != nil {
			result["to"] = tx.To().Hex()
		}

		result["nonce"] = tx.Nonce()
		result["value"] = tx.Value().String()
		result["gas"] = tx.Gas()
		result["gasPrice"] = tx.GasPrice().String()

		if isParallel {
			// For parallel transactions, check if it's in a batch
			inBatch := false
			var batchID uint64

			api.pool.batchMu.RLock()
			for _, batch := range api.pool.batchedTxs {
				for _, batchTx := range batch.Transactions {
					if batchTx.Hash() == txHash {
						inBatch = true
						batchID = batch.BatchID
						break
					}
				}
				if inBatch {
					break
				}
			}
			api.pool.batchMu.RUnlock()

			result["inBatch"] = inBatch
			if inBatch {
				result["batchID"] = batchID
			}
		}

		return result, nil
	}

	result["isParallelizable"] = false
	result["error"] = "transaction does not have a valid tag"
	return result, nil
}

// BatchStatistics returns detailed information about the current batches
func (api *ParallelTxPoolAPI) BatchStatistics() map[string]interface{} {
	stats := make(map[string]interface{})

	api.pool.batchMu.RLock()
	defer api.pool.batchMu.RUnlock()

	// General batch statistics
	stats["batchSize"] = api.pool.batchSize
	stats["batchCount"] = len(api.pool.batchedTxs)
	stats["totalBatchedTxs"] = 0

	// Distribution of transactions in batches
	batchSizes := make([]int, 0, len(api.pool.batchedTxs))
	batchDetails := make([]map[string]interface{}, 0, len(api.pool.batchedTxs))

	for _, batch := range api.pool.batchedTxs {
		batchSize := len(batch.Transactions)
		stats["totalBatchedTxs"] = stats["totalBatchedTxs"].(int) + batchSize
		batchSizes = append(batchSizes, batchSize)

		// Collect detailed info about this batch
		batchInfo := make(map[string]interface{})
		batchInfo["batchID"] = batch.BatchID
		batchInfo["txCount"] = batchSize

		// Get unique senders in this batch
		senders := make(map[common.Address]bool)
		for _, tx := range batch.Transactions {
			sender, err := types.Sender(api.pool.signer, tx)
			if err == nil {
				senders[sender] = true
			}
		}

		batchInfo["uniqueSenders"] = len(senders)

		// Calculate gas statistics for this batch
		if batchSize > 0 {
			totalGas := uint64(0)
			minGas := batch.Transactions[0].Gas()
			maxGas := minGas

			for _, tx := range batch.Transactions {
				gas := tx.Gas()
				totalGas += gas
				if gas < minGas {
					minGas = gas
				}
				if gas > maxGas {
					maxGas = gas
				}
			}

			batchInfo["totalGas"] = totalGas
			batchInfo["avgGas"] = totalGas / uint64(batchSize)
			batchInfo["minGas"] = minGas
			batchInfo["maxGas"] = maxGas
		}

		batchDetails = append(batchDetails, batchInfo)
	}

	// Add batch size distribution
	if len(batchSizes) > 0 {
		// Sort batch sizes for distribution analysis
		sort.Ints(batchSizes)

		stats["minBatchSize"] = batchSizes[0]
		stats["maxBatchSize"] = batchSizes[len(batchSizes)-1]

		// Calculate median batch size
		median := 0
		if len(batchSizes)%2 == 0 {
			median = (batchSizes[len(batchSizes)/2-1] + batchSizes[len(batchSizes)/2]) / 2
		} else {
			median = batchSizes[len(batchSizes)/2]
		}
		stats["medianBatchSize"] = median
	}

	// Add individual batch details
	stats["batches"] = batchDetails

	return stats
}

// AnalyzeTransactionData examines transaction data to suggest whether it would be suitable for parallelization
func (api *ParallelTxPoolAPI) AnalyzeTransactionData(data hexutil.Bytes) map[string]interface{} {
	result := make(map[string]interface{})

	// Basic data analysis
	dataLen := len(data)
	result["dataLength"] = dataLen

	// Check if already has tag
	if dataLen >= 8 {
		prefix := string(data[:8])
		if prefix == ParallelizableTag {
			result["isTagged"] = true
			result["tag"] = "PARALLEL"
			result["recommendation"] = "Transaction is already tagged as parallelizable"
			return result
		} else if prefix == SequentialTag {
			result["isTagged"] = true
			result["tag"] = "SEQUENTIAL"
			result["recommendation"] = "Transaction is already tagged as sequential"
			return result
		}
	}

	result["isTagged"] = false

	// Analyze transaction data to determine if it's likely parallelizable
	// This is a simplified analysis that could be expanded with more sophisticated logic

	// Method signature detection (first 4 bytes of data for contract calls)
	if dataLen >= 4 {
		methodSignature := hexutil.Encode(data[:4])
		result["methodSignature"] = methodSignature

		// Known parallel-safe method signatures could be checked here
		// For example: simple token transfers, read-only operations, etc.

		// Check for common ERC20 transfer method (0xa9059cbb)
		if methodSignature == "0xa9059cbb" && dataLen >= 68 {
			result["methodType"] = "ERC20 Transfer"
			result["parallelRecommendation"] = true
			result["confidence"] = "high"
			result["recommendation"] = "This appears to be an ERC20 transfer which is typically parallelizable"
			return result
		}

		// Check for simple ETH transfers (empty or very small data)
		if dataLen <= 4 {
			result["methodType"] = "ETH Transfer"
			result["parallelRecommendation"] = true
			result["confidence"] = "high"
			result["recommendation"] = "This appears to be a simple ETH transfer which is typically parallelizable"
			return result
		}

		// Default guidance for unknown methods
		result["methodType"] = "Unknown Contract Interaction"
		result["parallelRecommendation"] = false
		result["confidence"] = "low"
		result["recommendation"] = "Contract interactions with unknown methods should be treated as sequential by default for safety"
	}

	return result
}
