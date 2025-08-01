import { createFileRoute } from '@tanstack/react-router'
import { DataTable } from '@/components/data-table'
import { columns } from '@/components/student-table/columns'
import { SidebarInset } from '@/components/ui/sidebar'
import StudentForm from '@/components/student-form'
import useDataTableToolbarConfig from '@/hooks/useDataTableToolbarConfig'
import { EduLevelOptions } from '@/components/data-table/data/data'
import { EhtnicOptions } from '@/data/ethnics'
import useClassData from '@/hooks/useClasses'
import useStudentData from '@/hooks/useStudents'
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger
} from '@/components/ui/accordion'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge, badgeVariants } from '@/components/ui/badge'

export const Route = createFileRoute('/hcyu')({
	component: RouteComponent
})

function RouteComponent() {
	const {
		data: students = [],
		isLoading: isLoadingStudents,
		refetch: refetchStudent
	} = useStudentData({ politicalOrg: 'hcyu' })
	const { data: classes, refetch } = useClassData()
	const { createFacetedFilter, createSearchConfig } =
		useDataTableToolbarConfig()

	if (isLoadingStudents) {
		return <div>Loading...</div>
	}

	const handleFormSuccess = () => {
		refetchStudent()
	}
	const searchConfig = [createSearchConfig('fullName', 'Tìm kiếm theo tên...')]

	const militaryRankSet = new Set(
		students.filter((s) => !!s.rank).map((s) => s.rank)
	)
	const militaryRankOptions = Array.from(militaryRankSet).map((rank) => ({
		label: rank,
		value: rank
	}))
	const classOptions = classes
		? classes.map((c) => ({
				label: c.name,
				value: c.name
			}))
		: []

	const previousUnitSet = new Set(
		students.filter((s) => !!s.previousUnit).map((s) => s.previousUnit)
	)
	const previousUnitOptions = Array.from(previousUnitSet).map((pu) => ({
		label: pu,
		value: pu
	}))

	const facetedFilters = [
		// createFacetedFilter('class.name', 'Lớp', classOptions),
		createFacetedFilter('rank', 'Cấp bậc', militaryRankOptions),
		createFacetedFilter('previousUnit', 'Đơn vị cũ', previousUnitOptions),
		createFacetedFilter('ethnic', 'Dân tộc', EhtnicOptions),
		createFacetedFilter('educationLevel', 'Trình độ học vấn', EduLevelOptions)
	]
	const defaultColumnVisibility = {
		dob: false,
		enlistmentPeriod: false,
		isGraduated: false,
		major: false,
		phone: false,
		position: false,
		policyBeneficiaryGroup: false,
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
		motherPhoneNumber: false
	}

	const studentK1Class = students.filter(
		(student) => student.class.name === 'K1'
	)
	const studentKCL1Class = students.filter(
		(student) => student.class.name === 'KCL1'
	)
	const studentNVQYCk42Class = students.filter(
		(student) => student.class.name === 'NVQYCk42'
	)
	return (
		<SidebarInset>
			<div className='hidden h-full flex-1 flex-col space-y-8 p-8 md:flex'>
				<div className='flex items-center justify-between space-y-2'>
					<div>
						<h2 className='text-2xl font-bold tracking-tight'>
							Danh sách học viên là Đoàn viên
						</h2>
						<p className='text-muted-foreground'>
							Đây là danh sách học viên là Đoàn viên của đại đội
						</p>
					</div>
				</div>
				{/* <DataTable
                                        data={students}
                                        defaultColumnVisibility={{
                                                dob: false,
                                                enlistmentPeriod: false,
                                                isGraduated: false,
                                                major: false,
                                                phone: false,
                                                position: false,
                                                policyBeneficiaryGroup: false,
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
                                /> */}
				<Accordion
					type='multiple'
					className='w-full'
					defaultValue={['d2']}
				>
					

					<AccordionItem value='d1'>
						<AccordionTrigger>
							<Badge variant='default'>Đại đội 4</Badge>
						</AccordionTrigger>
						<AccordionContent>
							<DataTable
								data={students}
								defaultColumnVisibility={{
									dob: false,
									enlistmentPeriod: false,
									isGraduated: false,
									major: false,
									phone: false,
									position: false,
									policyBeneficiaryGroup: false,
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
									motherPhoneNumber: false
								}}
								columns={columns}
								toolbarProps={{
									rightSection: <StudentForm onSuccess={handleFormSuccess} />,
									searchConfig,
									facetedFilters
								}}
							/>
						</AccordionContent>
					</AccordionItem>
                                        <AccordionItem value='d2'>
						<AccordionTrigger>
							<Badge variant='default'>Đại đội 5</Badge>
						</AccordionTrigger>
						<AccordionContent>
							<Tabs defaultValue='account' className='w-full'>
								<TabsList>
									<TabsTrigger value='k1'>Lớp K1</TabsTrigger>
									<TabsTrigger value='kcl1'>Lớp KCL1</TabsTrigger>
									<TabsTrigger value='nvqyck42'>Lớp NVQYCk42</TabsTrigger>
								</TabsList>
								<TabsContent value='k1'>
									<DataTable
										data={studentK1Class}
										defaultColumnVisibility={defaultColumnVisibility}
										columns={columns}
										toolbarProps={{
											rightSection: (
												<StudentForm onSuccess={handleFormSuccess} />
											),
											searchConfig,
											facetedFilters
										}}
									/>
								</TabsContent>
								<TabsContent value='kcl1'>
									<DataTable
										data={studentKCL1Class}
										defaultColumnVisibility={defaultColumnVisibility}
										columns={columns}
										toolbarProps={{
											rightSection: (
												<StudentForm onSuccess={handleFormSuccess} />
											),
											searchConfig,
											facetedFilters
										}}
									/>
								</TabsContent>
								<TabsContent value='ncqyck42'>
									<DataTable
										data={studentNVQYCk42Class}
										defaultColumnVisibility={defaultColumnVisibility}
										columns={columns}
										toolbarProps={{
											rightSection: (
												<StudentForm onSuccess={handleFormSuccess} />
											),
											searchConfig,
											facetedFilters
										}}
									/>
								</TabsContent>
							</Tabs>
						</AccordionContent>
					</AccordionItem>
				</Accordion>
			</div>
		</SidebarInset>
	)
}
