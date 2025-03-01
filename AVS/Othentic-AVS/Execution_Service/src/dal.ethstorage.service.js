require('dotenv').config();
const { ethers } = require('ethers');

var rpcBaseAddress = '';
var privateKey = '';

function init() {
  rpcBaseAddress = process.env.OTHENTIC_CLIENT_RPC_ADDRESS;
  privateKey = process.env.PRIVATE_KEY_PERFORMER;
}

async function sendTask(data, taskDefinitionId) {
  try {
    const wallet = new ethers.Wallet(privateKey);
    const performerAddress = wallet.address;

    // Convert data to bytes
    const encodedData = ethers.hexlify(ethers.toUtf8Bytes(JSON.stringify(data)));
    
    // Store data in EthStorage
    const ethStorageContract = new ethers.Contract(
      process.env.ETH_STORAGE_ADDRESS,
      [
        "function store(bytes calldata data) external returns (bytes32)",
        "function retrieve(bytes32 key) external view returns (bytes)"
      ],
      wallet
    );

    // Store data and get storage key
    const tx = await ethStorageContract.store(encodedData);
    const receipt = await tx.wait();
    const storageKey = receipt.events[0].args[0]; // Assuming storage key is emitted in first event

    // Create task message with storage key
    const message = ethers.AbiCoder.defaultAbiCoder().encode(
      ["bytes32", "address", "uint16"], 
      [storageKey, performerAddress, taskDefinitionId]
    );
    const messageHash = ethers.keccak256(message);
    const sig = wallet.signingKey.sign(messageHash).serialized;

    const jsonRpcBody = {
      jsonrpc: "2.0",
      method: "sendTask",
      params: [
        storageKey,
        taskDefinitionId,
        performerAddress,
        sig,
      ]
    };

    const provider = new ethers.JsonRpcProvider(rpcBaseAddress);
    const response = await provider.send(jsonRpcBody.method, jsonRpcBody.params);
    console.log("Task sent successfully:", response);
    return storageKey;

  } catch (error) {
    console.error("Error sending task:", error);
    throw error;
  }
}

module.exports = {
  init,
  sendTask
}
