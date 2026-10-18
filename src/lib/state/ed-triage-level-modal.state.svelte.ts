import type { EdTriageLevelRow } from '$lib/model/type/medora/er/er.type';

export type EdTriageLevelModalMode = 'create' | 'edit';

class EdTriageLevelModalStateClass {
	mode = $state<EdTriageLevelModalMode>('create');
	editRow = $state<EdTriageLevelRow | null>(null);

	openCreate() {
		this.mode = 'create';
		this.editRow = null;
	}

	openEdit(row: EdTriageLevelRow) {
		this.mode = 'edit';
		this.editRow = row;
	}
}

export const EdTriageLevelModalState = new EdTriageLevelModalStateClass();
