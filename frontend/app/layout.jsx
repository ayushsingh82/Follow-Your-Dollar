import "./globals.css";

export const metadata = {
  title: "Follow Your Dollar",
  description: "Every donated dollar, traced to a receipt.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
