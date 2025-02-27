require('dotenv').config();
const dalService = require("./dal.service");
const crypto = require("crypto"); // Import crypto module for hashing

async function validate(proofOfTask, blockHash) {
  try {
    const taskResult = await dalService.getIPfsTask(proofOfTask);
    const blockDataString = JSON.stringify(taskResult);
    const computedHash = crypto.createHash("sha256").update(blockDataString).digest("hex");

    // Compare the computed hash with the provided blockHash
    if (computedHash === blockHash) {
      console.log("Hash validation successful: Hashes match.");
      return true;
    } else {
      console.log("Hash validation failed: Hashes do not match.");
      return false;
    }
  } catch (err) {
    console.error("Error during validation:", err?.message);
    return false;
  }
}

module.exports = {
  validate,
};