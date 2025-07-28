import { createFileRoute } from '@tanstack/react-router';
import { DataTable } from '@/components/data-table';
import { columns } from '@/components/student-table/columns';
import { SidebarInset } from '@/components/ui/sidebar';
import StudentForm from '@/components/student-form';
import useDataTableToolbarConfig from '@/hooks/useDataTableToolbarConfig';
import { EduLevelOptions } from '@/components/data-table/data/data';
import { EhtnicOptions } from '@/data/ethnics';
import useClassData from '@/hooks/useClasses';
import useStudentData from '@/hooks/useStudents';
import type { Month } from '@/types';
import dayjs from 'dayjs';
import { useState } from 'react';
import {
        Select,
        SelectContent,
        SelectGroup,
        SelectItem,
        SelectLabel,
        SelectTrigger,
        SelectValue,
} from '@/components/ui/select';
import { set } from 'zod';

export const Route = createFileRoute('/birthday')({
        component: RouteComponent,
});

function RouteComponent() {
        const [month, setMonth] = useState<Month>(
                dayjs().format('MM') as Month
        );
        const {
                data: students = [],
                isLoading: isLoadingStudents,
                refetch: refetchStudent,
        } = useStudentData({ birthdayInMonth: month });
        const { data: classes, refetch } = useClassData();
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

        const militaryRankSet = new Set(
                students.filter((s) => !!s.rank).map((s) => s.rank)
        );
        const militaryRankOptions = Array.from(militaryRankSet).map((rank) => ({
                label: rank,
                value: rank,
        }));
        const classOptions = classes
                ? classes.map((c) => ({
                          label: c.name,
                          value: c.name,
                  }))
                : [];

        const previousUnitSet = new Set(
                students
                        .filter((s) => !!s.previousUnit)
                        .map((s) => s.previousUnit)
        );
        const previousUnitOptions = Array.from(previousUnitSet).map((pu) => ({
                label: pu,
                value: pu,
        }));

        const facetedFilters = [
                createFacetedFilter('class.name', 'Lớp', classOptions),
                createFacetedFilter('rank', 'Cấp bậc', militaryRankOptions),
                createFacetedFilter(
                        'previousUnit',
                        'Đơn vị cũ',
                        previousUnitOptions
                ),
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
                                                <div className="flex gap-2">
                                                        <h2 className="text-2xl font-bold tracking-tight">
                                                                Danh sách học
                                                                viên có sinh
                                                                nhật trong
                                                        </h2>
                                                        <Select
                                                                value={month}
                                                                onValueChange={(
                                                                        value
                                                                ) => {
                                                                        setMonth(
                                                                                value as Month
                                                                        );
                                                                }}
                                                        >
                                                                <SelectTrigger className="w-[180px]">
                                                                        <SelectValue
                                                                                aria-label={
                                                                                        month
                                                                                }
                                                                        >
                                                                                Tháng{' '}
                                                                                {
                                                                                        month
                                                                                }
                                                                        </SelectValue>
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                        <SelectGroup>
                                                                                {[
                                                                                        {
                                                                                                value: '01',
                                                                                                label: 'Tháng 1',
                                                                                        },
                                                                                        {
                                                                                                value: '02',
                                                                                                label: 'Tháng 2',
                                                                                        },
                                                                                        {
                                                                                                value: '03',
                                                                                                label: 'Tháng 3',
                                                                                        },
                                                                                        {
                                                                                                value: '04',
                                                                                                label: 'Tháng 4',
                                                                                        },
                                                                                        {
                                                                                                value: '05',
                                                                                                label: 'Tháng 5',
                                                                                        },
                                                                                        {
                                                                                                value: '06',
                                                                                                label: 'Tháng 6',
                                                                                        },
                                                                                        {
                                                                                                value: '07',
                                                                                                label: 'Tháng 7',
                                                                                        },
                                                                                        {
                                                                                                value: '08',
                                                                                                label: 'Tháng 8',
                                                                                        },
                                                                                        {
                                                                                                value: '09',
                                                                                                label: 'Tháng 9',
                                                                                        },
                                                                                        {
                                                                                                value: '10',
                                                                                                label: 'Tháng 10',
                                                                                        },
                                                                                        {
                                                                                                value: '11',
                                                                                                label: 'Tháng 11',
                                                                                        },
                                                                                        {
                                                                                                value: '12',
                                                                                                label: 'Tháng 12',
                                                                                        },
                                                                                ].map(
                                                                                        ({
                                                                                                label,
                                                                                                value,
                                                                                        }) => (
                                                                                                <SelectItem
                                                                                                        value={
                                                                                                                value
                                                                                                        }
                                                                                                >
                                                                                                        {
                                                                                                                label
                                                                                                        }
                                                                                                </SelectItem>
                                                                                        )
                                                                                )}
                                                                        </SelectGroup>
                                                                </SelectContent>
                                                        </Select>
                                                </div>
                                                <p className="text-muted-foreground">
                                                        Đây là danh sách học
                                                        viên có sinh nhật trong
                                                        tháng {month} của đại
                                                        đội
                                                </p>
                                        </div>
                                </div>
                                <DataTable
                                        data={students}
                                        defaultColumnVisibility={{
                                                enlistmentPeriod: false,
                                                isGraduated: false,
                                                major: false,
                                                phone: false,
                                                position: false,
                                                policyBeneficiaryGroup: false,
                                                politicalOrg: false,
                                                politicalOrgOfficialDate: false,
                                                cpvId: false,
                                                previousPosition: false,
                                                religion: false,
                                                schoolName: false,
                                                shortcoming: false,
                                                talent: false,
                                                fatherName: false,
                                                fatherJob: false,
                                                fatherPhoneNumber: false,
                                                motherName: false,
                                                motherJob: false,
                                                motherPhoneNumber: false,
                                        }}
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
