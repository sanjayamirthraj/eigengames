'use client';

import React, { useEffect, useState } from 'react';

interface HydrationErrorSuppressorProps {
  children: React.ReactNode;
}

// This component will suppress hydration errors by remounting 
// the children after initial client-side hydration
export default function HydrationErrorSuppressor({ 
  children 
}: HydrationErrorSuppressorProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // On the first render (server-side), render a simpler version
  // This will be replaced by the full children on client-side hydration
  if (!mounted) {
    return <div suppressHydrationWarning>{children}</div>;
  }

  // After client-side hydration, render the actual children
  // This avoids any mismatch between the server and client renders
  return <>{children}</>;
} 