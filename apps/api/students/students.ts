import { api } from 'encore.dev/api';
import log from 'encore.dev/log';
import { StudentParam, StudentQuery } from '../schema/student.js';
import studentController from './controller.js';

interface ChildrenInfo {
        fullName: string;
        dob: string;
}

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
        fatherDob: string;
        fatherPhoneNumber: string;
        fatherJob: string;
        // fatherJobAddress: string;
        motherName: string;
        motherDob: string;
        motherPhoneNumber: string;
        motherJob: string;
        // motherJobAddress: string;
        isMarried: boolean;
        spouseName: string;
        spouseDob: string;
        spouseJob: string;
        spousePhoneNumber: string;
        familySize: number;
        familyBackground: string;
        familyBirthOrder: string;
        achievement: string;
        disciplinaryHistory: string;
        childrenInfos: ChildrenInfo[];
        phone: string;
        classId: number;
}

interface StudentDBResponse extends StudentBody {
        id: number;
        createdAt: string;
        updatedAt: string;
}

interface StudentResponse extends StudentDBResponse {
        class: { id: number; description: string; name: string };
}

interface BulkStudentResponse {
        data: StudentDBResponse[];
}

export const CreateStudent = api(
        { expose: true, method: 'POST', path: '/students' },
        async (body: StudentBody): Promise<BulkStudentResponse> => {
                const studentParam: StudentParam = {
                        ...body,
                };
                log.trace('students.CreateStudents body', { studentParam });

                const createdStudent = await studentController.create([
                        studentParam,
                ]);

                const resp = createdStudent.map(
                        (s) => ({ ...s }) as StudentDBResponse
                );

                return { data: resp };
        }
);

interface StudentBulkBody {
        data: StudentBody[];
}

export const CreateStudents = api(
        { expose: true, method: 'POST', path: '/students/bulk' },
        async (body: StudentBulkBody): Promise<BulkStudentResponse> => {
                const studentParams = body.data.map(
                        (b) => ({ ...b }) as StudentParam
                );

                const createdStudent =
                        await studentController.create(studentParams);

                const resp = createdStudent.map(
                        (s) => ({ ...s }) as StudentDBResponse
                );

                return { data: resp };
        }
);
interface GetStudentsResponse {
        data: StudentResponse[];
}

interface GetStudentsQuery {
        classId?: number;
        birthdayInMonth?:
                | '01'
                | '02'
                | '03'
                | '04'
                | '05'
                | '06'
                | '07'
                | '08'
                | '09'
                | '10'
                | '11'
                | '12';
        politicalOrg?: 'hcyu' | 'cpv';
        birthdayInWeek?: boolean;
        isMarried?: boolean;
}

export const GetStudents = api(
        { expose: true, method: 'GET', path: '/students' },
        async (query: GetStudentsQuery): Promise<GetStudentsResponse> => {
                const q: StudentQuery = { ...query };
                log.trace('students.GetStudents query params', { params: q });
                const students = await studentController.find(q);
                const resp = students.map(
                        (s) => ({ ...s }) as unknown as StudentResponse
                );

                return { data: resp };
        }
);
