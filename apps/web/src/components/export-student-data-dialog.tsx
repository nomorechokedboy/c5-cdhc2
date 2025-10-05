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
import useAuth from '@/hooks/useAuth'
import useExportButton from '@/hooks/useExportButton'
import type { TemplType } from '@/types'
import { useState, type ReactNode } from 'react'

export interface ExportStudentDataDialogProps {
	children: ReactNode
	data: Record<string, string>[]
	defaultFilename: string
	defaultValues?: {
		unitName?: string
		underUnitName?: string
	}
	templType: TemplType
	id?: string
}

export function ExportStudentDataDialog({
	children,
	data,
	defaultFilename,
	defaultValues,
	templType,
	id = 'exportFileForm'
}: ExportStudentDataDialogProps) {
	const { user } = useAuth()
	const { onExport } = useExportButton({ filename: defaultFilename })
	const [open, setOpen] = useState(false)
	const form = useAppForm({
		defaultValues: {
			city: 'Thành phố Hồ Chí Minh',
			commanderName: user?.displayName ?? '',
			commanderPosition: 'CHỈ HUY ĐƠN VỊ',
			commanderRank: '',
			data,
			underUnitName: defaultValues?.underUnitName ?? '',
			unitName: defaultValues?.unitName ?? '',
			filename: defaultFilename,
			templateType: templType
		},
		onSubmit: async ({ value, formApi }) => {
			onExport(value).then(() => {
				formApi.reset()
			})
			setOpen(false)
		}
	})
	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<form
				id={id}
				onSubmit={(e) => {
					e.preventDefault()
					e.stopPropagation()
					form.handleSubmit()
				}}
			>
				<DialogTrigger asChild>{children}</DialogTrigger>
				<DialogContent className='container' key={id}>
					<DialogHeader>
						<DialogTitle>Xuất dữ liệu</DialogTitle>
						<DialogDescription>
							Hãy điền những thông tin cần thiết để xuất dữ liệu
						</DialogDescription>
					</DialogHeader>
					<div className='grid grid-cols-3 gap-4'>
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
								<field.EditableInput
									label='Tên file'
									ellipsisMaxWidth='500px'
								/>
							)}
						</form.AppField>
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
								<field.EditableInput
									label='Tên đơn vị'
									ellipsisMaxWidth='500px'
								/>
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
								<field.EditableInput
									label='Tên đơn vị trực thuộc'
									ellipsisMaxWidth='500px'
								/>
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
								<field.EditableInput
									label='Cấp bậc của chỉ huy'
									ellipsisMaxWidth='500px'
								/>
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
									form={id}
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
