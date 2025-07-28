import type { Student } from '@/types';
import type { Column, Row } from '@tanstack/react-table';
import { toast } from 'sonner';
import useStudentData from './useStudents';
import useUpdateStudent from './useUpdateStudent';

export default function usePatchStudent(
        row: Row<Student>,
        column: Column<Student>
) {
        const { refetch } = useStudentData();
        const handleSuccess = () => {
                refetch();
        };
        const { mutateAsync, isPending } = useUpdateStudent({
                onSuccess: handleSuccess,
        });
        const handlePatchStudentData = async (value: string) => {
                try {
                        await mutateAsync({
                                data: [
                                        {
                                                id: row.original.id,
                                                [column.id]: value,
                                        },
                                ],
                        });
                        toast.success('Cập nhật thông tin học viên thành công');
                } catch (err) {
                        console.error(err);
                        toast.error('Cập nhật thông tin học viên thất bại!');
                }
        };

        return { handlePatchStudentData, isPending };
}
