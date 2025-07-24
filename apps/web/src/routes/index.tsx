import { DataTable } from '@/components/data-table';
import { baseStudentsColumns } from '@/components/student-table/columns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SidebarInset } from '@/components/ui/sidebar';
import useStudentData from '@/hooks/useStudents';
import { createFileRoute } from '@tanstack/react-router';
import { CalendarDays } from 'lucide-react';
import dayjs from 'dayjs';
import type { Month, Student } from '@/types';
import { ReactNode } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';

export const Route = createFileRoute('/')({
        component: App,
});

function App() {
        const {
                data: studentWithBirthdayInWeek = [],
                isLoading: isLoadingStudentBirthdayInWeek,
                refetch: refetchStudentBirthdayInWeek,
        } = useStudentData({
                birthdayInWeek: true,
        });
        const thisMonth = dayjs().format('MM') as Month;

        const {
                data: studentWithBrithdayInMonth = [],
                isLoading: isLoadingStudentBirthdayInMonth,
                refetch: refetchStudentBirthdayInMonth,
        } = useStudentData({
                birthdayInMonth: thisMonth,
        });

        const {
                data: cpvStudents = [],
                isLoading: isLoadingCpvStudents,
                refetch: refetchCpvStudents,
        } = useStudentData({
                politicalOrg: 'cpv',
        });

        const {
                data: hcyuStudents = [],
                isLoading: isLoadingHcyuStudents,
                refetch: refetchHcyuStudents,
        } = useStudentData({
                politicalOrg: 'hcyu',
        });

        const tablesProps: {
                title: ReactNode;
                data: Student[];
                columns: ColumnDef<Student>[];
        }[] = [
                {
                        columns: baseStudentsColumns,
                        data: studentWithBirthdayInWeek,
                        title: 'Học viên có sinh nhật trong tuần',
                },
                {
                        columns: baseStudentsColumns,
                        data: studentWithBrithdayInMonth,
                        title: 'Học viên có sinh nhật trong tháng',
                },
                {
                        columns: baseStudentsColumns,
                        data: hcyuStudents,
                        title: 'Học viên là đoàn viên',
                },
                {
                        columns: baseStudentsColumns,
                        data: cpvStudents,
                        title: 'Học viên là Đảng viên',
                },
        ];

        return (
                <SidebarInset>
                        <div className="grid grid-cols-2 p-4 gap-4">
                                {tablesProps.map(({ columns, data, title }) => (
                                        <Card key={title?.toString()}>
                                                <CardHeader>
                                                        <CardTitle className="flex items-center gap-2 text-lg">
                                                                <CalendarDays className="h-5 w-5 text-blue-600" />
                                                                {title}
                                                                <Badge
                                                                        variant="secondary"
                                                                        className="ml-auto"
                                                                >
                                                                        {
                                                                                data.length
                                                                        }
                                                                </Badge>
                                                        </CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                        <DataTable
                                                                columns={
                                                                        columns
                                                                }
                                                                data={data}
                                                                toolbarVisible={
                                                                        false
                                                                }
                                                                pagination={
                                                                        data.length >
                                                                        10
                                                                }
                                                        />
                                                </CardContent>
                                        </Card>
                                ))}
                        </div>
                </SidebarInset>
        );
}
