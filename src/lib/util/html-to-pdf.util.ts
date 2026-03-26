import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * Rasterizes HTML (full document string) to a multi-page A4 PDF in the browser.
 * For use only in the browser (client-side).
 */
export async function htmlStringToPdfBlob(
	html: string
): Promise<Blob> {
	const iframe = document.createElement('iframe');
	iframe.setAttribute('title', 'pdf-render');
	iframe.style.cssText =
		'position:fixed;left:-12000px;top:0;width:794px;min-height:400px;border:0;visibility:hidden;';
	document.body.appendChild(iframe);

	try {
		const win = iframe.contentWindow;
		const doc = iframe.contentDocument;
		if (!win || !doc) {
			throw new Error('iframe document unavailable');
		}
		doc.open();
		doc.write(html);
		doc.close();

		await new Promise<void>((resolve) => {
			win.requestAnimationFrame(() => {
				setTimeout(() => resolve(), 250);
			});
		});

		const body = doc.body;
		const canvas = await html2canvas(body, {
			scale: 1.5,
			useCORS: true,
			logging: false,
			windowWidth: body.scrollWidth,
			windowHeight: body.scrollHeight
		});

		const imgData = canvas.toDataURL('image/png');
		const pdf = new jsPDF({
			orientation: 'p',
			unit: 'mm',
			format: 'a4'
		});
		const pageWidth = pdf.internal.pageSize.getWidth();
		const pageHeight = pdf.internal.pageSize.getHeight();
		const imgWidth = pageWidth;
		const imgHeight = (canvas.height * pageWidth) / canvas.width;

		let heightLeft = imgHeight;
		let position = 0;

		pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
		heightLeft -= pageHeight;

		while (heightLeft > 0) {
			position = heightLeft - imgHeight;
			pdf.addPage();
			pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
			heightLeft -= pageHeight;
		}

		return pdf.output('blob');
	} finally {
		iframe.remove();
	}
}

export async function uploadPatientAttachmentPdf(
	file: Blob,
	filename: string
): Promise<string> {
	const formData = new FormData();
	formData.append(
		'file',
		new File([file], filename, { type: 'application/pdf' })
	);
	const res = await fetch('/api/upload/patient-attachment', {
		method: 'POST',
		body: formData
	});
	const data = (await res.json()) as { url?: string; error?: string };
	if (!res.ok) {
		throw new Error(data.error ?? 'Upload failed');
	}
	if (!data.url) {
		throw new Error('Upload returned no URL');
	}
	return data.url;
}
