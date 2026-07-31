import { SidebarFooter, useSidebar } from '@/components/ui/sidebar'
import * as React from 'react'
import { filterStudentUnitTree } from '@/lib/student-units'
import {
	UserPlus,
	Calendar,
	ChevronDown,
	PieChart,
	Star,
	HeartHandshake,
	Church,
	UserCheck,
	Building2,
	UsersRound,
	Building,
	Home,
	Proportions,
	List,
	HouseHeart,
	UserRoundCog,
	ShieldUser,
	Warehouse,
	Package,
	Wrench,
	RefreshCw,
	DoorOpen,
	ArrowLeftRight,
	Layers,
	BookUser,
	Boxes,
	Tags,
	FileText,
	ClipboardList,
	Gavel,
	FileSearch,
	FileType,
	BookOpenCheck,
	FileStack,
	Shuffle,
	ClipboardCheck,
	GraduationCap
} from 'lucide-react'
import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
	SidebarRail
} from '@/components/ui/sidebar'
import { Link } from '@tanstack/react-router'
import StudentForm from '@/components/student-form'
import usePendingRoomAccounts from '@/hooks/usePendingRoomAccounts'
import usePendingProposals from '@/hooks/usePendingProposals'
import usePendingPermissions from '@/hooks/usePendingPermissions'
import { Badge } from '@/components/ui/badge'
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger
} from '@/components/ui/collapsible'
import useUnitsData from '@/hooks/useUnitsData'
import Cdhc2Logo from '@/assets/cdhc2.png'
import { AppSidebarSkeleton } from './app-sidebar-skeleton'
import { ThemeToggle } from './theme-toggle'
import useAuth from '@/hooks/useAuth'
import type { GetUnitQuery } from '@/types'
import {
	isBghOnlyUser,
	isDonViUser,
	isRoomTeacherUser,
	isSuperAdmin
} from '@/lib/utils'
import useIsNganhUser from '@/hooks/useIsNganhUser'
import { useQuery } from '@tanstack/react-query'
import { GetPendingExamCount } from '@/api/exam'
import { GetLeaveMyAccess } from '@/api/leave'
import {
	examNavAllowed,
	isExamOffice,
	isExamBgh,
	isPureExamLecturer
} from '@/lib/exam-roles'
// Updated data structure to support unlimited nesting and icons
const data = {
	versions: ['1.0.1', '1.1.0-alpha', '2.0.0-beta1'],
	navMain: [
		{
			title: 'Chung',
			url: '#',
			superAdminOnly: false,
			items: [
				{ title: 'Trang chủ', url: '/', icon: Home },
				{
					title: 'Phòng dạy của tôi',
					url: '/phong-day',
					icon: DoorOpen
				},
				{
					title: 'Chất lượng chính trị',
					url: '/thong-ke-chinh-tri',
					icon: Proportions
				}
			]
		},
		{
			title: 'Thống kê học viên',
			url: '#',
			superAdminOnly: false,
			icon: PieChart,
			items: [
				{
					title: 'Đảng viên',
					url: '/cpv',
					icon: UserCheck
				},
				{
					title: 'Đoàn viên',
					url: '/hcyu',
					icon: UserPlus
				},
				{
					title: 'Dân tộc thiểu số',
					url: '/ethnic-minority',
					icon: Star
				},
				{
					title: 'Tôn giáo',
					url: '/religion',
					icon: Church
				},
				{
					title: 'Hoàn cảnh khó khăn',
					url: '/hoan-canh-kho-khan',
					icon: HouseHeart
				}
			]
		},
		{
			title: 'Sự kiện học viên',
			url: '#',
			superAdminOnly: false,
			icon: Calendar,
			items: [
				{
					title: 'Sinh nhật đồng đội',
					url: '/birthday',
					icon: Calendar
				},
				{
					title: '☭ Chuyển Đảng chính thức ',
					url: '/chuyen-dang-chinh-thuc'
					// icon: HeartHandshake
				}
			]
		},
		// Chức năng khác -> import học viên
		{
			title: 'Chức năng khác',
			url: '#',
			superAdminOnly: false,
			icon: Star,
			items: [
				{
					title: 'Import học viên',
					url: '/import-students',
					icon: UserPlus
				}
			]
		},
		{
			title: 'Quản lý phép',
			url: '#',
			superAdminOnly: false,
			icon: Calendar,
			items: [
				{
					title: 'Đề xuất nghỉ phép',
					url: '/quan-ly-phep/de-xuat',
					icon: FileText
				},
				{
					title: 'Duyệt đề xuất phép',
					url: '/quan-ly-phep/duyet',
					icon: ClipboardCheck
				},
				{
					title: 'Danh sách phép',
					url: '/quan-ly-phep/danh-sach',
					icon: List
				},
				{
					title: 'Danh sách quân nhân',
					url: '/quan-ly-phep/quan-nhan',
					icon: UsersRound
				},
				{
					title: 'Danh mục đơn vị',
					url: '/quan-ly-phep/don-vi',
					icon: Building
				},
				{
					title: 'Danh mục chức vụ',
					url: '/quan-ly-phep/chuc-vu',
					icon: UserRoundCog
				},
				{
					title: 'Danh mục địa phương',
					url: '/quan-ly-phep/dia-phuong',
					icon: Building2
				},
				{
					title: 'Quy định phép',
					url: '/quan-ly-phep/quy-dinh',
					icon: FileText
				},
				{
					title: 'Lưu trữ nghỉ phép',
					url: '/quan-ly-phep/luu-tru',
					icon: FileStack
				},
				{
					title: 'Quản lý đợt nghỉ phép',
					url: '/quan-ly-phep/dot-nghi',
					icon: Calendar
				},
				{
					title: 'Báo cáo nghỉ phép',
					url: '/quan-ly-phep/bao-cao',
					icon: PieChart
				}
			]
		},
		{
			title: 'Quản lý vật tư',
			url: '#',
			superAdminOnly: false,
			icon: Warehouse,
			items: [
				{
					title: 'Danh mục tòa nhà',
					url: '/vat-tu',
					icon: Building2,
					items: [
						{
							title: 'Tòa nhà',
							url: '/vat-tu',
							search: { view: 'toa' },
							icon: Building2
						},
						{
							title: 'Tài khoản',
							url: '/vat-tu',
							search: { view: 'tai-khoan' },
							icon: BookUser
						},
						{
							title: 'Phòng',
							url: '/vat-tu',
							search: { view: 'phong' },
							icon: DoorOpen
						},
						{
							title: 'Đơn vị sử dụng',
							url: '/vat-tu',
							search: { view: 'don-vi' },
							icon: UsersRound
						}
					]
				},
				{
					title: 'Danh mục ngành',
					url: '/vat-tu/danh-muc-nganh',
					icon: Layers,
					items: [
						{
							title: 'Ngành',
							url: '/vat-tu/danh-muc-nganh',
							search: { view: 'nganh' },
							icon: Layers
						},
						{
							title: 'Loại vật',
							url: '/vat-tu/danh-muc-nganh',
							search: { view: 'loai-vat' },
							icon: Tags
						},
						{
							title: 'Vật tư',
							url: '/vat-tu/danh-muc-nganh',
							search: { view: 'vat-tu' },
							icon: Boxes
						},
						{
							title: 'Nhật ký',
							url: '/vat-tu/nhat-ky',
							icon: ClipboardList
						}
					]
				},
				{
					title: 'Cập nhật vật tư',
					url: '/vat-tu/cap-nhat',
					icon: RefreshCw
				},
				{
					title: 'Đề xuất',
					url: '/vat-tu/de-xuat',
					icon: FileText,
					/** Badge +n pending — set runtime */
					badgeCount: 0
				},
				{
					title: 'Thanh lý',
					url: '/vat-tu/thanh-ly',
					icon: Gavel
				},
				{
					title: 'Phân công sửa chữa',
					url: '/vat-tu/phan-cong',
					icon: Wrench
				},
				{
					title: 'Điều động & thu hồi',
					url: '/vat-tu/dieu-dong',
					icon: ArrowLeftRight
				},
				{
					title: 'Kho vật tư',
					url: '/vat-tu/kho',
					icon: Warehouse
				},
				{
					title: 'Tìm kiếm',
					url: '/vat-tu/tim-kiem',
					icon: FileSearch
				},
				{
					title: 'Báo cáo vật tư',
					url: '/vat-tu/bao-cao',
					icon: Package
				},
				{
					title: 'Mẫu báo cáo Word',
					url: '/vat-tu/mau-bao-cao',
					icon: FileType
				}
			]
		},
		{
			title: 'Đề thi tự luận',
			url: '#',
			superAdminOnly: false,
			icon: BookOpenCheck,
			/** filter theo examNavAllowed khi render */
			items: [
				{
					title: 'Tổng quan',
					url: '/de-thi',
					icon: BookOpenCheck,
					examKey: 'overview' as const
				},
				{
					title: 'Danh mục đào tạo',
					url: '/de-thi/danh-muc',
					icon: Layers,
					examKey: 'catalog' as const
				},
				{
					title: 'Danh mục lớp',
					url: '/de-thi/lop',
					icon: GraduationCap,
					examKey: 'classes' as const
				},
				{
					title: 'Danh mục giáo viên',
					url: '/de-thi/giao-vien',
					icon: UsersRound,
					examKey: 'teachers' as const
				},
				{
					title: 'Phân công môn học',
					url: '/de-thi/phan-cong',
					icon: ClipboardCheck,
					examKey: 'assign' as const
				},
				{
					title: 'Đề của tôi (GV/CNK soạn)',
					url: '/de-thi/cua-toi',
					icon: FileText,
					examKey: 'mine' as const
				},
				{
					title: 'Duyệt đề',
					url: '/de-thi/duyet',
					icon: ClipboardCheck,
					badgeCount: 0,
					examKey: 'approve' as const
				},
				{
					title: 'Ngân hàng đề',
					url: '/de-thi/ngan-hang',
					icon: FileStack,
					examKey: 'bank' as const
				},
				{
					title: 'Rút đề (Ban KT)',
					url: '/de-thi/rut-de',
					icon: Shuffle,
					examKey: 'draw' as const
				}
			]
		},
		{
			title: 'Quản lý người dùng',
			url: '#',
			superAdminOnly: true,
			icon: Calendar,
			items: [
				{
					title: 'Danh sách người dùng',
					url: '/list-user',
					icon: List,
					/** Badge +n — set runtime trong AppSidebar */
					badgeCount: 0
				},
				{
					title: 'Danh sách vai trò',
					url: '/vai-tro',
					icon: UserRoundCog
				}
			]
		}
	]
}

// Type definition for navigation items
interface NavItem {
	title: string
	url: string
	isActive?: boolean
	superAdminOnly?: boolean
	items?: NavItem[]
	search?: { [k: string]: string }
	icon?: React.ElementType
	/** Hiện badge +n (vd. tài khoản phòng chờ phân quyền) */
	badgeCount?: number
	/** Lọc menu đề thi theo quyền đặc tả */
	examKey?:
		| 'overview'
		| 'catalog'
		| 'classes'
		| 'teachers'
		| 'assign'
		| 'mine'
		| 'approve'
		| 'bank'
		| 'draw'
}

// Recursive component to render nested menu items
function NavMenuItems({
	items,
	level = 0
}: {
	items: NavItem[]
	level?: number
}) {
	if (level === 0) {
		// Top level items
		return (
			<SidebarMenu>
				{items.map((item) => (
					<NavMenuItem key={item.title} item={item} level={level} />
				))}
			</SidebarMenu>
		)
	} else {
		// Nested items use SidebarMenuSub
		return (
			<SidebarMenuSub>
				{items.map((item) => (
					<NavMenuItem key={item.title} item={item} level={level} />
				))}
			</SidebarMenuSub>
		)
	}
}

// Individual menu item component
function NavMenuItem({ item, level }: { item: NavItem; level: number }) {
	const { state } = useSidebar()
	const isCollapsed = state === 'collapsed'

	const hasChildren = item.items && item.items.length > 0
	const Icon = item.icon

	if (level === 0) {
		// Top level menu item
		if (hasChildren) {
			return (
				<SidebarMenuItem>
					<Collapsible
						className='group/collapsible'
						defaultOpen={false}
					>
						<CollapsibleTrigger asChild>
							<SidebarMenuButton className='flex items-center gap-3 rounded-xl px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-200 focus:bg-blue-100 cursor-pointer'>
								{Icon && <Icon className='w-5 h-5' />}
								{!isCollapsed && <span>{item.title}</span>}
								{!isCollapsed && (
									<ChevronDown className='ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180' />
								)}
							</SidebarMenuButton>
						</CollapsibleTrigger>
						{!isCollapsed && (
							<CollapsibleContent>
								<NavMenuItems
									items={item.items!}
									level={level + 1}
								/>
							</CollapsibleContent>
						)}
					</Collapsible>
				</SidebarMenuItem>
			)
		} else {
			return (
				<SidebarMenuItem>
					<SidebarMenuButton
						asChild
						isActive={item.isActive}
						className='flex items-center gap-3 rounded-xl px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-200 focus:bg-blue-100 cursor-pointer'
					>
						<Link
							to={item.url}
							className='flex items-center gap-3 w-full'
						>
							{Icon && <Icon className='w-5 h-5' />}
							{!isCollapsed && <span>{item.title}</span>}
						</Link>
					</SidebarMenuButton>
				</SidebarMenuItem>
			)
		}
	}

	return (
		<SidebarMenuSubItem>
			{hasChildren ? (
				<Collapsible className='group/collapsible'>
					<CollapsibleTrigger asChild>
						<SidebarMenuSubButton className='flex items-center gap-3 rounded-xl px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-200 focus:bg-blue-100 cursor-pointer'>
							{Icon && <Icon className='w-5 h-5  ' />}
							{!isCollapsed && <span>{item.title}</span>}
							{!isCollapsed && (
								<ChevronDown className='ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180' />
							)}
						</SidebarMenuSubButton>
					</CollapsibleTrigger>
					{!isCollapsed && (
						<CollapsibleContent>
							<NavMenuItems
								items={item.items!}
								level={level + 1}
							/>
						</CollapsibleContent>
					)}
				</Collapsible>
			) : (
				<SidebarMenuSubButton
					asChild
					isActive={item.isActive}
					className='flex items-center gap-3 rounded-xl px-4 py-2 font-medium text-gray-700 transition-colors  hover:bg-gray-200  focus:bg-blue-100 '
				>
					<Link
						to={item.url}
						search={item.search}
						className='flex items-center gap-3 w-full'
					>
						{Icon && <Icon className='w-5 h-5  ' />}
						{!isCollapsed && (
							<span className='flex-1'>{item.title}</span>
						)}
						{!isCollapsed &&
							item.badgeCount != null &&
							item.badgeCount > 0 && (
								<Badge
									className={
										item.url === '/list-user'
											? 'ml-auto bg-red-600 hover:bg-red-600 text-white text-xs font-bold px-1.5 min-w-[1.5rem] justify-center'
											: 'ml-auto bg-amber-500 hover:bg-amber-500 text-white text-xs font-bold px-1.5 min-w-[1.5rem] justify-center'
									}
								>
									+{item.badgeCount}
								</Badge>
							)}
					</Link>
				</SidebarMenuSubButton>
			)}
		</SidebarMenuSubItem>
	)
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	const { state } = useSidebar()
	const isCollapsed = state === 'collapsed'
	const { user } = useAuth()
	const { data: leaveAccess } = useQuery({
		queryKey: ['leave-my-access'],
		queryFn: GetLeaveMyAccess,
		enabled: Boolean(user),
		retry: false
	})

	const getUnitsQuery: GetUnitQuery | undefined =
		user?.isSuperUser === true
			? {
					level: 'battalion'
				}
			: undefined
	const { data: units, isLoading: isLoadingUnits } =
		useUnitsData(getUnitsQuery)
	const pendingRoomAccounts = usePendingRoomAccounts()
	const pendingPerm = usePendingPermissions()
	/** Ưu tiên user chờ cấp quyền; fallback tài khoản phòng */
	const pendingCount =
		pendingPerm.data?.count ?? pendingRoomAccounts.data?.count ?? 0
	const pendingProposals = usePendingProposals()
	const proposalCount = pendingProposals.data ?? 0
	const pendingExams = useQuery({
		queryKey: ['exam-pending-count'],
		queryFn: GetPendingExamCount,
		refetchInterval: 60_000,
		retry: false
	})
	const examPendingCount = pendingExams.data ?? 0
	const roomTeacher = isRoomTeacherUser()
	const nganhUser = useIsNganhUser()
	const donViUser = isDonViUser()
	/** BGH thuần: không super — menu xem + đề xuất */
	const bghOnly = isBghOnlyUser()

	if (isLoadingUnits) {
		return <AppSidebarSkeleton />
	}

	/** Chỉ TD1 (D1–D3) + TD2 (D4–D5) — xem student-units.ts */
	const studentUnits = filterStudentUnitTree(units ?? [])
	const unitsNavbar = studentUnits.map((unit) => {
		return {
			title: unit.name,
			url: '#',
			items: [
				{
					title: `Học viên ${unit.name}`,
					url: `/${unit.level === 'battalion' ? 'tieu-doan/' : 'dai-doi/'}${unit.alias}`,
					search: { name: unit.name, level: unit.level },
					icon: UsersRound
				},
				...(unit.children || []).map((child) => ({
					title: child.name,
					url: `/dai-doi/${child.alias}`,
					icon: Building2
				}))
			],
			icon: Building
		} as NavItem
	})

	// User phòng dạy: chỉ Trang chủ + Phòng dạy của tôi
	const roomTeacherNav: typeof data.navMain = [
		{
			title: 'Chung',
			url: '#',
			superAdminOnly: false,
			items: [
				{ title: 'Trang chủ', url: '/', icon: Home },
				{
					title: 'Phòng dạy của tôi',
					url: '/phong-day',
					icon: DoorOpen
				}
			]
		}
	]

	/**
	 * GV soạn đề thuần (exam_lecturer, vd. gv.cntt):
	 * Không quản lý vật tư / học viên — chỉ đề thi của mình.
	 */
	const examLecturerNav: typeof data.navMain = [
		{
			title: 'Chung',
			url: '#',
			superAdminOnly: false,
			items: [{ title: 'Trang chủ', url: '/', icon: Home }]
		},
		{
			title: 'Đề thi tự luận',
			url: '#',
			superAdminOnly: false,
			icon: BookOpenCheck,
			items: [
				{
					title: 'Tổng quan',
					url: '/de-thi',
					icon: BookOpenCheck,
					examKey: 'overview' as const
				},
				{
					title: 'Đề của tôi',
					url: '/de-thi/cua-toi',
					icon: FileText,
					examKey: 'mine' as const
				}
			]
		}
	]

	// Ban Giám Hiệu (role admin, không super): chỉ xem + đề xuất phê duyệt
	const bghUserNav: typeof data.navMain = [
		{
			title: 'Chung',
			url: '#',
			superAdminOnly: false,
			items: [{ title: 'Trang chủ', url: '/', icon: Home }]
		},
		{
			title: 'Quản lý vật tư',
			url: '#',
			superAdminOnly: false,
			icon: Warehouse,
			items: [
				{
					title: 'Danh mục tòa nhà',
					url: '/vat-tu',
					icon: Building2,
					items: [
						{
							title: 'Tòa nhà',
							url: '/vat-tu',
							search: { view: 'toa' },
							icon: Building2
						},
						{
							title: 'Phòng',
							url: '/vat-tu',
							search: { view: 'phong' },
							icon: DoorOpen
						}
					]
				},
				{
					title: 'Danh mục ngành',
					url: '/vat-tu/danh-muc-nganh',
					icon: Layers,
					items: [
						{
							title: 'Ngành',
							url: '/vat-tu/danh-muc-nganh',
							search: { view: 'nganh' },
							icon: Layers
						},
						{
							title: 'Loại vật',
							url: '/vat-tu/danh-muc-nganh',
							search: { view: 'loai-vat' },
							icon: Tags
						},
						{
							title: 'Vật tư',
							url: '/vat-tu/danh-muc-nganh',
							search: { view: 'vat-tu' },
							icon: Boxes
						}
					]
				},
				{
					title: 'Đề xuất',
					url: '/vat-tu/de-xuat',
					icon: FileText,
					badgeCount: 0
				},
				{
					title: 'Báo cáo vật tư',
					url: '/vat-tu/bao-cao',
					icon: Package
				}
			]
		},
		{
			title: 'Đề thi tự luận',
			url: '#',
			superAdminOnly: false,
			icon: BookOpenCheck,
			items: [
				{
					title: 'Tổng quan',
					url: '/de-thi',
					icon: BookOpenCheck,
					examKey: 'overview' as const
				},
				{
					title: 'Danh mục giáo viên',
					url: '/de-thi/giao-vien',
					icon: UsersRound,
					examKey: 'teachers' as const
				},
				{
					title: 'Phân công môn học',
					url: '/de-thi/phan-cong',
					icon: ClipboardCheck,
					examKey: 'assign' as const
				},
				{
					title: 'Duyệt đề (BGH — cấp cuối)',
					url: '/de-thi/duyet',
					icon: ClipboardCheck,
					badgeCount: 0,
					examKey: 'approve' as const
				},
				{
					title: 'Ngân hàng đề',
					url: '/de-thi/ngan-hang',
					icon: FileStack,
					examKey: 'bank' as const
				}
			]
		}
	]

	// User đơn vị sử dụng: tòa (xem) + danh mục ngành (xem) + đề xuất
	const donViUserNav: typeof data.navMain = [
		{
			title: 'Chung',
			url: '#',
			superAdminOnly: false,
			items: [{ title: 'Trang chủ', url: '/', icon: Home }]
		},
		{
			title: 'Quản lý vật tư',
			url: '#',
			superAdminOnly: false,
			icon: Warehouse,
			items: [
				{
					title: 'Danh mục tòa nhà',
					url: '/vat-tu',
					icon: Building2,
					items: [
						{
							title: 'Tòa nhà',
							url: '/vat-tu',
							search: { view: 'toa' },
							icon: Building2
						},
						{
							title: 'Phòng',
							url: '/vat-tu',
							search: { view: 'phong' },
							icon: DoorOpen
						}
					]
				},
				{
					title: 'Danh mục ngành',
					url: '/vat-tu/danh-muc-nganh',
					icon: Layers,
					items: [
						{
							title: 'Ngành',
							url: '/vat-tu/danh-muc-nganh',
							search: { view: 'nganh' },
							icon: Layers
						},
						{
							title: 'Loại vật',
							url: '/vat-tu/danh-muc-nganh',
							search: { view: 'loai-vat' },
							icon: Tags
						},
						{
							title: 'Vật tư',
							url: '/vat-tu/danh-muc-nganh',
							search: { view: 'vat-tu' },
							icon: Boxes
						}
					]
				},
				{
					title: 'Đề xuất',
					url: '/vat-tu/de-xuat',
					icon: FileText
				}
			]
		}
	]

	// User ngành: Danh mục tòa (tòa/phòng/đv — không TK) + danh mục ngành + cập nhật + đề xuất
	// (không nhật ký, tài khoản, thanh lý admin, phân công, điều động, báo cáo…)
	const nganhUserNav: typeof data.navMain = [
		{
			title: 'Chung',
			url: '#',
			superAdminOnly: false,
			items: [{ title: 'Trang chủ', url: '/', icon: Home }]
		},
		{
			title: 'Quản lý vật tư',
			url: '#',
			superAdminOnly: false,
			icon: Warehouse,
			items: [
				{
					title: 'Danh mục tòa nhà',
					url: '/vat-tu',
					icon: Building2,
					items: [
						{
							title: 'Tòa nhà',
							url: '/vat-tu',
							search: { view: 'toa' },
							icon: Building2
						},
						{
							title: 'Phòng',
							url: '/vat-tu',
							search: { view: 'phong' },
							icon: DoorOpen
						},
						{
							title: 'Đơn vị sử dụng',
							url: '/vat-tu',
							search: { view: 'don-vi' },
							icon: UsersRound
						}
					]
				},
				{
					title: 'Danh mục ngành',
					url: '/vat-tu/danh-muc-nganh',
					icon: Layers,
					items: [
						{
							title: 'Ngành',
							url: '/vat-tu/danh-muc-nganh',
							search: { view: 'nganh' },
							icon: Layers
						},
						{
							title: 'Loại vật',
							url: '/vat-tu/danh-muc-nganh',
							search: { view: 'loai-vat' },
							icon: Tags
						},
						{
							title: 'Vật tư',
							url: '/vat-tu/danh-muc-nganh',
							search: { view: 'vat-tu' },
							icon: Boxes
						}
					]
				},
				{
					title: 'Cập nhật vật tư',
					url: '/vat-tu/cap-nhat',
					icon: RefreshCw
				},
				{
					title: 'Đề xuất',
					url: '/vat-tu/de-xuat',
					icon: FileText
				}
			]
		},
		// CNK = user ngành (đặc tả): duyệt bước 1, soạn, xem ngân hàng — không rút đề
		{
			title: 'Đề thi tự luận',
			url: '#',
			superAdminOnly: false,
			icon: BookOpenCheck,
			items: [
				{
					title: 'Tổng quan',
					url: '/de-thi',
					icon: BookOpenCheck,
					examKey: 'overview'
				},
				{
					title: 'Danh mục đào tạo',
					url: '/de-thi/danh-muc',
					icon: Layers,
					examKey: 'catalog'
				},
				{
					title: 'Danh mục lớp',
					url: '/de-thi/lop',
					icon: GraduationCap,
					examKey: 'classes'
				},
				{
					title: 'Danh mục giáo viên',
					url: '/de-thi/giao-vien',
					icon: UsersRound,
					examKey: 'teachers'
				},
				{
					title: 'Phân công môn học',
					url: '/de-thi/phan-cong',
					icon: ClipboardCheck,
					examKey: 'assign'
				},
				{
					title: 'Đề của tôi',
					url: '/de-thi/cua-toi',
					icon: FileText,
					examKey: 'mine'
				},
				{
					title: 'Duyệt đề (CNK)',
					url: '/de-thi/duyet',
					icon: ClipboardCheck,
					badgeCount: 0,
					examKey: 'approve'
				},
				{
					title: 'Ngân hàng đề',
					url: '/de-thi/ngan-hang',
					icon: FileStack,
					examKey: 'bank'
				}
			]
		}
	]

	// Ban Khảo thí (TP Đào tạo): thẩm định + rút đề
	const examOfficeNav: typeof data.navMain = [
		{
			title: 'Chung',
			url: '#',
			superAdminOnly: false,
			items: [{ title: 'Trang chủ', url: '/', icon: Home }]
		},
		{
			title: 'Đề thi tự luận',
			url: '#',
			superAdminOnly: false,
			icon: BookOpenCheck,
			items: [
				{
					title: 'Tổng quan',
					url: '/de-thi',
					icon: BookOpenCheck,
					examKey: 'overview'
				},
				{
					title: 'Duyệt / thẩm định (Ban KT)',
					url: '/de-thi/duyet',
					icon: ClipboardCheck,
					badgeCount: 0,
					examKey: 'approve'
				},
				{
					title: 'Ngân hàng đề',
					url: '/de-thi/ngan-hang',
					icon: FileStack,
					examKey: 'bank'
				},
				{
					title: 'Rút đề',
					url: '/de-thi/rut-de',
					icon: Shuffle,
					examKey: 'draw'
				}
			]
		}
	]

	const [firstNavItem, ...navMain] = data.navMain
	// Badge +n: danh sách user (tài khoản phòng) + đề xuất chờ duyệt
	const navWithBadge = navMain.map((item) => {
		if (item.title === 'Quản lý người dùng' && item.items) {
			return {
				...item,
				items: item.items.map((sub) =>
					sub.url === '/list-user'
						? { ...sub, badgeCount: pendingCount }
						: sub
				)
			}
		}
		if (item.title === 'Quản lý vật tư' && item.items) {
			return {
				...item,
				items: item.items.map((sub) =>
					sub.url === '/vat-tu/de-xuat'
						? {
								...sub,
								badgeCount:
									isSuperAdmin() || nganhUser || bghOnly
										? proposalCount
										: 0
							}
						: sub
				)
			}
		}
		if (item.title === 'Đề thi tự luận' && item.items) {
			return {
				...item,
				items: item.items.map((sub) =>
					sub.url === '/de-thi/duyet'
						? { ...sub, badgeCount: examPendingCount }
						: sub
				)
			}
		}
		return item
	})
	const nganhNavWithBadge = nganhUserNav.map((item) => {
		if (item.title === 'Quản lý vật tư' && item.items) {
			return {
				...item,
				items: item.items.map((sub) =>
					sub.url === '/vat-tu/de-xuat'
						? { ...sub, badgeCount: proposalCount }
						: sub
				)
			}
		}
		if (item.title === 'Đề thi tự luận' && item.items) {
			return {
				...item,
				items: item.items.map((sub) =>
					sub.url === '/de-thi/duyet'
						? { ...sub, badgeCount: examPendingCount }
						: sub
				)
			}
		}
		return item
	})
	const bghNavWithBadge = bghUserNav.map((item) => {
		if (item.title === 'Quản lý vật tư' && item.items) {
			return {
				...item,
				items: item.items.map((sub) =>
					sub.url === '/vat-tu/de-xuat'
						? { ...sub, badgeCount: proposalCount }
						: sub
				)
			}
		}
		if (item.title === 'Đề thi tự luận' && item.items) {
			return {
				...item,
				items: item.items.map((sub) =>
					sub.url === '/de-thi/duyet'
						? { ...sub, badgeCount: examPendingCount }
						: sub
				)
			}
		}
		return item
	})

	/** Lọc mục con Đề thi theo quyền đặc tả */
	function filterExamItems(items?: NavItem[]): NavItem[] | undefined {
		if (!items) return items
		return items.filter((sub) => {
			if (!sub.examKey) return true
			return examNavAllowed(sub.examKey)
		})
	}

	function withExamFilter(nav: typeof data.navMain) {
		return nav
			.map((item) => {
				if (item.title !== 'Đề thi tự luận') return item
				const items = filterExamItems(item.items) || []
				if (!items.length) return null
				return { ...item, items }
			})
			.filter(Boolean) as typeof data.navMain
	}

	const examOfficeNavWithBadge = examOfficeNav.map((item) => {
		if (item.title === 'Đề thi tự luận' && item.items) {
			return {
				...item,
				items: item.items.map((sub) =>
					sub.url === '/de-thi/duyet'
						? { ...sub, badgeCount: examPendingCount }
						: sub
				)
			}
		}
		return item
	})

	const examOfficeUser = isExamOffice() && !isSuperAdmin() && !nganhUser
	const leaveOperator =
		!isSuperAdmin() &&
		Boolean(
			leaveAccess?.isCommander ||
				leaveAccess?.isAgency ||
				leaveAccess?.isPersonnel
		)
	const leavePersonnelOnly =
		Boolean(leaveAccess?.isPersonnel) &&
		!leaveAccess?.isCommander &&
		!leaveAccess?.isAgency
	const leaveRoleNav: typeof data.navMain = [
		{
			title: 'Chung',
			url: '#',
			superAdminOnly: false,
			items: [{ title: 'Trang chủ', url: '/', icon: Home }]
		},
		{
			title: 'Quản lý phép',
			url: '#',
			superAdminOnly: false,
			icon: Calendar,
			items: [
				...(leaveAccess?.canPropose
					? [
							{
								title: 'Đề xuất nghỉ phép',
								url: '/quan-ly-phep/de-xuat',
								icon: FileText
							}
						]
					: []),
				{
					title: 'Quy định phép',
					url: '/quan-ly-phep/quy-dinh',
					icon: FileText
				},
				...(!leavePersonnelOnly
					? [
							{
								title: 'Duyệt đề xuất phép',
								url: '/quan-ly-phep/duyet',
								icon: ClipboardCheck
							},
							{
								title: 'Danh sách quân nhân',
								url: '/quan-ly-phep/quan-nhan',
								icon: UsersRound
							},
							{
								title: 'Đơn vị của tôi',
								url: '/quan-ly-phep/don-vi',
								icon: Building
							},
							{
								title: 'Danh mục chức vụ',
								url: '/quan-ly-phep/chuc-vu',
								icon: UserRoundCog
							},
							{
								title: 'Danh mục địa phương',
								url: '/quan-ly-phep/dia-phuong',
								icon: Building2
							},
							{
								title: 'Quản lý đợt nghỉ phép',
								url: '/quan-ly-phep/dot-nghi',
								icon: Calendar
							},
							{
								title: 'Lưu trữ nghỉ phép',
								url: '/quan-ly-phep/luu-tru',
								icon: FileStack
							}
						]
					: [])
			]
		}
	]
	/** GV soạn đề (gv.cntt…) — không super / ngành / BGH / Ban KT / phòng dạy */
	const pureExamLecturer =
		isPureExamLecturer() &&
		!roomTeacher &&
		!donViUser &&
		!examOfficeUser &&
		!nganhUser &&
		!bghOnly

	const allNavItems = leaveOperator
		? leaveRoleNav
		: roomTeacher
			? roomTeacherNav
			: pureExamLecturer
				? examLecturerNav
				: donViUser
					? donViUserNav
					: examOfficeUser
						? examOfficeNavWithBadge
						: nganhUser
							? nganhNavWithBadge
							: bghOnly
								? bghNavWithBadge
								: [
										firstNavItem,
										{
											title: 'Đơn vị',
											url: '#',
											items: unitsNavbar
										},
										...navWithBadge
									]
	const newData = {
		version: data.versions,
		navMain: withExamFilter(
			allNavItems.filter((item) => !item.superAdminOnly || isSuperAdmin())
		)
	}

	return (
		<Sidebar {...props}>
			<SidebarHeader>
				<div className='flex items-center gap-2 px-4 py-2'>
					<div className='flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-primary-foreground'>
						<img
							src={Cdhc2Logo}
							alt='Logo Trường Cao đẳng hậu cần 2'
							className='h-6 w-6'
						/>
					</div>
					{!isCollapsed && (
						<div className='flex flex-col'>
							<span className='text-sm font-semibold'>
								Hệ thống quản lý đào tạo
							</span>
							<span className='text-xs text-muted-foreground'>
								Trường Cao đẳng hậu cần 2
							</span>
						</div>
					)}
				</div>
			</SidebarHeader>

			<SidebarContent>
				{!isCollapsed &&
					!roomTeacher &&
					!pureExamLecturer &&
					!nganhUser &&
					!donViUser &&
					!bghOnly && (
						<div className='p-4 w-full'>
							<StudentForm
								buttonProps={{ className: 'w-full' }}
								onSuccess={() => {}}
							/>
						</div>
					)}

				{newData.navMain.map((item) => (
					<Collapsible
						key={item.title}
						className='group/collapsible'
						defaultOpen={false}
					>
						<SidebarGroup>
							{!isCollapsed && (
								<SidebarGroupLabel asChild>
									<CollapsibleTrigger>
										{item.title}
										<ChevronDown className='ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180' />
									</CollapsibleTrigger>
								</SidebarGroupLabel>
							)}
							{isCollapsed ? (
								<SidebarGroupContent>
									<NavMenuItems items={item.items || []} />
								</SidebarGroupContent>
							) : (
								<CollapsibleContent>
									<SidebarGroupContent>
										<NavMenuItems
											items={item.items || []}
										/>
									</SidebarGroupContent>
								</CollapsibleContent>
							)}
						</SidebarGroup>
					</Collapsible>
				))}
			</SidebarContent>
			<SidebarRail />
			<SidebarFooter>
				<div className='w-full flex items-center justify-between'>
					<div></div>
					<div className=''>
						<ThemeToggle />
					</div>
				</div>
			</SidebarFooter>
		</Sidebar>
	)
}
