import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import cdhc2Logo from '@/assets/cdhc2.png'

export function LoginForm() {
	const navigate = useNavigate()
	const { login } = useAuth()
	const [username, setUsername] = useState('')
	const [password, setPassword] = useState('')
	const [error, setError] = useState('')

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		//  Đăng nhập giả lập
		if (username === 'admin' && password === 'admin') {
			login()
			setError('')
			navigate({
				to: '/dai-doi/$companyAlias',
				params: { companyAlias: 'c5' }
			})
			//  Gọi API ở đây sau này
			// fetch('/api/login', { method: 'POST', body: JSON.stringify({ username, password }) })
		} else {
			setError('Tên đăng nhập hoặc mật khẩu không đúng.')
		}
	}

	return (
		<div className='w-screen h-screen flex flex-col items-center bg-gray-100 overflow-auto'>
			{/* Pattern chấm mờ */}
			<div className='absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.15),transparent_50%),radial-gradient(circle_at_bottom_right,rgba(139,92,246,0.15),transparent_50%)]'></div>

			{/* Nội dung chính */}
			<div className='z-10 w-full max-w-md px-4 animate-fadeInUp'>
				{/* Logo + tiêu đề */}
				<div className='flex flex-col items-center mb-8'>
					<img
						src={cdhc2Logo}
						alt='Logo'
						className='h-28 mb-3 drop-shadow-md'
					/>
					<h1 className='text-2xl font-extrabold text-gray-800 text-center'>
						TRƯỜNG CAO ĐẲNG HẬU CẦN 2
					</h1>
					<p className='text-gray-600 font-medium'>
						PHẦN MỀM QUẢN LÝ HỌC VIÊN
					</p>
				</div>

				{/* Form login */}
				<Card className='shadow-xl border backdrop-blur bg-white/90'>
					<CardHeader>
						<CardTitle className='text-center text-blue-900'>
							Đăng nhập hệ thống
						</CardTitle>
						<p className='text-center text-gray-500 text-sm'>
							Phiên bản 1.0
						</p>
					</CardHeader>
					<CardContent>
						<form onSubmit={handleSubmit} className='space-y-4'>
							<div>
								<label className='block font-medium mb-1'>
									Tên đăng nhập
								</label>
								<input
									type='text'
									className='w-full border px-3 py-2 rounded focus:ring-2 focus:ring-blue-300 outline-none'
									placeholder='Tên đăng nhập'
									value={username}
									onChange={(e) =>
										setUsername(e.target.value)
									}
								/>
							</div>
							<div>
								<label className='block font-medium mb-1'>
									Mật khẩu
								</label>
								<input
									type='password'
									className='w-full border px-3 py-2 rounded focus:ring-2 focus:ring-blue-300 outline-none'
									placeholder='Mật khẩu'
									value={password}
									onChange={(e) =>
										setPassword(e.target.value)
									}
								/>
							</div>
							<div className='text-sm text-blue-600 hover:underline cursor-pointer'>
								Quên mật khẩu?
							</div>
							{error && (
								<p className='text-red-600 text-sm'>{error}</p>
							)}
							<Button
								type='submit'
								className='w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold shadow-md'
							>
								Đăng nhập
							</Button>
						</form>
					</CardContent>
				</Card>
			</div>

			{/* Wave bottom */}
			<div className='absolute bottom-0 left-0 w-full overflow-hidden leading-none rotate-180'>
				<svg
					className='relative block w-full h-20'
					xmlns='http://www.w3.org/2000/svg'
					preserveAspectRatio='none'
					viewBox='0 0 1200 120'
				>
					<path
						d='M0,0V46.29c47.79,22,103.24,29,158,17,72.47-15.71,136.9-57.45,209-66,71.13-8.38,142.3,15.88,213,35.34,66.24,18.24,132.57,27.45,198,13,61.47-13.48,113-53.84,172-61,66-8.07,130,20.36,196,32V0Z'
						fill='#6366f1'
						fillOpacity='0.25'
					></path>
				</svg>
			</div>
		</div>
	)
}
