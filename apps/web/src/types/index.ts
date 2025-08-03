export interface Class extends Base {
        name: string;
        description: string;
        studentCount: number
}

export interface ClassBody {
        name: string;
        description?: string;
}

export type PoliticalOrg = 'hcyu' | 'cpv';

export type StudentBody = {
        fullName: string;
        birthPlace: string;
        address: string;
        class: Class;
        cpvId: string;
        dob: string;
        educationLevel: string;
        enlistmentPeriod: string;
        ethnic: string;
        fatherJob: string;
        fatherDob: string;
        fatherName: string;
        fatherPhoneNumber: string;
        isGraduated: boolean;
        major: string;
        motherJob: string;
        motherDob: string;
        motherName: string;
        motherPhoneNumber: string;
        phone: string;
        policyBeneficiaryGroup: string;
        politicalOrg: PoliticalOrg;
        politicalOrgOfficialDate: string;
        position: string;
        previousPosition: string;
        previousUnit: string;
        rank: string;
        religion: string;
        schoolName: string;
        shortcoming: string;
        talent: string;
        isMarried: boolean;
        spouseName: string;
        spouseDob: string;
        spousePhoneNumber: string;
        childrenInfos: ChildrenInfo[];
        familySize: number;
        familyBackground: string;
        familyBirthOrder: string;
        achievement: string;
        disciplinaryHistory: string;
};

type Base = {
        id: number;
        createdAt: string;
        updatedAt: string;
};

export interface Student extends Base, StudentBody {}

export interface StudentProto {
        TT: number;
        'Họ và tên': string;
        'Năm sinh': number;
        'Quê quán': string;
        'Hộ khẩu thường trú': string;
        CB: string;
        CV: string;
        'Đơn vị cũ': string;
        'Dân tộc': string;
        'Tôn giáo': string;
        'Nhập ngũ': number;
        Đoàn: number;
        Đảng: number | null;
        'Chính thức': number | null;
        'Số thẻ Đảng (Nếu có)': string | null;
        'Trình độ học vấn': string;
        'Tên trường': string | null;
        'Ngành nghề đào tạo': string | null;
        'Chức vụ công tác đơn vị cũ - chuyên ngành': string;
        'Diện chính sách': string | null;
        'Năng khiếu': string | null;
        'Sở đoản': string | null;
        Bố: string;
        'Năm sinh bố': number;
        'Nghề nghiệp bố': string;
        'SĐT Bố': number;
        Mẹ: string;
        'Năm sinh mẹ': number;
        'Nghề nghiệp mẹ': string;
        'SĐT mẹ': number;
        Vợ: string | null;
        'Năm sinh vợ': number | null;
        'Nghề nghiệp vợ': string | null;
        'SĐT vợ': number | null;
        'Con _ Năm sinh': string | null;
        'Gia đình có mấy thành viên': number | null;
        'Là con thứ mấy': number;
        'Sơ lược hoàn cảnh gia đình': string | null;
        'Thành tích': string | null;
        'Kỷ luật': string | null;
        Lớp: string;
}

export type ClassResponse = { data: Class[] };

export type StudentResponse = { data: Student[] };

export type UnitResponse = { data: Unit[] };

export interface SearchInputConfig {
        columnKey: string;
        placeholder?: string;
        className?: string;
}

export interface FacetedFilterConfig {
        columnKey: string;
        title: string;
        options: {
                label: string;
                value: string;
                icon?: React.ComponentType<{ className?: string }>;
        }[];
}

export type Month =
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

export interface StudentQueryParams {
        classId?: number;
        birthdayInMonth?: Month;
        politicalOrg?: PoliticalOrg;
        birthdayInWeek?: boolean;
        isMarried?: boolean;
}

export type ChildrenInfo = {
        fullName: string;
        dob: string;
};

export type DeleteStudentsBody = {
        ids: number[];
};

export type UpdateStudentBody = Partial<StudentBody> & { id: number };

export type UpdateStudentsBody = {
        data: UpdateStudentBody[];
};

export type UnitLevel = {
        name: 'battalion' | 'company';
};

// Unit type based on backend Unit type
export interface Unit  {
        id: number;
        alias: string;
        name: string;
        level: 'battalion' | 'company';
        createdAt: string;
        updatedAt: string;
        parentId?: number;
        parent?: Unit;
        children: Unit[];
        classes: Class[];
};

export const defaultStudentColumnVisibility = {
        dob: false,
        enlistmentPeriod: false,
        isGraduated: false,
        major: false,
        phone: false,
        position: false,
        policyBeneficiaryGroup: false,
        politicalOrgOfficialDate: false,
        cpvId: false,
        previousPosition: false,
        religion: false,
        schoolName: false,
        shortcoming: false,
        talent: false,
        fatherName: false,
        fatherJob: false,
        fatherPhoneNumber: false,
        motherName: false,
        motherJob: false,
        motherPhoneNumber: false,
        address: false,
        birthPlace: false,
}