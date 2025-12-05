import { middleware } from 'encore.dev/api'
import { getAuthData } from '~encore/auth'
import unitRepo from '../units/repo'
import log from 'encore.dev/log'
import userRepo from '../users/repo'

// Extend the middleware data type
declare module 'encore.dev/api' {
	interface MiddlewareData {
		validClassIds: number[]
		validUnitIds: number[]
	}
}

async function getValidIdsFromUnit(unitId: number) {
	const unit = await unitRepo.getOne({ id: unitId })

	if (!unit) {
		return { classIds: [], unitIds: [] }
	}

	let classIds: number[] = []
	const unitIds: number[] = [unitId]

	if (unit.level === 'battalion') {
		classIds = unit.children.flatMap((c) => c.classes.map((cl) => cl.id))
		unitIds.push(...unit.children.map((c) => c.id))
	} else if (unit.level === 'company') {
		classIds = unit.classes.map((cl) => cl.id)
	}

	return { classIds, unitIds }
}

async function getAllValidIds() {
	const units = await unitRepo.findAll()

	const classIds = units.flatMap((u) => {
		let ids = u.classes?.map((c) => c.id) || []
		if (u.children) {
			for (const child of u.children) {
				ids = ids.concat(child.classes?.map((c) => c.id) || [])
			}
		}
		return ids
	})

	const unitIds = units.flatMap((u) => {
		const ids = [u.id]
		if (u.children) {
			ids.push(...u.children.map((c) => c.id))
		}
		return ids
	})

	return { classIds, unitIds }
}

export const authzMiddleware = middleware(
	{ target: { auth: true } },
	async (req, next) => {
		const authData = getAuthData()

		if (!authData) {
			log.warn('authzMiddleware: No auth data available')
			req.data.validClassIds = []
			req.data.validUnitIds = []
			return next(req)
		}

		let classIds: number[] = []
		let unitIds: number[] = []

		try {
			if (authData.isSuperAdmin) {
				// Super admins get access to all units and classes
				const allIds = await getAllValidIds()

				classIds = allIds.classIds
				unitIds = allIds.unitIds
			} else if (authData.userID) {
				// Regular users: fetch their user record to get current unitId
				const user = await userRepo.findOne({
					id: Number(authData.userID)
				})

				if (user?.unitId) {
					const validIds = await getValidIdsFromUnit(user.unitId)
					classIds = validIds.classIds
					unitIds = validIds.unitIds
				}
			}

			log.trace('authzMiddleware: Computed valid IDs', {
				userId: authData.userID,
				classIds,
				unitIds
			})

			// Attach to request for API handlers to use
			req.data.validClassIds = classIds
			req.data.validUnitIds = unitIds

			return next(req)
		} catch (err) {
			console.error('authzMiddleware error', err)
			log.error('authzMiddleware: Error computing valid IDs', { err })
			req.data.validClassIds = []
			req.data.validUnitIds = []
			return next(req)
		}
	}
)
