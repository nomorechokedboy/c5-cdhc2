import { AppSidebar } from '@/components/app-sidebar';
import {
        Breadcrumb,
        BreadcrumbList,
        BreadcrumbItem,
        BreadcrumbLink,
        BreadcrumbSeparator,
        BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import {
        Sidebar,
        SidebarInset,
        SidebarProvider,
        SidebarTrigger,
} from '@/components/ui/sidebar';
import { Separator } from '@radix-ui/react-select';
import { createFileRoute } from '@tanstack/react-router';
import logo from '../logo.svg';

export const Route = createFileRoute('/')({
        component: App,
});

function App() {
        return (
                <SidebarInset>
                        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                                <div className="grid auto-rows-min gap-4 md:grid-cols-3">
                                        <div className="bg-muted/50 aspect-video rounded-xl" />
                                        <div className="bg-muted/50 aspect-video rounded-xl" />
                                        <div className="bg-muted/50 aspect-video rounded-xl" />
                                </div>
                                <div className="bg-muted/50 min-h-[100vh] flex-1 rounded-xl md:min-h-min" />
                        </div>

                        <div className="text-center">
                                <header className="min-h-screen flex flex-col items-center justify-center bg-[#282c34] text-white text-[calc(10px+2vmin)]">
                                        <img
                                                src={logo}
                                                className="h-[40vmin] pointer-events-none animate-[spin_20s_linear_infinite]"
                                                alt="logo"
                                        />
                                        <p>
                                                Edit{' '}
                                                <code>
                                                        src/routes/index.tsx
                                                </code>{' '}
                                                and save to reload.
                                        </p>
                                        <a
                                                className="text-[#61dafb] hover:underline"
                                                href="https://reactjs.org"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                        >
                                                Learn React
                                        </a>
                                        <a
                                                className="text-[#61dafb] hover:underline"
                                                href="https://tanstack.com"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                        >
                                                Learn TanStack
                                        </a>
                                </header>
                        </div>
                </SidebarInset>
        );
}
