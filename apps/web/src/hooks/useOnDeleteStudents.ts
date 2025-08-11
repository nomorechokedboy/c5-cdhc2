import useDeleteStudents from './useDeleteStudents'

export default function useOnDeleteStudents(refetchStudents: any) {
	const {
		mutateAsync: deleteStudentMutate
		/* isPending: isDeletingStudents,
        error: deleteStudentsErr,
        isError */
	} = useDeleteStudents()

	async function onDeleteRows(ids: Array<number>) {
		return deleteStudentMutate({ ids }).then(() => refetchStudents())
	}

	return onDeleteRows
}
