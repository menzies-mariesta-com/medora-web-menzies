import type { DialogInterface } from '$lib/model/interface/dialog.interface';

export const DialogState = $state<{ current: DialogInterface | null }>({ current: null });
