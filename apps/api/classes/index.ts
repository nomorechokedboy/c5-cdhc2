import { Class, ClassDB, ClassParam } from '../schema/classes.js';

export interface Repository {
        create(params: ClassParam[]): Promise<ClassDB[]>;
        delete(classes: ClassDB[]): Promise<ClassDB[]>;
        find(): Promise<Class[]>;
        findOne(c: ClassDB): Promise<Class>;
        update(params: ClassDB[]): Promise<ClassDB[]>;
}
