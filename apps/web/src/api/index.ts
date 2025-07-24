import type {
        Class,
        ClassBody,
        ClassResponse,
        Student,
        StudentBody,
        StudentQueryParams,
        StudentResponse,
} from '@/types';
import axios from 'axios';

export type City = {
        id: number;
        name: string;
        type: number;
        textType: string;
        slug: string;
};

export type CitytResponse = {
        total: number;
        data: City[];
        code: 'success' | 'failed';
        message?: string;
};

export function fromCitiesToSelectValues(
        cities: City[]
): { value: string; label: string }[] {
        return cities.map(({ name }) => ({ value: name, label: name }));
}

export function GetCities() {
        return axios
                .get<CitytResponse>(
                        'https://open.oapi.vn/location/provinces?size=63'
                )
                .then((res) => res.data.data);
}

export type Ethnic = {
        id: number;
        name: string;
};

export type EthnicsResponse = Ethnic[];

export function GetEthnics() {
        return axios
                .get<EthnicsResponse>(
                        'http://api.nosomovo.xyz/ethnic/getalllist?_gl=1*hsf3mt*_ga*MTI5MjcwNDAzOS4xNzUyODAyOTU3*_ga_XW6CMNCYH8*czE3NTI4MDI5NTckbzEkZzEkdDE3NTI4MDI5NjIkajU1JGwwJGgw'
                )
                .then((res) => res.data);
}

export function CreateClass(body: ClassBody) {
        return axios
                .post<ClassResponse>('http://localhost:4000/classes', body)
                .then((resp) => resp.data.data);
}

export async function GetClasses(): Promise<Class[]> {
        return axios
                .get<ClassResponse>('http://localhost:4000/classes')
                .then((resp) => resp.data.data);
}

export function CreateStudent(body: StudentBody) {
        return axios
                .post<StudentResponse>('http://localhost:4000/students', body)
                .then((resp) => resp.data.data);
}

export function GetStudents(params?: StudentQueryParams): Promise<Student[]> {
        return axios
                .get<StudentResponse>('http://localhost:4000/students', {
                        params,
                })
                .then((resp) => resp.data.data);
}
