import { onMount, onDestroy } from 'svelte';

type Callback = () => void;

export class LifeCycleUtil {
	private mountCallbacks: Callback[] = [];
	private beforeUpdateCallbacks: Callback[] = [];
	private afterUpdateCallbacks: Callback[] = [];
	private destroyCallbacks: Callback[] = [];

	constructor() {}

	/**
	 * Register a callback for Svelte's onMount
	 */
	onMount(cb: Callback): void {
		this.mountCallbacks.push(cb);
		onMount(() => {
			this.mountCallbacks.forEach((fn) => fn());
		});
	}

	/**
	 * Register a callback for Svelte's beforeUpdate
	 */
	beforeUpdate(cb: Callback): void {
		this.beforeUpdateCallbacks.push(cb);
		this.beforeUpdate(() => {
			this.beforeUpdateCallbacks.forEach((fn) => fn());
		});
	}

	/**
	 * Register a callback for Svelte's afterUpdate
	 */
	afterUpdate(cb: Callback): void {
		this.afterUpdateCallbacks.push(cb);
		this.afterUpdate(() => {
			this.afterUpdateCallbacks.forEach((fn) => fn());
		});
	}

	/**
	 * Register a callback for Svelte's onDestroy
	 */
	onDestroy(cb: Callback): void {
		this.destroyCallbacks.push(cb);
		onDestroy(() => {
			this.destroyCallbacks.forEach((fn) => fn());
		});
	}
}
