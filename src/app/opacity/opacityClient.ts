'use client';

// Simplifying the Opacity SDK initialization for the web
let isInitialized = false;

export async function initOpacity() {
  if (isInitialized) return;
  
  try {
    // Dynamic import to avoid server-side rendering issues
    const opacityModule = await import('@opacity-labs/react-native-opacity');
    const { init, OpacityEnvironment } = opacityModule;
    
    init({
      apiKey: "eigengames-15f3b854-8e7f-41a8-8f02-8503537ef1ac", 
      dryRun: false,    
      environment: OpacityEnvironment.Production, 
      shouldShowErrorsInWebView: true
    });
    
    isInitialized = true;
    console.log("Opacity SDK initialized successfully");
  } catch (error) {
    console.error("Failed to initialize Opacity SDK:", error);
  }
}

export async function getGitHubProfile() {
  try {
    if (!isInitialized) {
      await initOpacity();
    }
    
    const opacityModule = await import('@opacity-labs/react-native-opacity');
    const { get } = opacityModule;
    
    return await get('flow:github:profile');
  } catch (error) {
    console.error("Error fetching GitHub profile:", error);
    return { error: "Failed to fetch profile" };
  }
}