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
	let patientId = $state('');
	/** ISO timestamp from `patient_visit.clinical_signed_at` when the selected visit is locked. */
	let clinicalSignedAt = $state<string | null>(null);
	/** Bumped on clinical sign/unsign so pages can reload visit status tagging. */
	let clinicalSignRevision = $state(0);
	/** Bumped after bulk bill close so the bill page reloads lines. */
	let billingRefreshRevision = $state(0);

	if (typeof window !== 'undefined') {
		const storedVisit = window.sessionStorage.getItem('heka_visitId');
		const storedName = window.sessionStorage.getItem(
			'heka_patientName'
		);
		const storedPatientId = window.sessionStorage.getItem(
			'heka_patientId'
		);
		if (storedVisit) visitId = storedVisit;
		if (storedName) patientName = storedName;
		if (storedPatientId) patientId = storedPatientId;
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
		get patientId() {
			return patientId;
		},
		set patientId(v: string) {
			patientId = v;
			if (typeof window !== 'undefined') {
				if (v) window.sessionStorage.setItem('heka_patientId', v);
				else window.sessionStorage.removeItem('heka_patientId');
			}
		},

		get clinicalSignedAt() {
			return clinicalSignedAt;
		},

		get clinicalSignRevision() {
			return clinicalSignRevision;
		},

		/** Call when `getPatientVisitByIdWithRelations` (or equivalent) loads the current visit row. */
		setClinicalSignedAtFromVisit(iso: string | null | undefined) {
			const next =
				iso == null || String(iso).trim() === '' ? null : String(iso);
			clinicalSignedAt = next;
		},

		/** Call after visit.sign / visit.unsign so dependents reload visit status. */
		notifyClinicalSignChanged() {
			clinicalSignRevision += 1;
		},

		get billingRefreshRevision() {
			return billingRefreshRevision;
		},

		notifyBillingDataChanged() {
			billingRefreshRevision += 1;
		},

		get isClinicalVisitReadOnly() {
			return clinicalSignedAt != null && clinicalSignedAt !== '';
		},

		select(data: { visitId: string; patientName: string }) {
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
			patientId = '';
			clinicalSignedAt = null;
			if (typeof window !== 'undefined') {
				window.sessionStorage.removeItem('heka_visitId');
				window.sessionStorage.removeItem('heka_patientName');
				window.sessionStorage.removeItem('heka_patientId');
			}
		}
	};
})();
