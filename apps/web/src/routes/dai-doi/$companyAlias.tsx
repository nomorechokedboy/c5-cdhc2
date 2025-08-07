import { createFileRoute } from '@tanstack/react-router'
import ProtectedRoute from '@/components/ProtectedRoute'
import CompanyClassesTable from '@/components/company-classes-table'
import CompanyStudentTable from '@/components/company-student-table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export const Route = createFileRoute('/dai-doi/$companyAlias')({
    component: RouteComponent
})

function RouteComponent() {
    const { companyAlias } = Route.useParams()

    return (
        <ProtectedRoute>
            <div className='hidden h-full flex-1 flex-col space-y-8 p-8 md:flex'>
                <Tabs defaultValue='classes'>
                    <TabsList>
                        <TabsTrigger value='classes'>Lớp</TabsTrigger>
                        <TabsTrigger value='students'>Học viên</TabsTrigger>
                    </TabsList>

                    <TabsContent value='classes'>
                        <CompanyClassesTable companyAlias={companyAlias} />
                    </TabsContent>

                    <TabsContent value='students'>
                        <CompanyStudentTable
                            alias={companyAlias}
                            level='company'
                        />
                    </TabsContent>
                </Tabs>
            </div>
        </ProtectedRoute>
    )
}
