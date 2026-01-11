"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import AuthModal from "@/components/AuthModal";
import Questionnaire from "@/components/Questionnaire";
import ProfileDashboard from "@/components/ProfileDashboard";
import { getMockWalletAddress } from "@/utils/mockWallet";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/profile";

type ViewType = "AUTH" | "QUESTIONNAIRE" | "DASHBOARD";

interface UserData {
  walletAddress: string;
  displayName?: string;
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
}

export default function ProfilePage() {
  const [currentView, setCurrentView] = useState<ViewType>("AUTH");
  const [userData, setUserData] = useState<UserData | null>(null);
  const [mockWalletAddress, setMockWalletAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check for existing mock wallet on mount
  useEffect(() => {
    const storedWallet = getMockWalletAddress();
    if (storedWallet) {
      setMockWalletAddress(storedWallet);
      // Optionally check if user exists
      checkUserExists(storedWallet);
    }
  }, []);

  // Check if user exists in database
  const checkUserExists = async (walletAddress: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE_URL}/${walletAddress}`);

      if (!response.ok) {
        throw new Error("Failed to check user");
      }

      const data = await response.json();

      if (data.success && data.exists) {
        setUserData(data.user);
        setCurrentView("DASHBOARD");
      } else {
        // User doesn't exist
        setCurrentView("AUTH");
      }
    } catch (err) {
      console.error("Error checking user:", err);
      setError("Failed to check user status");
    } finally {
      setLoading(false);
    }
  };

  // Handle Sign In
  const handleSignIn = async (walletAddress: string) => {
    setMockWalletAddress(walletAddress);
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/${walletAddress}`);

      if (!response.ok) {
        throw new Error("Failed to fetch user");
      }

      const data = await response.json();

      if (data.success && data.exists) {
        setUserData(data.user);
        setCurrentView("DASHBOARD");
      } else {
        setError("User not found, please register");
        setCurrentView("AUTH");
      }
    } catch (err: any) {
      setError(err.message || "Failed to sign in. Please try again.");
      console.error("Sign in error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Handle Register (go to questionnaire)
  const handleRegister = (walletAddress: string) => {
    setMockWalletAddress(walletAddress);
    setError(null);
    setCurrentView("QUESTIONNAIRE");
  };

  // Handle Questionnaire Complete
  // NOTE: Currently calculates goals without saving to MongoDB
  // Once wallet integration is set up, this will save to MongoDB
  const handleQuestionnaireComplete = async (formData: any) => {
    if (!mockWalletAddress) {
      setError("Wallet address not found");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Calculate optimal shower goals (without saving to MongoDB)
      const response = await fetch(`${API_BASE_URL}/calculate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          heightFeet: formData.heightFeet,
          heightInches: formData.heightInches,
          weightLbs: formData.weightLbs,
          hairLength: formData.hairLength,
          hairType: formData.hairType,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to calculate goals");
      }

      const data = await response.json();

      if (data.success && data.goals) {
        // Combine form data with calculated goals for display
        const userDataWithGoals: UserData = {
          walletAddress: mockWalletAddress,
          displayName: formData.displayName,
          heightFeet: formData.heightFeet,
          heightInches: formData.heightInches,
          weightLbs: formData.weightLbs,
          hairLength: formData.hairLength,
          hairType: formData.hairType,
          idealTimeRange: data.goals.idealTimeRange,
          idealTemp: data.goals.idealTemp,
        };

        // Store in local state (NOT MongoDB yet - will save when wallet integration is ready)
        setUserData(userDataWithGoals);
        setCurrentView("DASHBOARD");

        // Log for debugging
        console.log("Calculated goals (not saved to MongoDB yet):", data.goals);
        console.log("User data:", userDataWithGoals);
      } else {
        throw new Error("Failed to calculate goals");
      }
    } catch (err: any) {
      setError(err.message || "Failed to calculate goals. Please try again.");
      console.error("Calculate error:", err);
      throw err; // Re-throw so Questionnaire can handle it
    } finally {
      setLoading(false);
    }
  };

  // Handle Cancel Questionnaire
  const handleCancelQuestionnaire = () => {
    setCurrentView("AUTH");
    setError(null);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <Navbar />

      {/* Error Message */}
      {error && currentView !== "AUTH" && (
        <div className="container mx-auto px-4 pt-4">
          <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="container mx-auto py-8">
        {loading && currentView === "AUTH" ? (
          <div className="flex items-center justify-center h-[60vh]">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
              <p className="text-slate-400">Loading...</p>
            </div>
          </div>
        ) : currentView === "AUTH" ? (
          <AuthModal onSignIn={handleSignIn} onRegister={handleRegister} />
        ) : currentView === "QUESTIONNAIRE" && mockWalletAddress ? (
          <Questionnaire
            walletAddress={mockWalletAddress}
            onComplete={handleQuestionnaireComplete}
            onCancel={handleCancelQuestionnaire}
          />
        ) : currentView === "DASHBOARD" && userData ? (
          <ProfileDashboard user={userData} />
        ) : null}
      </div>
    </main>
  );
}
