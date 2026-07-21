/**
 * Nhật ký danh mục ngành — chỉ nhật ký vật tư (thêm/sửa/xóa danh mục).
 * Hiển thị rõ ngày + giờ thao tác.
 */
import { useState } from 'react'
import { Boxes, ClipboardList, Layers, Tags } from 'lucide-react'
import CatalogAuditLogPanel from './CatalogAuditLogPanel'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function AssetActivityLogsPage() {
	const [sub, setSub] = useState('all')

	return (
		<div className='p-4 md:p-6 space-y-4 max-w-[1200px] mx-auto'>
			<div>
				<h1 className='text-xl font-semibold flex items-center gap-2'>
					<ClipboardList className='w-5 h-5' />
					Nhật ký vật tư
				</h1>
				<p className='text-sm text-muted-foreground mt-1'>
					Ghi nhận <strong>thêm</strong> · <strong>sửa tên</strong> ·{' '}
					<strong>xóa</strong> ngành / loại vật / vật tư — kèm{' '}
					<strong>ngày giờ</strong> và người thực hiện.
				</p>
			</div>

			<Tabs value={sub} onValueChange={setSub} className='space-y-4'>
				<TabsList className='h-auto flex flex-wrap gap-1'>
					<TabsTrigger value='all' className='gap-1.5'>
						<ClipboardList className='w-3.5 h-3.5' />
						Tất cả
					</TabsTrigger>
					<TabsTrigger value='nganh' className='gap-1.5'>
						<Layers className='w-3.5 h-3.5' />
						Ngành
					</TabsTrigger>
					<TabsTrigger value='loai-vat' className='gap-1.5'>
						<Tags className='w-3.5 h-3.5' />
						Loại vật
					</TabsTrigger>
					<TabsTrigger value='vat-tu' className='gap-1.5'>
						<Boxes className='w-3.5 h-3.5' />
						Vật tư
					</TabsTrigger>
				</TabsList>

				<TabsContent value='all' className='mt-0'>
					<CatalogAuditLogPanel title='Tất cả thao tác danh mục' />
				</TabsContent>
				<TabsContent value='nganh' className='mt-0'>
					<CatalogAuditLogPanel
						entityType='NGANH'
						title='Nhật ký ngành (thêm / sửa / xóa)'
					/>
				</TabsContent>
				<TabsContent value='loai-vat' className='mt-0'>
					<CatalogAuditLogPanel
						entityType='LOAI_VAT'
						title='Nhật ký loại vật (thêm / sửa / xóa)'
					/>
				</TabsContent>
				<TabsContent value='vat-tu' className='mt-0'>
					<CatalogAuditLogPanel
						entityType='VAT_TU'
						title='Nhật ký vật tư (thêm / sửa / xóa)'
					/>
				</TabsContent>
			</Tabs>
		</div>
	)
}
