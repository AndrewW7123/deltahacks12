"use client";

import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export default function Navbar() {
  return (
    <nav className="flex items-center justify-between p-6 bg-slate-900 border-b border-slate-700">
      <div className="flex items-center gap-2">
        <span className="text-2xl">🧼</span>
        <h1 className="text-xl font-bold text-white tracking-tighter">
          Proof-of-Shower
        </h1>
      </div>

      {/* This is the Magic Button from the library */}
      <div className="hover:scale-105 transition-transform">
        {/* We style the container, the button styles itself */}
        <WalletMultiButton style={{ backgroundColor: '#2563eb' }} />
      </div>
    </nav>
  );
}