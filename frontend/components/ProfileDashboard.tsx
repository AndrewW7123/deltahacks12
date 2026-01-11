"use client";

import { useState, useEffect } from "react";
import { Info } from "lucide-react";

interface ProfileDashboardProps {
  user: {
    walletAddress: string;
    displayName?: string;
    idealTimeRange?: {
      min: number;
      max: number;
    };
    idealTemp?: number;
  };
}

export default function ProfileDashboard({ user }: ProfileDashboardProps) {
  const [weeklyGraph, setWeeklyGraph] = useState<string | null>(null);
  const [loadingGraph, setLoadingGraph] = useState(false);
  const [showInfoTooltip, setShowInfoTooltip] = useState(false);

  // Convert seconds to minutes for display
  const minMinutes = user.idealTimeRange?.min
    ? Math.round(user.idealTimeRange.min / 60)
    : 0;
  const maxMinutes = user.idealTimeRange?.max
    ? Math.round(user.idealTimeRange.max / 60)
    : 0;

  // Format wallet address (show first 6 and last 4 characters)
  const formatWalletAddress = (address: string) => {
    if (address.length <= 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Fetch weekly schedule graph
  useEffect(() => {
    const fetchWeeklyGraph = async () => {
      if (!user.walletAddress) return;

      setLoadingGraph(true);
      try {
        const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001") + "/api/profile";
        const response = await fetch(`${API_BASE_URL}/weekly-schedule/${user.walletAddress}`);

        if (!response.ok) {
          throw new Error("Failed to fetch weekly schedule");
        }

        const data = await response.json();
        if (data.success && data.graph) {
          setWeeklyGraph(data.graph);
        } else {
          setWeeklyGraph("not enough data");
        }
      } catch (error) {
        console.error("Error fetching weekly graph:", error);
        setWeeklyGraph("not enough data");
      } finally {
        setLoadingGraph(false);
      }
    };

    fetchWeeklyGraph();
  }, [user.walletAddress]);

  return (
    <div className="min-h-screen">
      {/* Header Section - Matching ranked-shower-hub style */}
      <header className="relative bg-gradient-to-b from-card/90 to-card/50 border-b border-border">
        {/* Background glow */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            {/* Avatar Placeholder - Could add profile photo later */}
            <div className="relative">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 border-2 border-primary/30 flex items-center justify-center">
                <span className="text-3xl md:text-4xl font-bold text-primary">
                  {(user.displayName || "U").charAt(0).toUpperCase()}
                </span>
              </div>
            </div>

            {/* User Info */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2 tracking-tight">
                {user.displayName || "User"}
              </h1>
              <p className="text-muted-foreground mb-3">
                Wallet: {formatWalletAddress(user.walletAddress)}
              </p>
              {user.idealTimeRange && (
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-3">
                  <div className="px-4 py-1.5 rounded-full bg-secondary border border-border">
                    <span className="text-primary font-bold">
                      {minMinutes}-{maxMinutes} min
                    </span>
                    <span className="text-muted-foreground ml-1 text-sm">optimal range</span>
                  </div>
                  {user.idealTemp && (
                    <div className="px-4 py-1.5 rounded-full bg-secondary border border-border">
                      <span className="text-primary font-bold">{user.idealTemp}°C</span>
                      <span className="text-muted-foreground ml-1 text-sm">
                        ({(user.idealTemp * 9 / 5 + 32).toFixed(0)}°F)
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        {/* Calculated Shower Goal Card */}
        <div className="rounded-2xl bg-card/90 backdrop-blur-sm border border-border shadow-sm p-8 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-foreground tracking-tight animate-fade-in">
              Your Calculated Shower Goal
            </h2>
            {/* Info Icon Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowInfoTooltip(!showInfoTooltip)}
                onMouseEnter={() => setShowInfoTooltip(true)}
                onMouseLeave={() => setShowInfoTooltip(false)}
                className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 hover:bg-primary/20 border border-border hover:border-primary/50 transition-all"
                aria-label="Information about shower goal"
              >
                <Info className="w-4 h-4 text-primary" />
              </button>
              
              {/* Tooltip */}
              {showInfoTooltip && (
                <div className="absolute right-0 top-full mt-2 w-64 p-3 bg-card border border-border rounded-lg shadow-lg z-10">
                  <p className="text-sm text-muted-foreground">
                    This is an estimate of your optimal shower needs based on the information you provided during calibration. The range is calculated using your body measurements and hair profile to optimize efficiency and hygiene.
                  </p>
                </div>
              )}
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-5xl md:text-6xl font-bold text-primary mb-3">
              {minMinutes}-{maxMinutes}
            </div>
            <div className="text-xl text-muted-foreground mb-4">Minutes</div>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Optimized for your body type and hair profile. This personalized range helps you optimize your shower time for maximum efficiency and hygiene.
            </p>
            {user.idealTemp && (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-muted-foreground text-sm">
                  Recommended Temperature: <span className="text-foreground font-semibold">{user.idealTemp}°C ({(user.idealTemp * 9/5 + 32).toFixed(0)}°F)</span>
                </p>
              </div>
            )}
          </div>

          {/* Weekly Schedule Graph Section */}
          <div className="mt-6 pt-6 border-t border-border">
            <h3 className="text-lg font-semibold text-foreground mb-3 tracking-tight animate-fade-in-delay">
              Weekly Schedule
            </h3>
            {loadingGraph ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                <span className="ml-3 text-muted-foreground text-sm">Generating graph...</span>
              </div>
            ) : weeklyGraph === "not enough data" ? (
              <div className="py-8 text-center">
                <p className="text-muted-foreground text-sm">Not enough data</p>
                <p className="text-muted-foreground text-xs mt-2">
                  Complete more showers to see your weekly schedule analysis
                </p>
              </div>
            ) : weeklyGraph ? (
              <div className="p-4 bg-muted/50 rounded-lg border border-border">
                <p className="text-sm text-foreground whitespace-pre-line">{weeklyGraph}</p>
              </div>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}
