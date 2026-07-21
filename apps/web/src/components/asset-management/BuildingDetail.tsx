import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowLeft, DoorOpen, Pencil, Plus, Trash2 } from 'lucide-react'
import useIsNganhUser from '@/hooks/useIsNganhUser'
import { isBghOnlyUser } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table'
import { ErrorState } from '@/components/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { useBuilding } from '@/hooks/useBuildings'
import { useFloorMutations } from '@/hooks/useFloors'
import { useRoomMutations } from '@/hooks/useRooms'
import type { Floor, Room } from '@/types/asset'
import FloorDialog from './FloorDialog'
import RoomDialog from './RoomDialog'
import { toast } from 'sonner'
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog'

export default function BuildingDetail({ buildingId }: { buildingId: number }) {
	const nganhUser = useIsNganhUser()
	const readOnly = nganhUser || isBghOnlyUser()
	const { data, isLoading, error, refetch } = useBuilding(buildingId)
	const { remove: removeFloor } = useFloorMutations()
	const { remove: removeRoom } = useRoomMutations()

	const [floorOpen, setFloorOpen] = useState(false)
	const [editingFloor, setEditingFloor] = useState<Floor | null>(null)
	const [roomOpen, setRoomOpen] = useState(false)
	const [roomFloorId, setRoomFloorId] = useState<number | null>(null)
	const [editingRoom, setEditingRoom] = useState<Room | null>(null)
	const [confirm, setConfirm] = useState<{
		title: string
		run: () => Promise<void>
	} | null>(null)

	if (error) {
		return <ErrorState error={error} onRetry={() => refetch()} />
	}

	if (isLoading || !data) {
		return (
			<div className='p-8 space-y-4'>
				<Skeleton className='h-8 w-64' />
				<Skeleton className='h-40 w-full' />
			</div>
		)
	}

	return (
		<div className='space-y-6 p-6 md:p-8'>
			<div className='flex flex-wrap items-center gap-3'>
				<Button variant='ghost' size='sm' asChild>
					<Link to='/vat-tu'>
						<ArrowLeft className='w-4 h-4 mr-1' />
						Danh mục
					</Link>
				</Button>
			</div>

			<div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
				<div>
					<h1 className='text-2xl font-semibold flex items-center gap-2'>
						{data.name}
						<Badge variant='secondary'>{data.code}</Badge>
					</h1>
					<p className='text-sm text-muted-foreground mt-1'>
						{data.address || 'Chưa có địa chỉ'}
						{data.description ? ` · ${data.description}` : ''}
					</p>
				</div>
				{!readOnly && (
					<Button
						onClick={() => {
							setEditingFloor(null)
							setFloorOpen(true)
						}}
					>
						<Plus className='w-4 h-4 mr-2' />
						Thêm tầng
					</Button>
				)}
			</div>

			{(data.floors ?? []).length === 0 ? (
				<Card>
					<CardContent className='py-10 text-center text-muted-foreground'>
						Tòa nhà chưa có tầng.
					</CardContent>
				</Card>
			) : (
				(data.floors ?? []).map((floor) => (
					<Card key={floor.id}>
						<CardHeader className='flex flex-row items-center justify-between space-y-0'>
							<div>
								<CardTitle className='text-lg'>
									{floor.name}
								</CardTitle>
								<CardDescription>
									Tầng số {floor.floorNumber} ·{' '}
									{floor.rooms?.length ?? 0} phòng
								</CardDescription>
							</div>
							{!readOnly && (
								<div className='flex gap-2'>
									<Button
										size='sm'
										onClick={() => {
											setRoomFloorId(floor.id)
											setEditingRoom(null)
											setRoomOpen(true)
										}}
									>
										<Plus className='w-4 h-4 mr-1' />
										Phòng
									</Button>
									<Button
										size='sm'
										variant='outline'
										onClick={() => {
											setEditingFloor(floor)
											setFloorOpen(true)
										}}
									>
										<Pencil className='w-4 h-4' />
									</Button>
									<Button
										size='sm'
										variant='outline'
										className='text-destructive'
										onClick={() =>
											setConfirm({
												title: `Xóa tầng "${floor.name}"?`,
												run: async () => {
													await removeFloor.mutateAsync(
														[floor.id]
													)
													toast.success('Đã xóa tầng')
												}
											})
										}
									>
										<Trash2 className='w-4 h-4' />
									</Button>
								</div>
							)}
						</CardHeader>
						<CardContent>
							{(floor.rooms?.length ?? 0) === 0 ? (
								<p className='text-sm text-muted-foreground'>
									Chưa có phòng.
								</p>
							) : (
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Mã</TableHead>
											<TableHead>Tên</TableHead>
											<TableHead>Loại</TableHead>
											<TableHead className='text-center w-24'>
												Số lượng
											</TableHead>
											<TableHead>QL</TableHead>
											<TableHead>TT</TableHead>
											<TableHead className='text-right'>
												Thao tác
											</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{(floor.rooms ?? []).map((room) => (
											<TableRow key={room.id}>
												<TableCell className='font-mono text-sm'>
													{room.roomCode}
												</TableCell>
												<TableCell>
													{room.roomName}
												</TableCell>
												<TableCell>
													{room.roomType || '—'}
												</TableCell>
												<TableCell className='text-center font-medium tabular-nums'>
													{room.totalQuantity ?? 0}
												</TableCell>
												<TableCell>
													{room.manager || '—'}
												</TableCell>
												<TableCell>
													<Badge variant='outline'>
														{room.status}
													</Badge>
												</TableCell>
												<TableCell className='text-right space-x-1'>
													<Button
														size='sm'
														variant='link'
														asChild
													>
														<Link
															to='/vat-tu/phong/$roomId'
															params={{
																roomId: String(
																	room.id
																)
															}}
														>
															<DoorOpen className='w-3.5 h-3.5 mr-1 inline' />
															Hồ sơ
														</Link>
													</Button>
													{!readOnly && (
														<>
															<Button
																size='sm'
																variant='ghost'
																onClick={() => {
																	setRoomFloorId(
																		floor.id
																	)
																	setEditingRoom(
																		room
																	)
																	setRoomOpen(
																		true
																	)
																}}
															>
																<Pencil className='w-3.5 h-3.5' />
															</Button>
															<Button
																size='sm'
																variant='ghost'
																className='text-destructive'
																onClick={() =>
																	setConfirm({
																		title: `Xóa phòng "${room.roomName}"?`,
																		run: async () => {
																			await removeRoom.mutateAsync(
																				[
																					room.id
																				]
																			)
																			toast.success(
																				'Đã xóa phòng'
																			)
																		}
																	})
																}
															>
																<Trash2 className='w-3.5 h-3.5' />
															</Button>
														</>
													)}
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							)}
						</CardContent>
					</Card>
				))
			)}

			<FloorDialog
				open={floorOpen}
				onOpenChange={setFloorOpen}
				buildingId={buildingId}
				buildingCode={data?.code}
				floor={editingFloor}
			/>
			{roomFloorId !== null && (
				<RoomDialog
					open={roomOpen}
					onOpenChange={setRoomOpen}
					floorId={roomFloorId}
					locationPrefix={(() => {
						const f = data?.floors?.find(
							(x) => x.id === roomFloorId
						)
						if (!f) return data?.code
						return f.code || `${data?.code ?? ''}${f.floorNumber}`
					})()}
					room={editingRoom}
				/>
			)}

			<Dialog
				open={!!confirm}
				onOpenChange={(o) => !o && setConfirm(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Xác nhận xóa</DialogTitle>
					</DialogHeader>
					<p className='text-sm text-muted-foreground'>
						{confirm?.title}
					</p>
					<DialogFooter>
						<Button
							variant='outline'
							onClick={() => setConfirm(null)}
						>
							Hủy
						</Button>
						<Button
							variant='destructive'
							onClick={async () => {
								try {
									await confirm?.run()
								} catch (err) {
									toast.error('Xóa thất bại', {
										description: (err as Error).message
									})
								} finally {
									setConfirm(null)
								}
							}}
						>
							Xóa
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	)
}
