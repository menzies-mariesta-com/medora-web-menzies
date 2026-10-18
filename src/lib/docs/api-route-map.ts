/**
 * Maps Medora page_url prefixes to API path segments for documentation cross-links.
 */
export const API_ROUTE_PREFIX_BY_PAGE_SEGMENT: Record<string, string> = {
	registration: '/api/medora/hospital/{hospital_id}/home/registration',
	'nursing-workbench': '/api/medora/hospital/{hospital_id}/home/nursing-workbench',
	consultation: '/api/medora/hospital/{hospital_id}/home/consultation',
	billing: '/api/medora/hospital/{hospital_id}/home/billing',
	inventory: '/api/medora/hospital/{hospital_id}/home/inventory',
	diagnostics: '/api/medora/hospital/{hospital_id}/home/diagnostics'
};
