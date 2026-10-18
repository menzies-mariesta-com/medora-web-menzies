export type DocsManifestModule = {
	slug: string;
	name: string;
	moduleId: number;
	moduleUrl: string;
	workflows: string[];
};

export type DocsManifestWorkflow = {
	slug: string;
	path: string;
	title: string;
	pageId: number;
	moduleId: number;
	moduleName: string;
	moduleSlug: string;
	pageUrl: string;
	contentFile: string;
};
