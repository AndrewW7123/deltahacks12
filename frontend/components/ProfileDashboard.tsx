"use client";

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

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Welcome Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-white">
          Welcome, {user.displayName || "User"}! 🚿
        </h1>
        <div className="text-slate-400">
          <p>Your Wallet: {formatWalletAddress(user.walletAddress)}</p>
        </div>
      </div>

      {/* Calculated Shower Goal Card */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-8">
        <h2 className="text-lg font-semibold text-white mb-4">Your Calculated Shower Goal</h2>
        <div className="text-center">
          <div className="text-5xl font-bold text-green-400 mb-2">
            {minMinutes}-{maxMinutes}
          </div>
          <div className="text-xl text-slate-300 mb-4">Minutes</div>
          <p className="text-slate-400 text-sm">
            Optimized for your body type and hair profile
          </p>
          {user.idealTemp && (
            <p className="text-slate-400 text-sm mt-2">
              Recommended Temperature: {user.idealTemp}°C ({(user.idealTemp * 9/5 + 32).toFixed(0)}°F)
            </p>
          )}
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-blue-900/20 border border-blue-700/50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-blue-300 mb-2">How This Works</h3>
        <p className="text-slate-300 text-sm">
          Your shower goal is calculated based on your body measurements and hair profile.
          This personalized range helps you optimize your shower time for maximum efficiency and hygiene.
        </p>
      </div>
    </div>
  );
}
