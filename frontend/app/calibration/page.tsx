"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Questionnaire from "@/components/Questionnaire";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001") + "/api/profile";

export default function CalibrationPage() {
  const { connected, publicKey } = useWallet();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check wallet connection on mount
  useEffect(() => {
    if (!connected || !publicKey) {
      // If not connected, redirect to profile page to connect wallet
      router.push("/profile");
      return;
    }

    // Check if user already exists (maybe they completed calibration)
    checkUserExists();
  }, [connected, publicKey, router]);

  // Check if user exists in MongoDB
  const checkUserExists = async () => {
    if (!publicKey) return;

    try {
      setLoading(true);
      setError(null);
      const walletAddress = publicKey.toString();
      const response = await fetch(`${API_BASE_URL}/${walletAddress}`);

      if (!response.ok) {
        throw new Error("Failed to check user");
      }

      const data = await response.json();

      // If user already exists, redirect to profile
      if (data.success && data.exists) {
        router.push("/profile");
      } else {
        // User doesn't exist, show questionnaire
        setLoading(false);
      }
    } catch (err) {
      console.error("Error checking user:", err);
      setError("Failed to check user status");
      setLoading(false);
    }
  };

  // Handle Questionnaire Complete
  const handleQuestionnaireComplete = async (formData: any) => {
    if (!publicKey) {
      setError("Wallet not connected");
      return;
    }

    const walletAddress = publicKey.toString();
    setLoading(true);
    setError(null);

    try {
      // Save profile to MongoDB using POST /api/profile/setup
      const response = await fetch(`${API_BASE_URL}/setup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          walletAddress,
          displayName: formData.displayName,
          heightFeet: formData.heightFeet,
          heightInches: formData.heightInches,
          weightLbs: formData.weightLbs,
          hairLength: formData.hairLength,
          hairType: formData.hairType,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save profile");
      }

      const data = await response.json();

      if (data.success && data.user) {
        // Success! Redirect to profile page
        router.push("/profile");
      } else {
        throw new Error("Failed to save profile");
      }
    } catch (err: any) {
      setError(err.message || "Failed to save profile. Please try again.");
      console.error("Save error:", err);
      throw err; // Re-throw so Questionnaire can handle it
    } finally {
      setLoading(false);
    }
  };

  // Handle Cancel - redirect to profile
  const handleCancel = () => {
    router.push("/profile");
  };

  if (!connected || !publicKey) {
    return null; // Will redirect to /profile
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto py-8 pt-32">
          <div className="flex items-center justify-center h-[60vh]">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
              <p className="text-muted-foreground">Loading...</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <Navbar />

      {/* Error Message */}
      {error && (
        <div className="container mx-auto px-4 pt-24">
          <div className="bg-destructive/10 border border-destructive/50 rounded-lg p-4 mb-4">
            <p className="text-destructive text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Questionnaire */}
      <div className="container mx-auto py-8 pt-32">
        <Questionnaire
          walletAddress={publicKey.toString()}
          onComplete={handleQuestionnaireComplete}
          onCancel={handleCancel}
        />
      </div>
    </main>
  );
}

