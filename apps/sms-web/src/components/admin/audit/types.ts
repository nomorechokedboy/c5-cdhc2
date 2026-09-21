export interface AuditEntry {
	id: string
	timestamp: string
	event_type: string
	actor_id: number
	actor_role: string
	outcome: 'success' | 'failure' | 'denied'
	service: string
	endpoint: string
	ip_address?: string
	details?: unknown
	error_msg?: string
}

export interface AuditListResponse {
	data: AuditEntry[]
	total: number
	page: number
	limit: number
	total_pages: number
}

export interface AuditStatsResponse {
	total_events: number
	today_events: number
	failure_count: number
	denied_count: number
	top_event_types: { event_type: string; count: number }[]
	recent_actors: { actor_id: number; actor_role: string; count: number }[]
}

export interface Filters {
	event_type: string
	outcome: string
	actor_id: string
	from: string
	to: string
	search: string
}

export const EMPTY_FILTERS: Filters = {
	event_type: '',
	outcome: '',
	actor_id: '',
	from: '',
	to: '',
	search: ''
}
