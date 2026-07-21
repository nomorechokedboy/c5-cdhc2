/**
 * Trích chữ ký từ ảnh upload: bỏ nền trắng/sáng → PNG trong suốt,
 * crop khung chứa nét chữ ký. Dùng khi lưu chữ ký và khi dán vào form/in.
 */

export type ExtractSignatureOptions = {
	/** Độ sáng (0–255) coi là nền — mặc định 245 (gần trắng) */
	bgThreshold?: number
	/** Max cạnh dài output (px) */
	maxEdge?: number
}

/**
 * Đọc File / data URL / blob URL → data URL PNG (nền trong suốt + crop).
 */
export async function extractSignatureFromImage(
	source: File | string | Blob,
	opts: ExtractSignatureOptions = {}
): Promise<string> {
	const bgThreshold = opts.bgThreshold ?? 245
	const maxEdge = opts.maxEdge ?? 800

	const objectUrl =
		typeof source === 'string' ? source : URL.createObjectURL(source)

	try {
		const img = await loadImage(objectUrl)
		const w = img.naturalWidth || img.width
		const h = img.naturalHeight || img.height
		if (!w || !h) throw new Error('Không đọc được kích thước ảnh chữ ký')

		const canvas = document.createElement('canvas')
		canvas.width = w
		canvas.height = h
		const ctx = canvas.getContext('2d', { willReadFrequently: true })
		if (!ctx) throw new Error('Trình duyệt không hỗ trợ canvas')
		ctx.drawImage(img, 0, 0)

		const imageData = ctx.getImageData(0, 0, w, h)
		const d = imageData.data

		// Ước lượng màu nền từ 4 góc
		const corners = [
			pixelAt(d, w, 0, 0),
			pixelAt(d, w, w - 1, 0),
			pixelAt(d, w, 0, h - 1),
			pixelAt(d, w, w - 1, h - 1)
		]
		const bgR = avg(corners.map((p) => p.r))
		const bgG = avg(corners.map((p) => p.g))
		const bgB = avg(corners.map((p) => p.b))

		let minX = w
		let minY = h
		let maxX = 0
		let maxY = 0
		let ink = 0

		for (let y = 0; y < h; y++) {
			for (let x = 0; x < w; x++) {
				const i = (y * w + x) * 4
				const r = d[i]!
				const g = d[i + 1]!
				const b = d[i + 2]!
				const a = d[i + 3]!

				// Đã trong suốt
				if (a < 20) {
					d[i + 3] = 0
					continue
				}

				const lum = 0.299 * r + 0.587 * g + 0.114 * b
				const distBg = Math.sqrt(
					(r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2
				)

				// Nền sáng / gần màu góc → trong suốt
				const isBg =
					lum >= bgThreshold ||
					distBg < 28 ||
					(r > 230 && g > 230 && b > 230)

				if (isBg) {
					d[i + 3] = 0
					continue
				}

				// Làm nét chữ ký đậm hơn một chút trên nền trong suốt
				// (giữ màu mực, alpha full)
				d[i + 3] = 255
				ink++
				if (x < minX) minX = x
				if (y < minY) minY = y
				if (x > maxX) maxX = x
				if (y > maxY) maxY = y
			}
		}

		if (ink < 30) {
			throw new Error(
				'Không nhận diện được nét chữ ký — chụp/scan nền trắng, chữ ký đậm hơn'
			)
		}

		ctx.putImageData(imageData, 0, 0)

		// Crop + padding
		const pad = 4
		minX = Math.max(0, minX - pad)
		minY = Math.max(0, minY - pad)
		maxX = Math.min(w - 1, maxX + pad)
		maxY = Math.min(h - 1, maxY + pad)
		const cw = maxX - minX + 1
		const ch = maxY - minY + 1

		let outW = cw
		let outH = ch
		if (Math.max(cw, ch) > maxEdge) {
			const scale = maxEdge / Math.max(cw, ch)
			outW = Math.max(1, Math.round(cw * scale))
			outH = Math.max(1, Math.round(ch * scale))
		}

		const out = document.createElement('canvas')
		out.width = outW
		out.height = outH
		const octx = out.getContext('2d')
		if (!octx) throw new Error('Canvas output lỗi')
		octx.clearRect(0, 0, outW, outH)
		octx.drawImage(canvas, minX, minY, cw, ch, 0, 0, outW, outH)

		return out.toDataURL('image/png')
	} finally {
		if (typeof source !== 'string' || !source.startsWith('data:')) {
			if (objectUrl.startsWith('blob:')) URL.revokeObjectURL(objectUrl)
		}
	}
}

function loadImage(src: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const img = new Image()
		img.onload = () => resolve(img)
		img.onerror = () => reject(new Error('Không tải được ảnh chữ ký'))
		// data URL / same origin — không cần crossOrigin
		if (!src.startsWith('data:')) {
			img.crossOrigin = 'anonymous'
		}
		img.src = src
	})
}

function pixelAt(data: Uint8ClampedArray, w: number, x: number, y: number) {
	const i = (y * w + x) * 4
	return { r: data[i]!, g: data[i + 1]!, b: data[i + 2]!, a: data[i + 3]! }
}

function avg(nums: number[]) {
	return nums.reduce((a, b) => a + b, 0) / (nums.length || 1)
}

/** File → data URL gốc (chưa extract) — dùng preview nhanh */
export function fileToDataUrl(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		if (file.size > 2_000_000) {
			reject(new Error('Ảnh chữ ký tối đa ~2MB'))
			return
		}
		const reader = new FileReader()
		reader.onload = () => resolve(String(reader.result || ''))
		reader.onerror = () => reject(reader.error || new Error('Đọc file lỗi'))
		reader.readAsDataURL(file)
	})
}
