import { Class, ClassParam } from '../schema/classes.js';

export interface Repository {
        create(params: ClassParam[]): Promise<Class[]>;
        delete(classes: Class[]): Promise<Class[]>;
        find(): Promise<Class[]>;
        findOne(c: Class): Promise<Class>;
        update(params: Class[]): Promise<Class[]>;
}
