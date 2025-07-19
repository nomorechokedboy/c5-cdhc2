import { api } from 'encore.dev/api';
import { ClassParam } from '../schema/classes.js';
import classController from './controller.js';

interface ClassBody {
        name: string;
        description?: string;
}

interface ClassResponse {
        id: number;
        name: string;
        description: string;
}

interface BulkClassResponse {
        data: ClassResponse[];
}

export const CreateClass = api(
        { expose: true, method: 'POST', path: '/classes' },
        async (body: ClassBody): Promise<BulkClassResponse> => {
                const classParam: ClassParam = {
                        name: body.name,
                        description: body.description,
                };

                const createdClass = await classController.create([classParam]);

                const resp = createdClass.map(
                        ({ description, id, name }) =>
                                ({
                                        description,
                                        id,
                                        name,
                                }) as ClassResponse
                );

                return { data: resp };
        }
);

interface GetClassesResponse extends BulkClassResponse {}

export const GetClasses = api(
        { expose: true, method: 'GET', path: '/classes' },
        async (): Promise<GetClassesResponse> => {
                const classes = await classController.find();
                const resp = classes.map(
                        ({ description, id, name }) =>
                                ({
                                        description,
                                        id,
                                        name,
                                }) as ClassResponse
                );

                return { data: resp };
        }
);
