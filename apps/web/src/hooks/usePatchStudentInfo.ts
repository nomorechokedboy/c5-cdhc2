import type { Student } from '@/types';
import type { Column, Row } from '@tanstack/react-table';
import { toast } from 'sonner';
import useStudentData from './useStudents';
import useUpdateStudent from './useUpdateStudent';

export default function usePatchStudentInfo(
        _student: Student
) {
        const { refetch } = useStudentData();
        const handleSuccess = () => {
                refetch();
        };
        const { mutateAsync, isPending } = useUpdateStudent({
                onSuccess: handleSuccess,
        });
        const handlePatchStudentInfo = async (_student: Student) => {
                try {
                        await mutateAsync({
                                data: [
                                        _student
                                ],
                        });
                        toast.success('Cập nhật thông tin học viên thành công');
                } catch (err) {
                        console.error(err);
                        toast.error('Cập nhật thông tin học viên thất bại!');
                }
        };

        return { handlePatchStudentInfo, isPending };
}
