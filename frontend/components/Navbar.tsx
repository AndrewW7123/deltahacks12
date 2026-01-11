"use client";

import Link from "next/link";
import Image from "next/image";
import { useWallet } from "@solana/wallet-adapter-react";
import { User, UserCircle } from "lucide-react";

export default function Navbar() {
  const { connected, publicKey } = useWallet();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 backdrop-blur-md bg-card/90 border-b border-border shadow-sm">
      <Link href="/" className="flex items-center gap-3 group">
        <div className="relative w-16 h-16 group-hover:rotate-12 transition-transform">
          <Image
            src="/delta.png"
            alt="Ranked Showers Logo"
            width={64}
            height={64}
            className="object-contain"
          />
        </div>
        <span className="text-3xl font-bold text-gradient-primary group-hover:opacity-80 transition-opacity tracking-tight">
          Ranked Showers
        </span>
      </Link>

      <div className="flex items-center gap-4">
        {/* User Profile Icon - Links to /profile */}
        <Link
          href="/profile"
          className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 hover:bg-primary/20 border border-border hover:border-primary/50 transition-all hover:scale-105 group"
          title={connected ? "View Profile" : "Login / Sign Up"}
        >
          {connected && publicKey ? (
            <User className="w-5 h-5 text-primary group-hover:text-primary/80 transition-colors" />
          ) : (
            <UserCircle className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
          )}
        </Link>
      </div>
    </nav>
  );
}
