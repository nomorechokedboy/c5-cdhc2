import type { ProfileTabValue } from '../student-profile/profile-tabs'

/** Field (khóa gốc, trước dấu «.» hoặc «[») nằm ở tab nào của form sửa */
const TAB_OF_FIELD: Record<string, ProfileTabValue> = {
	avatarFile: 'personal',
	fullName: 'personal',
	studentId: 'personal',
	dob: 'personal',
	birthPlace: 'personal',
	ethnic: 'personal',
	religion: 'personal',
	address: 'personal',
	phone: 'personal',

	rank: 'military',
	position: 'military',
	unitId: 'military',
	enlistmentPeriod: 'military',
	previousUnit: 'military',
	previousPosition: 'military',
	politicalOrg: 'military',
	politicalOrgOfficialDate: 'military',
	cpvOfficialAt: 'military',
	cpvId: 'military',

	schoolName: 'education',
	major: 'education',
	educationLevel: 'education',
	isGraduated: 'education',
	talent: 'education',
	shortcoming: 'education',
	policyBeneficiaryGroup: 'education',

	fatherName: 'family',
	fatherDob: 'family',
	fatherJob: 'family',
	fatherPhoneNumber: 'family',
	motherName: 'family',
	motherDob: 'family',
	motherJob: 'family',
	motherPhoneNumber: 'family',
	isMarried: 'family',
	spouseName: 'family',
	spouseDob: 'family',
	spouseJob: 'family',
	spousePhoneNumber: 'family',
	childrenInfos: 'family',
	siblings: 'family',
	familyBackground: 'family',
	familySize: 'family',
	familyBirthOrder: 'family',

	achievement: 'history',
	disciplinaryHistory: 'history',
	contactPerson: 'history',
	relatedDocumentations: 'history'
}

export function tabOfField(name: string): ProfileTabValue | undefined {
	return TAB_OF_FIELD[name.split(/[.[]/)[0]]
}

/** Tab nào đang có ít nhất một field bị lỗi; nhận `form.state.fieldMeta` */
export function tabsWithErrors(
	fieldMeta: Record<string, { errors?: readonly unknown[] } | undefined>
): Set<ProfileTabValue> {
	const tabs = new Set<ProfileTabValue>()
	for (const [name, meta] of Object.entries(fieldMeta)) {
		if (!meta?.errors?.length) continue
		const tab = tabOfField(name)
		if (tab) tabs.add(tab)
	}
	return tabs
}
