use alloy_network::EthereumWallet;
use alloy_primitives::Address;
use alloy_signer_local::PrivateKeySigner;
use blueprint_sdk::logging::info;
use blueprint_sdk::runners::core::runner::BlueprintRunner;
use blueprint_sdk::runners::eigenlayer::bls::EigenlayerBLSConfig;
use blueprint_sdk::utils::evm::get_wallet_provider_http;
use parallel_exec_blueprint_eigenlayer::constants::{
    AGGREGATOR_PRIVATE_KEY, TASK_MANAGER_ADDRESS,
};
use parallel_exec_blueprint_eigenlayer::contexts::aggregator::AggregatorContext;
use parallel_exec_blueprint_eigenlayer::contexts::client::AggregatorClient;
use parallel_exec_blueprint_eigenlayer::contexts::x_square::ParallelExecContext;
use parallel_exec_blueprint_eigenlayer::jobs::compute_x_square::CalculateTaskEventHandler;
use parallel_exec_blueprint_eigenlayer::jobs::initialize_task::InitializeBlsTaskEventHandler;
use parallel_exec_blueprint_eigenlayer::ParallelExecTaskManager;
use parallel_exec_blueprint_eigenlayer::api_client::ApiClient;

#[blueprint_sdk::main(env)]
async fn main() {
    let signer: PrivateKeySigner = AGGREGATOR_PRIVATE_KEY
        .parse()
        .expect("failed to generate wallet ");
    let wallet = EthereumWallet::from(signer);
    let provider = get_wallet_provider_http(&env.http_rpc_endpoint, wallet.clone());

    let server_address = format!("{}:{}", "127.0.0.1", 8081);
    let api_client = ApiClient::new();
    
    let parallel_exec_context = ParallelExecContext {
        client: AggregatorClient::new(&server_address)?,
        api_client,
        std_config: env.clone(),
    };
    let aggregator_context =
        AggregatorContext::new(server_address, *TASK_MANAGER_ADDRESS, wallet, env.clone())
            .await
            .unwrap();

    let contract = ParallelExecTaskManager::new(
        *TASK_MANAGER_ADDRESS,
        provider,
    );

    let initialize_task =
        InitializeBlsTaskEventHandler::new(contract.clone(), aggregator_context.clone());

    let calculate_task = CalculateTaskEventHandler::new(contract.clone(), parallel_exec_context);

    info!("~~~ Executing the parallel execution blueprint ~~~");
    let eigen_config = EigenlayerBLSConfig::new(Address::default(), Address::default());
    BlueprintRunner::new(eigen_config, env)
        .job(calculate_task)
        .job(initialize_task)
        .background_service(Box::new(aggregator_context))
        .run()
        .await?;

    info!("Exiting...");
    Ok(())
}
