// Copyright 2024 The go-ethereum Authors
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

package types

import (
	"bytes"
	"math/big"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/rlp"
)

// AccessList is an EIP-2930 access list.
type AccessList []AccessTuple

// AccessTuple is the element type of an access list.
type AccessTuple struct {
	Address     common.Address `json:"address"     gencodec:"required"`
	StorageKeys []common.Hash  `json:"storageKeys" gencodec:"required"`
}

const (
	// ParallelTxType is the transaction type for parallel transactions
	ParallelTxType = 0x05

	// ParallelTypeIndependent indicates a transaction that can be executed independently
	ParallelTypeIndependent = 0x00

	// ParallelTypeDependent indicates a transaction that depends on other transactions
	ParallelTypeDependent = 0x01
)

// ParallelTx is a transaction type that supports parallel execution
type ParallelTx struct {
	ChainID      *big.Int
	Nonce        uint64
	GasTipCap    *big.Int
	GasFeeCap    *big.Int
	Gas          uint64
	To           *common.Address
	Value        *big.Int
	Data         []byte
	AccessList   AccessList
	ParallelType uint8
	Dependencies []common.Hash
	BatchID      uint64

	// Signature values
	V *big.Int
	R *big.Int
	S *big.Int
}

// copy creates a deep copy of the transaction data and initializes all fields.
func (tx *ParallelTx) copy() TxData {
	cpy := &ParallelTx{
		ChainID:      new(big.Int),
		Nonce:        tx.Nonce,
		GasTipCap:    new(big.Int),
		GasFeeCap:    new(big.Int),
		Gas:          tx.Gas,
		To:           copyAddressPtr(tx.To),
		Value:        new(big.Int),
		Data:         common.CopyBytes(tx.Data),
		AccessList:   make(AccessList, len(tx.AccessList)),
		ParallelType: tx.ParallelType,
		Dependencies: make([]common.Hash, len(tx.Dependencies)),
		BatchID:      tx.BatchID,
		V:            new(big.Int),
		R:            new(big.Int),
		S:            new(big.Int),
	}
	if tx.ChainID != nil {
		cpy.ChainID.Set(tx.ChainID)
	}
	if tx.GasTipCap != nil {
		cpy.GasTipCap.Set(tx.GasTipCap)
	}
	if tx.GasFeeCap != nil {
		cpy.GasFeeCap.Set(tx.GasFeeCap)
	}
	if tx.Value != nil {
		cpy.Value.Set(tx.Value)
	}
	if tx.V != nil {
		cpy.V.Set(tx.V)
	}
	if tx.R != nil {
		cpy.R.Set(tx.R)
	}
	if tx.S != nil {
		cpy.S.Set(tx.S)
	}
	copy(cpy.AccessList, tx.AccessList)
	copy(cpy.Dependencies, tx.Dependencies)
	return cpy
}

// accessors for innerTx

func (tx *ParallelTx) txType() byte           { return ParallelTxType }
func (tx *ParallelTx) chainID() *big.Int      { return tx.ChainID }
func (tx *ParallelTx) accessList() AccessList { return tx.AccessList }
func (tx *ParallelTx) data() []byte           { return tx.Data }
func (tx *ParallelTx) gas() uint64            { return tx.Gas }
func (tx *ParallelTx) gasFeeCap() *big.Int    { return tx.GasFeeCap }
func (tx *ParallelTx) gasTipCap() *big.Int    { return tx.GasTipCap }
func (tx *ParallelTx) gasPrice() *big.Int     { return tx.GasFeeCap }
func (tx *ParallelTx) value() *big.Int        { return tx.Value }
func (tx *ParallelTx) nonce() uint64          { return tx.Nonce }
func (tx *ParallelTx) to() *common.Address    { return tx.To }

func (tx *ParallelTx) rawSignatureValues() (v, r, s *big.Int) {
	return tx.V, tx.R, tx.S
}

func (tx *ParallelTx) setSignatureValues(chainID, v, r, s *big.Int) {
	tx.ChainID = chainID
	tx.V = v
	tx.R = r
	tx.S = s
}

// IsParallelizable returns whether the transaction can be executed in parallel
func (tx *ParallelTx) IsParallelizable() bool {
	return tx.ParallelType == ParallelTypeIndependent || len(tx.Dependencies) == 0
}

// GetDependencies returns the list of transaction hashes this transaction depends on
func (tx *ParallelTx) GetDependencies() []common.Hash {
	return tx.Dependencies
}

// GetBatchID returns the batch ID of the transaction
func (tx *ParallelTx) GetBatchID() uint64 {
	return tx.BatchID
}

// GetParallelType returns the parallel type of the transaction
func (tx *ParallelTx) GetParallelType() uint8 {
	return tx.ParallelType
}

// effectiveGasPrice returns the price of gas charged for the transaction
func (tx *ParallelTx) effectiveGasPrice(dst *big.Int, baseFee *big.Int) *big.Int {
	if baseFee == nil {
		return dst.Set(tx.GasFeeCap)
	}
	tip := dst.Sub(tx.GasFeeCap, baseFee)
	if tip.Cmp(tx.GasTipCap) > 0 {
		tip.Set(tx.GasTipCap)
	}
	return tip.Add(tip, baseFee)
}

// encode encodes the transaction data into RLP format
func (tx *ParallelTx) encode(b *bytes.Buffer) error {
	return rlp.Encode(b, tx)
}

// decode decodes RLP data into the transaction fields
func (tx *ParallelTx) decode(input []byte) error {
	return rlp.DecodeBytes(input, tx)
}
