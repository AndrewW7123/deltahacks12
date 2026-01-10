import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "@solana/wallet-adapter-react-ui/styles.css";
import AppWalletProvider from "@/components/AppWalletProvider"; // 1. Import your new component

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TO BE NAMED",
  description: "TO BE WRITTEN",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* 2. Wrap the children (your pages) with the Wallet Provider */}
        <AppWalletProvider>
          {children}
        </AppWalletProvider>
      </body>
    </html>
  );
}