import type { Metadata } from "next";
import { Geist, Geist_Mono, Nunito_Sans } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const nunitoSans = Nunito_Sans({ variable: '--font-sans' });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "JustOCR",
  description: "Straightforward OCR with cloud models from Google, Mistral, and more; or stay private In-Browser On-Device with local models.",
  metadataBase: new URL('https://justocr.vercel.app'),
  openGraph: {
    title: "JustOCR",
    description: "Straightforward OCR with cloud models from Google, Mistral, and more; or stay private In-Browser On-Device with local models.",
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "JustOCR",
    description: "Straightforward OCR with cloud models from Google, Mistral, and more; or stay private In-Browser On-Device with local models.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={nunitoSans.variable}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}
