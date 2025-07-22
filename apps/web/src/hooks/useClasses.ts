import { GetClasses } from '@/api';
import { useQuery } from '@tanstack/react-query';

export default function useClassData() {
        return useQuery({
                queryKey: ['classes'],
                queryFn: GetClasses,
        });
}
