import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import HamburgerMenu from "@/components/layout/HamburgerMenu";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-brand-gray">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-brand-gray-medium">
        <div className="flex items-center justify-between px-4 h-14 max-w-lg mx-auto">
          <img
            src="https://images.squarespace-cdn.com/content/v1/59a8252ef14aa1d4753f773f/1505582501952-4GGS7SEZFFX11LO447W5/logo+ozone+sito.png"
            alt="O-Zone"
            className="h-8 object-contain"
          />
          <HamburgerMenu />
        </div>
      </header>

      {/* Content */}
      <main className="max-w-lg mx-auto px-4 py-4">{children}</main>
    </div>
  );
}
