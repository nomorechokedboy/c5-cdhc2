export const STEPS = [
	{
		id: 'personal',
		title: 'Thông tin cá nhân',
		fields: [
			'fullName',
			'birthPlace',
			'address',
			'ethnic',
			'religion',
			'educationLevel',
			'schoolName',
			'major',
			'phone',
			'classId'
		]
	},
	{
		id: 'other',
		title: 'Thông tin khác',
		fields: [
			'rank',
			'previousUnit',
			'previousPosition',
			'enlistmentPeriod',
			'politicalOrg',
			'politicalOrgOfficialDate'
		]
	},
	{
		id: 'parent',
		title: 'Thông tin bố mẹ',
		fields: []
	},
	{
		id: 'family',
		title: 'Thông tin vợ/chồng và con',
		fields: []
	},
	{ id: 'review', title: 'Xem lại thông tin', fields: [] }
]

interface Notification {
	id: string
	type: 'like' | 'comment' | 'follow' | 'mention'
	user: {
		name: string
		avatar: string
		username: string
	}
	message: string
	timestamp: string
	read: boolean
}

export const generateMockNotifications = (page: number, limit = 10) => {
	const types = ['like', 'comment', 'follow', 'mention'] as const
	const users = [
		{
			name: 'Alice Johnson',
			username: 'alice_j',
			avatar: '/placeholder.svg?height=40&width=40&text=AJ'
		},
		{
			name: 'Bob Smith',
			username: 'bob_smith',
			avatar: '/placeholder.svg?height=40&width=40&text=BS'
		},
		{
			name: 'Carol Davis',
			username: 'carol_d',
			avatar: '/placeholder.svg?height=40&width=40&text=CD'
		},
		{
			name: 'David Wilson',
			username: 'david_w',
			avatar: '/placeholder.svg?height=40&width=40&text=DW'
		},
		{
			name: 'Emma Brown',
			username: 'emma_b',
			avatar: '/placeholder.svg?height=40&width=40&text=EB'
		},
		{
			name: 'Frank Miller',
			username: 'frank_m',
			avatar: '/placeholder.svg?height=40&width=40&text=FM'
		},
		{
			name: 'Grace Lee',
			username: 'grace_l',
			avatar: '/placeholder.svg?height=40&width=40&text=GL'
		},
		{
			name: 'Henry Taylor',
			username: 'henry_t',
			avatar: '/placeholder.svg?height=40&width=40&text=HT'
		}
	]

	const messages = {
		like: ['liked your post', 'liked your comment', 'liked your photo'],
		comment: [
			'commented on your post',
			'replied to your comment',
			'mentioned you in a comment'
		],
		follow: ['started following you', 'requested to follow you'],
		mention: [
			'mentioned you in a post',
			'tagged you in a photo',
			'mentioned you in a story'
		]
	}

	const notifications: Notification[] = []
	const startIndex = page * limit

	for (let i = 0; i < limit; i++) {
		const index = startIndex + i
		const type = types[index % types.length]
		const user = users[index % users.length]
		const message = messages[type][index % messages[type].length]

		// Create timestamps that get older as we go further
		const hoursAgo = Math.floor(index / 2) + Math.random() * 2
		const timestamp = new Date(
			Date.now() - hoursAgo * 60 * 60 * 1000
		).toISOString()

		notifications.push({
			id: `notification-${index}`,
			type,
			user,
			message,
			timestamp,
			read: Math.random() > 0.3 // 70% chance of being read
		})
	}

	return notifications
}
