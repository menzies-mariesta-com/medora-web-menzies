export const adminShellState = $state({
	drawerOpen: false
});

/** Close the mobile drawer after navigating. */
export function closeAdminDrawer() {
	adminShellState.drawerOpen = false;
}
