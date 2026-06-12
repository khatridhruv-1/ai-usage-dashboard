import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Usage Dashboard",
  description: "Cursor, Claude & OpenAI usage analytics",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
