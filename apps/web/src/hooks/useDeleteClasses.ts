import { useMutation } from '@tanstack/react-query'
import { DeleteClasses } from '@/api'

export function useDeleteClasses() {
  return useMutation({
    mutationFn: (ids: number[]) => DeleteClasses(ids)
  })
}