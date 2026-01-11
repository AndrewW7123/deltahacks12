"use client";

type LeaderboardRowProps = {
  rank: number;
  username: string;
  avatar?: string;
  score: number;
  wallet?: string;
};

export default function LeaderboardRow({
  rank,
  username,
  avatar,
  score,
  wallet,
}: LeaderboardRowProps) {
  // Generate avatar if not provided
  const avatarSrc =
    avatar ||
    (wallet
      ? `data:image/svg+xml;base64,${btoa(
          `<svg width="48" height="48" xmlns="http://www.w3.org/2000/svg">
            <circle cx="24" cy="24" r="24" fill="hsl(var(--primary))"/>
            <text x="24" y="32" font-family="Arial" font-size="20" font-weight="bold" fill="white" text-anchor="middle">
              ${wallet.slice(0, 1).toUpperCase()}
            </text>
          </svg>`
        )}`
      : "/api/avatar/default");

  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-card/90 backdrop-blur-sm border border-border shadow-sm hover:border-primary/40 hover:shadow-md transition-colors cursor-pointer group">
      {/* Rank */}
      <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center font-bold text-muted-foreground group-hover:text-primary transition-colors">
        {rank}
      </div>

      {/* Avatar */}
      <div className="relative">
        <img
          src={avatarSrc}
          alt={username}
          className="w-12 h-12 rounded-full object-cover border-2 border-border group-hover:border-primary/50 transition-colors"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            if (wallet) {
              target.src = `data:image/svg+xml;base64,${btoa(
                `<svg width="48" height="48" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="24" cy="24" r="24" fill="hsl(var(--primary))"/>
                  <text x="24" y="32" font-family="Arial" font-size="20" font-weight="bold" fill="white" text-anchor="middle">
                    ${wallet.slice(0, 1).toUpperCase()}
                  </text>
                </svg>`
              )}`;
            }
          }}
        />
      </div>

      {/* Username */}
      <div className="flex-1">
        <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
          {username}
        </p>
        {wallet && (
          <p className="text-xs text-muted-foreground mt-0.5 font-mono">
            {wallet.slice(0, 6)}...{wallet.slice(-4)}
          </p>
        )}
      </div>

      {/* Score */}
      <div className="text-right">
        <p className="font-bold text-primary text-lg">{score.toLocaleString()}</p>
        <p className="text-xs text-muted-foreground">points</p>
      </div>
    </div>
  );
}
