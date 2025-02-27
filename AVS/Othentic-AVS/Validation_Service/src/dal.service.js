require('dotenv').config();
const axios = require("axios");

var ipfsHost='';

function init() {
  ipfsHost = process.env.IPFS_HOST;
}


async function getIPfsTask(cid) {
  try {
    const { data } = await axios.get(`${ipfsHost}${cid}`);

    if (!Array.isArray(data)) {
      throw new Error("Invalid block data format: expected an array of blocks");
    }

    // Return the block data as-is
    return data;
  } catch (error) {
    console.error("Error fetching IPFS task:", error);
    throw error;
  }
}
  
module.exports = {
  init,
  getIPfsTask
}