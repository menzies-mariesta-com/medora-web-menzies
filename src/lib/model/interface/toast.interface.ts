import type { StatusColorEnum } from '../enum/color.enum';

export interface ToastInterface {
	id: number;
	message: string;
	type: StatusColorEnum;
	/** Optional second line (smaller text), e.g. server or validation detail */
	detail?: string;
}
