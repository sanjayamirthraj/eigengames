use crate::contexts::client::AggregatorClient;
use crate::api_client::ApiClient;
use blueprint_sdk::config::GadgetConfiguration;
use blueprint_sdk::macros::contexts::KeystoreContext;

#[derive(Clone, KeystoreContext)]
pub struct EigenSquareContext {
    pub client: AggregatorClient,
    pub api_client: ApiClient,
    #[config]
    pub std_config: GadgetConfiguration,
}
