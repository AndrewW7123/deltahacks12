"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  User,
  Scissors,
  UserCheck,
  MoveDown,
  AlignJustify,
  Waves,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";
import Navbar from "@/components/Navbar";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001") + "/api/profile";

type LucideIcon = React.ComponentType<{ size?: number; className?: string }>;

export default function CalibrationPage() {
  const router = useRouter();
  const { connected, publicKey, disconnect } = useWallet();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    displayName: "",
    heightFeet: "",
    heightInches: "",
    weightLbs: "",
    hairLength: "",
    hairType: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if wallet not connected
  useEffect(() => {
    if (!connected || !publicKey) {
      router.push("/profile");
    }
  }, [connected, publicKey, router]);

  // Progress bar calculation (4 steps)
  const progress = (step / 4) * 100;

  // Format wallet address for display
  const formatWalletAddress = (address: string) => {
    if (address.length <= 10) return address;
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  };

  // Validation
  const isStep1Valid = formData.displayName.trim().length > 0;
  const isStep2Valid = true; // Height and weight are optional
  const isStep3Valid = formData.hairLength !== "";
  const isStep4Valid = formData.hairType !== "";

  // Handle Next button
  const handleNext = () => {
    if (step === 1 && !isStep1Valid) return;
    if (step === 3 && !isStep3Valid) return;
    if (step === 4) return; // Final step, handle submit instead

    setStep(step + 1);
    setError(null);
  };

  // Handle Back button
  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      setError(null);
    }
  };

  // Handle Final Submit
  const handleSubmit = async () => {
    if (!publicKey) {
      setError("Wallet not connected");
      return;
    }

    if (!isStep4Valid) {
      setError("Please select hair type");
      return;
    }

    setError(null);

    try {
      setLoading(true);
      const walletAddress = publicKey.toString();

      const response = await fetch(`${API_BASE_URL}/setup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          walletAddress,
          displayName: formData.displayName,
          heightFeet: parseInt(formData.heightFeet) || 0,
          heightInches: parseInt(formData.heightInches) || 0,
          weightLbs: parseFloat(formData.weightLbs) || 0,
          hairLength: formData.hairLength,
          hairType: formData.hairType,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save profile");
      }

      const data = await response.json();

      if (data.success) {
        // Redirect to dashboard on success
        router.push("/profile");
      } else {
        throw new Error("Failed to save profile");
      }
    } catch (err: any) {
      setError(err.message || "Failed to save profile. Please try again.");
      console.error("Calibration error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Hair Length Options
  const hairLengthOptions: Array<{
    value: string;
    label: string;
    icon: LucideIcon;
  }> = [
    { value: "BALD", label: "Bald / Very Short", icon: User },
    { value: "SHORT", label: "Short (Ear)", icon: Scissors },
    { value: "MEDIUM", label: "Medium (Shoulder)", icon: UserCheck },
    { value: "LONG", label: "Long (Back)", icon: MoveDown },
  ];

  // Hair Type Options
  const hairTypeOptions: Array<{
    value: string;
    label: string;
    icon: LucideIcon;
  }> = [
    { value: "STRAIGHT", label: "Straight", icon: AlignJustify },
    { value: "CURLY", label: "Curly / Coily", icon: Waves },
  ];

  // Don't render if wallet not connected (will redirect)
  if (!connected || !publicKey) {
    return (
      <main className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto py-8 pt-32">
          <div className="flex items-center justify-center h-[60vh]">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
              <p className="text-muted-foreground">Redirecting...</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto py-8 pt-32 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-base text-muted-foreground">Step {step} of 4</span>
              <span className="text-base text-muted-foreground">{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-gradient-to-r from-primary to-accent h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>

          {/* Main Form Card */}
          <div className="bg-card border border-border rounded-xl p-8 shadow-lg">
            {/* Step 1: Display Name */}
            {step === 1 && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-3xl font-bold text-foreground mb-4">
                    Let's calibrate your profile
                  </h2>
                  <p className="text-lg text-muted-foreground">Start by telling us about yourself</p>
                </div>

                {/* Wallet Address Display */}
                <div className="bg-muted/50 border border-border rounded-xl p-4">
                  <p className="text-sm text-muted-foreground mb-2">Connected Wallet</p>
                  <p className="text-xl font-mono text-primary">{formatWalletAddress(publicKey.toString())}</p>
                </div>

                {/* Display Name */}
                <div>
                  <label className="block text-lg font-medium text-foreground mb-3">
                    Display Name <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    className="w-full px-5 py-4 text-lg bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Enter your name"
                    required
                  />
                </div>
              </div>
            )}

            {/* Step 2: Height and Weight */}
            {step === 2 && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-3xl font-bold text-foreground mb-4">Body Measurements</h2>
                  <p className="text-lg text-muted-foreground">Help us calculate your optimal shower goals</p>
                </div>

                <div className="space-y-6">
                  {/* Height */}
                  <div>
                    <label className="block text-lg font-medium text-foreground mb-3">Height</label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <input
                          type="number"
                          min="0"
                          max="8"
                          value={formData.heightFeet}
                          onChange={(e) => setFormData({ ...formData, heightFeet: e.target.value })}
                          className="w-full px-5 py-4 text-lg bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="Feet"
                        />
                      </div>
                      <div>
                        <input
                          type="number"
                          min="0"
                          max="11"
                          value={formData.heightInches}
                          onChange={(e) => setFormData({ ...formData, heightInches: e.target.value })}
                          className="w-full px-5 py-4 text-lg bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="Inches"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Weight */}
                  <div>
                    <label className="block text-lg font-medium text-foreground mb-3">Weight (lbs)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={formData.weightLbs}
                      onChange={(e) => setFormData({ ...formData, weightLbs: e.target.value })}
                      className="w-full px-5 py-4 text-lg bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Enter your weight in pounds"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Hair Length */}
            {step === 3 && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-3xl font-bold text-foreground mb-4">How long is your hair?</h2>
                  <p className="text-lg text-muted-foreground">Select the option that best describes you</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {hairLengthOptions.map((option) => {
                    const Icon = option.icon;
                    const isSelected = formData.hairLength === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, hairLength: option.value });
                          setError(null);
                        }}
                        className={`relative p-6 rounded-xl border-2 transition-all duration-200 ${
                          isSelected
                            ? "border-primary bg-primary/10 shadow-lg shadow-primary/20"
                            : "border-border bg-background hover:border-primary/50"
                        }`}
                      >
                        <div className="flex flex-col items-center justify-center space-y-3 h-full">
                          <div
                            className={`p-3 rounded-lg ${
                              isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                            }`}
                          >
                            <Icon size={32} />
                          </div>
                          <span className={`text-base font-medium text-center ${isSelected ? "text-foreground" : "text-muted-foreground"}`}>
                            {option.label}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 4: Hair Type */}
            {step === 4 && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-3xl font-bold text-foreground mb-4">What is your hair texture?</h2>
                  <p className="text-lg text-muted-foreground">Choose the texture that matches your hair</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {hairTypeOptions.map((option) => {
                    const Icon = option.icon;
                    const isSelected = formData.hairType === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, hairType: option.value });
                          setError(null);
                        }}
                        className={`relative p-8 rounded-xl border-2 transition-all duration-200 ${
                          isSelected
                            ? "border-primary bg-primary/10 shadow-lg shadow-primary/20"
                            : "border-border bg-background hover:border-primary/50"
                        }`}
                      >
                        <div className="flex flex-col items-center space-y-4">
                          <div
                            className={`p-4 rounded-lg ${
                              isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                            }`}
                          >
                            <Icon size={40} />
                          </div>
                          <span className={`text-xl font-medium ${isSelected ? "text-foreground" : "text-muted-foreground"}`}>
                            {option.label}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mt-6 p-4 bg-destructive/10 border border-destructive/50 rounded-lg">
                <p className="text-destructive text-base">{error}</p>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex gap-4 mt-8">
              {/* Back Button (show from step 2 onwards) */}
              {step > 1 && (
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={loading}
                  className="px-6 py-3 bg-muted hover:bg-muted/80 disabled:bg-muted/50 disabled:cursor-not-allowed text-foreground font-semibold rounded-lg transition-colors flex items-center gap-2"
                >
                  <ArrowLeft size={20} />
                  Back
                </button>
              )}

              {/* Next / Submit Button */}
              {step < 4 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={
                    (step === 1 && !isStep1Valid) ||
                    (step === 3 && !isStep3Valid) ||
                    loading
                  }
                  className="ml-auto px-8 py-3 bg-primary hover:bg-primary/90 disabled:bg-muted disabled:cursor-not-allowed disabled:opacity-50 text-primary-foreground font-semibold rounded-lg transition-colors flex items-center gap-2"
                >
                  Next
                  <ArrowRight size={20} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading || !isStep4Valid}
                  className="ml-auto px-8 py-3 bg-primary hover:bg-primary/90 disabled:bg-muted disabled:cursor-not-allowed text-primary-foreground font-semibold rounded-lg transition-all flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-foreground"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={20} />
                      Complete Calibration
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
