// Mirrors the EventType constants in audit/entities.go.
// labelKey is the i18n key resolved at render time via t().
export const EVENT_TYPE_OPTIONS = [
	{ value: '', labelKey: 'audit.filter.allEvents' },
	{ value: 'auth.login', labelKey: 'audit.eventTypes.auth.login' },
	{
		value: 'auth.token_refresh',
		labelKey: 'audit.eventTypes.auth.token_refresh'
	},
	{ value: 'auth.denied', labelKey: 'audit.eventTypes.auth.denied' },
	{ value: 'grade.update', labelKey: 'audit.eventTypes.grade.update' },
	{ value: 'export.grades', labelKey: 'audit.eventTypes.export.grades' },
	{ value: 'template.upload', labelKey: 'audit.eventTypes.template.upload' },
	{ value: 'template.delete', labelKey: 'audit.eventTypes.template.delete' },
	{
		value: 'config.langpack_set',
		labelKey: 'audit.eventTypes.config.langpack_set'
	},
	{
		value: 'config.langpack_delete',
		labelKey: 'audit.eventTypes.config.langpack_delete'
	},
	{ value: 'audit.purge', labelKey: 'audit.eventTypes.audit.purge' }
] as const

export const OUTCOME_OPTIONS = [
	{ value: '', labelKey: 'audit.filter.allOutcomes' },
	{ value: 'success', labelKey: 'audit.outcome.success' },
	{ value: 'failure', labelKey: 'audit.outcome.failure' },
	{ value: 'denied', labelKey: 'audit.outcome.denied' }
] as const

export const PER_PAGE = [20, 50, 100]
