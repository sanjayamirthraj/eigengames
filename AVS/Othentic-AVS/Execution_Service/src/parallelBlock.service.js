require('dotenv').config();
const axios = require("axios");
  
async function getBlock() {
    try {
        const result = await axios.get('http://localhost:3000/blocks');
        return result.data.blocks;

    } catch (err) {
      console.error("Error fetching blocks:", err);
      return null;
    }
  }

  module.exports = {
    getBlock,
  }