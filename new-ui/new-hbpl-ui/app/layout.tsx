import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";
import Navbar from "@/src/components/Navbar";
import Footer from "@/src/components/Footer";
import NotificationBanner from "@/src/components/NotificationBanner";
import WhatsAppButton from "@/src/components/WhatsAppButton";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  weight: ["800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "HBPL Community — Empowering Students, Building Future Leaders",
  description:
    "Join the fastest growing academic community where excellence meets opportunity. Cricket league, aptitude exams, and social initiatives.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${manrope.variable}`}>
      <body className="min-h-screen flex flex-col bg-page antialiased">
        <NotificationBanner />
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
        <WhatsAppButton />
      </body>
    </html>
  );
}
