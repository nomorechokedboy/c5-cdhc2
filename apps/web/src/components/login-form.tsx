import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useAuth } from '@/context/AuthContext'
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
			navigate({ to: '/dai-doi/$companyAlias', params: { companyAlias: 'c5' } })
			//  Gọi API ở đây sau này
			// fetch('/api/login', { method: 'POST', body: JSON.stringify({ username, password }) })
		} else {
			setError('Tên đăng nhập hoặc mật khẩu không đúng.')
		}
	}

	return (
		<div className='w-screen h-screen flex flex-col items-center bg-gray-100 overflow-auto'>
			{/* Header với logo */}
			<div className='w-full bg-[#616bcf] py-4 flex flex-col items-center'>
				<img
					src='https://cdhc2.edu.vn/wp-content/uploads/2025/07/LOGO-MOI.png'
					alt='Logo'
					className='h-40 mb-2'
				/>
				<h1 className='text-white text-2xl font-bold'>
					TRƯỜNG CAO ĐẲNG HẬU CẦN 2
				</h1>
			</div>

			{/* Content form */}
			<div className='bg-white shadow-md mt-6 p-6 w-full max-w-4xl rounded-md flex flex-col md:flex-row'>
				{/* Left - Hỗ trợ kỹ thuật */}
				<div className='flex-1 mb-6 md:mb-0 md:mr-10'>
					<h3 className='text-lg font-bold text-blue-800 mb-2'>
						PHẦN MỀM QUẢN LÝ HỌC VIÊN
					</h3>
					<p className=' font-semibold'>ĐẠI ĐỘI 5 - TIỂU ĐOÀN 2</p>
				</div>

				{/* Right - Form đăng nhập */}
				<div className='flex-1'>
					<h3 className='text-center text-xl font-bold text-blue-900 mb-1'>
						ĐĂNG NHẬP HỆ THỐNG
					</h3>
					<p className='text-center text-gray-600 mb-4'>
						Phiên bản 1.0
					</p>

					<form onSubmit={handleSubmit} className='space-y-4'>
						<div>
							<label className='block font-medium mb-1'>
								Tên đăng nhập
							</label>
							<input
								type='text'
								className='w-full border px-3 py-2 rounded'
								placeholder='Tên đăng nhập'
								value={username}
								onChange={(e) => setUsername(e.target.value)}
							/>
						</div>
						<div>
							<label className='block font-medium mb-1'>
								Mật khẩu
							</label>
							<input
								type='password'
								className='w-full border px-3 py-2 rounded'
								placeholder='Mật khẩu'
								value={password}
								onChange={(e) => setPassword(e.target.value)}
							/>
						</div>
						<div className='text-sm text-blue-600 hover:underline cursor-pointer'>
							Quên mật khẩu?
						</div>
						{error && (
							<p className='text-red-600 text-sm'>{error}</p>
						)}
						<button
							type='submit'
							className='bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 w-full'
						>
							Đăng nhập
						</button>
					</form>
				</div>
			</div>
		</div>
	)
}
