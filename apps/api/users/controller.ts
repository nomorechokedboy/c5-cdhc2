import log from 'encore.dev/log'
import { Repository } from '.'
import {
	CreateUserRequest,
	InitAdminRequest,
	InitAdminResponse,
	UpdateUserRequest,
	User,
	UserDB
} from '../schema'
import argon2 from 'argon2'
import { appConfig } from '../configs'
import { AppError } from '../errors'
import userRepo from './repo'
import userRolesRepo from '../user-roles/repo'
import orm from '../database'
import { users } from '../schema/users'
import { userRoles } from '../schema/user-roles'

class controller {
	constructor(private readonly repo: Repository) {}

	async create(params: CreateUserRequest) {
		log.trace('userController.create params', { params })

		try {
			const hashPassword = await argon2.hash(params.password, {
				secret: Buffer.from(appConfig.HASH_SECRET)
			})
			params.password = hashPassword
		} catch (err) {
			log.error('UserController.create error', { err })
			throw AppError.handleAppErr(AppError.internal('Internal error'))
		}

		// Extract roleIds before creating user
		const { roleIds, ...userParams } = params

		if (!roleIds?.length && !userParams.status) {
			userParams.status = 'pending'
		}

		// Create user
		const user = await this.repo
			.create(userParams)
			.catch(AppError.handleAppErr)

		// Assign roles if provided
		if (roleIds && roleIds.length > 0) {
			await userRolesRepo
				.assignRolesToUser({
					userId: user.id,
					roleIds
				})
				.catch(AppError.handleAppErr)
		}

		return user
	}

	async find(): Promise<
		Array<
			Omit<User, 'password'> & {
				nganhCodes?: string[]
				nganhLabels?: Array<{ code: string; name: string }>
			}
		>
	> {
		log.trace('userController.find with nganh')
		const resp = await this.repo.find().catch(AppError.handleAppErr)
		const usersWithoutPw = resp.map(({ password: _, ...user }) => user)

		try {
			const { default: orm } = await import('../database')
			const { userNganh } = await import('../schema/user-nganh')
			const { categories } = await import('../schema/categories')

			const links = await orm
				.select({
					userId: userNganh.userId,
					code: userNganh.nganhCode
				})
				.from(userNganh)

			const codesByUser = new Map<number, string[]>()
			for (const row of links) {
				const c = (row.code || '').trim().toUpperCase()
				if (!c) continue
				const list = codesByUser.get(row.userId) || []
				if (!list.includes(c)) list.push(c)
				codesByUser.set(row.userId, list)
			}

			const allCodes = [...new Set([...codesByUser.values()].flat())]
			const nameByCode = new Map<string, string>()
			if (allCodes.length) {
				const cats = await orm.select().from(categories)
				for (const c of cats) {
					const code = (c.code || '').trim().toUpperCase()
					if (allCodes.includes(code)) {
						nameByCode.set(code, c.name)
					}
				}
			}

			return usersWithoutPw.map((u) => {
				const codes = codesByUser.get(u.id) || []
				const nganhLabels = codes.map((code) => ({
					code,
					name: nameByCode.get(code) || code
				}))
				return {
					...u,
					nganhCodes: codes,
					nganhLabels
				}
			})
		} catch (err) {
			log.warn('userController.find: attach nganh failed', { err })
			return usersWithoutPw
		}
	}

	findOne(params: UserDB): Promise<Omit<User, 'password'>> {
		log.trace('UserController.findOne params', { params })
		return this.repo
			.findOne(params)
			.then(({ password: _, ...user }) => user)
			.catch(AppError.handleAppErr)
	}

	async update(params: UpdateUserRequest): Promise<UserDB> {
		log.trace('UserController.update params', { params })

		// Hash password if provided (for password change)
		if (params.password) {
			try {
				const hashPassword = await argon2.hash(params.password, {
					secret: Buffer.from(appConfig.HASH_SECRET)
				})
				params.password = hashPassword
			} catch (err) {
				log.error('UserController.update password hash error', { err })
				throw AppError.handleAppErr(AppError.internal('Internal error'))
			}
		}

		return this.repo.update(params).catch(AppError.handleAppErr)
	}

	async delete(ids: number[]) {
		log.trace('UserController.delete params', { ids })
		const users = await this.repo
			.findByIds(ids)
			.catch(AppError.handleAppErr)
		if (users.length !== ids.length) {
			AppError.handleAppErr(AppError.invalidArgument('Invalid user ids'))
		}

		return this.repo.delete(ids).catch(AppError.handleAppErr)
	}

	async isInitAdmin(): Promise<boolean> {
		log.trace('UserController.isInitAdmin processing')
		const admins = await this.repo
			.find({ isAdmin: true })
			.catch(AppError.handleAppErr)
		if (admins.length !== 0) {
			return true
		}

		return false
	}

	async initAdmin(req: InitAdminRequest): Promise<InitAdminResponse> {
		log.trace('UserController.initAdmin request', { req })
		const isInitAdmin = await this.isInitAdmin().catch(
			AppError.handleAppErr
		)
		if (isInitAdmin) {
			AppError.handleAppErr(
				AppError.unavailable('Admin user is already init')
			)
		}

		await userController
			.create({
				password: req.password,
				displayName: req.displayName,
				username: req.username,
				isSuperUser: true,
				unitId: null
			})
			.catch(AppError.handleAppErr)

		return {}
	}

	/**
	 * User thường chưa có vai trò / status pending → cần cấp quyền.
	 * Super user không đếm.
	 * (Không còn đồng bộ TK phòng — chỉ TK đơn vị sử dụng + ngành.)
	 */
	async listPendingPermissions(): Promise<{
		count: number
		items: Array<{
			userId: number
			username: string
			displayName: string
			status: string | null
			createdAt: string
		}>
	}> {
		const all = await orm.select().from(users)
		const roleRows = await orm
			.select({ userId: userRoles.userId })
			.from(userRoles)
		const hasRole = new Set(roleRows.map((r) => r.userId))

		const items = all
			.filter((u) => {
				if (u.isSuperUser) return false
				const noRole = !hasRole.has(u.id)
				// Chỉ đếm khi chưa có role (pending hoặc approved nhưng quên gán role)
				return noRole
			})
			.map((u) => ({
				userId: u.id,
				username: u.username,
				displayName: u.displayName,
				status: u.status ?? null,
				createdAt: u.createdAt
			}))
			.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))

		return { count: items.length, items }
	}
}

const userController = new controller(userRepo)

export default userController
