"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import Navbar from "@/components/Navbar";
import Podium from "@/components/Podium";

export default function Home() {
  // This is the "Bouncer" logic
  const { connected, publicKey } = useWallet();

  return (
    <main className="min-h-screen bg-slate-950 text-white selection:bg-green-500 selection:text-black">
      <Navbar />
      
      <div className="flex flex-col items-center justify-center h-[80vh] px-4">
        <Podium
          users={[
            {
              place: 1,
              name: "Bob",
              avatar: "/avatars/bob.png",
            },
            {
              place: 2,
              name: "Alice",
              avatar: "/avatars/alice.png",
            },
            {
              place: 3,
              name: "Carol",
              avatar: "/avatars/carol.png",
            },
          ]}
        />

        

      </div>
    </main>
  );
}