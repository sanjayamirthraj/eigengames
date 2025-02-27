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

// Add special comment to suppress React hydration errors
// @ts-ignore
// eslint-disable-next-line @next/next/no-sync-scripts
/* @__SUPPRESS_HYDRATION_WARNING__ */

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-black text-white`}
        suppressHydrationWarning={true}
      >
        {/* @__SUPPRESS_HYDRATION_WARNING__ */}
        <HydrationErrorSuppressor>
          {children}
        </HydrationErrorSuppressor>
      </body>
    </html>
  );
}
