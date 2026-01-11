/**
 * Mock Wallet Utility
 * Simulates wallet connection without requiring a browser extension
 */

/**
 * Simulates connecting a wallet with a delay
 * @returns {Promise<string>} A mock wallet address
 */
export async function connectMockWallet(): Promise<string> {
  // Simulate network delay (500ms - 1.5s)
  const delay = Math.random() * 1000 + 500;
  await new Promise((resolve) => setTimeout(resolve, delay));

  // Generate a random mock wallet address
  const randomHex = Array.from({ length: 40 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("");

  const mockWalletAddress = `0x${randomHex}`;

  // Store in localStorage for session persistence
  if (typeof window !== "undefined") {
    localStorage.setItem("mockWalletAddress", mockWalletAddress);
  }

  return mockWalletAddress;
}

/**
 * Gets the current mock wallet address from localStorage
 * @returns {string | null} The stored wallet address or null
 */
export function getMockWalletAddress(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("mockWalletAddress");
}

/**
 * Clears the mock wallet address
 */
export function disconnectMockWallet(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("mockWalletAddress");
  }
}

