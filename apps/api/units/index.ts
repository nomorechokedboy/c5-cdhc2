import { Unit, UnitDB, UnitParams } from '../schema/units'

export interface Repository {
	create(params: UnitParams[]): Promise<UnitDB[]>
	delete(units: UnitDB[]): Promise<UnitDB[]>
	find(): Promise<Unit[]>
}
