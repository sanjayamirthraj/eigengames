require('dotenv').config();
const axios = require("axios");
  
async function getBlock() {
    try {
        // const result = await axios.get('http://localhost:3000/blocks');
        // the helper under AVS/parallel-exec-helper is deployed on render at this URL
        const result = await axios.get('https://parallel-exec-helper.onrender.com/blocks');
        return result.data.blocks;

    } catch (err) {
      console.error("Error fetching blocks:", err);
      return null;
    }
  }

  module.exports = {
    getBlock,
  }