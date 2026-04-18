import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Panel Administrativo | La Pineria Express",
  description: "Panel administrativo para generar cotizaciones",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
