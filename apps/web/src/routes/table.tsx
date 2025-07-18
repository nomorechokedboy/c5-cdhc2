import tasks from '../components/data-table/data/task.json';
import students from '../components/data-table/data/student.json';
import { DataTable } from '@/components/data-table';
import { columns } from '@/components/data-table/columns';
import { UserNav } from '@/components/data-table/user-nav';
import { SidebarInset } from '@/components/ui/sidebar';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/table')({
        component: TableTest,
});

function TableTest() {
        return (
                <SidebarInset>
                        <div className="hidden h-full flex-1 flex-col space-y-8 p-8 md:flex">
                                <div className="flex items-center justify-between space-y-2">
                                        <div>
                                                <h2 className="text-2xl font-bold tracking-tight">
                                                        Welcome back!
                                                </h2>
                                                <p className="text-muted-foreground">
                                                        Here&apos;s a list of
                                                        your tasks for this
                                                        month!
                                                </p>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                                <UserNav />
                                        </div>
                                </div>
                                {/* <DataTable data={tasks} columns={columns} /> */}
                                <DataTable data={students} columns={columns} />
                        </div>
                </SidebarInset>
        );
}
