import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Future Self Interview",
  description: "老化を売るAPIで、老化を受け入れるアプリ",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
