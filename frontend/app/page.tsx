"use client";

import { useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import Navbar from "@/components/Navbar";
import Podium from "@/components/Podium";
import LeaderboardRow from "@/components/LeaderboardRow";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { useFullLeaderboard } from "@/hooks/useFullLeaderboard";
import { generateAvatarUrl } from "@/utils/avatar";
import { Droplets, TrendingUp } from "lucide-react";

export default function Home() {
  const { connected, publicKey } = useWallet();
  const { podiumData, loading, error } = useLeaderboard();
  const { leaderboardData, loading: loadingFull } = useFullLeaderboard(10);

  // Log publicKey to console when wallet connects
  useEffect(() => {
    if (connected && publicKey) {
      console.log("Wallet connected! Public Key:", publicKey.toString());
    }
  }, [connected, publicKey]);

  // Transform leaderboard data for Podium component
  const podiumUsers = podiumData.map((entry) => ({
    place: entry.place as 1 | 2 | 3,
    name: entry.name,
    wallet: entry.wallet,
    score: entry.score, // Changed from balance to score
    // Use MongoDB profile photo if available, otherwise generate from wallet
    avatar: entry.avatar || generateAvatarUrl(entry.wallet),
  }));

  return (
    <main className="min-h-screen">
      <Navbar />
      
      {/* Hero Section with Podium */}
      <section className="pt-32 pb-20 px-4 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-water pointer-events-none" />
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl opacity-50" />
        <div className="absolute top-40 right-1/4 w-64 h-64 bg-accent/10 rounded-full blur-3xl opacity-30" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Droplets className="w-6 h-6 text-primary animate-float" />
            <span className="text-primary font-medium uppercase tracking-wider text-sm">
              Global Leaderboard
            </span>
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold mb-6 tracking-tight">
            <span className="text-gradient-primary">Ranked Showers</span>
          </h1>

          <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-16">
            Compete to be the cleanest in the world! Track your performance and find your optimal showers.
          </p>

          {/* Podium */}
          {loading ? (
            <div className="flex flex-col items-center gap-4 py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <p className="text-muted-foreground">Loading leaderboard...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-4 py-20">
              <p className="text-destructive">Error loading leaderboard</p>
              <p className="text-muted-foreground text-sm">{error}</p>
            </div>
          ) : (
            <Podium users={podiumUsers} />
          )}
        </div>
      </section>

      {/* Extended Leaderboard */}
      {!loading && !error && leaderboardData.length > 3 && (
        <section className="py-20 px-4 border-t border-border">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 rounded-lg bg-primary/10">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground tracking-tight">Rising Competitors</h2>
            </div>

            {loadingFull ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="space-y-3">
                {leaderboardData
                  .filter((user) => user.rank > 3) // Skip top 3 (already in podium)
                  .map((user) => (
                    <LeaderboardRow
                      key={user.wallet}
                      rank={user.rank}
                      username={user.name}
                      wallet={user.wallet}
                      score={user.score} // Changed from balance to score
                      // Use MongoDB profile photo if available, otherwise generate from wallet
                      avatar={user.profilePhoto || generateAvatarUrl(user.wallet)}
                    />
                  ))}
              </div>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
