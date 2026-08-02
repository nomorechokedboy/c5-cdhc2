import { api, APIError } from 'encore.dev/api'
import { execFile } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

interface ConvertWordTemplateRequest {
	fileName: string
	base64: string
}

interface ConvertWordTemplateResponse {
	fileName: string
	base64: string
}

/** Chuyển mẫu Word .doc cũ sang .docx để trình duyệt có thể trộn dữ liệu. */
export const ConvertLeaveWordTemplate = api<
	ConvertWordTemplateRequest,
	ConvertWordTemplateResponse
>(
	{
		auth: true,
		expose: true,
		method: 'POST',
		path: '/leave-management/word-templates/convert'
	},
	async ({ fileName, base64 }) => {
		if (!/\.docx?$/i.test(fileName))
			throw APIError.invalidArgument(
				'Chỉ hỗ trợ file Word .doc hoặc .docx'
			)
		const input = Buffer.from(base64, 'base64')
		if (!input.length || input.length > 10 * 1024 * 1024)
			throw APIError.invalidArgument(
				'File Word không hợp lệ hoặc quá 10 MB'
			)

		const workDir = await mkdtemp(join(tmpdir(), 'leave-word-template-'))
		try {
			const inputPath = join(workDir, 'template.doc')
			await writeFile(inputPath, input)
			try {
				await execFileAsync(
					'libreoffice',
					[
						'--headless',
						`-env:UserInstallation=file://${join(workDir, 'profile')}`,
						'--infilter=MS Word 97',
						'--convert-to',
						'docx:Office Open XML Text',
						'--outdir',
						workDir,
						inputPath
					],
					{ timeout: 30_000 }
				)
			} catch {
				throw APIError.internal(
					'Không thể tự động chuyển đổi file Word này'
				)
			}
			const output = await readFile(join(workDir, 'template.docx'))
			return {
				fileName: fileName.replace(/\.docx?$/i, '') + '.docx',
				base64: output.toString('base64')
			}
		} finally {
			await rm(workDir, { recursive: true, force: true })
		}
	}
)
