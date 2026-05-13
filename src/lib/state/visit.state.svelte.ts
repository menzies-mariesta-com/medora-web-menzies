/**
 * Shared visit selection state.
 *
 * Any section that needs the currently-selected visit (nursing EMR, CPOE,
 * observation EMR, etc.) reads / writes through this singleton so the
 * selection persists when the user navigates between those sections.
 */
export const VisitState = (() => {
	let visitId = $state('');
	let patientName = $state('');
	/** ISO timestamp from `patient_visit.clinical_signed_at` when the selected visit is locked. */
	let clinicalSignedAt = $state<string | null>(null);

	if (typeof window !== 'undefined') {
		const storedVisit = window.sessionStorage.getItem('heka_visitId');
		const storedName = window.sessionStorage.getItem(
			'heka_patientName'
		);
		if (storedVisit) visitId = storedVisit;
		if (storedName) patientName = storedName;
	}

	return {
		get visitId() {
			return visitId;
		},
		set visitId(v: string) {
			visitId = v;
			if (typeof window !== 'undefined')
				window.sessionStorage.setItem('heka_visitId', v);
		},
		get patientName() {
			return patientName;
		},
		set patientName(v: string) {
			patientName = v;
			if (typeof window !== 'undefined')
				window.sessionStorage.setItem('heka_patientName', v);
		},

		get clinicalSignedAt() {
			return clinicalSignedAt;
		},

		/** Call when `getPatientVisitByIdWithRelations` (or equivalent) loads the current visit row. */
		setClinicalSignedAtFromVisit(iso: string | null | undefined) {
			const next =
				iso == null || String(iso).trim() === '' ? null : String(iso);
			clinicalSignedAt = next;
		},

		get isClinicalVisitReadOnly() {
			return clinicalSignedAt != null && clinicalSignedAt !== '';
		},

		select(data: { visitId: number | string; patientName: string }) {
			visitId = String(data.visitId);
			patientName = data.patientName;
			if (typeof window !== 'undefined') {
				window.sessionStorage.setItem('heka_visitId', visitId);
				window.sessionStorage.setItem(
					'heka_patientName',
					patientName
				);
			}
		},

		reset() {
			visitId = '';
			patientName = '';
			clinicalSignedAt = null;
			if (typeof window !== 'undefined') {
				window.sessionStorage.removeItem('heka_visitId');
				window.sessionStorage.removeItem('heka_patientName');
			}
		}
	};
})();
