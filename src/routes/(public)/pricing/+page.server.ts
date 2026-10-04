import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { sendEmailServer } from '$lib/server/util/mailer.server';
import { getSiteOrigin } from '$lib/server/seo/site-origin.server';
import { isTrialDuration } from '$lib/tool/pricing';

/** Prerender HTML; trial form actions still hit the serverless endpoint. */
export const prerender = true;

export const load: PageServerLoad = async () => {
	return { origin: getSiteOrigin() };
};

export const actions: Actions = {
	requestTrial: async ({ request }) => {
		const form = await request.formData();
		const firstName = String(form.get('firstName') ?? '').trim();
		const lastName = String(form.get('lastName') ?? '').trim();
		const hospitalName = String(form.get('hospitalName') ?? '').trim();
		const website = String(form.get('website') ?? '').trim();
		const email = String(form.get('email') ?? '')
			.trim()
			.toLowerCase();
		const message = String(form.get('message') ?? '').trim();
		const duration = String(form.get('duration') ?? '').trim();

		if (!firstName || !lastName || !hospitalName || !email || !duration) {
			return fail(400, {
				success: false,
				message: 'Fill all required fields.'
			});
		}
		if (!email.includes('@')) {
			return fail(400, {
				success: false,
				message: 'Enter a valid email address.'
			});
		}
		if (!isTrialDuration(duration)) {
			return fail(400, {
				success: false,
				message: 'Choose a trial duration: 7 days, 2 weeks, or 1 month.'
			});
		}

		const inbox = (
			env.SUPPORT_IT_EMAIL ||
			env.SMTP_USER ||
			''
		).trim();

		const body = [
			`Trial request from Medora pricing`,
			``,
			`Name: ${firstName} ${lastName}`,
			`Hospital / group: ${hospitalName}`,
			`Website: ${website || '(none)'}`,
			`Email: ${email}`,
			`Duration: ${duration}`,
			``,
			`Message:`,
			message || '(none)'
		].join('\n');

		if (!inbox) {
			return {
				success: true,
				message:
					'Trial request received. We will follow up by email soon.'
			};
		}

		const sent = await sendEmailServer({
			to: inbox,
			subject: `Medora trial request: ${hospitalName}`,
			message: body
		});

		if (!sent) {
			return fail(500, {
				success: false,
				message: 'Could not send your request. Try again later.'
			});
		}

		return {
			success: true,
			message: 'Trial request received. We will follow up by email soon.'
		};
	}
};
