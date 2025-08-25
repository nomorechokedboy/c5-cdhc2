import {
	Class,
	ClassDB,
	ClassParam,
	ClassQuery,
	UpdateClassMap
} from '../schema/classes.js'

export interface Repository {
	create(params: ClassParam[]): Promise<ClassDB[]>
	delete(classes: ClassDB[]): Promise<ClassDB[]>
	find(q: ClassQuery): Promise<Class[]>
	findOne(c: ClassDB): Promise<Class | undefined>
	update(params: UpdateClassMap): Promise<ClassDB[]>
}
