"use client";

import Link from "next/link";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export default function Navbar() {
  return (
    <nav className="flex items-center justify-between p-6 bg-slate-900 border-b border-slate-700">
      <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
        <span className="text-2xl">🧼</span>
        <h1 className="text-xl font-bold text-white tracking-tighter">
          Proof-of-Shower
        </h1>
      </Link>

      <div className="flex items-center gap-4">
        {/* Profile Icon Link */}
        <Link
          href="/profile"
          className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          aria-label="Profile"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-white"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
        </Link>

        {/* Wallet Connect Button */}
        <div className="hover:scale-105 transition-transform">
          <WalletMultiButton style={{ backgroundColor: "#2563eb" }} />
        </div>
      </div>
    </nav>
  );
}