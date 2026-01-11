"use client";

/**
 * WalletConnectionGuard Component
 * 
 * Currently not redirecting - pages handle their own questionnaire display.
 * This component is kept for potential future use.
 */
export default function WalletConnectionGuard({ children }: { children: React.ReactNode }) {
  // No redirect logic - pages handle questionnaire display themselves
  return <>{children}</>;
}

