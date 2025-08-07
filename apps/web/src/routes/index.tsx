import { createFileRoute, redirect } from '@tanstack/react-router';
import { DataTable } from '@/components/data-table';
import { columns } from '@/components/student-table/columns';
import { SidebarInset } from '@/components/ui/sidebar';
import StudentForm from '@/components/student-form';
import useDataTableToolbarConfig from '@/hooks/useDataTableToolbarConfig';
import { EduLevelOptions } from '@/components/data-table/data/data';
import { EhtnicOptions } from '@/data/ethnics';
import useClassData from '@/hooks/useClasses';
import useStudentData from '@/hooks/useStudents';
import type { Month, Student, StudentBody } from '@/types';
import dayjs from 'dayjs';

export const Route = createFileRoute('/')({
  component: RouteComponent,
});

function RouteComponent() {
        const handleFormSuccess = () => {};

        return (
                <SidebarInset>
                        <div className="p-4">
                                <div className="w-4xl">
                                        <StudentForm
                                                onSuccess={handleFormSuccess}
                                        />
                                </div>
                        </div>
                </SidebarInset>
        );
}
