import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from '@/components/ui/dialog'
import { useAppForm } from '@/hooks/demo.form'
import useExportButton from '@/hooks/useExportButton'
import useUnitsData from '@/hooks/useUnitsData'
import { useState, type ReactNode } from 'react'

export interface ExportStudentDataDialogProps {
	children: ReactNode
	data: Record<string, string>[]
	defaultFilename: string
	defaultValues?: {
		unitName?: string
		underUnitName?: string
	}
}

export function ExportStudentDataDialog({
	children,
	data,
	defaultFilename,
	defaultValues
}: ExportStudentDataDialogProps) {
	const { onExport } = useExportButton({ filename: defaultFilename })
	const [open, setOpen] = useState(false)
	const form = useAppForm({
		defaultValues: {
			city: 'Thành phố Hồ Chí Minh',
			commanderName: '',
			commanderPosition: 'CHỈ HUY ĐƠN VỊ',
			commanderRank: '',
			data,
			reportTitle: '',
			underUnitName: defaultValues?.underUnitName ?? '',
			unitName: defaultValues?.unitName ?? '',
			filename: defaultFilename
		},
		onSubmit: async ({ value, formApi }) => {
			onExport(value).then(() => {
				formApi.reset()
			})
			setOpen(false)
		}
	})
	const {
		data: units,
		refetch: refetchUnits,
		isLoading: isLoadingUnits
	} = useUnitsData({ level: 'battalion' })
	const unitOptions = units
		?.map((unit) => [unit, ...unit.children])
		.flat()
		.map((unit) => ({
			value: unit.name.toUpperCase(),
			label: unit.name.toUpperCase()
		}))
	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<form
				id='exportFileForm'
				onSubmit={(e) => {
					e.preventDefault()
					e.stopPropagation()
					form.handleSubmit()
				}}
			>
				<DialogTrigger asChild>{children}</DialogTrigger>
				<DialogContent className='container'>
					<DialogHeader>
						<DialogTitle>Xuất dữ liệu</DialogTitle>
						<DialogDescription>
							Hãy điền những thông tin cần thiết để xuất dữ liệu
						</DialogDescription>
					</DialogHeader>
					<div className='grid grid-cols-2 gap-4'>
						<form.AppField
							name='reportTitle'
							validators={{
								onBlur: ({ value }) =>
									!value
										? 'Tiêu đề của file thống kê không được bỏ trống'
										: undefined
							}}
						>
							{(field) => (
								<field.TextField label='Tiêu đề của file thống kê' />
							)}
						</form.AppField>
						<form.AppField
							name='filename'
							validators={{
								onBlur: ({ value }) =>
									!value
										? 'Tên file không được bỏ trống'
										: undefined
							}}
						>
							{(field) => (
								<field.EditableInput label='Tên file' />
							)}
						</form.AppField>
					</div>
					<div className='grid grid-cols-2 gap-4'>
						<form.AppField
							name='unitName'
							validators={{
								onBlur: ({ value }) =>
									!value
										? 'Tên đơn vị không được bỏ trống'
										: undefined
							}}
						>
							{(field) => (
								<field.EditableInput label='Tên đơn vị' />
							)}
						</form.AppField>
						<form.AppField
							name='underUnitName'
							validators={{
								onBlur: ({ value }) =>
									!value
										? 'Tên đơn vị trực thuộc không được bỏ trống'
										: undefined
							}}
						>
							{(field) => (
								<field.EditableInput label='Tên đơn vị trực thuộc' />
							)}
						</form.AppField>
					</div>
					<div className='grid grid-cols-3 gap-4'>
						<form.AppField
							name='commanderPosition'
							validators={{
								onBlur: ({ value }) =>
									!value
										? 'Chức vụ chỉ huy không được bỏ trống'
										: undefined
							}}
						>
							{(field) => (
								<field.EditableInput label='Cấp bậc của chỉ huy' />
							)}
						</form.AppField>
						<form.AppField
							name='commanderName'
							validators={{
								onBlur: ({ value }) =>
									!value
										? 'Tên chỉ huy không được bỏ trống'
										: undefined
							}}
						>
							{(field) => <field.TextField label='Tên chỉ huy' />}
						</form.AppField>
						<form.AppField
							name='commanderRank'
							validators={{
								onBlur: ({ value }) =>
									!value
										? 'Cấp bậc của chỉ huy không được bỏ trống'
										: undefined
							}}
						>
							{(field) => (
								<field.TextField label='Cấp bậc của chỉ huy' />
							)}
						</form.AppField>
					</div>
					<DialogFooter>
						<DialogClose asChild>
							<Button variant='outline'>Hủy</Button>
						</DialogClose>
						<form.Subscribe
							selector={(state) => [
								state.canSubmit,
								state.isSubmitting
							]}
							children={([canSubmit, isSubmitting]) => (
								<Button
									type='submit'
									form='exportFileForm'
									disabled={!canSubmit}
								>
									{isSubmitting
										? 'Đang xuất file...'
										: 'Xác nhận'}
								</Button>
							)}
						/>
					</DialogFooter>
				</DialogContent>
			</form>
		</Dialog>
	)
}
