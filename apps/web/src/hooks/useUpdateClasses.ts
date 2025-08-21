import { useMutation } from '@tanstack/react-query'
import { UpdateClasses } from '@/api'
import type { Class } from '@/types'

export function useUpdateClasses() {
  return useMutation({
    mutationFn: (data: Class[]) => UpdateClasses(data)
  })
}