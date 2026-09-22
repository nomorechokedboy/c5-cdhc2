import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from '@repo/ui/components/ui/input'

export type ConductParse = { ok: true; value: number | null } | { ok: false }

/** Rèn luyện is 0 to 10 with at most one decimal; blank means "delete". */
export function parseConduct(text: string): ConductParse {
	const s = text.trim().replace(',', '.')
	if (s === '') return { ok: true, value: null }
	if (!/^\d{1,2}(\.\d)?$/.test(s)) return { ok: false }
	const value = Number(s)
	return value >= 0 && value <= 10 ? { ok: true, value } : { ok: false }
}

const show = (value: number | null) => (value === null ? '' : value.toFixed(1))

interface ConductInputProps {
	value: number | null
	ariaLabel: string
	onSave: (value: number | null) => void
}

export function ConductInput({ value, ariaLabel, onSave }: ConductInputProps) {
	const { t } = useTranslation()
	const [text, setText] = useState(show(value))
	const [invalid, setInvalid] = useState(false)

	useEffect(() => {
		setText(show(value))
		setInvalid(false)
	}, [value])

	const commit = () => {
		const parsed = parseConduct(text)
		if (!parsed.ok) {
			setInvalid(true)
			return
		}
		setInvalid(false)
		if (parsed.value !== value) onSave(parsed.value)
	}

	return (
		<Input
			inputMode='decimal'
			aria-label={ariaLabel}
			aria-invalid={invalid}
			title={invalid ? t('report.conduct.invalid') : undefined}
			value={text}
			onChange={(e) => setText(e.target.value)}
			onBlur={commit}
			onKeyDown={(e) => {
				if (e.key === 'Enter') e.currentTarget.blur()
				if (e.key === 'Escape') {
					setText(show(value))
					setInvalid(false)
				}
			}}
			className='score mx-auto h-8 w-16 text-center'
		/>
	)
}
