import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({ 
  subsets: ["latin"], 
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-manrope" 
});

export const metadata: Metadata = {
  title: "Young&Test | AI-Powered Student Quiz Platform",
  description: "Create engaging, proctored quizzes in seconds. Students join instantly with a 6-digit PIN.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${manrope.variable} font-sans antialiased bg-[#ffffff] text-slate-900 selection:bg-[#fbbf24] selection:text-slate-900`}>
        {children}
      </body>
    </html>
  );
}
