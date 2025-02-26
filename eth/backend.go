package eth

import (
	"github.com/your-project/blobpool"
	"github.com/your-project/legacypool"
	"github.com/your-project/parallelpool"
	"github.com/your-project/stack"
	"github.com/your-project/txpool"
)

func (eth *Ethereum) initTxPool(config *Config) error {
	blobPool := blobpool.New(config.BlobPool, eth.blockchain)

	if config.TxPool.Journal != "" {
		config.TxPool.Journal = stack.ResolvePath(config.TxPool.Journal)
	}
	legacyPool := legacypool.New(config.TxPool, eth.blockchain)
	parallelPool := parallelpool.New(parallelpool.Config{PriceBump: config.TxPool.PriceBump}, eth.blockchain)

	eth.txPool, err = txpool.New(config.TxPool.PriceLimit, eth.blockchain, []txpool.SubPool{legacyPool, blobPool, parallelPool})
	if err != nil {
		return err
	}

	return nil
}
