"use client";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export default function WalletConnectButton() {
    return (
        <div className="z-50 relative">
             <WalletMultiButton style={{ height: '48px' }} />
        </div>
    );
}