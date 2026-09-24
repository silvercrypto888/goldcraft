import "./globals.css";
import type { Metadata } from "next";
import { Orbitron, Inter } from "next/font/google";

const display = Orbitron({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "700", "900"],
});

const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Goldcraft — Transmute the Glyph",
  description:
    "A puzzle of alchemy and symmetry: transform an asymmetric glyph into the golden glyph while dodging explosive ones. Travel the structure of D8.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
