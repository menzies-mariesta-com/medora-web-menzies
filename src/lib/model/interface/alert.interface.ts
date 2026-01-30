import type { StatusColorEnum } from '../enum/color.enum';

export interface AlertInterface {
	id: number;
	message: string;
	type: StatusColorEnum;
}
