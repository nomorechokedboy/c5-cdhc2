/**
 * Import đề thi từ Word/txt theo cấu trúc:
 *   ĐỀ THI SỐ n → Câu … → Đáp án - Thang điểm → Câu …
 * Một file có thể chứa nhiều đề.
 */
import { useRef, useState } from 'react'
import { Download, FileUp, Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { UploadFiles } from '@/api'
import { ApiUrl } from '@/lib/const'
import {
	mergeAnswersIntoQuestions,
	parseExamDocumentFromFile,
	parseExamDocumentFromText,
	parseExamQuestionsFromText,
	readFileAsText,
	type ParsedExamDocument,
	type ParsedExamPaper,
	type ParsedExamQuestion
} from '@/lib/parse-exam-file'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

export type ExamAttachedFile = {
	fileName: string
	fileUrl: string | null
}

type Props = {
	/** File gốc đã gắn (hiển thị) */
	sourceFile?: ExamAttachedFile | null
	onSourceFileChange?: (f: ExamAttachedFile | null) => void
	/** Legacy 2 file — vẫn hỗ trợ khi soạn 1 đề */
	questionFile?: ExamAttachedFile | null
	answerFile?: ExamAttachedFile | null
	onQuestionFileChange?: (f: ExamAttachedFile | null) => void
	onAnswerFileChange?: (f: ExamAttachedFile | null) => void
	currentQuestions?: ParsedExamQuestion[]
	/** 1 đề (paper đầu hoặc gộp) */
	onQuestionsParsed?: (qs: ParsedExamQuestion[]) => void
	/** Nhiều đề từ 1 file Word */
	onDocumentParsed?: (doc: ParsedExamDocument) => void
	/** Ẩn phần 2 file riêng (khi bulk) */
	hideLegacySplit?: boolean
}

async function storeFile(file: File): Promise<string | null> {
	try {
		const fd = new FormData()
		fd.append('file', file)
		const res = await UploadFiles(fd)
		const uri = res?.uris?.[0]
		if (uri) {
			if (uri.startsWith('http')) return uri
			return `${ApiUrl.replace(/\/$/, '')}/media/${encodeURIComponent(uri)}`
		}
	} catch (e) {
		console.warn('Upload storage failed, fallback data URL', e)
	}
	if (file.size > 2_500_000) return null
	return new Promise((resolve, reject) => {
		const reader = new FileReader()
		reader.onload = () => resolve(String(reader.result || null))
		reader.onerror = () => reject(reader.error)
		reader.readAsDataURL(file)
	})
}

const SAMPLE_BUNDLE = '/samples/exam-import/bo-de-mau.txt'
/** Mẫu B — bảng gộp đề Word (Đề số | Câu hỏi | Nội dung | Đáp án | Điểm) */
const SAMPLE_GOP_DOCX = '/samples/exam-import/mau-de-gop.docx'
const SAMPLE_GOP_TXT = '/samples/exam-import/mau-de-gop.txt'
/** Mẫu C — Bộ câu hỏi + đáp án hoàn chỉnh (I. BỘ CÂU HỎI / II. ĐÁP ÁN) */
const SAMPLE_BO_CH_DA = '/samples/exam-import/bo-cau-hoi-dap-an-hoan-chinh.docx'

function totalQuestions(papers: ParsedExamPaper[]) {
	return papers.reduce((n, p) => n + p.questions.length, 0)
}

export default function ExamFileImport({
	sourceFile = null,
	onSourceFileChange,
	questionFile = null,
	answerFile = null,
	onQuestionFileChange,
	onAnswerFileChange,
	currentQuestions = [],
	onQuestionsParsed,
	onDocumentParsed,
	hideLegacySplit = false
}: Props) {
	const bundleRef = useRef<HTMLInputElement>(null)
	const qRef = useRef<HTMLInputElement>(null)
	const aRef = useRef<HTMLInputElement>(null)
	const [busy, setBusy] = useState<'bundle' | 'q' | 'a' | null>(null)
	const [preview, setPreview] = useState<ParsedExamDocument | null>(null)

	async function handleBundleFile(file: File | null) {
		if (!file) return
		setBusy('bundle')
		try {
			const url = await storeFile(file)
			const attached = { fileName: file.name, fileUrl: url }
			onSourceFileChange?.(attached)
			// Gắn luôn vào questionFile để submit (1 file chứa CH + ĐA)
			onQuestionFileChange?.(attached)
			onAnswerFileChange?.(attached)

			const doc = await parseExamDocumentFromFile(file)
			setPreview(doc)
			onDocumentParsed?.(doc)

			const papers = doc.papers
			if (papers.length === 1) {
				onQuestionsParsed?.(papers[0]!.questions)
				toast.success(
					`Đã import «${file.name}» — 1 đề, ${papers[0]!.questions.length} câu (có đáp án)`
				)
			} else {
				// Paper đầu cho form 1 đề; bulk page sẽ dùng full document
				onQuestionsParsed?.(papers[0]!.questions)
				toast.success(
					`Đã import «${file.name}» — ${papers.length} đề, ${totalQuestions(papers)} câu`
				)
			}
		} catch (e) {
			setPreview(null)
			toast.error(
				e instanceof Error ? e.message : 'Không import được file đề'
			)
		} finally {
			setBusy(null)
			if (bundleRef.current) bundleRef.current.value = ''
		}
	}

	async function handleQuestionFile(file: File | null) {
		if (!file) return
		setBusy('q')
		try {
			const url = await storeFile(file)
			onQuestionFileChange?.({ fileName: file.name, fileUrl: url })

			const text = await readFileAsText(file)
			if (text.trim()) {
				// Thử cấu trúc bộ đề (có thể 1 file CH vẫn có header)
				const doc = parseExamDocumentFromText(text)
				if (doc.papers.length > 1) {
					setPreview(doc)
					onDocumentParsed?.(doc)
					onQuestionsParsed?.(doc.papers[0]!.questions)
					toast.success(
						`Đã import «${file.name}» — ${doc.papers.length} đề`
					)
					return
				}
				const qs =
					doc.papers[0]?.questions ?? parseExamQuestionsFromText(text)
				if (qs.length) {
					const byNum = new Map(
						currentQuestions.map((q) => [q.questionNumber, q])
					)
					const merged = qs.map((q) => {
						const old = byNum.get(q.questionNumber)
						return {
							...q,
							answer: q.answer || old?.answer || ''
						}
					})
					onQuestionsParsed?.(merged)
					toast.success(
						`Đã import «${file.name}» — ${qs.length} câu hỏi`
					)
					return
				}
			}
			toast.success(`Đã gắn file câu hỏi «${file.name}»`)
		} catch (e) {
			toast.error(
				e instanceof Error
					? e.message
					: 'Không import được file câu hỏi'
			)
		} finally {
			setBusy(null)
			if (qRef.current) qRef.current.value = ''
		}
	}

	async function handleAnswerFile(file: File | null) {
		if (!file) return
		setBusy('a')
		try {
			const url = await storeFile(file)
			onAnswerFileChange?.({ fileName: file.name, fileUrl: url })

			const text = await readFileAsText(file)
			if (text.trim()) {
				const fromAns = parseExamQuestionsFromText(text)
				if (fromAns.length) {
					const base =
						currentQuestions.length > 0
							? currentQuestions
							: fromAns.map((a) => ({
									...a,
									content:
										a.content ||
										`(Câu ${a.questionNumber})`,
									answer: ''
								}))
					const out = mergeAnswersIntoQuestions(base, text)
					onQuestionsParsed?.(out)
					toast.success(
						`Đã import «${file.name}» — ${fromAns.length} đáp án`
					)
					return
				}
			}
			toast.success(`Đã gắn file đáp án «${file.name}»`)
		} catch (e) {
			toast.error(
				e instanceof Error ? e.message : 'Không import được file đáp án'
			)
		} finally {
			setBusy(null)
			if (aRef.current) aRef.current.value = ''
		}
	}

	const shownFile = sourceFile || questionFile

	return (
		<div className='space-y-3 rounded-lg border-2 border-primary/20 bg-primary/5 p-4'>
			<div className='flex flex-wrap items-start justify-between gap-2'>
				<div>
					<p className='text-sm font-semibold'>
						Import file đề / đáp án
					</p>
					<p className='text-muted-foreground text-xs'>
						<strong>Mẫu C (khuyến nghị):</strong> Word «Bộ câu hỏi -
						Đáp án» — I. BỘ CÂU HỎI (Đề số 1…n + Câu) + II. ĐÁP ÁN
						(thang điểm). <strong>Mẫu A:</strong> txt ĐỀ THI SỐ n.{' '}
						<strong>Mẫu B:</strong> bảng gộp đề. Hỗ trợ{' '}
						<strong>.docx .txt</strong>.
					</p>
				</div>
				<div className='flex flex-wrap gap-2'>
					<Button
						type='button'
						size='sm'
						variant='default'
						className='h-8 text-xs'
						asChild
					>
						<a
							href={SAMPLE_BO_CH_DA}
							download='bo-cau-hoi-dap-an-hoan-chinh.docx'
						>
							<Download className='mr-1 h-3 w-3' />
							Mẫu C (.docx) — đầy đủ
						</a>
					</Button>
					<Button
						type='button'
						size='sm'
						variant='outline'
						className='h-8 text-xs'
						asChild
					>
						<a href={SAMPLE_BUNDLE} download='bo-de-mau.txt'>
							<Download className='mr-1 h-3 w-3' />
							Mẫu A (bộ đề)
						</a>
					</Button>
					<Button
						type='button'
						size='sm'
						variant='outline'
						className='h-8 text-xs'
						asChild
					>
						<a href={SAMPLE_GOP_DOCX} download='mau-de-gop.docx'>
							<Download className='mr-1 h-3 w-3' />
							Mẫu B (.docx)
						</a>
					</Button>
					<Button
						type='button'
						size='sm'
						variant='outline'
						className='h-8 text-xs'
						asChild
					>
						<a href={SAMPLE_GOP_TXT} download='mau-de-gop.txt'>
							<Download className='mr-1 h-3 w-3' />
							Mẫu B (.txt)
						</a>
					</Button>
				</div>
			</div>

			<div className='space-y-2 rounded-md border bg-background p-3'>
				<Label className='text-base'>File đề thi (docx / txt) *</Label>
				<input
					ref={bundleRef}
					type='file'
					className='hidden'
					accept='.txt,.docx,.odt,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.oasis.opendocument.text,text/plain'
					onChange={(e) =>
						void handleBundleFile(e.target.files?.[0] ?? null)
					}
				/>
				<div className='flex flex-wrap items-center gap-2'>
					<Button
						type='button'
						size='default'
						disabled={busy === 'bundle'}
						onClick={() => bundleRef.current?.click()}
					>
						{busy === 'bundle' ? (
							<Loader2 className='mr-2 h-4 w-4 animate-spin' />
						) : (
							<FileUp className='mr-2 h-4 w-4' />
						)}
						Chọn file .docx / .txt
					</Button>
					{shownFile && (
						<>
							<Badge
								variant='default'
								className='max-w-[16rem] truncate'
							>
								{shownFile.fileName}
							</Badge>
							<Button
								type='button'
								size='icon'
								variant='ghost'
								className='h-8 w-8'
								onClick={() => {
									onSourceFileChange?.(null)
									onQuestionFileChange?.(null)
									onAnswerFileChange?.(null)
									setPreview(null)
								}}
							>
								<Trash2 className='h-3.5 w-3.5 text-destructive' />
							</Button>
						</>
					)}
				</div>

				{preview && preview.papers.length > 0 && (
					<div className='mt-2 max-h-40 overflow-y-auto rounded border bg-muted/40 p-2 text-xs'>
						{preview.documentTitle && (
							<p className='mb-1 font-medium'>
								{preview.documentTitle}
							</p>
						)}
						<ul className='space-y-0.5'>
							{preview.papers.map((p, i) => {
								const pts = p.questions.reduce(
									(s, q) => s + (q.points || 0),
									0
								)
								const withAns = p.questions.filter((q) =>
									q.answer.trim()
								).length
								return (
									<li key={i}>
										<strong>{p.title}</strong> —{' '}
										{p.questions.length} câu · {pts} điểm ·{' '}
										{withAns}/{p.questions.length} có đáp án
									</li>
								)
							})}
						</ul>
					</div>
				)}
			</div>

			<details className='text-muted-foreground text-xs'>
				<summary className='cursor-pointer font-medium text-foreground'>
					Xem định dạng 2 mẫu
				</summary>
				<div className='mt-2 space-y-3'>
					<div>
						<p className='mb-1 font-medium text-foreground'>
							Mẫu A — bộ đề (Word/txt)
						</p>
						<pre className='bg-muted overflow-x-auto rounded p-2 whitespace-pre-wrap'>
							{`ĐỀ THI SỐ 1
Câu 1 (3 điểm): ...
Đáp án - Thang điểm
Câu 1 (3 điểm): ...`}
						</pre>
					</div>
					<div>
						<p className='mb-1 font-medium text-foreground'>
							Mẫu B — bảng gộp đề Word (De_thi_…_Gop_De.docx)
						</p>
						<pre className='bg-muted overflow-x-auto rounded p-2 whitespace-pre-wrap'>
							{`Đề số | Câu hỏi | Nội dung | Đáp án | Điểm
1 | 1 | Trình bày Nhà nước CHXHCN… | - Khái niệm (1,0đ)- Nhà nước của ND (0,5đ)- … (1,0đ) | 3
  | 2 | Phân tích tư tưởng HCM… | - Trung với nước (1,0đ)- Cần kiệm liêm chính (1,0đ)- … | 4
  | 3 | Trách nhiệm SV… | - Học tập (1,0đ)- Pháp luật (1,0đ)- … | 3

• Cột «Đáp án»: mỗi ý kèm (xđ) hoặc (x,yđ) / (x điểm)
• Ô «Đề số» trống = cùng đề với dòng trên (ô gộp)
• Cột «Điểm» = tổng điểm câu; không có thì cộng các ý trong ngoặc`}
						</pre>
					</div>
				</div>
			</details>

			{!hideLegacySplit && (
				<details className='rounded-md border bg-background p-3'>
					<summary className='cursor-pointer text-sm font-medium'>
						Tuỳ chọn: import 2 file riêng (câu hỏi + đáp án)
					</summary>
					<div className='mt-3 grid gap-3 sm:grid-cols-2'>
						<div className='space-y-2'>
							<Label>File câu hỏi</Label>
							<input
								ref={qRef}
								type='file'
								className='hidden'
								accept='.txt,.csv,.json,.docx,.odt'
								onChange={(e) =>
									void handleQuestionFile(
										e.target.files?.[0] ?? null
									)
								}
							/>
							<div className='flex flex-wrap items-center gap-2'>
								<Button
									type='button'
									size='sm'
									variant='outline'
									disabled={busy === 'q'}
									onClick={() => qRef.current?.click()}
								>
									{busy === 'q' ? (
										<Loader2 className='mr-1 h-3 w-3 animate-spin' />
									) : (
										<FileUp className='mr-1 h-3 w-3' />
									)}
									Chọn file CH
								</Button>
								{questionFile && (
									<Badge
										variant='secondary'
										className='max-w-[10rem] truncate'
									>
										{questionFile.fileName}
									</Badge>
								)}
							</div>
						</div>
						<div className='space-y-2'>
							<Label>File đáp án</Label>
							<input
								ref={aRef}
								type='file'
								className='hidden'
								accept='.txt,.csv,.json,.docx,.odt'
								onChange={(e) =>
									void handleAnswerFile(
										e.target.files?.[0] ?? null
									)
								}
							/>
							<div className='flex flex-wrap items-center gap-2'>
								<Button
									type='button'
									size='sm'
									variant='outline'
									disabled={busy === 'a'}
									onClick={() => aRef.current?.click()}
								>
									{busy === 'a' ? (
										<Loader2 className='mr-1 h-3 w-3 animate-spin' />
									) : (
										<FileUp className='mr-1 h-3 w-3' />
									)}
									Chọn file ĐA
								</Button>
								{answerFile && (
									<Badge
										variant='secondary'
										className='max-w-[10rem] truncate'
									>
										{answerFile.fileName}
									</Badge>
								)}
							</div>
						</div>
					</div>
				</details>
			)}
		</div>
	)
}
