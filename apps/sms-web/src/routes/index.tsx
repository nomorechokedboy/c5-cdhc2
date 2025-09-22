import { createFileRoute } from '@tanstack/react-router'
import logo from '../logo.svg'
import ProtectedRoute from '@/components/ProtectedRoute'
import CourseCard from '@/components/course-card'

export const Route = createFileRoute('/')({
	component: App
})

const courses = [
	{
		id: 1,
		title: 'Advanced Mathematics',
		code: 'MATH 401',
		description:
			'Calculus, linear algebra, and differential equations for advanced students.',
		instructor: 'Dr. Sarah Chen',
		students: 28,
		semester: 'Fall 2024',
		status: 'Active',
		color: 'bg-blue-500',
		schedule: 'MWF 10:00-11:00 AM',
		room: 'Math Building 205',
		credits: 4,
		assignments: [
			{
				id: 1,
				title: 'Calculus Problem Set 1',
				dueDate: '2024-09-15',
				submitted: 25,
				total: 28
			},
			{
				id: 2,
				title: 'Linear Algebra Quiz',
				dueDate: '2024-09-22',
				submitted: 28,
				total: 28
			},
			{
				id: 3,
				title: 'Midterm Exam',
				dueDate: '2024-10-15',
				submitted: 0,
				total: 28
			}
		],
		grades: {
			average: 87.5,
			distribution: { A: 8, B: 12, C: 6, D: 2, F: 0 }
		}
	},
	{
		id: 2,
		title: 'Computer Science Fundamentals',
		code: 'CS 101',
		description:
			'Introduction to programming concepts, algorithms, and data structures.',
		instructor: 'Prof. Michael Rodriguez',
		students: 45,
		semester: 'Fall 2024',
		status: 'Active',
		color: 'bg-green-500',
		schedule: 'TTh 1:00-2:30 PM',
		room: 'CS Building 102',
		credits: 3,
		assignments: [
			{
				id: 1,
				title: 'Programming Assignment 1',
				dueDate: '2024-09-10',
				submitted: 40,
				total: 45
			},
			{
				id: 2,
				title: 'Algorithms Quiz',
				dueDate: '2024-09-17',
				submitted: 45,
				total: 45
			},
			{
				id: 3,
				title: 'Final Project',
				dueDate: '2024-11-01',
				submitted: 0,
				total: 45
			}
		],
		grades: {
			average: 85.0,
			distribution: { A: 10, B: 15, C: 10, D: 5, F: 5 }
		}
	},
	{
		id: 3,
		title: 'English Literature',
		code: 'ENG 302',
		description: 'Analysis of contemporary and classical literary works.',
		instructor: 'Dr. Emily Watson',
		students: 32,
		semester: 'Fall 2024',
		status: 'Active',
		color: 'bg-purple-500',
		schedule: 'MWF 1:00-2:00 PM',
		room: 'Literature Building 201',
		credits: 3,
		assignments: [
			{
				id: 1,
				title: 'Essay 1',
				dueDate: '2024-09-20',
				submitted: 30,
				total: 32
			},
			{
				id: 2,
				title: 'Literature Quiz',
				dueDate: '2024-09-27',
				submitted: 32,
				total: 32
			},
			{
				id: 3,
				title: 'Final Exam',
				dueDate: '2024-10-25',
				submitted: 0,
				total: 32
			}
		],
		grades: {
			average: 88.0,
			distribution: { A: 9, B: 12, C: 8, D: 2, F: 1 }
		}
	},
	{
		id: 4,
		title: 'Physics Laboratory',
		code: 'PHYS 201',
		description:
			'Hands-on experiments in mechanics, thermodynamics, and electromagnetism.',
		instructor: 'Dr. James Park',
		students: 24,
		semester: 'Fall 2024',
		status: 'Active',
		color: 'bg-orange-500',
		schedule: 'TTh 11:00-12:30 PM',
		room: 'Physics Lab 101',
		credits: 3,
		assignments: [
			{
				id: 1,
				title: 'Mechanics Lab Report',
				dueDate: '2024-09-25',
				submitted: 20,
				total: 24
			},
			{
				id: 2,
				title: 'Thermodynamics Quiz',
				dueDate: '2024-10-02',
				submitted: 24,
				total: 24
			},
			{
				id: 3,
				title: 'Electromagnetism Project',
				dueDate: '2024-11-15',
				submitted: 0,
				total: 24
			}
		],
		grades: {
			average: 86.0,
			distribution: { A: 7, B: 10, C: 6, D: 1, F: 0 }
		}
	},
	{
		id: 5,
		title: 'World History',
		code: 'HIST 150',
		description:
			'Survey of global historical events from ancient civilizations to modern times.',
		instructor: 'Prof. Lisa Thompson',
		students: 38,
		semester: 'Fall 2024',
		status: 'Active',
		color: 'bg-red-500',
		schedule: 'MWF 11:00-12:00 PM',
		room: 'History Building 103',
		credits: 3,
		assignments: [
			{
				id: 1,
				title: 'Essay on Ancient Civilizations',
				dueDate: '2024-09-22',
				submitted: 35,
				total: 38
			},
			{
				id: 2,
				title: 'History Quiz',
				dueDate: '2024-09-29',
				submitted: 38,
				total: 38
			},
			{
				id: 3,
				title: 'Final Paper',
				dueDate: '2024-10-30',
				submitted: 0,
				total: 38
			}
		],
		grades: {
			average: 89.0,
			distribution: { A: 11, B: 15, C: 9, D: 2, F: 1 }
		}
	},
	{
		id: 6,
		title: 'Organic Chemistry',
		code: 'CHEM 301',
		description: 'Study of carbon-based compounds and their reactions.',
		instructor: 'Dr. Robert Kim',
		students: 22,
		semester: 'Spring 2025',
		status: 'Upcoming',
		color: 'bg-teal-500',
		schedule: 'MWF 1:00-2:00 PM',
		room: 'Chemistry Lab 202',
		credits: 3,
		assignments: [],
		grades: {
			average: 0,
			distribution: {}
		}
	}
]

function App() {
	return (
		<ProtectedRoute>
			<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
				{courses.map((course) => (
					<CourseCard key={course.id} course={course} />
				))}
			</div>
		</ProtectedRoute>
	)
}
