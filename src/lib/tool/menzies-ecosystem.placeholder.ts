import type { MenziesEcosystemProduct } from '$lib/model/type/menzies-ecosystem.type';

/**
 * Placeholder subscription state until owner plan APIs are wired.
 * Toggle `purchased` and set `externalUrl` when integrating each product SSO/deep link.
 */
export function getMenziesEcosystemProductsPlaceholder(): MenziesEcosystemProduct[] {
	return [
		{
			id: 'nextup',
			purchased: false,
			externalUrl: 'https://nextup.menzies.example'
		},
		{
			id: 'medora_patients',
			purchased: false,
			externalUrl: 'https://patients.medora.menzies.example'
		},
		{
			id: 'medora_doctors',
			purchased: false,
			externalUrl: 'https://doctors.medora.menzies.example'
		}
	];
}
