import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from './(public)/auth/login/+page.svelte';

describe('/(public)/auth/login/+page.svelte', () => {
	it('should render login email field', () => {
		const { container } = render(Page);
		expect(container.querySelector('#email-input')).toBeTruthy();
	});
});
