/**
 * Square crop box for a camera frame capture.
 *
 * The patient photo circle is square, so capture the centred square of the
 * video frame. Never upscales: a smaller frame keeps its own size.
 */
export function captureFrameSize(
	width: number,
	height: number,
	maxSize: number
): { size: number; x: number; y: number } {
	const source = Math.min(width, height);
	if (!Number.isFinite(source) || source <= 0) {
		return { size: 0, x: 0, y: 0 };
	}
	const size = Math.round(Math.min(source, maxSize));
	return {
		size,
		x: Math.round((width - size) / 2),
		y: Math.round((height - size) / 2)
	};
}
