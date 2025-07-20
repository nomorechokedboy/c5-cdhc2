import { api } from 'encore.dev/api';
import { StudentParam } from '../schema/student.js';
import studentController from './controller.js';

interface StudentBody {
        fullName: string;
        birthPlace: string;
        address: string;
        dob: string;
        rank: string;
        previousUnit: string;
        previousPosition: string;
        ethnic: string;
        religion: string;
        enlistmentPeriod: string;
        politicalOrg: 'hcyu' | 'cpv';
        politicalOrgOfficialDate: string;
        cpvId: string | null;
        educationLevel: string;
        schoolName: string;
        major: string;
        isGraduated: boolean;
        talent: string;
        shortcoming: string;
        policyBeneficiaryGroup: string;
        fatherName: string;
        fatherPhoneNumber: string;
        fatherJob: string;
        fatherJobAddress: string;
        motherName: string;
        motherPhoneNumber: string;
        motherJob: string;
        motherJobAddress: string;
        phone: string;
}

interface StudentResponse extends StudentBody {
        id: number;
}

interface BulkStudentResponse {
        data: StudentResponse[];
}

export const CreateStudent = api(
        { expose: true, method: 'POST', path: '/students' },
        async (body: StudentBody): Promise<BulkStudentResponse> => {
                const studentParam: StudentParam = {
                        ...body,
                };

                const createdStudent = await studentController.create([
                        studentParam,
                ]);

                const resp = createdStudent.map(
                        (s) => ({ ...s }) as StudentResponse
                );

                return { data: resp };
        }
);

interface GetStudentsResponse extends BulkStudentResponse {}

export const GetStudents = api(
        { expose: true, method: 'GET', path: '/students' },
        async (): Promise<GetStudentsResponse> => {
                const students = await studentController.find();
                const resp = students.map((s) => ({ ...s }) as StudentResponse);

                return { data: resp };
        }
);
