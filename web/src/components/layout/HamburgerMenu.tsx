"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

const menuItems = [
  { href: "/ore", label: "Ore", roles: ["istruttore", "responsabile", "admin"] },
  { href: "/profilo", label: "Profilo", roles: ["istruttore", "responsabile", "admin"] },
  { href: "/responsabile", label: "Dashboard", roles: ["responsabile", "admin"] },
  { href: "/admin", label: "Admin", roles: ["admin"] },
];

export default function HamburgerMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();
  const menuRef = useRef<HTMLDivElement>(null);

  const role = (session?.user as { role?: string })?.role ?? "istruttore";
  const visibleItems = menuItems.filter((item) => item.roles.includes(role));

  // Chiudi menu quando si cambia pagina
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Chiudi menu cliccando fuori
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="p-1.5 rounded-lg hover:bg-brand-gray transition"
        aria-label="Menu"
      >
        {open ? (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-brand-gray-medium py-1 z-50">
          {visibleItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-4 py-2.5 text-sm transition ${
                  isActive
                    ? "font-semibold text-brand-black bg-brand-gray"
                    : "text-brand-gray-dark hover:bg-brand-gray"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <div className="border-t border-brand-gray-medium my-1" />
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="block w-full text-left px-4 py-2.5 text-sm text-brand-gray-dark hover:bg-brand-gray transition"
          >
            Esci
          </button>
        </div>
      )}
    </div>
  );
}
