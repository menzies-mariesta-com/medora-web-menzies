import type { StatusColorEnum } from '$lib/model/enum/color.enum';
import type { AlertInterface } from '$lib/model/interface/alert.interface';
import { AlertState } from '$lib/state/alert.state.svelte';

export class AlertService {
	addAlert(message: string, type: StatusColorEnum) {
		const newAlert: AlertInterface = {
			id: Date.now(),
			message,
			type
		};
		AlertState.push(newAlert);

		// Auto-remove after 5s
		setTimeout(() => this.removeAlert(newAlert.id), 5000);
	}

	removeAlert(id: number) {
		const index = AlertState.findIndex((a) => a.id === id);
		if (index !== -1) {
			AlertState.splice(index, 1);
		}
	}

	clearAll() {
		AlertState.splice(0, AlertState.length);
	}
}
