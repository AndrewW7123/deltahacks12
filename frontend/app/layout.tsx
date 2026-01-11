import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import "@solana/wallet-adapter-react-ui/styles.css";
import AppWalletProvider from "@/components/AppWalletProvider";
import WalletConnectionGuard from "@/components/WalletConnectionGuard";

const outfit = Outfit({ 
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "Ranked Showers",
  description: "Compete to be the cleanest in the world! Track your performance and find your optimal showers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={outfit.className} suppressHydrationWarning>
        {/* Wrap the children (your pages) with the Wallet Provider */}
        <AppWalletProvider>
          {/* Monitor wallet connection and redirect to calibration if user doesn't exist */}
          <WalletConnectionGuard>
            {children}
          </WalletConnectionGuard>
        </AppWalletProvider>
      </body>
    </html>
  );
}