/**
 * Sửa đề nháp / trả lại
 */
import { useEffect, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Loader2, Save, Send } from 'lucide-react'
import { toast } from 'sonner'
import { GetExam, SubmitExam, UpdateExam } from '@/api/exam'
import ExamFileImport, { type ExamAttachedFile } from './ExamFileImport'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type QForm = { content: string; answer: string; points: string }

export default function ExamEditorPage({ examId }: { examId: number }) {
	const nav = useNavigate()
	const qc = useQueryClient()
	const [title, setTitle] = useState('')
	const [note, setNote] = useState('')
	const [questions, setQuestions] = useState<QForm[]>([])
	const [qFile, setQFile] = useState<ExamAttachedFile | null>(null)
	const [aFile, setAFile] = useState<ExamAttachedFile | null>(null)

	const examQ = useQuery({
		queryKey: ['exam', examId],
		queryFn: () => GetExam(examId)
	})

	useEffect(() => {
		const e = examQ.data
		if (!e) return
		setTitle(e.title)
		setNote(e.note || '')
		setQuestions(
			(e.questions || []).map((q) => ({
				content: q.content,
				answer: q.answer || '',
				points: String(q.points ?? 1)
			}))
		)
		if (!e.questions?.length) {
			setQuestions([{ content: '', answer: '', points: '1' }])
		}
		setQFile(
			e.questionFileName
				? {
						fileName: e.questionFileName,
						fileUrl: e.questionFileUrl
					}
				: null
		)
		setAFile(
			e.answerFileName
				? {
						fileName: e.answerFileName,
						fileUrl: e.answerFileUrl
					}
				: null
		)
	}, [examQ.data])

	function buildBody() {
		return {
			title,
			note: note || undefined,
			questionFileName: qFile?.fileName ?? null,
			questionFileUrl: qFile?.fileUrl ?? null,
			answerFileName: aFile?.fileName ?? null,
			answerFileUrl: aFile?.fileUrl ?? null,
			questions: questions
				.filter((q) => q.content.trim() || q.answer.trim())
				.map((q, i) => ({
					questionNumber: i + 1,
					content: q.content || `(Câu ${i + 1})`,
					answer: q.answer,
					points: Number(q.points) || 1
				}))
		}
	}

	function assertImportOk() {
		const hasQ =
			!!qFile?.fileName || questions.some((q) => q.content.trim())
		const hasA =
			!!aFile?.fileName ||
			!!qFile?.fileName || // 1 file Word chứa cả CH + ĐA
			questions.some((q) => q.answer.trim())
		if (!hasQ) throw new Error('Hãy import file đề (Word/txt)')
		if (!hasA) {
			throw new Error(
				'Đề cần có đáp án (trong file Word phần «Đáp án - Thang điểm» hoặc form)'
			)
		}
	}

	const saveMut = useMutation({
		mutationFn: () => {
			assertImportOk()
			return UpdateExam(examId, buildBody())
		},
		onSuccess: () => {
			toast.success('Đã lưu (import file)')
			void qc.invalidateQueries({ queryKey: ['exam', examId] })
			void qc.invalidateQueries({ queryKey: ['exam-mine'] })
		},
		onError: (e: Error) => toast.error(e.message)
	})

	const submitMut = useMutation({
		mutationFn: async () => {
			assertImportOk()
			await UpdateExam(examId, buildBody())
			return SubmitExam(examId)
		},
		onSuccess: () => {
			toast.success('Đã gửi duyệt')
			void nav({ to: '/de-thi/cua-toi' })
		},
		onError: (e: Error) => toast.error(e.message)
	})

	if (examQ.isLoading) {
		return (
			<div className='flex justify-center p-16'>
				<Loader2 className='h-8 w-8 animate-spin' />
			</div>
		)
	}

	const exam = examQ.data
	if (!exam) {
		return <div className='p-6'>Không tìm thấy đề</div>
	}
	if (exam.locked || !['DRAFT', 'RETURNED'].includes(exam.status)) {
		return (
			<div className='space-y-3 p-6'>
				<p>Đề không thể sửa ở trạng thái hiện tại.</p>
				<Button asChild>
					<Link
						to='/de-thi/chi-tiet/$id'
						params={{ id: String(examId) }}
					>
						Xem chi tiết
					</Link>
				</Button>
			</div>
		)
	}

	return (
		<div className='mx-auto max-w-3xl space-y-6 p-4 md:p-6'>
			<Button variant='ghost' size='sm' asChild className='-ml-2'>
				<Link to='/de-thi/cua-toi'>
					<ArrowLeft className='mr-1 h-4 w-4' />
					Quay lại
				</Link>
			</Button>
			<div>
				<h1 className='text-2xl font-semibold'>Sửa đề thi</h1>
				<p className='text-muted-foreground font-mono text-sm'>
					{exam.code}
				</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className='text-base'>Nội dung</CardTitle>
				</CardHeader>
				<CardContent className='space-y-4'>
					<p className='text-muted-foreground text-sm'>
						Import <strong>1 file Word/txt</strong> theo cấu trúc ĐỀ
						THI SỐ n → câu hỏi → Đáp án - Thang điểm (hoặc 2 file
						riêng).
					</p>
					<div>
						<Label>Tiêu đề</Label>
						<Input
							value={title}
							onChange={(e) => setTitle(e.target.value)}
						/>
					</div>
					<ExamFileImport
						sourceFile={qFile}
						onSourceFileChange={setQFile}
						questionFile={qFile}
						answerFile={aFile}
						onQuestionFileChange={setQFile}
						onAnswerFileChange={setAFile}
						currentQuestions={questions.map((q, i) => ({
							questionNumber: i + 1,
							content: q.content,
							answer: q.answer,
							points: Number(q.points) || 1
						}))}
						onQuestionsParsed={(qs) =>
							setQuestions(
								qs.map((q) => ({
									content: q.content,
									answer: q.answer,
									points: String(q.points || 1)
								}))
							)
						}
						onDocumentParsed={(doc) => {
							// Khi sửa 1 đề: nếu file nhiều đề, lấy đề đầu (hoặc khớp số trong tiêu đề)
							const papers = doc.papers
							if (!papers.length) return
							const numMatch = title.match(/(?:số|đề)\s*(\d+)/i)
							const want = numMatch ? Number(numMatch[1]) : null
							const paper =
								(want != null &&
									papers.find(
										(p) => p.examNumber === want
									)) ||
								papers[0]!
							setQuestions(
								paper.questions.map((q) => ({
									content: q.content,
									answer: q.answer,
									points: String(q.points || 1)
								}))
							)
							if (!title.trim()) setTitle(paper.title)
						}}
					/>
					<details className='rounded-lg border p-3'>
						<summary className='cursor-pointer text-sm font-medium'>
							Tuỳ chọn: chỉnh form từng câu (không bắt buộc)
						</summary>
						<div className='mt-3'>
							<div className='mb-2 flex justify-between'>
								<Label>Câu hỏi (form)</Label>
								<Button
									size='sm'
									variant='outline'
									onClick={() =>
										setQuestions((qs) => [
											...qs,
											{
												content: '',
												answer: '',
												points: '1'
											}
										])
									}
								>
									Thêm câu
								</Button>
							</div>
							<div className='space-y-3'>
								{questions.map((q, idx) => (
									<div
										key={idx}
										className='space-y-2 rounded border p-3'
									>
										<div className='flex items-center justify-between'>
											<span className='text-sm font-medium'>
												Câu {idx + 1}
											</span>
											<Input
												className='w-20'
												value={q.points}
												onChange={(e) => {
													const v = e.target.value
													setQuestions((qs) =>
														qs.map((x, i) =>
															i === idx
																? {
																		...x,
																		points: v
																	}
																: x
														)
													)
												}}
											/>
										</div>
										<Textarea
											placeholder='Câu hỏi'
											value={q.content}
											onChange={(e) => {
												const v = e.target.value
												setQuestions((qs) =>
													qs.map((x, i) =>
														i === idx
															? {
																	...x,
																	content: v
																}
															: x
													)
												)
											}}
										/>
										<Textarea
											placeholder='Đáp án'
											value={q.answer}
											onChange={(e) => {
												const v = e.target.value
												setQuestions((qs) =>
													qs.map((x, i) =>
														i === idx
															? {
																	...x,
																	answer: v
																}
															: x
													)
												)
											}}
										/>
									</div>
								))}
							</div>
						</div>
					</details>
					<div>
						<Label>Ghi chú</Label>
						<Textarea
							value={note}
							onChange={(e) => setNote(e.target.value)}
						/>
					</div>
					<div className='flex gap-2'>
						<Button
							variant='outline'
							disabled={saveMut.isPending}
							onClick={() => saveMut.mutate()}
						>
							{saveMut.isPending ? (
								<Loader2 className='mr-2 h-4 w-4 animate-spin' />
							) : (
								<Save className='mr-2 h-4 w-4' />
							)}
							Lưu
						</Button>
						<Button
							disabled={submitMut.isPending}
							onClick={() => submitMut.mutate()}
						>
							{submitMut.isPending ? (
								<Loader2 className='mr-2 h-4 w-4 animate-spin' />
							) : (
								<Send className='mr-2 h-4 w-4' />
							)}
							Lưu & gửi duyệt
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
