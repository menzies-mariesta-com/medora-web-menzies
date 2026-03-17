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

	return {
		get visitId() {
			return visitId;
		},
		set visitId(v: string) {
			visitId = v;
		},
		get patientName() {
			return patientName;
		},
		set patientName(v: string) {
			patientName = v;
		},

		select(data: { visitId: number; patientName: string }) {
			visitId = String(data.visitId);
			patientName = data.patientName;
		},

		reset() {
			visitId = '';
			patientName = '';
		}
	};
})();
