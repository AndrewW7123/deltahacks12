"use client";

import { useState, useEffect } from "react";

type PodiumUser = {
  place: 1 | 2 | 3;
  name: string;
  wallet: string;
  score: number; // Changed from balance to score
  avatar?: string | null;
};

type LeaderboardResponse = {
  success: boolean;
  data: PodiumUser[];
  message?: string;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

/**
 * Hook to fetch leaderboard data (top 3) based on user scores from MongoDB
 */
export function useLeaderboard() {
  const [podiumData, setPodiumData] = useState<PodiumUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`${API_BASE_URL}/api/leaderboard/podium`);
        
        if (!response.ok) {
          // Handle HTTP errors
          const errorText = await response.text();
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { message: errorText || `HTTP ${response.status}` };
          }
          throw new Error(errorData.message || errorData.error || `HTTP ${response.status}`);
        }

        const result: LeaderboardResponse = await response.json();

        if (result.success) {
          setPodiumData(result.data || []);
        } else {
          setError(result.message || "Failed to fetch leaderboard");
        }
      } catch (err) {
        console.error("Error fetching leaderboard:", err);
        // Better error messages
        if (err instanceof TypeError && err.message.includes("fetch")) {
          setError("Cannot connect to backend server. Make sure the server is running on " + API_BASE_URL);
        } else {
          setError(err instanceof Error ? err.message : "Unknown error");
        }
      } finally {
        setLoading(false);
      }
    }

    fetchLeaderboard();

    // Refresh every 30 seconds to get latest scores
    const interval = setInterval(fetchLeaderboard, 30000);

    return () => clearInterval(interval);
  }, []);

  return { podiumData, loading, error };
}

