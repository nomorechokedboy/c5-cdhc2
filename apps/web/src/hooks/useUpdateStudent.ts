import { UpdateStudents } from '@/api';
import type { UpdateStudentsBody } from '@/types';
import { useMutation, type UseMutationOptions } from '@tanstack/react-query';

export default function useUpdateStudent(
        options?: Omit<
                UseMutationOptions<unknown, Error, UpdateStudentsBody, unknown>,
                'mutationFn'
        >
) {
        return useMutation({ ...options, mutationFn: UpdateStudents });
}
