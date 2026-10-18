export type DocsSearchItem = {
	title: string;
	href: string;
	category: string;
	keywords: string;
};

export type DocsBreadcrumb = {
	label: string;
	href?: string;
};

export type DocsManifestStats = {
	modules: number;
	workflows: number;
	apis: number;
	templates: number;
	journalSections: number;
};
