"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const HIDDEN_PATHS = ["/", "/logged-out", "/health-profile"];

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "หน้าหลัก", icon: "/icon/homeNavbar.svg" },
  { href: "/calendar", label: "ปฏิทิน", icon: "/icon/calenderNavbar.svg" },
  { href: "/if", label: "IF", icon: "/icon/ifNavbar.svg" },
  { href: "/stats", label: "สถิติ", icon: "/icon/graphNavbar.svg" },
  { href: "/profile", label: "โปรไฟล์", icon: "/icon/profileNavbar.svg" },
];

const ACTIVE_COLOR = "#18A659";
const INACTIVE_COLOR = "#9CA3AF";

function NavIcon({ src, isActive }: { src: string; isActive: boolean }) {
  return (
    <span
      aria-hidden="true"
      className="h-6 w-6 shrink-0"
      style={{
        backgroundColor: isActive ? ACTIVE_COLOR : INACTIVE_COLOR,
        WebkitMaskImage: `url(${src})`,
        maskImage: `url(${src})`,
        maskSize: "contain",
        maskPosition: "center",
        maskRepeat: "no-repeat",
      }}
    />
  );
}

export default function BottomNav() {
  const pathname = usePathname();

  if (HIDDEN_PATHS.includes(pathname)) {
    return null;
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex max-w-3xl items-stretch justify-between">
        {NAV_ITEMS.map(({ href, label, icon }) => {
          const isActive =
            pathname === href || pathname.startsWith(`${href}/`);

          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={`flex min-w-[64px] flex-col items-center gap-1 px-3 py-3 text-[11px] font-medium transition-colors ${
                  isActive ? "text-[#18A659]" : "text-zinc-400 hover:text-zinc-600"
                }`}
              >
                <NavIcon src={icon} isActive={isActive} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}