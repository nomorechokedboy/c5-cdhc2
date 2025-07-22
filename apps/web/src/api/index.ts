import type { Class, ClassBody } from '@/types';
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

type ClassResponse = { data: Class[] };

export function CreateClass(body: ClassBody) {
        return axios
                .post<Class[]>('http://localhost:4000/classes', body)
                .then((resp) => resp.data);
}

export async function GetClasses(): Promise<Class[]> {
        return axios
                .get<ClassResponse>('http://localhost:4000/classes')
                .then((resp) => resp.data.data);
}
