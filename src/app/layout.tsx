// src/app/layout.tsx
import type { ReactNode } from "react";

export const metadata = {
  title: "Gold Rush",
  description: "Beat the agent. Grow your stack.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          padding: 0,
        }}
      >
        {children}
      </body>
    </html>
  );
}
