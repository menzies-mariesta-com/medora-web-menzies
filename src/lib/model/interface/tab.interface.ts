import type { Component } from 'svelte';

export interface TabInterface {
	name: string;
	icon: Component;
	link?: string;
	component?: Component;
}
