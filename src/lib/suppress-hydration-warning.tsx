'use client';

import React, { useEffect, useState } from 'react';

/**
 * Higher-Order Component that suppresses hydration warnings on the wrapped component
 * Can be used for individual components that have persistent hydration issues
 */
export function withSuppressedHydrationWarning<P extends object>(
  Component: React.ComponentType<P>
): React.FC<P> {
  const WithSuppressedHydrationWarning: React.FC<P> = (props) => {
    const [isClient, setIsClient] = useState(false);
    
    useEffect(() => {
      setIsClient(true);
    }, []);

    // Use a simple placeholder during server-side rendering
    if (!isClient) {
      return <div suppressHydrationWarning />;
    }

    // On the client, render with the actual component
    return <Component {...props} />;
  };

  // Display name for debugging
  const displayName = Component.displayName || Component.name || 'Component';
  WithSuppressedHydrationWarning.displayName = `withSuppressedHydrationWarning(${displayName})`;

  return WithSuppressedHydrationWarning;
}

/**
 * Hook to use in functional components to conditionally render content
 * only on the client-side, avoiding hydration mismatches
 */
export function useClientOnly(): boolean {
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  return isClient;
} 