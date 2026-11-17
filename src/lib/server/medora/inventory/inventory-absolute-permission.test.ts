import { describe, expect, it } from 'vitest';
import {
	RoleEnum,
	InvDepartmentIndentStatusTaggingEnum,
	InvDepartmentConsumptionStatusTaggingEnum
} from '$lib/model/enum/db-link';
import { checkUserCanCancelDepartmentIndent } from '$lib/server/medora/inventory/department-indent.server';
import { computeCanManageOpenConsumption } from '$lib/server/medora/inventory/department-consumption.server';

const OWNER = 'user-owner';
const REQUESTER = 'user-requester';
const BYSTANDER = 'user-bystander';

function indent(
	requestedBy: string,
	statusTaggingId: InvDepartmentIndentStatusTaggingEnum
) {
	return { requestedBy, statusTaggingId };
}

describe('absolute permission: department indent cancel', () => {
	it('lets the owner withdraw a pending indent they did not create', async () => {
		await expect(
			checkUserCanCancelDepartmentIndent(
				'h',
				indent(
					REQUESTER,
					InvDepartmentIndentStatusTaggingEnum.PENDING
				),
				OWNER,
				RoleEnum.OWNER
			)
		).resolves.toBe(true);
		await expect(
			checkUserCanCancelDepartmentIndent(
				'h',
				indent(
					REQUESTER,
					InvDepartmentIndentStatusTaggingEnum.PENDING_CENTRAL
				),
				OWNER,
				RoleEnum.SYSTEM_ADMIN
			)
		).resolves.toBe(true);
	});

	it('keeps staff requester-only', async () => {
		const pending = indent(
			REQUESTER,
			InvDepartmentIndentStatusTaggingEnum.PENDING
		);
		await expect(
			checkUserCanCancelDepartmentIndent(
				'h',
				pending,
				REQUESTER,
				RoleEnum.STAFF
			)
		).resolves.toBe(true);
		await expect(
			checkUserCanCancelDepartmentIndent(
				'h',
				pending,
				BYSTANDER,
				RoleEnum.STAFF
			)
		).resolves.toBe(false);
	});

	it('never cancels a terminal indent, even for the owner', async () => {
		await expect(
			checkUserCanCancelDepartmentIndent(
				'h',
				indent(
					REQUESTER,
					InvDepartmentIndentStatusTaggingEnum.RECEIVED
				),
				OWNER,
				RoleEnum.OWNER
			)
		).resolves.toBe(false);
	});

	it('denies a signed-out caller', async () => {
		await expect(
			checkUserCanCancelDepartmentIndent(
				'h',
				indent(
					REQUESTER,
					InvDepartmentIndentStatusTaggingEnum.PENDING
				),
				null,
				null
			)
		).resolves.toBe(false);
	});
});

describe('absolute permission: department consumption manage', () => {
	const base = {
		hospitalId: 'h',
		storeId: 1,
		staffId: null
	};

	it('lets the admin team manage a pending document they did not create', async () => {
		await expect(
			computeCanManageOpenConsumption({
				...base,
				requestedBy: REQUESTER,
				userId: OWNER,
				statusTaggingId:
					InvDepartmentConsumptionStatusTaggingEnum.PENDING,
				roleId: RoleEnum.ADMIN_TEAM
			})
		).resolves.toBe(true);
	});

	it('keeps staff requester-only and rejects a bystander', async () => {
		await expect(
			computeCanManageOpenConsumption({
				...base,
				requestedBy: REQUESTER,
				userId: REQUESTER,
				statusTaggingId:
					InvDepartmentConsumptionStatusTaggingEnum.PENDING,
				roleId: RoleEnum.STAFF
			})
		).resolves.toBe(true);
		await expect(
			computeCanManageOpenConsumption({
				...base,
				requestedBy: REQUESTER,
				userId: BYSTANDER,
				statusTaggingId:
					InvDepartmentConsumptionStatusTaggingEnum.PENDING,
				roleId: RoleEnum.STAFF
			})
		).resolves.toBe(false);
	});

	it('blocks every role once the document is no longer pending', async () => {
		await expect(
			computeCanManageOpenConsumption({
				...base,
				requestedBy: REQUESTER,
				userId: OWNER,
				statusTaggingId:
					InvDepartmentConsumptionStatusTaggingEnum.POSTED,
				roleId: RoleEnum.OWNER
			})
		).resolves.toBe(false);
	});
});
