import {
	EhtnicOptions,
	eduLevelOptions,
	rankOptions,
	religionOptions
} from '@/data/ethnics'

export type ImportColumnKind =
	| 'text'
	| 'date'
	| 'boolean'
	| 'number'
	| 'politicalOrg'
	| 'unit'

export interface ImportColumn {
	/** Tên trường API — nằm ở dòng 2 của file và là khoá để đọc dữ liệu */
	key: string
	/** Tiêu đề tiếng Việt ở dòng 1 */
	header: string
	kind: ImportColumnKind
	/** Giá trị ở dòng mẫu (cột `unit` được điền lúc tạo file) */
	sample: string | number
	/** Danh sách chọn (dropdown) của cột */
	list?: string[]
}

const YES_NO = ['Có', 'Không']
const POLITICAL_ORG = ['Đoàn', 'Đảng', 'Chưa tham gia']

const values = (options: Array<{ value: string }>) =>
	options.map((o) => o.value)

/**
 * Nguồn duy nhất cho cấu trúc file import: tạo file mẫu và đọc file đều dựa vào đây
 * (trước đây là 3 mảng song song phải giữ khớp chỉ số bằng tay).
 */
export const IMPORT_COLUMNS: ImportColumn[] = [
	{
		key: 'fullName',
		header: 'Họ và tên',
		kind: 'text',
		sample: 'Nguyễn Văn A'
	},
	{ key: 'birthPlace', header: 'Nơi sinh', kind: 'text', sample: 'Hà Nội' },
	{
		key: 'address',
		header: 'Địa chỉ',
		kind: 'text',
		sample: '123 Đường ABC'
	},
	{ key: 'dob', header: 'Ngày sinh', kind: 'date', sample: '01/01/2000' },
	{
		key: 'rank',
		header: 'Cấp bậc',
		kind: 'text',
		sample: 'Binh nhất',
		list: values(rankOptions)
	},
	{
		key: 'previousUnit',
		header: 'Đơn vị cũ',
		kind: 'text',
		sample: 'Đại đội 1'
	},
	{ key: 'previousPosition', header: 'Chức vụ cũ', kind: 'text', sample: '' },
	{
		key: 'ethnic',
		header: 'Dân tộc',
		kind: 'text',
		sample: 'Kinh',
		list: values(EhtnicOptions)
	},
	{
		key: 'religion',
		header: 'Tôn giáo',
		kind: 'text',
		sample: 'Không',
		list: values(religionOptions)
	},
	{
		key: 'enlistmentPeriod',
		header: 'Thời gian nhập ngũ',
		kind: 'text',
		sample: '2024'
	},
	{
		key: 'politicalOrg',
		header: 'Đoàn/Đảng',
		kind: 'politicalOrg',
		sample: 'Đoàn',
		list: POLITICAL_ORG
	},
	{
		key: 'politicalOrgOfficialDate',
		header: 'Ngày chính thức vào Đảng/Đoàn',
		kind: 'date',
		sample: '26/03/2020'
	},
	{ key: 'cpvId', header: 'ID Đảng viên', kind: 'text', sample: '' },
	{
		key: 'educationLevel',
		header: 'Trình độ học vấn',
		kind: 'text',
		sample: '12/12',
		list: values(eduLevelOptions)
	},
	{
		key: 'schoolName',
		header: 'Tên trường',
		kind: 'text',
		sample: 'THPT Hà Nội'
	},
	{ key: 'major', header: 'Chuyên ngành', kind: 'text', sample: 'Toán' },
	{
		key: 'isGraduated',
		header: 'Đã tốt nghiệp',
		kind: 'boolean',
		sample: 'Không',
		list: YES_NO
	},
	{ key: 'talent', header: 'Tài năng', kind: 'text', sample: 'Văn nghệ' },
	{
		key: 'shortcoming',
		header: 'Thiếu sót',
		kind: 'text',
		sample: 'Chưa có'
	},
	{
		key: 'policyBeneficiaryGroup',
		header: 'Nhóm thụ hưởng chính sách',
		kind: 'text',
		sample: 'Không'
	},
	{
		key: 'fatherName',
		header: 'Tên cha',
		kind: 'text',
		sample: 'Nguyễn Văn B'
	},
	{
		key: 'fatherDob',
		header: 'Ngày sinh cha',
		kind: 'date',
		sample: '01/01/1970'
	},
	{
		key: 'fatherPhoneNumber',
		header: 'SĐT cha',
		kind: 'text',
		sample: '0912345678'
	},
	{
		key: 'fatherJob',
		header: 'Nghề nghiệp cha',
		kind: 'text',
		sample: 'Công nhân'
	},
	{ key: 'motherName', header: 'Tên mẹ', kind: 'text', sample: 'Trần Thị C' },
	{
		key: 'motherDob',
		header: 'Ngày sinh mẹ',
		kind: 'date',
		sample: '02/02/1972'
	},
	{
		key: 'motherPhoneNumber',
		header: 'SĐT mẹ',
		kind: 'text',
		sample: '0987654321'
	},
	{
		key: 'motherJob',
		header: 'Nghề nghiệp mẹ',
		kind: 'text',
		sample: 'Giáo viên'
	},
	{
		key: 'isMarried',
		header: 'Đã kết hôn',
		kind: 'boolean',
		sample: 'Không',
		list: YES_NO
	},
	{ key: 'spouseName', header: 'Tên vợ/chồng', kind: 'text', sample: '' },
	{
		key: 'spouseDob',
		header: 'Ngày sinh vợ/chồng',
		kind: 'date',
		sample: ''
	},
	{
		key: 'spouseJob',
		header: 'Nghề nghiệp vợ/chồng',
		kind: 'text',
		sample: ''
	},
	{
		key: 'spousePhoneNumber',
		header: 'SĐT vợ/chồng',
		kind: 'text',
		sample: ''
	},
	{
		key: 'familySize',
		header: 'Số lượng thành viên gia đình',
		kind: 'number',
		sample: 4
	},
	{
		key: 'familyBackground',
		header: 'Hoàn cảnh gia đình',
		kind: 'text',
		sample: 'Không'
	},
	{
		key: 'familyBirthOrder',
		header: 'Thứ tự sinh',
		kind: 'text',
		sample: 'Con cả'
	},
	{
		key: 'achievement',
		header: 'Thành tích',
		kind: 'text',
		sample: 'Học sinh giỏi'
	},
	{
		key: 'disciplinaryHistory',
		header: 'Lịch sử kỷ luật',
		kind: 'text',
		sample: ''
	},
	{
		key: 'phone',
		header: 'Số điện thoại',
		kind: 'text',
		sample: '0911222333'
	},
	// Khoá `unitId` giữ nguyên để file mẫu cũ vẫn đọc được; ô nhập tên lớp hoặc ID lớp
	{ key: 'unitId', header: 'Lớp', kind: 'unit', sample: '' }
]

export const DATE_KEYS = IMPORT_COLUMNS.filter((c) => c.kind === 'date').map(
	(c) => c.key
)
