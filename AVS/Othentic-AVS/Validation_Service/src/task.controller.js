"use strict";
const { Router } = require("express")
const CustomError = require("./utils/validateError");
const CustomResponse = require("./utils/validateResponse");
const validatorService = require("./validator.service");

const router = Router()

router.post("/validate", async (req, res) => {
    var proofOfTask = req.body.proofOfTask;
    var blockHash = req.body.data;
    var blockHashString = Buffer.from(blockHash.replace(/^0x/, ''), 'hex').toString('utf8');
    console.log("Block hash:", blockHashString);
    console.log(`Validate task: proof of task: ${proofOfTask} ${blockHashString}`);
    try {
        const result = await validatorService.validate(proofOfTask, blockHashString);
        console.log('Vote:', result ? 'Approve' : 'Not Approved');
        return res.status(200).send(new CustomResponse(result));
    } catch (error) {
        console.log(error)
        return res.status(500).send(new CustomError("Something went wrong", {}));
    }
})

module.exports = router
