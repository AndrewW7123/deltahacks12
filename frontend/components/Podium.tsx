type PodiumUser = {
  place: 1 | 2 | 3
  name: string
  wallet?: string
  score?: number // Changed from balance to score
  avatar?: string
}

export default function Podium({
  users,
}: {
  users: PodiumUser[]
}) {
  const order: (1 | 2 | 3)[] = [2, 1, 3] // visual order: 2nd, 1st, 3rd

  // If no users, show empty state
  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center mt-24">
        <p className="text-muted-foreground text-lg">No leaderboard data yet</p>
        <p className="text-muted-foreground/70 text-sm mt-2">Complete showers to appear on the leaderboard!</p>
      </div>
    )
  }

  const getRankStyles = (place: 1 | 2 | 3) => {
    switch (place) {
      case 1:
        return {
          bg: "bg-gradient-to-b from-gold/30 to-gold/10",
          border: "border-gold/50",
          glow: "shadow-gold",
          badge: "bg-gold text-background",
          height: "h-48",
        };
      case 2:
        return {
          bg: "bg-gradient-to-b from-silver/20 to-silver/5",
          border: "border-silver/40",
          glow: "",
          badge: "bg-silver text-background",
          height: "h-40",
        };
      case 3:
        return {
          bg: "bg-gradient-to-b from-bronze/20 to-bronze/5",
          border: "border-bronze/40",
          glow: "",
          badge: "bg-bronze text-background",
          height: "h-32",
        };
    }
  };

  return (
    <div className="flex items-end justify-center gap-4 md:gap-8 mt-24">
      {order.map((place) => {
        const user = users.find((u) => u.place === place)
        if (!user) return null
        
        const styles = getRankStyles(place);
        const isFirst = place === 1;

        // Use provided avatar or generate from wallet address
        const avatarSrc = user.avatar || (user.wallet ? `/api/avatar/${user.wallet}` : "/api/avatar/default")

        return (
          <div
            key={place}
            className={`flex flex-col items-center ${isFirst ? "scale-110 z-10" : ""}`}
          >
            {/* Avatar & Info */}
            <div className={`relative mb-4 p-1 rounded-full ${styles.border} border-2 ${styles.glow}`}>
              <img
                src={avatarSrc}
                alt={user.name}
                className="w-20 h-20 md:w-24 md:h-24 rounded-full object-cover border-2 border-background"
                onError={(e) => {
                  // Fallback to a simple colored circle if image fails
                  const target = e.target as HTMLImageElement
                  if (user.wallet) {
                    target.src = `data:image/svg+xml;base64,${btoa(
                      `<svg width="96" height="96" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="48" cy="48" r="48" fill="hsl(var(--primary))"/>
                        <text x="48" y="64" font-family="Arial" font-size="40" font-weight="bold" fill="white" text-anchor="middle">
                          ${user.wallet.slice(0, 1).toUpperCase()}
                        </text>
                      </svg>`
                    )}`
                  }
                }}
              />
              <div className={`absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${styles.badge}`}>
                {place}
              </div>
            </div>

            <p className="font-semibold text-foreground mb-1">{user.name}</p>
            {user.wallet && (
              <p className="text-xs text-muted-foreground mb-1 font-mono">
                {user.wallet.slice(0, 6)}...{user.wallet.slice(-4)}
              </p>
            )}
            {user.score !== undefined && (
              <p className="text-primary font-bold text-lg tabular-nums">{user.score.toLocaleString()} pts</p>
            )}

            {/* Podium Block */}
            <div
              className={`${styles.height} w-24 md:w-32 mt-4 rounded-t-xl ${styles.bg} border ${styles.border} origin-bottom flex items-center justify-center`}
            >
              <span className="text-4xl font-extrabold text-foreground/20">{place}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
