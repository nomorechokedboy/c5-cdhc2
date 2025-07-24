import { DataTable } from '@/components/data-table';
import { columns } from '@/components/student-table/columns';
import { UserNav } from '@/components/data-table/user-nav';
import { SidebarInset } from '@/components/ui/sidebar';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { GetStudents } from '@/api';
import StudentForm from '@/components/student-form';
import useDataTableToolbarConfig from '@/hooks/useDataTableToolbarConfig';
import {
        MilitaryRankOptions,
        EduLevelOptions,
} from '@/components/data-table/data/data';
import { EhtnicOptions } from '@/data/ethnics';
import useClassData from '@/hooks/useClasses';

export const Route = createFileRoute('/students')({
        component: StudentPage,
});

function StudentPage() {
        const {
                data: students = [],
                isLoading: isLoadingStudents,
                refetch: refetchStudent,
        } = useQuery({ queryKey: ['students'], queryFn: GetStudents });
        const { data: classes, refetch } = useClassData();
        const classOptions = classes
                ? classes.map((c) => ({
                          label: c.name,
                          value: c.name,
                  }))
                : [];
        const { createFacetedFilter, createSearchConfig } =
                useDataTableToolbarConfig();

        if (isLoadingStudents) {
                return <div>Loading...</div>;
        }

        const handleFormSuccess = () => {
                refetchStudent();
        };
        const searchConfig = [
                createSearchConfig('fullName', 'Tìm kiếm theo tên...'),
        ];
        const facetedFilters = [
                createFacetedFilter('className', 'Lớp', classOptions),
                createFacetedFilter('rank', 'Cấp bậc', MilitaryRankOptions),
                createFacetedFilter('ethnic', 'Dân tộc', EhtnicOptions),
                createFacetedFilter(
                        'educationLevel',
                        'Trình độ học vấn',
                        EduLevelOptions
                ),
        ];

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
                                        data={students}
                                        columns={columns}
                                        toolbarProps={{
                                                rightSection: (
                                                        <StudentForm
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
