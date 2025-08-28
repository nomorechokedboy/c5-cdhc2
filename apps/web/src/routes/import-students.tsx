import { ImportStudentsDialog } from '@/components/import-students-dialog'
import ProtectedRoute from '@/components/ProtectedRoute'
import { SidebarInset } from '@/components/ui/sidebar'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/import-students')({
  component: RouteComponent,
})

function RouteComponent() {
    return (
        <ProtectedRoute>
            <SidebarInset>
                <ImportStudentsDialog  isOpen={true} onClose={()=>{} } />
            </SidebarInset>
        </ProtectedRoute>

    )
    
    // <ImportStudentsDialog  isOpen={true} onClose={() => {}} />
}
