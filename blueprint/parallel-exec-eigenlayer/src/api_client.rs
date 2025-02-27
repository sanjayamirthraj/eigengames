use reqwest::Client;
use serde::{Deserialize, Serialize};
use alloy_primitives::{keccak256, B256};
use std::time::Duration;
use blueprint_sdk::logging::debug;

#[derive(Debug, Clone)]
pub struct ApiClient {
    client: Client,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Block {
    pub hash: String,
    pub number: String,
    pub timestamp: String,
    pub transactions_root: String,
    pub parent_hash: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ApiResponse {
    pub status: String,
    pub message: String,
    pub data: Vec<Block>,
}

impl ApiClient {
    pub fn new() -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(10))
            .build()
            .expect("Failed to create HTTP client");
            
        Self { client }
    }

    pub async fn get_calculation(&self) -> Result<B256, reqwest::Error> {
        let url = "https://parallel-exec-helper.onrender.com/blocks";
        
        debug!("Fetching blocks from API: {}", url);
        
        let response: ApiResponse = self.client
            .get(url)
            .send()
            .await?
            .json()
            .await?;

        debug!("Received {} blocks from API", response.data.len());

        // Concatenate all block hashes
        let combined = response.data
            .iter()
            .map(|block| block.hash.as_str())
            .collect::<Vec<&str>>()
            .join("");

        // Hash the combined string
        let result = keccak256(combined.as_bytes());
        debug!("Calculated hash from block data: {:?}", result);
        
        Ok(result)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_api_response_parsing() {
        let api_client = ApiClient::new();
        let result = api_client.get_calculation().await;
        
        match result {
            Ok(hash) => {
                println!("Successfully got hash: {:?}", hash);
                assert!(hash.as_slice() != [0u8; 32]);
            },
            Err(e) => {
                println!("API Error: {}", e);
                panic!("API call failed");
            }
        }
    }
} 