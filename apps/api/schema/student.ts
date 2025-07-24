import { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import * as sqlite from 'drizzle-orm/sqlite-core';
import { customType } from 'drizzle-orm/sqlite-core';
import { classes } from './classes';

const PoliticalOrgEnum = customType<{ data: string; driverData: string }>({
        dataType() {
                return 'text';
        },
        toDriver(val: string) {
                if (!['hcyu', 'cpv'].includes(val))
                        throw Error('politicalOrg can be only hcyu or cpv');
                return val;
        },
});

export const students = sqlite.sqliteTable('students', {
        id: sqlite.int().primaryKey({ autoIncrement: true }),
        fullName: sqlite.text().default(''),
        birthPlace: sqlite.text().default(''),
        address: sqlite.text().default(''),
        dob: sqlite.text().default(''),
        rank: sqlite.text().default(''),
        previousUnit: sqlite.text().default(''),
        previousPosition: sqlite.text().default(''),
        position: sqlite.text().default('Học viên'),
        ethnic: sqlite.text().default(''),
        religion: sqlite.text().default(''),
        enlistmentPeriod: sqlite.text().default(''),
        politicalOrg: PoliticalOrgEnum('politicalOrg')
                .$type<'hcyu' | 'cpv'>()
                .notNull(),
        politicalOrgOfficialDate: sqlite.text().default(''),
        cpvId: sqlite.text(),
        educationLevel: sqlite.text().default(''),
        schoolName: sqlite.text().default(''),
        major: sqlite.text().default(''),
        isGraduated: sqlite.integer({ mode: 'boolean' }).default(false),
        talent: sqlite.text().default(''),
        shortcoming: sqlite.text().default(''),
        policyBeneficiaryGroup: sqlite.text().default(''),
        fatherName: sqlite.text().default(''),
        fatherPhoneNumber: sqlite.text().default(''),
        fatherJob: sqlite.text().default(''),
        fatherJobAddress: sqlite.text().default(''),
        motherName: sqlite.text().default(''),
        motherPhoneNumber: sqlite.text().default(''),
        motherJob: sqlite.text().default(''),
        motherJobAddress: sqlite.text().default(''),
        phone: sqlite.text().default(''),
        classId: sqlite.integer().references(() => classes.id),
});

export type StudentDB = InferSelectModel<typeof students>;

export type Student = Omit<StudentDB, 'classId'> & {
        class: { id: number; name: string; description: string };
};

export type StudentParam = InferInsertModel<typeof students>;

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

export type StudentQuery = {
        classId?: number;
        birthdayInMonth?: Month;
        politicalOrg?: 'hcyu' | 'cpv';
        birthdayInWeek?: boolean;
        isMarried?: boolean;
};
