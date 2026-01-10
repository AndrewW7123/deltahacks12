"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import Navbar from "@/components/Navbar";

export default function Home() {
  // This is the "Bouncer" logic
  const { connected, publicKey } = useWallet();

  return (
    <main className="min-h-screen bg-slate-950 text-white selection:bg-green-500 selection:text-black">
      <Navbar />

      <div className="flex flex-col items-center justify-center h-[80vh] px-4">
        
        {/* SCENARIO 1: NOT CONNECTED (Show Error) */}
        {!connected && (
          <div className="text-center max-w-md border border-red-500/50 bg-red-900/10 p-10 rounded-2xl backdrop-blur-sm">
            <div className="text-6xl mb-6">🛑</div>
            <h2 className="text-3xl font-bold mb-4 text-red-400">Access Denied</h2>
            <p className="text-gray-300 text-lg">
              You must connect a Solana Wallet to verify your hygiene.
            </p>
            <div className="mt-8 text-sm text-gray-500 animate-pulse">
              Please connect via top right corner ↗
            </div>
          </div>
        )}

        {/* SCENARIO 2: CONNECTED (Show Dashboard) */}
        {connected && publicKey && (
          <div className="w-full max-w-2xl text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="inline-block px-4 py-1 mb-6 rounded-full bg-green-500/10 border border-green-500/50 text-green-400 font-mono text-sm">
              IDENTITY VERIFIED
            </div>
            
            <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-teal-400 bg-clip-text text-transparent">
              Welcome, Scrubber.
            </h1>
            
            <p className="text-xl text-gray-400 mb-8">
              Your Wallet ID: <span className="font-mono text-white bg-slate-800 px-2 py-1 rounded">{publicKey.toString().slice(0, 6)}...{publicKey.toString().slice(-4)}</span>
            </p>

            <div className="grid grid-cols-2 gap-4 mb-10">
               <div className="p-6 bg-slate-900 rounded-xl border border-slate-800">
                  <div className="text-3xl font-bold text-white mb-1">0</div>
                  <div className="text-sm text-gray-400 uppercase tracking-wider">Current Streak</div>
               </div>
               <div className="p-6 bg-slate-900 rounded-xl border border-slate-800">
                  <div className="text-3xl font-bold text-yellow-400 mb-1">0 $SCRUB</div>
                  <div className="text-sm text-gray-400 uppercase tracking-wider">Rewards Earned</div>
               </div>
            </div>

            <button 
                onClick={() => alert("Connecting to Shower Rig via Bluetooth...")}
                className="w-full py-5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-xl font-bold text-xl transition-all shadow-lg shadow-blue-500/25 active:scale-95"
            >
              🚀 START SHOWER SESSION
            </button>
          </div>
        )}

      </div>
    </main>
  );
}