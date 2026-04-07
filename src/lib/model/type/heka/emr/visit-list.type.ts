export type VisitStatusCode = 'open' | 'vital' | 'seen' | 'closed';

export type PatientVisitForEmrList = {
	id: number;
	visitNo: string | null;
	createdAt?: string | Date | null;
	visitStatus: VisitStatusCode;
	visitType: { id: number; name: string | null } | null;
	hospital: { id: string; name: string | null } | null;
	branch: { id: string; name: string | null } | null;
	doctor:
		| {
				id: string;
				firstName: string | null;
				middleName: string | null;
				lastName: string | null;
				title: { name: string | null } | null;
		  }
		| null;
	patient:
		| {
				id: string;
				code: string | null;
				firstName: string | null;
				middleName: string | null;
				lastName: string | null;
				dateOfBirth?: string | null;
				title?: { name: string | null } | null;
				gender?: { name: string | null } | null;
		  }
		| null;
};

export type VisitTypeOption = { id: number; name: string | null };

