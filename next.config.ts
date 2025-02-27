import type { NextConfig } from "next";
import type { webpack } from 'next/dist/compiled/webpack/webpack';

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  
  // Suppress hydration warnings globally
  webpack: (config, { dev, isServer }) => {
    // Only apply in development mode
    if (dev && !isServer) {
      // Find the DefinePlugin in the webpack plugins
      const definePlugin = config.plugins.find(
        (plugin: webpack.WebpackPluginInstance) => plugin.constructor.name === 'DefinePlugin'
      );
      
      if (definePlugin) {
        // Modify the plugin to disable hydration warnings
        Object.assign(definePlugin.definitions, {
          '__NEXT_DISABLE_HYDRATION_WARNING': 'true',
          'process.env.__NEXT_DISABLE_HYDRATION_WARNING': 'true',
          'process.env.__NEXT_REACT_ROOT': 'true',
          'process.env.__NEXT_SUPPRESS_HYDRATION_WARNING': 'true',
        });
      }
    }

    return config;
  },
};

export default nextConfig;
