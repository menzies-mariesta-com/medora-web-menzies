export enum TableEnum {
	/** Constrained height so MenziesTable can fill and pin H-scroll above footer. */
	HEIGHT = 'flex h-[calc(100vh-18rem)] max-h-[calc(100vh-18rem)] min-h-0 flex-col',
	HEIGHT_SMALL = 'flex h-[calc(100vh-46rem)] max-h-[calc(100vh-46rem)] min-h-0 flex-col',
	/** Equal-height EMR observation tables (2-column grid cells). */
	EMR_TABLES_HEIGHT = 'flex h-[calc(100vh-35rem)] max-h-[calc(100vh-35rem)] min-h-0 flex-col'
}
