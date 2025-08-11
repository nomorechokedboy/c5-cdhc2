import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { NotificationBell } from './notification-bell';
import React from 'react';
import { useLocation } from '@tanstack/react-router';
import { UserNav } from './data-table/user-nav';

export default function Header() {
  const location = useLocation();
  const path = location.pathname;
  const segments = path.split('/').filter(Boolean);

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    ...segments.map((seg, idx) => ({
      label: decodeURIComponent(seg),
      href: '/' + segments.slice(0, idx + 1).join('/'),
    })),
  ];

  return (
    <header className="flex flex-row items-center justify-between h-16 shrink-0 gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10 border-b">
      <div className="flex items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbItems.map((item, idx) => (
              <React.Fragment key={item.href}>
                <BreadcrumbItem>
                  {idx === 0 ? (
                    <BreadcrumbLink href={item.href}>{item.label}</BreadcrumbLink>
                  ) : idx < breadcrumbItems.length - 1 ? (
                    <span className="text-muted-foreground cursor-default select-none">{item.label}</span>
                  ) : (
                    <BreadcrumbPage>{item.label}</BreadcrumbPage>
                  )}
                </BreadcrumbItem>
                {idx < breadcrumbItems.length - 1 && <BreadcrumbSeparator />}
              </React.Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <div className="px-4 flex items-center gap-5">
        <UserNav/>
        <NotificationBell />
      </div>
    </header>
  );
}
