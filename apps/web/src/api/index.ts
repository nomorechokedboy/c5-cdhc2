import axios from 'axios';

type City = {
        id: number;
        name: string;
        type: number;
        textType: string;
        slug: string;
};

type CitytResponse = {
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
