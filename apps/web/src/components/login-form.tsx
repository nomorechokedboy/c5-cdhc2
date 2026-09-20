import { Button } from '@/components/ui/button'
import cdhc2Logo from '@/assets/cdhc2.png'
import { useAppForm } from '@/hooks/demo.form'
import useAuth from '@/hooks/useAuth'

const APP_VERSION = '1.0'

export function LoginForm() {
	const { login } = useAuth()

	const form = useAppForm({
		defaultValues: {
			username: '',
			password: ''
		},
		onSubmit: async ({ value }) => {
			login(value)
		}
	})

	return (
		<main className='grid h-dvh grid-cols-[minmax(0,1fr)] overflow-auto lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]'>
			<aside
				className='relative isolate flex min-h-72 flex-col justify-between overflow-hidden p-6 text-sidebar-foreground lg:min-h-full lg:p-12'
				style={{
					backgroundColor: 'var(--sidebar)',
					backgroundImage:
						'var(--stamp-side), var(--sidebar-gradient)',
					backgroundRepeat: 'no-repeat, no-repeat',
					backgroundPosition: 'right -24% top -16%, 0 0',
					backgroundSize: 'min(120vw, 720px), 100% 100%'
				}}
			>
				<div className='flex items-center gap-3'>
					<img
						src={cdhc2Logo}
						alt='Huy hiệu Trường Cao đẳng Hậu cần 2'
						className='size-11 shrink-0 drop-shadow-md'
					/>
					<span className='font-display text-sm font-medium tracking-wide text-sidebar-foreground/80'>
						Trường Cao đẳng Hậu cần 2
					</span>
				</div>

				<div className='max-w-md'>
					<svg
						viewBox='0 0 600 80'
						className='mb-6 h-14 w-full max-w-sm text-sidebar-primary lg:h-20'
						fill='none'
						stroke='currentColor'
						strokeWidth='2.5'
						strokeLinecap='round'
						strokeLinejoin='round'
						aria-hidden
					>
						<path
							className='pulse-draw'
							pathLength={1}
							d='M0 42 H170 l14 -9 l12 9 H232 l10 8 l16 -44 l16 62 l11 -26 H322 l14 -11 l16 11 H600'
						/>
					</svg>
					<h2 className='font-display text-4xl font-bold leading-[1.05] tracking-wide lg:text-6xl'>
						Quản lý
						<br />
						học viên
					</h2>
					<p className='mt-4 max-w-sm text-sm leading-relaxed text-sidebar-foreground/75 lg:text-base'>
						Hồ sơ, đơn vị và kết quả rèn luyện của học viên trong
						một hệ thống.
					</p>
				</div>
			</aside>

			<section className='flex flex-col'>
				<div className='flex flex-1 items-center justify-center px-6 py-12'>
					<div className='w-full max-w-sm rounded-xl border bg-card p-8 shadow-sm motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:duration-500'>
						<h1 className='font-display text-4xl font-bold tracking-wide text-foreground'>
							Đăng nhập
						</h1>
						<p className='mt-2 text-muted-foreground'>
							Dùng tài khoản do nhà trường cấp.
						</p>

						<form
							onSubmit={(e) => {
								e.preventDefault()
								e.stopPropagation()
								form.handleSubmit()
							}}
							className='mt-8 space-y-5'
						>
							<form.AppField
								name='username'
								validators={{
									onBlur: ({ value }) =>
										!value
											? 'Tên đăng nhập là bắt buộc'
											: undefined
								}}
							>
								{(field) => (
									<field.TextField label='Tên đăng nhập' />
								)}
							</form.AppField>

							<form.AppField
								name='password'
								validators={{
									onBlur: ({ value }) =>
										!value
											? 'Mật khẩu là bắt buộc'
											: undefined
								}}
							>
								{(field) => (
									<field.TextField
										type='password'
										label='Mật khẩu'
									/>
								)}
							</form.AppField>

							<div className='text-sm text-info hover:underline cursor-pointer'>
								Quên mật khẩu?
							</div>

							<form.Subscribe
								selector={(state) => [
									state.canSubmit,
									state.isSubmitting
								]}
								children={([canSubmit, isSubmitting]) => (
									<Button
										type='submit'
										disabled={!canSubmit}
										size='lg'
										className='w-full font-semibold'
									>
										{isSubmitting
											? 'Đang đăng nhập...'
											: 'Đăng nhập'}
									</Button>
								)}
							/>
						</form>
					</div>
				</div>
				<p className='px-6 pb-6 text-center text-xs text-muted-foreground'>
					Phiên bản {APP_VERSION}
				</p>
			</section>
		</main>
	)
}
