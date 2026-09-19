import { Unit, UnitDB, UnitParams, UnitQuery } from '../schema/units'

export interface Repository {
	create(params: UnitParams[]): Promise<UnitDB[]>
	delete(units: UnitDB[]): Promise<UnitDB[]>
	update(id: number, params: Partial<UnitParams>): Promise<UnitDB[]>
	/** Tìm nhiều đơn vị: lọc (ids/level/parentId/alias), search, phân trang */
	find(query?: UnitQuery): Promise<Unit[]>
	/** Tìm 1 đơn vị theo các field của bản ghi (undefined bị bỏ qua, null → IS NULL) */
	findOne(params: Partial<UnitDB>): Promise<Unit | undefined>
}
