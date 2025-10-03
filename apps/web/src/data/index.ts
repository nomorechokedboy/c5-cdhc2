import {
	familyInfoSchema,
	militaryInfoSchema,
	parentInfoSchema,
	personalInfoSchema
} from '@/components/student-form-schema'

export const STEPS = [
	{
		id: 'personal',
		title: 'Thông tin cá nhân',
		fields: [
			'fullName',
			'classId',
			'birthPlace',
			'address',
			'ethnic',
			'religion',
			'educationLevel',
			'schoolName',
			'major',
			'phone',
			'dob',
			'avatar',
			'studentId'
		],
		validationSchema: personalInfoSchema
	},
	{
		id: 'other',
		title: 'Thông tin khác',
		fields: [
			'rank',
			'enlistmentPeriod',
			'policyBeneficiaryGroup',
			'previousUnit',
			'previousPosition',
			'politicalOrg',
			'politicalOrgOfficialDate',
			'cpvId',
			'cpvOfficialAt',
			'talent',
			'shortcoming',
			'achievement',
			'disciplinaryHistory',
			'contactPerson',
			'relatedDocumentations'
		],
		validationSchema: militaryInfoSchema
	},
	{
		id: 'parent',
		title: 'Thông tin bố mẹ',
		fields: [
			'familySize',
			'familyBirthOrder',
			'familyBackground',
			'fatherName',
			'fatherDob',
			'fatherJob',
			'fatherPhoneNumber',
			'motherName',
			'motherDob',
			'motherJob',
			'motherPhoneNumber',
			'siblings'
		],
		validationSchema: parentInfoSchema
	},
	{
		id: 'family',
		title: 'Thông tin vợ/chồng và con',
		fields: [
			'spouseName',
			'spouseDob',
			'spouseJob',
			'spousePhoneNumber',
			'childrenInfos'
		],
		validationSchema: familyInfoSchema
	}
]
