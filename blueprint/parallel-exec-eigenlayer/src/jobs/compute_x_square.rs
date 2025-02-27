#![allow(dead_code)]
use crate::contexts::client::SignedTaskResponse;
use crate::contexts::x_square::ParallelExecContext;
use crate::IIncredibleSquaringTaskManager::TaskResponse;
use crate::{
    IncredibleSquaringTaskManager, ProcessorError, INCREDIBLE_SQUARING_TASK_MANAGER_ABI_STRING,
};
use alloy_primitives::{keccak256, Bytes};
use alloy_sol_types::SolType;
use blueprint_sdk::contexts::keystore::KeystoreContext;
use blueprint_sdk::crypto::bn254::ArkBlsBn254;
use blueprint_sdk::event_listeners::evm::EvmContractEventListener;
use blueprint_sdk::keystore::backends::Backend;
use blueprint_sdk::logging::{info, debug, error};
use blueprint_sdk::macros::ext::keystore::backends::bn254::Bn254Backend;
use blueprint_sdk::macros::job;
use color_eyre::Result;
use eigensdk::crypto_bls::BlsKeyPair;
use eigensdk::crypto_bls::OperatorId;
use std::convert::Infallible;
use crate::contexts::x_square::ParallelExecContext;
use crate::ParallelExecTaskManager;

/// Sends a signed task response to the BLS Aggregator.
///
/// This job is triggered by the `NewTaskCreated` event emitted by the `IncredibleSquaringTaskManager`.
/// The job fetches block data from an external API, hashes the concatenated block hashes,
/// and sends the signed task response to the BLS Aggregator.
/// The job returns 1 if the task response was sent successfully.
/// The job returns 0 if the task response failed to send, failed to get the BLS key, or failed to fetch API data.
#[job(
    id = 0,
    params(task_created_block, quorum_numbers, quorum_threshold_percentage, task_index),
    event_listener(
        listener = EvmContractEventListener<ParallelExecContext, ParallelExecTaskManager::NewTaskCreated>,
        instance = ParallelExecTaskManager,
        abi = PARALLEL_EXEC_TASK_MANAGER_ABI_STRING,
        pre_processor = convert_event_to_inputs,
    ),
)]
pub async fn calculate_task(
    ctx: ParallelExecContext,
    task_created_block: u32,
    quorum_numbers: Bytes,
    quorum_threshold_percentage: u8,
    task_index: u32,
) -> std::result::Result<u32, Infallible> {
    let client = ctx.client.clone();
    let api_client = ctx.api_client.clone();

    // Get the calculation result from the API
    let result_hash = match api_client.get_calculation().await {
        Ok(result) => {
            info!("Successfully obtained hash from API: {:?}", result);
            result
        },
        Err(e) => {
            error!("Failed to get calculation from API: {}", e);
            return Ok(0);
        }
    };

    // Create task response with the API result hash
    let task_response = TaskResponse {
        referenceTaskIndex: task_index,
        resultHash: result_hash,
    };
    debug!("Created task response with hash: {:?}", result_hash);

    let bn254_public = ctx.keystore().first_local::<ArkBlsBn254>().unwrap();
    let bn254_secret = match ctx.keystore().expose_bls_bn254_secret(&bn254_public) {
        Ok(s) => match s {
            Some(s) => s,
            None => return Ok(0),
        },
        Err(_) => return Ok(0),
    };
    let bls_key_pair = match BlsKeyPair::new(bn254_secret.0.to_string()) {
        Ok(pair) => pair,
        Err(_) => return Ok(0),
    };
    let operator_id = operator_id_from_key(bls_key_pair.clone());

    // Sign the Hashed Message and send it to the BLS Aggregator
    let msg_hash = keccak256(<TaskResponse as SolType>::abi_encode(&task_response));
    let signed_response = SignedTaskResponse {
        task_response,
        signature: bls_key_pair.sign_message(msg_hash.as_ref()),
        operator_id,
    };

    info!(
        "Sending signed task response to BLS Aggregator: {:#?}",
        signed_response
    );
    if let Err(e) = client.send_signed_task_response(signed_response).await {
        error!("Failed to send signed task response: {:?}", e);
        return Ok(0);
    }

    Ok(1)
}

/// Generate the Operator ID from the BLS Keypair
pub fn operator_id_from_key(key: BlsKeyPair) -> OperatorId {
    let pub_key = key.public_key();
    let pub_key_affine = pub_key.g1();

    let x_int: num_bigint::BigUint = pub_key_affine.x.into();
    let y_int: num_bigint::BigUint = pub_key_affine.y.into();

    let x_bytes = x_int.to_bytes_be();
    let y_bytes = y_int.to_bytes_be();

    keccak256([x_bytes, y_bytes].concat())
}

/// Converts the event to inputs.
///
/// Uses a tuple to represent the return type because
/// the macro will index all values in the #[job] function
/// and parse the return type by the index.
pub async fn convert_event_to_inputs(
    (event, _log): (
        ParallelExecTaskManager::NewTaskCreated,
        alloy_rpc_types::Log,
    ),
) -> Result<Option<(u32, Bytes, u8, u32)>, ProcessorError> {
    let task_index = event.taskIndex;
    let task_created_block = event.task.taskCreatedBlock;
    let quorum_numbers = event.task.quorumNumbers;
    let quorum_threshold_percentage = event.task.quorumThresholdPercentage.try_into().unwrap();
    Ok(Some((
        task_created_block,
        quorum_numbers,
        quorum_threshold_percentage,
        task_index,
    )))
}
