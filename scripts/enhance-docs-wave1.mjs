import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const contentDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src/lib/docs/content/workflows');

const pages = {
	'registration-patient-registration': {
		title: 'Patient registration',
		roles: 'Registration clerk, front desk',
		steps: [
			'Capture demographics and identifiers.',
			'Assign patient code and photo if used.',
			'Link to visit or appointment when scheduling.'
		]
	},
	'nursing-workbench-clinical-document': {
		title: 'Clinical document',
		roles: 'Nurse, physician',
		steps: [
			'Open visit context in the nursing chart.',
			'Choose an enabled hospital template or custom document.',
			'Print or save to the patient chart with placeholders merged.'
		]
	},
	'consultation-cpoe-prescription': {
		title: 'CPOE prescription',
		roles: 'Physician, prescriber',
		steps: [
			'Review allergies and formulary.',
			'Enter medication orders with CDS alerts as needed.',
			'Sign or route to pharmacy per hospital policy.'
		]
	},
	'billing-op-billing': {
		title: 'OP billing',
		roles: 'Cashier, billing clerk',
		steps: [
			'Load visit service lines and deposits.',
			'Apply discounts or packages per authorization.',
			'Post bill and print receipt using document print codes.'
		]
	},
	'inventory-stock': {
		title: 'Stock inquiry and issue',
		roles: 'Store keeper, pharmacist',
		steps: [
			'Select store and item.',
			'Pick batch lots for issue in purchase units.',
			'Confirm stock deduction and audit trail.'
		]
	},
	'diagnostics-lab-results': {
		title: 'Lab results verification',
		roles: 'Lab technologist, pathologist',
		steps: [
			'Open result entry from section worklist.',
			'Enter or verify analyte values and flags.',
			'Release to EMR and trigger critical callback if required.'
		]
	}
};

for (const [slug, meta] of Object.entries(pages)) {
	const body = `---
title: "${meta.title}"
description: "In-depth workflow for ${meta.title}."
docType: workflow
slug: workflows/${slug}
sinceVersion: "1.5.0"
lastReviewed: "2026-03-21"
---

## Summary

${meta.title} is a core Medora workflow for **${meta.roles}**.

## Who uses this

| Role | Responsibility |
|------|----------------|
| ${meta.roles} | Primary operator for this screen |

## Workflow

\`\`\`mermaid
flowchart TD
  start[Start] --> prep[Prepare context]
  prep --> work[Complete clinical or admin task]
  work --> verify[Verify and save]
  verify --> done[Done]
\`\`\`

## Steps

${meta.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}

## APIs

Hospital-scoped APIs mirror \`/api/medora/hospital/{hospital_id}/home/...\`. Authenticate as staff with page permission.

## Troubleshooting

- Confirm user group includes this page.
- Refresh after master data changes.

## Legal

Follow hospital privacy policy for PHI on this screen.
`;
	writeFileSync(join(contentDir, `${slug}.md`), body, 'utf8');
}

console.log(`Enhanced ${Object.keys(pages).length} wave-1 workflow docs`);
