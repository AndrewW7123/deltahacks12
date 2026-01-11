/**
 * Generate avatar URL from wallet address
 * Uses a simple hash-based approach to generate consistent colors
 * In production, you could use services like:
 * - https://avatars.dicebear.com/
 * - https://ui-avatars.com/
 * - Or store actual avatars on-chain
 */

export function generateAvatarUrl(walletAddress: string): string {
  // Simple hash-based color generation
  // This creates a consistent color for each wallet address
  let hash = 0;
  for (let i = 0; i < walletAddress.length; i++) {
    hash = walletAddress.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Generate HSL color
  const hue = hash % 360;
  const saturation = 60 + (hash % 20); // 60-80%
  const lightness = 50 + (hash % 15); // 50-65%

  // Create a data URI for a colored circle
  // For now, we'll use a simple colored background
  // In production, you might want to use an actual avatar service
  return `data:image/svg+xml;base64,${btoa(
    `<svg width="56" height="56" xmlns="http://www.w3.org/2000/svg">
      <circle cx="28" cy="28" r="28" fill="hsl(${hue}, ${saturation}%, ${lightness}%)"/>
      <text x="28" y="38" font-family="Arial" font-size="24" font-weight="bold" fill="white" text-anchor="middle">
        ${walletAddress.slice(0, 1).toUpperCase()}
      </text>
    </svg>`
  )}`;
}

