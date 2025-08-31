import { Button } from '@/components/ui/button'
import { useAppForm } from '@/hooks/demo.form'
import { type ReactNode, useState } from 'react'
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
import type { ExportPoliticsQualitySummary } from '@/types'
import useExportPoliticsQualityReport from '@/hooks/useExportPoliticsQualityReport'

export interface ExportPoliticsQualityDialogProps {
	children: ReactNode
	data: {
		data: ExportPoliticsQualitySummary[]
		total: Omit<ExportPoliticsQualitySummary, 'idx' | 'className' | 'note'>
	}
	defaultFilename: string
}

export default function ExportPoliticsQualityDialog({
	children,
	data: { total, data },
	defaultFilename
}: ExportPoliticsQualityDialogProps) {
	const { onExport } = useExportPoliticsQualityReport({
		filename: defaultFilename
	})
	const [open, setOpen] = useState(false)
	const form = useAppForm({
		defaultValues: {
			data,
			total,
			title: '',
			filename: defaultFilename
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
				id='exportFileForm'
				onSubmit={(e) => {
					e.preventDefault()
					e.stopPropagation()
					form.handleSubmit()
				}}
			>
				<DialogTrigger asChild>{children}</DialogTrigger>
				<DialogContent className='sm:max-w-[425px]'>
					<DialogHeader>
						<DialogTitle>Xuất dữ liệu</DialogTitle>
						<DialogDescription>
							Hãy điền những thông tin cần thiết để xuất dữ liệu
						</DialogDescription>
					</DialogHeader>
					<div className='grid gap-4'>
						<form.AppField
							name='title'
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
							{(field) => <field.TextField label='Tên file' />}
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
