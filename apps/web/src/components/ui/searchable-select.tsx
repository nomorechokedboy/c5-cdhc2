/**
 * Select có ô tìm kiếm trong popover.
 * - Gõ mã/tên → lọc ngay (không dấu, không phân biệt hoa thường)
 * - Tab / Shift+Tab: qua các field form
 * - ↑ ↓: di chuyển trong danh sách; Enter: chọn; Esc: đóng
 * - ← →: khi đóng, Tab tự nhiên; khi mở, di chuyển highlight (cùng ↑↓)
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronsUpDown, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
	Popover,
	PopoverContent,
	PopoverTrigger
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export type SearchableOption = {
	value: string
	label: string
	/** Text phụ để tìm (mã phòng, alias đơn vị…) */
	keywords?: string
}

/** lower-case + bỏ dấu + đ→d (để "tai" khớp "Tài", không khớp lung tung) */
function normalize(s: string): string {
	return s
		.normalize('NFD')
		.replace(/\p{M}/gu, '')
		.replace(/đ/g, 'd')
		.replace(/Đ/g, 'd')
		.toLocaleLowerCase('vi')
		.replace(/\s+/g, ' ')
		.trim()
}

function matchesOption(o: SearchableOption, query: string): boolean {
	const q = normalize(query)
	if (!q) return true

	const label = normalize(o.label)
	const keys = normalize(o.keywords ?? '')
	const alias = (label.split(/\s*[—–-]\s*/)[0] ?? label).trim()
	const hay = `${label} ${keys} ${alias}`

	const parts = q.split(' ').filter(Boolean)
	return parts.every((part) => hay.includes(part))
}

function scoreOption(o: SearchableOption, query: string): number {
	const q = normalize(query)
	if (!q) return 0

	const label = normalize(o.label)
	const keys = normalize(o.keywords ?? '')
	const alias = (label.split(/\s*[—–-]\s*/)[0] ?? label).trim()

	let score = 0
	if (alias.startsWith(q)) score += 500
	else if (keys.split(' ').some((k) => k.startsWith(q))) score += 450
	else if (label.startsWith(q)) score += 350
	else if (label.split(' ').some((w) => w.startsWith(q))) score += 300
	else if (keys.includes(q) || label.includes(q)) score += 150

	const idx = label.indexOf(q)
	if (idx >= 0) score += Math.max(0, 50 - idx)

	return score
}

function filterOptions(
	options: SearchableOption[],
	query: string
): SearchableOption[] {
	const q = normalize(query)
	if (!q) return options

	const hit = options
		.filter((o) => matchesOption(o, query))
		.map((o) => ({ o, score: scoreOption(o, query) }))

	hit.sort(
		(a, b) => b.score - a.score || a.o.label.localeCompare(b.o.label, 'vi')
	)
	return hit.map((x) => x.o)
}

type Props = {
	options: SearchableOption[]
	value: string
	onValueChange: (value: string) => void
	placeholder?: string
	searchPlaceholder?: string
	emptyText?: string
	disabled?: boolean
	className?: string
	contentClassName?: string
}

export function SearchableSelect({
	options,
	value,
	onValueChange,
	placeholder = 'Chọn…',
	searchPlaceholder = 'Gõ để tìm…',
	emptyText = 'Không có kết quả',
	disabled = false,
	className,
	contentClassName
}: Props) {
	const [open, setOpen] = useState(false)
	const [query, setQuery] = useState('')
	const [highlight, setHighlight] = useState(0)
	const inputRef = useRef<HTMLInputElement>(null)
	const listRef = useRef<HTMLDivElement>(null)
	const triggerRef = useRef<HTMLButtonElement>(null)
	const optionRefs = useRef<Array<HTMLButtonElement | null>>([])

	const selected = options.find((o) => o.value === value)

	const filtered = useMemo(
		() => filterOptions(options, query),
		[options, query]
	)

	// Reset highlight khi lọc / mở
	useEffect(() => {
		if (!open) return
		const idx = filtered.findIndex((o) => o.value === value)
		setHighlight(idx >= 0 ? idx : 0)
	}, [open, query, filtered, value])

	// Focus ô tìm khi mở
	useEffect(() => {
		if (!open) return
		const t = window.setTimeout(() => {
			inputRef.current?.focus()
			inputRef.current?.select()
		}, 0)
		return () => window.clearTimeout(t)
	}, [open])

	// Cuộn item đang highlight vào view
	useEffect(() => {
		if (!open) return
		const el = optionRefs.current[highlight]
		el?.scrollIntoView({ block: 'nearest' })
	}, [highlight, open])

	function pick(val: string) {
		onValueChange(val)
		setOpen(false)
		setQuery('')
		// Trả focus về trigger để Tab tiếp sang field kế
		window.setTimeout(() => triggerRef.current?.focus(), 0)
	}

	function moveHighlight(delta: number) {
		if (filtered.length === 0) return
		setHighlight((h) => {
			const next = (h + delta + filtered.length) % filtered.length
			return next
		})
	}

	function onSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
		// Cho Tab / Shift+Tab thoát popover và đi field kế / trước
		if (e.key === 'Tab') {
			setOpen(false)
			setQuery('')
			// Không preventDefault — browser Tab tự nhiên
			return
		}
		if (e.key === 'Escape') {
			e.preventDefault()
			e.stopPropagation()
			setOpen(false)
			setQuery('')
			triggerRef.current?.focus()
			return
		}
		if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
			e.preventDefault()
			e.stopPropagation()
			moveHighlight(1)
			return
		}
		if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
			e.preventDefault()
			e.stopPropagation()
			moveHighlight(-1)
			return
		}
		if (e.key === 'Enter') {
			e.preventDefault()
			e.stopPropagation()
			const item = filtered[highlight]
			if (item) pick(item.value)
			return
		}
		// Không chặn các phím gõ thường (IME tiếng Việt)
	}

	function onTriggerKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
		if (disabled) return
		// Mở bằng mũi tên / Enter / Space (ngoài mặc định button)
		if (
			e.key === 'ArrowDown' ||
			e.key === 'ArrowUp' ||
			e.key === 'ArrowLeft' ||
			e.key === 'ArrowRight'
		) {
			e.preventDefault()
			setOpen(true)
		}
	}

	return (
		<Popover
			modal
			open={open}
			onOpenChange={(next) => {
				setOpen(next)
				if (!next) setQuery('')
			}}
		>
			<PopoverTrigger asChild>
				<Button
					ref={triggerRef}
					type='button'
					variant='outline'
					role='combobox'
					aria-expanded={open}
					aria-haspopup='listbox'
					disabled={disabled}
					onKeyDown={onTriggerKeyDown}
					className={cn(
						'w-full justify-between font-normal h-12 text-lg px-3',
						!selected && 'text-muted-foreground',
						className
					)}
					title={selected?.label ?? placeholder}
				>
					<span className='min-w-0 flex-1 truncate text-left text-base sm:text-lg'>
						{selected?.label ?? placeholder}
					</span>
					<ChevronsUpDown className='ml-2 h-5 w-5 shrink-0 opacity-50' />
				</Button>
			</PopoverTrigger>
			<PopoverContent
				className={cn(
					// Rộng hơn ô trigger để đọc đủ tên dài (vd. Máy tính để bàn…)
					'z-[200] p-0 w-[var(--radix-popover-trigger-width)] min-w-[min(100vw-2rem,20rem)] max-w-[min(100vw-2rem,28rem)]',
					contentClassName
				)}
				align='start'
				sideOffset={4}
				collisionPadding={16}
				onOpenAutoFocus={(e) => {
					e.preventDefault()
					inputRef.current?.focus()
				}}
				onCloseAutoFocus={(e) => e.preventDefault()}
				onWheel={(e) => e.stopPropagation()}
			>
				<div className='flex items-center gap-2 border-b px-3'>
					<Search className='size-5 shrink-0 opacity-50' />
					<input
						ref={inputRef}
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder={searchPlaceholder}
						className='placeholder:text-muted-foreground flex h-12 w-full rounded-md bg-transparent py-3 text-lg outline-none'
						autoComplete='off'
						role='combobox'
						aria-autocomplete='list'
						aria-controls='searchable-select-list'
						aria-activedescendant={
							filtered[highlight]
								? `searchable-opt-${filtered[highlight]!.value}`
								: undefined
						}
						onKeyDown={onSearchKeyDown}
					/>
				</div>
				<div
					id='searchable-select-list'
					ref={listRef}
					role='listbox'
					className='max-h-72 overflow-y-auto overscroll-contain p-1.5'
					onWheel={(e) => e.stopPropagation()}
				>
					{filtered.length === 0 ? (
						<div className='text-muted-foreground py-8 text-center text-lg'>
							{emptyText}
							{query.trim() ? (
								<span className='mt-1 block text-base'>
									Không khớp «{query.trim()}»
								</span>
							) : null}
						</div>
					) : (
						filtered.map((item, i) => {
							const isSelected = item.value === value
							const isHi = i === highlight
							return (
								<button
									key={item.value}
									id={`searchable-opt-${item.value}`}
									ref={(el) => {
										optionRefs.current[i] = el
									}}
									type='button'
									role='option'
									aria-selected={isSelected}
									className={cn(
										'flex w-full cursor-default items-start gap-2 rounded-md px-3 py-2.5 text-left text-base sm:text-lg outline-none',
										'hover:bg-accent hover:text-accent-foreground',
										isSelected && 'bg-accent/50',
										isHi &&
											'bg-accent text-accent-foreground ring-1 ring-ring'
									)}
									onMouseEnter={() => setHighlight(i)}
									onMouseDown={(e) => {
										e.preventDefault()
										e.stopPropagation()
										pick(item.value)
									}}
								>
									<Check
										className={cn(
											'mt-0.5 h-5 w-5 shrink-0',
											isSelected
												? 'opacity-100'
												: 'opacity-0'
										)}
									/>
									<span className='min-w-0 flex-1 whitespace-normal break-words leading-snug'>
										{item.label}
									</span>
								</button>
							)
						})
					)}
				</div>
				<div className='text-muted-foreground border-t px-3 py-2 text-sm flex flex-wrap gap-x-4 gap-y-1'>
					<span>
						<span className='font-semibold text-foreground/80'>
							↑↓←→
						</span>{' '}
						di chuyển
					</span>
					<span>
						<span className='font-semibold text-foreground/80'>
							Enter
						</span>{' '}
						chọn
					</span>
					<span>
						<span className='font-semibold text-foreground/80'>
							Tab
						</span>{' '}
						field kế
					</span>
					<span>
						<span className='font-semibold text-foreground/80'>
							Esc
						</span>{' '}
						đóng
					</span>
					{query.trim() && filtered.length > 0 ? (
						<span className='ml-auto font-medium'>
							{filtered.length} kết quả
						</span>
					) : null}
				</div>
			</PopoverContent>
		</Popover>
	)
}
