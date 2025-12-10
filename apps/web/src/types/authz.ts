import type { schema } from '@/api/client'

export class Role {
	constructor(
		readonly id: number,
		readonly name: string,
		readonly description: string,
		readonly permissions: Permission[],
		readonly userCount: number,
		readonly createdAt: string
	) {}

	static From({
		id,
		name,
		description = '',
		permissions = [],
		users = [],
		createdAt
	}: schema.Role) {
		return new Role(
			id,
			name,
			description,
			permissions.map(Permission.From),
			users.length,
			createdAt
		)
	}
}

export class Permission {
	constructor(
		readonly id: number,
		readonly key: string,
		readonly name: string,
		readonly description: string,
		readonly category: string,
		readonly rolesCount: number,
		readonly createdAt: string
	) {}

	static From({
		id,
		name,
		displayName,
		description = '',
		createdAt,
		roles = [],
		resource
	}: schema.Permission) {
		return new Permission(
			id,
			name,
			displayName,
			description,
			resource!.displayName,
			roles.length,
			createdAt
		)
	}
}

export class Action {
	constructor(
		readonly id: number,
		readonly name: string,
		readonly displayName: string,
		readonly description: string
	) {}
}

export class Resource {
	constructor(
		readonly id: number,
		readonly name: string,
		readonly displayName: string,
		readonly description: string
	) {}
}
