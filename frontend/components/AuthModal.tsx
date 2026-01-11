"use client";

import { useState } from "react";
import { connectMockWallet } from "@/utils/mockWallet";

interface AuthModalProps {
  onSignIn: (walletAddress: string) => void;
  onRegister: (walletAddress: string) => void;
}

export default function AuthModal({ onSignIn, onRegister }: AuthModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      const walletAddress = await connectMockWallet();
      onSignIn(walletAddress);
    } catch (err) {
      setError("Failed to connect wallet. Please try again.");
      console.error("Sign in error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    try {
      setLoading(true);
      setError(null);
      const walletAddress = await connectMockWallet();
      onRegister(walletAddress);
    } catch (err) {
      setError("Failed to connect wallet. Please try again.");
      console.error("Register error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 max-w-md w-full shadow-2xl">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">Welcome to Shower%</h2>
          <p className="text-slate-400">Connect your wallet to get started</p>
        </div>

        <div className="space-y-4">
          {/* Sign In Button */}
          <button
            onClick={handleSignIn}
            disabled={loading}
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
          >
            {loading ? "Connecting..." : "Sign In with Wallet"}
          </button>

          {/* Register Button */}
          <button
            onClick={handleRegister}
            disabled={loading}
            className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
          >
            {loading ? "Connecting..." : "New User Registration"}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-900/30 border border-red-500/50 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-slate-500">
          Using mock wallet for testing (no extension required)
        </p>
      </div>
    </div>
  );
}

