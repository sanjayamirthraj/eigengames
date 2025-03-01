require('dotenv').config();
const { ethers } = require('ethers');

var provider;
var ethStorageContract;

function init() {
  provider = new ethers.JsonRpcProvider(process.env.ETH_STORAGE_RPC);
  ethStorageContract = new ethers.Contract(
    process.env.ETH_STORAGE_ADDRESS,
    [
      "function retrieve(bytes32 key) external view returns (bytes)"
    ],
    provider
  );
}

async function getStorageData(storageKey) {
  try {
    // Retrieve data from EthStorage
    const encodedData = await ethStorageContract.retrieve(storageKey);
    
    // Decode the data
    const decodedData = JSON.parse(ethers.toUtf8String(encodedData));

    if (!Array.isArray(decodedData)) {
      throw new Error("Invalid block data format: expected an array of blocks");
    }

    return decodedData;
  } catch (error) {
    console.error("Error retrieving data from EthStorage:", error);
    throw error;
  }
}

module.exports = {
  init,
  getStorageData
}