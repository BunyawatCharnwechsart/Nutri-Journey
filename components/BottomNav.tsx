"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

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

function CalendarIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 29 29"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M22 7H20V6C20 5.73478 19.8946 5.48043 19.7071 5.29289C19.5196 5.10536 19.2652 5 19 5C18.7348 5 18.4804 5.10536 18.2929 5.29289C18.1054 5.48043 18 5.73478 18 6V7H12V6C12 5.73478 11.8946 5.48043 11.7071 5.29289C11.5196 5.10536 11.2652 5 11 5C10.7348 5 10.4804 5.10536 10.2929 5.29289C10.1054 5.48043 10 5.73478 10 6V7H8C7.20435 7 6.44129 7.31607 5.87868 7.87868C5.31607 8.44129 5 9.20435 5 10V22C5 22.7957 5.31607 23.5587 5.87868 24.1213C6.44129 24.6839 7.20435 25 8 25H22C22.7957 25 23.5587 24.6839 24.1213 24.1213C24.6839 23.5587 25 22.7957 25 22V10C25 9.20435 24.6839 8.44129 24.1213 7.87868C23.5587 7.31607 22.7957 7 22 7ZM23 22C23 22.2652 22.8946 22.5196 22.7071 22.7071C22.5196 22.8946 22.2652 23 22 23H8C7.73478 23 7.48043 22.8946 7.29289 22.7071C7.10536 22.5196 7 22.2652 7 22V15H23V22ZM23 13H7V10C7 9.73478 7.10536 9.48043 7.29289 9.29289C7.48043 9.10536 7.73478 9 8 9H10V10C10 10.2652 10.1054 10.5196 10.2929 10.7071C10.4804 10.8946 10.7348 11 11 11C11.2652 11 11.5196 10.8946 11.7071 10.7071C11.8946 10.5196 12 10.2652 12 10V9H18V10C18 10.2652 18.1054 10.5196 18.2929 10.7071C18.4804 10.8946 18.7348 11 19 11C19.2652 11 19.5196 10.8946 19.7071 10.7071C19.8946 10.5196 20 10.2652 20 10V9H22C22.2652 9 22.5196 9.10536 22.7071 9.29289C22.8946 9.48043 23 9.73478 23 10V13Z" />
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
  { href: "/calendar", label: "ปฏิทิน", Icon: CalendarIcon },
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