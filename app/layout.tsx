import type { Metadata } from "next";
import { Geist, Geist_Mono, Nunito_Sans } from "next/font/google";
import "./globals.css";

const nunitoSans = Nunito_Sans({variable:'--font-sans'});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "JustOCR | Just OCR, Your Choice of Engine",
  description: "Extract text from images and PDFs with your choice of OCR engine.",
  metadataBase: new URL('https://justocr.vercel.app'),
  openGraph: {
    title: "JustOCR | Just OCR, Your Choice of Engine",
    description: "Extract text from images and PDFs with your choice of OCR engine.",
    images: ['/api/og'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "JustOCR | Just OCR, Your Choice of Engine",
    description: "Extract text from images and PDFs with your choice of OCR engine.",
    images: ['/api/og'],
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
      </body>
    </html>
  );
}
