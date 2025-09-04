
import type { Metadata } from "next";
import "./globals.css";

import { GoogleOAuthProvider } from '@react-oauth/google';



export const metadata: Metadata = {
  title: "AudioCity",
  description: "AudioCity Audiobook Store",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <GoogleOAuthProvider clientId="556546199897-kcg7hsj7ap216a1tg5f7q5lh94t35o0m.apps.googleusercontent.com">
        <body>{children}</body>
      </GoogleOAuthProvider>
    </html>
  );
}
