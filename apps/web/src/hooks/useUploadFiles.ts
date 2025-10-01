import { UploadFiles } from '@/api'
import { useMutation } from '@tanstack/react-query'

export default function useUploadFiles() {
	return useMutation({
		onError: (err) => {
			console.error('Failed to upload file: ', err)
		},
		mutationFn: UploadFiles
	})
}
