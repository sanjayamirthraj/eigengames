"use strict";
const { Router } = require("express")
const axios = require("axios");
const cron = require("node-cron");
const CustomError = require("./utils/validateError");
const CustomResponse = require("./utils/validateResponse");
const parallelBlockService = require("./parallelBlock.service");
const dalService = require("./dal.service");
const crypto = require("crypto"); // Import crypto module for hashing

const router = Router()

router.post("/execute", async (req, res) => {
    console.log("Executing task");

    try {
        var taskDefinitionId = Number(req.body.taskDefinitionId) || 0;
        console.log(`taskDefinitionId: ${taskDefinitionId}`);

        const result = await parallelBlockService.getBlock();

        // Convert the entire block data to a JSON string to find the block hash
        const blockDataString = JSON.stringify(result);
        const hash = crypto.createHash("sha256").update(blockDataString).digest("hex");

        // Publish the entire block data (with parallelization batches) to IPFS
        const cid = await dalService.publishJSONToIpfs(result);
        // Use the block hash data as the task data to be stored on-chain
        const data = hash; // Use the generated hash as data
        await dalService.sendTask(cid, data, taskDefinitionId);
        return res.status(200).send(new CustomResponse({proofOfTask: cid, data: data, taskDefinitionId: taskDefinitionId}, "Task executed successfully"));
    } catch (error) {
        console.log(error)
        return res.status(500).send(new CustomError("Something went wrong", {}));
    }
})

// Cron Job to execute the task every 5 seconds
setTimeout(() => {
    console.log("Starting cron job...");
    cron.schedule("*/5 * * * * *", async () => {
        console.log("Executing scheduled task...");
        try {
            const response = await axios.post("http://localhost:4003/task/execute", { taskDefinitionId: 0 }); // Adjust the port if needed
            console.log("Task executed:", response.data);
        } catch (error) {
            console.error("Error executing task:", error.message);
        }
    });
console.log("Cron job started...");
}, 5000);

console.log("Cron job started...");

module.exports = router