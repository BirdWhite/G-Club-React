'use client';

import Link from 'next/link';

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
  pathname: string;
  showBadge?: boolean;
  badgeCount?: number;
}

export function NavLink({ href, children, pathname, showBadge = false, badgeCount = 0 }: NavLinkProps) {
  const isActive = href === '/' ? pathname === href : pathname?.startsWith(href);

  return (
    <Link
      href={href}
      className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium relative ${
        isActive ? 'nav-link-active' : 'nav-link'
      }`}
    >
      {children}
      {showBadge && badgeCount > 0 && (
        <span className="absolute -top-1 -right-4 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
          {badgeCount > 99 ? '99+' : badgeCount}
        </span>
      )}
    </Link>
  );
}
