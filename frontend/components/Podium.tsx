type PodiumUser = {
  place: 1 | 2 | 3
  name: string
  avatar: string
}

export default function Podium({
  users,
}: {
  users: PodiumUser[]
}) {
  const order = [2, 1, 3] // visual order

  return (
    <div className="flex items-end justify-center gap-8 mt-24">
      {order.map((place) => {
        const user = users.find((u) => u.place === place)!
        const height =
          place === 1 ? "h-40" : place === 2 ? "h-32" : "h-28"

        return (
          <div
            key={place}
            className="relative flex flex-col items-center"
          >
            {/* Avatar + name */}
            <div className="absolute -top-20 flex flex-col items-center">
              <img
                src={user.avatar}
                alt={user.name}
                className="w-14 h-14 rounded-full border-2 border-white shadow-md"
              />
              <span className="mt-1 text-sm font-semibold">
                {user.name}
              </span>
            </div>

            {/* Podium */}
            <div
              className={`w-24 ${height} flex items-center justify-center rounded-t-lg bg-gradient-to-b 
              ${
                place === 1
                  ? "from-yellow-400 to-yellow-500"
                  : place === 2
                  ? "from-gray-300 to-gray-400"
                  : "from-orange-400 to-orange-500"
              }`}
            >
              <span className="text-lg font-bold text-white">
                {place === 1
                  ? "1st"
                  : place === 2
                  ? "2nd"
                  : "3rd"}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
