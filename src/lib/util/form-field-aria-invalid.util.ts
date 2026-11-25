/** Keep aria-invalid in sync with :user-invalid (accessible-error-announcement). */
export function syncFormControlAriaInvalid(el: Element) {
	if (!(el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement)) {
		return;
	}
	const invalid = el.matches(':user-invalid');
	el.setAttribute('aria-invalid', invalid ? 'true' : 'false');
}

export function attachFormFieldAriaInvalidSync(el: HTMLElement | null): (() => void) | void {
	if (!el) return;

	const update = () => {
		if (el instanceof HTMLFormElement) {
			for (const control of el.elements) {
				if (control instanceof HTMLElement) syncFormControlAriaInvalid(control);
			}
			return;
		}
		syncFormControlAriaInvalid(el);
	};

	update();
	const events = ['blur', 'change', 'input', 'invalid'] as const;
	for (const type of events) {
		el.addEventListener(type, update);
	}
	el.addEventListener('reset', update);

	return () => {
		for (const type of events) {
			el.removeEventListener(type, update);
		}
		el.removeEventListener('reset', update);
	};
}