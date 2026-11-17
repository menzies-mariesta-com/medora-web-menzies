/** Per-page permission actions stored in `user_group_page.action_code`. */
export enum PageActionEnum {
	VIEW = 'view',
	CREATE = 'create',
	EDIT = 'edit',
	DELETE = 'delete',
	APPROVE = 'approve',
	CANCEL = 'cancel',
	ISSUE = 'issue',
	RECEIVE = 'receive',
	PRINT = 'print',
	EXPORT = 'export',
	UPLOAD = 'upload'
}

/** Permissions a page offers when the catalog has no entry for it. */
export const DEFAULT_PAGE_ACTIONS: PageActionEnum[] = [
	PageActionEnum.VIEW,
	PageActionEnum.CREATE,
	PageActionEnum.EDIT,
	PageActionEnum.DELETE
];

export const PAGE_ACTION_VALUES: PageActionEnum[] =
	Object.values(PageActionEnum);

export function isPageAction(
	value: unknown
): value is PageActionEnum {
	return (
		typeof value === 'string' &&
		(PAGE_ACTION_VALUES as string[]).includes(value)
	);
}
