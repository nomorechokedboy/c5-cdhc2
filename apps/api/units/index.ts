import { Unit, UnitDB, UnitParams, UnitQuery } from '../schema/units'

export interface Repository {
	create(params: UnitParams[]): Promise<UnitDB[]>
	delete(units: UnitDB[]): Promise<UnitDB[]>
	find(query: UnitQuery): Promise<Unit[]>
	findOne(params: {
		alias: string
		level: 'battalion' | 'company'
	}): Promise<Unit | undefined>
	findByIds(ids: number[]): Promise<UnitDB[]>
	findById(
		id: number,
		opts?: {
			with: { children?: boolean; classes?: boolean; parent?: boolean }
		}
	): Promise<UnitDB | undefined>
	getOne(params: Partial<UnitDB>): Promise<Unit | undefined>
}
