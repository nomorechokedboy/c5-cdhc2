import * as Tabs from '@radix-ui/react-tabs'
import { PROFILE_TABS, type ProfileTabValue } from './profile-tabs'

/**
 * Thanh tab của hồ sơ. Tab đang mở có gạch chân màu chính; tab có trường bị lỗi
 * (`errorTabs`) có chấm đỏ để người sửa biết phải quay lại đâu.
 */
export function ProfileTabList({
	errorTabs
}: {
	errorTabs?: ReadonlySet<ProfileTabValue>
}) {
	return (
		<Tabs.List className='mb-4 flex space-x-4 overflow-x-auto border-b px-2'>
			{PROFILE_TABS.map(({ value, label, icon: Icon }) => {
				const hasError = errorTabs?.has(value)
				return (
					<Tabs.Trigger
						key={value}
						value={value}
						className='relative cursor-pointer whitespace-nowrap border-b-2 border-transparent pb-2 font-display text-base font-semibold tracking-wide outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=active]:border-primary data-[state=active]:text-primary'
					>
						<Icon className='mr-1 inline h-4 w-4' />
						{label}
						{hasError && (
							<>
								<span
									aria-hidden
									className='ml-1.5 inline-block size-2 rounded-full bg-destructive align-middle'
								/>
								<span className='sr-only'>(có lỗi)</span>
							</>
						)}
					</Tabs.Trigger>
				)
			})}
		</Tabs.List>
	)
}
