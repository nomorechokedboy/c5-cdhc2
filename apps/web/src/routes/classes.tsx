import { columns } from '@/components/class-table/columns';
import { DataTable } from '@/components/data-table';
import { UserNav } from '@/components/data-table/user-nav';
import { SidebarInset } from '@/components/ui/sidebar';
import { createFileRoute } from '@tanstack/react-router';
import ClassCard from '@/components/class-table/class-card';
import ClassForm from '@/components/class-form';
import useClassData from '@/hooks/useClasses';
import useDataTableToolbarConfig from '@/hooks/useDataTableToolbarConfig';
import type { FacetedFilterConfig } from '@/types';

export const Route = createFileRoute('/classes')({
        component: ClassPage,
});

function ClassPage() {
        const {
                data: classes = [],
                isLoading: isLoadingClasses,
                refetch: refetchClasses,
        } = useClassData();
        const { createSearchConfig } = useDataTableToolbarConfig();

        if (isLoadingClasses) {
                return <div>Loading...</div>;
        }

        const handleFormSuccess = () => {
                refetchClasses();
        };

        const searchConfig = [
                createSearchConfig('name', 'Tìm kiếm theo tên lớp...'),
        ];
        const facetedFilters: FacetedFilterConfig[] = [];

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
                                <DataTable
                                        columns={columns}
                                        cardComponent={ClassCard}
                                        cardClassName="grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                                        data={classes}
                                        defaultViewMode="card"
                                        toolbarProps={{
                                                rightSection: (
                                                        <ClassForm
                                                                onSuccess={
                                                                        handleFormSuccess
                                                                }
                                                        />
                                                ),
                                                searchConfig,
                                                facetedFilters,
                                        }}
                                />
                        </div>
                </SidebarInset>
        );
}
