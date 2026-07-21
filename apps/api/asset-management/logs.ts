import { api, Query } from 'encore.dev/api'
import log from 'encore.dev/log'
import type { RepairLogDB } from '../schema/repair-logs'
import type { InventoryLogDB } from '../schema/inventory-logs'
import type { ReplacementLogDB } from '../schema/replacement-logs'
import assetController from './controller'

// ── Shared query ───────────────────────────────────────────────

interface LogListQuery {
	roomAssetId?: Query<number>
	roomId?: Query<number>
}

// ── Repair logs ────────────────────────────────────────────────

export interface RepairLogResponse {
	id: number
	createdAt: string
	updatedAt: string
	roomAssetId: number
	repairDate: string
	content: string
	cost: number
	performer: string | null
	note: string | null
}

function toRepair(r: RepairLogDB): RepairLogResponse {
	return {
		id: r.id,
		createdAt: r.createdAt,
		updatedAt: r.updatedAt,
		roomAssetId: r.roomAssetId,
		repairDate: r.repairDate,
		content: r.content,
		cost: r.cost,
		performer: r.performer ?? null,
		note: r.note ?? null
	}
}

export const CreateRepairLog = api(
	{ auth: true, expose: true, method: 'POST', path: '/repair-logs' },
	async (body: {
		roomAssetId: number
		repairDate: string
		content: string
		cost?: number
		performer?: string
		note?: string
	}): Promise<{ data: RepairLogResponse }> => {
		log.trace('CreateRepairLog', { body })
		const created = await assetController.createRepairLog(body)
		return { data: toRepair(created) }
	}
)

export const GetRepairLogs = api(
	{ auth: true, expose: true, method: 'GET', path: '/repair-logs' },
	async (q: LogListQuery): Promise<{ data: RepairLogResponse[] }> => {
		const list = await assetController.listRepairLogs({
			roomAssetId: q.roomAssetId,
			roomId: q.roomId
		})
		return { data: list.map(toRepair) }
	}
)

export const GetRepairLog = api(
	{ auth: true, expose: true, method: 'GET', path: '/repair-logs/:id' },
	async ({ id }: { id: number }): Promise<{ data: RepairLogResponse }> => {
		const row = await assetController.getRepairLog(id)
		return { data: toRepair(row) }
	}
)

export const UpdateRepairLog = api(
	{ auth: true, expose: true, method: 'PATCH', path: '/repair-logs/:id' },
	async ({
		id,
		...body
	}: {
		id: number
		roomAssetId?: number
		repairDate?: string
		content?: string
		cost?: number
		performer?: string
		note?: string
	}): Promise<{ data: RepairLogResponse }> => {
		const updated = await assetController.updateRepairLog({ id, ...body })
		return { data: toRepair(updated) }
	}
)

export const DeleteRepairLogs = api(
	{ auth: true, expose: true, method: 'POST', path: '/repair-logs/delete' },
	async ({ ids }: { ids: number[] }): Promise<{ ids: number[] }> => {
		await assetController.deleteRepairLogs(ids)
		return { ids }
	}
)

// ── Inventory logs ─────────────────────────────────────────────

export interface InventoryLogResponse {
	id: number
	createdAt: string
	updatedAt: string
	roomAssetId: number
	inventoryDate: string
	actualQuantity: number
	expectedQuantity: number
	result: string | null
	note: string | null
}

function toInventory(r: InventoryLogDB): InventoryLogResponse {
	return {
		id: r.id,
		createdAt: r.createdAt,
		updatedAt: r.updatedAt,
		roomAssetId: r.roomAssetId,
		inventoryDate: r.inventoryDate,
		actualQuantity: r.actualQuantity,
		expectedQuantity: r.expectedQuantity,
		result: r.result ?? null,
		note: r.note ?? null
	}
}

export const CreateInventoryLog = api(
	{ auth: true, expose: true, method: 'POST', path: '/inventory-logs' },
	async (body: {
		roomAssetId: number
		inventoryDate: string
		actualQuantity: number
		expectedQuantity?: number
		result?: string
		note?: string
	}): Promise<{ data: InventoryLogResponse }> => {
		log.trace('CreateInventoryLog', { body })
		// expectedQuantity optional — controller defaults to current asset quantity
		const created = await assetController.createInventoryLog(body)
		return { data: toInventory(created) }
	}
)

export const GetInventoryLogs = api(
	{ auth: true, expose: true, method: 'GET', path: '/inventory-logs' },
	async (q: LogListQuery): Promise<{ data: InventoryLogResponse[] }> => {
		const list = await assetController.listInventoryLogs({
			roomAssetId: q.roomAssetId,
			roomId: q.roomId
		})
		return { data: list.map(toInventory) }
	}
)

export const GetInventoryLog = api(
	{ auth: true, expose: true, method: 'GET', path: '/inventory-logs/:id' },
	async ({ id }: { id: number }): Promise<{ data: InventoryLogResponse }> => {
		const row = await assetController.getInventoryLog(id)
		return { data: toInventory(row) }
	}
)

export const UpdateInventoryLog = api(
	{ auth: true, expose: true, method: 'PATCH', path: '/inventory-logs/:id' },
	async ({
		id,
		...body
	}: {
		id: number
		roomAssetId?: number
		inventoryDate?: string
		actualQuantity?: number
		expectedQuantity?: number
		result?: string
		note?: string
	}): Promise<{ data: InventoryLogResponse }> => {
		const updated = await assetController.updateInventoryLog({
			id,
			...body
		})
		return { data: toInventory(updated) }
	}
)

export const DeleteInventoryLogs = api(
	{
		auth: true,
		expose: true,
		method: 'POST',
		path: '/inventory-logs/delete'
	},
	async ({ ids }: { ids: number[] }): Promise<{ ids: number[] }> => {
		await assetController.deleteInventoryLogs(ids)
		return { ids }
	}
)

// ── Replacement logs ───────────────────────────────────────────

export interface ReplacementLogResponse {
	id: number
	createdAt: string
	updatedAt: string
	roomAssetId: number
	replacementDate: string
	oldAsset: string
	newAsset: string
	reason: string | null
	performer: string | null
	note: string | null
}

function toReplacement(r: ReplacementLogDB): ReplacementLogResponse {
	return {
		id: r.id,
		createdAt: r.createdAt,
		updatedAt: r.updatedAt,
		roomAssetId: r.roomAssetId,
		replacementDate: r.replacementDate,
		oldAsset: r.oldAsset,
		newAsset: r.newAsset,
		reason: r.reason ?? null,
		performer: r.performer ?? null,
		note: r.note ?? null
	}
}

export const CreateReplacementLog = api(
	{ auth: true, expose: true, method: 'POST', path: '/replacement-logs' },
	async (body: {
		roomAssetId: number
		replacementDate: string
		oldAsset: string
		newAsset: string
		reason?: string
		performer?: string
		note?: string
	}): Promise<{ data: ReplacementLogResponse }> => {
		log.trace('CreateReplacementLog', { body })
		const created = await assetController.createReplacementLog(body)
		return { data: toReplacement(created) }
	}
)

export const GetReplacementLogs = api(
	{ auth: true, expose: true, method: 'GET', path: '/replacement-logs' },
	async (q: LogListQuery): Promise<{ data: ReplacementLogResponse[] }> => {
		const list = await assetController.listReplacementLogs({
			roomAssetId: q.roomAssetId,
			roomId: q.roomId
		})
		return { data: list.map(toReplacement) }
	}
)

export const GetReplacementLog = api(
	{
		auth: true,
		expose: true,
		method: 'GET',
		path: '/replacement-logs/:id'
	},
	async ({
		id
	}: {
		id: number
	}): Promise<{ data: ReplacementLogResponse }> => {
		const row = await assetController.getReplacementLog(id)
		return { data: toReplacement(row) }
	}
)

export const UpdateReplacementLog = api(
	{
		auth: true,
		expose: true,
		method: 'PATCH',
		path: '/replacement-logs/:id'
	},
	async ({
		id,
		...body
	}: {
		id: number
		roomAssetId?: number
		replacementDate?: string
		oldAsset?: string
		newAsset?: string
		reason?: string
		performer?: string
		note?: string
	}): Promise<{ data: ReplacementLogResponse }> => {
		const updated = await assetController.updateReplacementLog({
			id,
			...body
		})
		return { data: toReplacement(updated) }
	}
)

export const DeleteReplacementLogs = api(
	{
		auth: true,
		expose: true,
		method: 'POST',
		path: '/replacement-logs/delete'
	},
	async ({ ids }: { ids: number[] }): Promise<{ ids: number[] }> => {
		await assetController.deleteReplacementLogs(ids)
		return { ids }
	}
)
