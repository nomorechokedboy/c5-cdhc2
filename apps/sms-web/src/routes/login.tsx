import { Button } from '@repo/ui/components/ui/button'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/login')({ component: Login })

export default function Login() {
	return (
		<div>
			Login Page
			<a href='http://localhost:4000/login' target='_blank'>
				<Button>TestButton</Button>
			</a>
		</div>
	)
}
