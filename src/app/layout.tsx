import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import HydrationErrorSuppressor from "@/lib/hydration-error-suppressor";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ethereum Parallel Execution Dashboard",
  description: "Visualize and optimize Ethereum transaction parallelization for block proposers",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-black text-white`}
      >
        <HydrationErrorSuppressor>
          {children}
        </HydrationErrorSuppressor>
      </body>
    </html>
  );
}
