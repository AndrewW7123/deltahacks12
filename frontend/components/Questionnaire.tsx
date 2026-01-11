"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  User,
  Scissors,
  UserCheck,
  MoveDown,
  AlignJustify,
  Waves,
} from "lucide-react";

interface QuestionnaireProps {
  walletAddress: string;
  onComplete: (data: any) => Promise<void>;
  onCancel?: () => void;
}

export default function Questionnaire({
  walletAddress,
  onComplete,
  onCancel,
}: QuestionnaireProps) {
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

  // Progress bar calculation (4 steps now)
  const progress = (step / 4) * 100;

  // Format wallet address for display
  const formatWalletAddress = (address: string) => {
    if (address.length <= 10) return address;
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  };

  // Validation
  const isStep1Valid = formData.displayName.trim().length > 0;
  const isStep2Valid = true; // Height and weight are optional

  // Handle Next button
  const handleNext = () => {
    if (step === 1 && !isStep1Valid) return;
    if (step === 3 && !formData.hairLength) return;
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
    if (!formData.hairType) {
      setError("Please select hair type");
      return;
    }

    setError(null);

    try {
      setLoading(true);
      await onComplete({
        walletAddress,
        displayName: formData.displayName,
        heightFeet: parseInt(formData.heightFeet) || 0,
        heightInches: parseInt(formData.heightInches) || 0,
        weightLbs: parseFloat(formData.weightLbs) || 0,
        hairLength: formData.hairLength,
        hairType: formData.hairType,
      });
    } catch (err: any) {
      setError(err.message || "Failed to save profile. Please try again.");
      console.error("Questionnaire error:", err);
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-base text-slate-400">Step {step} of 4</span>
            <span className="text-base text-slate-400">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Step 1: Wallet Address + Name */}
        {step === 1 && (
          <div className="space-y-8">
            <div>
              <h2 className="text-3xl font-bold text-white mb-4">
                Let's calibrate your profile.
              </h2>
              <p className="text-lg text-slate-400">Start by telling us about yourself</p>
            </div>

            {/* Wallet Address Display */}
            <div className="bg-slate-700/50 border border-slate-600 rounded-xl p-4">
              <p className="text-sm text-slate-400 mb-2">Connected Wallet</p>
              <p className="text-xl font-mono text-green-400">{formatWalletAddress(walletAddress)}</p>
            </div>

            {/* Display Name */}
            <div>
              <label className="block text-lg font-medium text-white mb-3">
                Display Name *
              </label>
              <input
                type="text"
                value={formData.displayName}
                onChange={(e) =>
                  setFormData({ ...formData, displayName: e.target.value })
                }
                className="w-full px-5 py-4 text-lg bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your name"
                required
              />
            </div>
          </div>
        )}

        {/* Step 2: Height and Weight (Grouped) */}
        {step === 2 && (
          <div className="space-y-8">
            <div>
              <h2 className="text-3xl font-bold text-white mb-4">
                Body Measurements
              </h2>
              <p className="text-lg text-slate-400">Help us calculate your optimal shower goals</p>
            </div>

            <div className="space-y-6">
              {/* Height */}
              <div>
                <label className="block text-lg font-medium text-white mb-3">
                  Height
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <input
                      type="number"
                      min="0"
                      max="8"
                      value={formData.heightFeet}
                      onChange={(e) =>
                        setFormData({ ...formData, heightFeet: e.target.value })
                      }
                      className="w-full px-5 py-4 text-lg bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Feet"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      min="0"
                      max="11"
                      value={formData.heightInches}
                      onChange={(e) =>
                        setFormData({ ...formData, heightInches: e.target.value })
                      }
                      className="w-full px-5 py-4 text-lg bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Inches"
                    />
                  </div>
                </div>
              </div>

              {/* Weight */}
              <div>
                <label className="block text-lg font-medium text-white mb-3">
                  Weight (lbs)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={formData.weightLbs}
                  onChange={(e) =>
                    setFormData({ ...formData, weightLbs: e.target.value })
                  }
                  className="w-full px-5 py-4 text-lg bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <h2 className="text-3xl font-bold text-white mb-4">
                How long is your hair?
              </h2>
              <p className="text-lg text-slate-400">Select the option that best describes you</p>
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
                        ? "border-transparent bg-gradient-to-br from-green-500/20 to-blue-500/20 shadow-lg shadow-green-500/20"
                        : "border-slate-600 bg-slate-700 hover:border-slate-500"
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-green-500/30 to-blue-500/30 blur-sm -z-10"></div>
                    )}
                    <div className="flex flex-col items-center justify-center space-y-3 h-full">
                      <div
                        className={`p-3 rounded-lg ${
                          isSelected
                            ? "bg-gradient-to-br from-green-500 to-blue-500 text-white"
                            : "bg-slate-600 text-slate-300"
                        }`}
                      >
                        <Icon size={32} />
                      </div>
                      <span
                        className={`text-base font-medium text-center ${
                          isSelected ? "text-white" : "text-slate-300"
                        }`}
                      >
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
              <h2 className="text-3xl font-bold text-white mb-4">
                What is your hair texture?
              </h2>
              <p className="text-lg text-slate-400">Choose the texture that matches your hair</p>
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
                        ? "border-transparent bg-gradient-to-br from-green-500/20 to-blue-500/20 shadow-lg shadow-green-500/20"
                        : "border-slate-600 bg-slate-700 hover:border-slate-500"
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-green-500/30 to-blue-500/30 blur-sm -z-10"></div>
                    )}
                    <div className="flex flex-col items-center space-y-4">
                      <div
                        className={`p-4 rounded-lg ${
                          isSelected
                            ? "bg-gradient-to-br from-green-500 to-blue-500 text-white"
                            : "bg-slate-600 text-slate-300"
                        }`}
                      >
                        <Icon size={40} />
                      </div>
                      <span
                        className={`text-xl font-medium ${
                          isSelected ? "text-white" : "text-slate-300"
                        }`}
                      >
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
          <div className="mt-6 p-4 bg-red-900/30 border border-red-500/50 rounded-lg">
            <p className="text-red-400 text-base">{error}</p>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex gap-4 mt-8">
          {/* Cancel Button (only show on first step) */}
          {step === 1 && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3 bg-slate-600 hover:bg-slate-700 text-white font-semibold rounded-lg transition-colors text-lg"
            >
              Cancel
            </button>
          )}

          {/* Back Button (show from step 2 onwards) */}
          {step > 1 && (
            <button
              type="button"
              onClick={handleBack}
              className="px-6 py-3 bg-slate-600 hover:bg-slate-700 text-white font-semibold rounded-lg transition-colors text-lg"
            >
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
                (step === 3 && !formData.hairLength)
              }
              className="ml-auto px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50 text-white font-semibold rounded-lg transition-colors text-lg"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !formData.hairType}
              className="ml-auto px-8 py-3 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all text-lg"
            >
              {loading ? "Saving..." : "Complete Registration"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
