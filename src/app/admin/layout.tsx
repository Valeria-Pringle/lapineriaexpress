import type { Metadata } from "next";
import { AdminLayoutClient } from "@/components/admin/AdminLayoutClient";

export const metadata: Metadata = {
  title: "Panel Administrativo | La Pineria Express",
  description: "Panel administrativo para cotizaciones y finanzas",
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
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
