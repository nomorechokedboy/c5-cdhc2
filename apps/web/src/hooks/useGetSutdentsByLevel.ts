import { useQuery } from '@tanstack/react-query';
import { GetStudentByLevel } from '@/api';
import type { UnitLevel } from '@/types';

export default function useGetStudentsByLevel(level: UnitLevel) {
  return useQuery({
    queryKey: ['units', level],
    queryFn: () => GetStudentByLevel(level),
  });
}
