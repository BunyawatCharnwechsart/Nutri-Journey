"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import PhotoIcon from "@/components/PhotoIcon";

const HIDDEN_PATHS = ["/", "/logged-out", "/health-profile", "/privacy", "/terms"];

// Routes that exist and are visited often - warmed up so navigation feels instant.
const PREFETCH_PATHS = ["/dashboard", "/profile"];

interface IconProps {
  className?: string;
}

function HomeIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 22 20"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M11 0L10.4227 0.540817L0 10.7746L1.15452 11.9082L2.18076 10.8974V20H9.3965V12.1278H12.6035V20H19.8192V10.8974L20.8455 11.9066L22 10.773L11.5773 0.539243L11 0ZM11 2.23884L18.2157 9.32378V18.4256H14.207V10.5534H7.793V18.4256H3.78426V9.32299L11 2.23884Z" />
    </svg>
  );
}

function IfIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 29 29"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M6.68508 18.4442C6.23279 17.3522 6 16.1819 6 15C6 12.6131 6.94821 10.3239 8.63604 8.63604C10.3239 6.94821 12.6131 6 15 6C17.3869 6 19.6761 6.94821 21.364 8.63604C23.0518 10.3239 24 12.6131 24 15C24 16.1819 23.7672 17.3522 23.3149 18.4442C22.8626 19.5361 22.1997 20.5282 21.364 21.364C20.5282 22.1997 19.5361 22.8626 18.4442 23.3149C17.3522 23.7672 16.1819 24 15 24C13.8181 24 12.6478 23.7672 11.5558 23.3149C10.4639 22.8626 9.47177 22.1997 8.63604 21.364C7.80031 20.5282 7.13738 19.5361 6.68508 18.4442Z" />
      <path d="M15 10V15L18 18" />
    </svg>
  );
}

function ChartIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 29 29"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M7 15H10V24H7V15ZM13 6H16V24H13V6ZM19 10.5H22V24H19V10.5Z"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M24 24H5" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ProfileIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 29 29"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M6 21.6667C6 20.429 6.50044 19.242 7.39124 18.3668C8.28204 17.4917 9.49022 17 10.75 17H20.25C21.5098 17 22.718 17.4917 23.6088 18.3668C24.4996 19.242 25 20.429 25 21.6667C25 22.2855 24.7498 22.879 24.3044 23.3166C23.859 23.7542 23.2549 24 22.625 24H8.375C7.74511 24 7.14102 23.7542 6.69562 23.3166C6.25022 22.879 6 22.2855 6 21.6667Z"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M15.5 15C17.9853 15 20 12.9853 20 10.5C20 8.01472 17.9853 6 15.5 6C13.0147 6 11 8.01472 11 10.5C11 12.9853 13.0147 15 15.5 15Z"
        strokeWidth="2"
      />
    </svg>
  );
}

interface NavItem {
  href: string;
  label: string;
  Icon: (props: IconProps) => React.ReactElement;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "หน้าหลัก", Icon: HomeIcon },
  { href: "/photo", label: "รูปภาพ", Icon: PhotoIcon },
  { href: "/if", label: "IF", Icon: IfIcon },
  { href: "/stats", label: "สถิติ", Icon: ChartIcon },
  { href: "/profile", label: "โปรไฟล์", Icon: ProfileIcon },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    PREFETCH_PATHS.forEach((path) => router.prefetch(path));
  }, [router]);

  if (HIDDEN_PATHS.includes(pathname)) {
    return null;
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex max-w-3xl items-stretch justify-between">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const isActive =
            pathname === href || pathname.startsWith(`${href}/`);

          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={`flex min-w-[64px] flex-col items-center gap-1 px-3 py-3 text-[11px] font-medium ${
                  isActive
                    ? "text-[#18A659]"
                    : "text-zinc-400 hover:text-zinc-600"
                }`}
              >
                <Icon className="h-6 w-6 shrink-0" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}