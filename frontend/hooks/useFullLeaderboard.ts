"use client";

import { useState, useEffect } from "react";

type LeaderboardUser = {
  rank: number;
  name: string;
  wallet: string;
  score: number; // Changed from balance to score
  profilePhoto?: string | null;
  totalShowers?: number;
};

type LeaderboardResponse = {
  success: boolean;
  data: LeaderboardUser[];
  message?: string;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

/**
 * Hook to fetch full leaderboard data (top N users) based on user scores from MongoDB
 */
export function useFullLeaderboard(limit: number = 10) {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`${API_BASE_URL}/api/leaderboard/top?limit=${limit}`);
        
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
          setLeaderboardData(result.data || []);
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
  }, [limit]);

  return { leaderboardData, loading, error };
}

