require('dotenv').config();
const axios = require("axios");
  
async function getBlock() {
    try {
        // const result = await axios.get('http://localhost:3000/blocks');
        // the helper under AVS/parallel-exec-helper is running on docker container
        const result = await axios.get('http://10.8.0.102:3000/blocks');
        return result.data.blocks;

    } catch (err) {
      console.error("Error fetching blocks:", err);
      return null;
    }
  }

  module.exports = {
    getBlock,
  }