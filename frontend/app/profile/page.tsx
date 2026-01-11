"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import Navbar from "@/components/Navbar";
import ProfileDashboard from "@/components/ProfileDashboard";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001") + "/api/profile";

type ViewType = "LOGIN" | "DASHBOARD";

interface UserData {
  walletAddress: string;
  displayName?: string;
  profilePhoto?: string;
  heightFeet?: number;
  heightInches?: number;
  weightLbs?: number;
  hairLength?: string;
  hairType?: string;
  idealTimeRange?: {
    min: number;
    max: number;
  };
  idealTemp?: number;
  totalPoints?: number;
  totalShowers?: number;
}

export default function ProfilePage() {
  const router = useRouter();
  const { connected, publicKey, disconnect, connecting, select, wallet } = useWallet();
  const { setVisible } = useWalletModal();
  const [currentView, setCurrentView] = useState<ViewType>("LOGIN");
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debug: Log wallet state changes
  useEffect(() => {
    console.log("Wallet state:", { connected, publicKey: publicKey?.toString(), connecting, wallet: wallet?.adapter.name });
  }, [connected, publicKey, connecting, wallet]);

  // Check if user exists when wallet connects
  useEffect(() => {
    if (connected && publicKey) {
      const walletAddress = publicKey.toString();
      console.log("Wallet connected, checking user:", walletAddress);
      checkUserExists(walletAddress);
    } else {
      // Reset state when wallet disconnects
      setCurrentView("LOGIN");
      setUserData(null);
      setError(null);
    }
  }, [connected, publicKey]);

  // Check if user exists in database
  const checkUserExists = async (walletAddress: string) => {
    try {
      setLoading(true);
      setError(null);
      console.log("Checking user exists:", walletAddress);
      const response = await fetch(`${API_BASE_URL}/${walletAddress}`);

      if (!response.ok) {
        throw new Error("Failed to check user");
      }

      const data = await response.json();
      console.log("User check response:", data);

      if (data.success && data.exists) {
        setUserData(data.user);
        setCurrentView("DASHBOARD");
      } else {
        // User doesn't exist, redirect to calibration page
        router.push("/calibration");
      }
    } catch (err) {
      console.error("Error checking user:", err);
      setError("Failed to check user status");
      // On error, redirect to calibration to allow registration
      router.push("/calibration");
    } finally {
      setLoading(false);
    }
  };


  // Handle Disconnect
  const handleDisconnect = async () => {
    try {
      await disconnect();
      setCurrentView("LOGIN");
      setUserData(null);
      setError(null);
    } catch (err) {
      console.error("Error disconnecting:", err);
    }
  };

  // Handle Wallet Connect Button Click
  const handleConnectClick = () => {
    setVisible(true);
  };

  return (
    <main className="min-h-screen bg-background">
      <Navbar />

      {/* Error Message */}
      {error && currentView !== "LOGIN" && (
        <div className="container mx-auto px-4 pt-24">
          <div className="bg-destructive/10 border border-destructive/50 rounded-lg p-4">
            <p className="text-destructive text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="container mx-auto py-8 pt-32">
        {loading && currentView === "LOGIN" ? (
          <div className="flex items-center justify-center h-[60vh]">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
              <p className="text-muted-foreground">Loading...</p>
            </div>
          </div>
        ) : currentView === "LOGIN" ? (
          // Login View - Show wallet connect button
          <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-md mx-auto">
            <div className="w-full bg-card/90 backdrop-blur-sm border border-border rounded-xl p-8 shadow-lg">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-foreground mb-3">Welcome to Ranked Showers</h2>
                <p className="text-muted-foreground">Connect your Solana wallet to get started</p>
              </div>

              <div className="space-y-4">
                {/* Custom Wallet Connect Button - Opens Modal Instead of Redirecting */}
                <div className="flex justify-center">
                  <button
                    onClick={handleConnectClick}
                    disabled={connecting}
                    className="px-8 py-3 bg-primary hover:bg-primary/90 disabled:bg-primary/50 disabled:cursor-not-allowed text-primary-foreground font-semibold rounded-lg transition-colors"
                  >
                    {connecting ? "Connecting..." : connected ? "Connected" : "Select Wallet"}
                  </button>
                </div>
              </div>

              <p className="mt-6 text-center text-xs text-muted-foreground">
                Connect your Solana wallet extension
              </p>
            </div>
          </div>
        ) : currentView === "DASHBOARD" && userData ? (
          <div className="space-y-6">
            {/* Disconnect Button */}
            <div className="flex justify-end">
              <button
                onClick={handleDisconnect}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground border border-border rounded-lg hover:border-destructive/50 transition-colors"
              >
                Disconnect Wallet
              </button>
            </div>
                    <ProfileDashboard 
                      user={userData} 
                      onUpdate={(updatedUser) => {
                        // Update local state with the updated user data
                        setUserData(updatedUser);
                      }}
                    />
          </div>
        ) : null}
      </div>
    </main>
  );
}
