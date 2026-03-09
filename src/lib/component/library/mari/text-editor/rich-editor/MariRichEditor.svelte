<script lang="ts">
	import { createEventDispatcher, onMount, onDestroy } from 'svelte';
	import MariRichEditorController from './MariRichEditorController.svelte';
	import MariRichEditorPreview from './MariRichEditorPreview.svelte';

	let {
		value = $bindable(''),
		placeholder,
		showPreview = false,
		className,
		editorClassName
	} = $props<{
		value?: string;
		placeholder?: string;
		showPreview?: boolean;
		className?: string;
		editorClassName?: string;
	}>();

	const dispatch = createEventDispatcher<{
		input: { value: string };
		change: { value: string };
	}>();

	let editorElement: HTMLDivElement;
let lastEditorRange: Range | null = null;

	type ToolbarCommandDetail = {
		name:
			| 'paragraph'
			| 'heading1'
			| 'heading2'
			| 'heading3'
			| 'bold'
			| 'italic'
			| 'underline'
			| 'strikeThrough'
			| 'subscript'
			| 'superscript'
			| 'justifyLeft'
			| 'justifyCenter'
			| 'justifyRight'
			| 'justifyFull'
			| 'insertOrderedList'
			| 'insertUnorderedList'
			| 'fontSizeIncrease'
			| 'fontSizeDecrease'
			| 'fontSizeSet'
			| 'tableAddRowBelow'
			| 'tableRemoveRow'
			| 'tableAddColRight'
			| 'tableRemoveCol'
			| 'link'
			| 'image'
			| 'table';
		value?: number;
	};

	type ActiveStates = Partial<Record<ToolbarCommandDetail['name'], boolean>>;
	let activeStates = $state<ActiveStates>({});
	let fontSize = $state(14);
	let isInTable = $state(false);

	const QUERYABLE_COMMANDS: (keyof ActiveStates)[] = [
		'bold',
		'italic',
		'underline',
		'strikeThrough',
		'subscript',
		'superscript',
		'insertOrderedList',
		'insertUnorderedList',
		'justifyLeft',
		'justifyCenter',
		'justifyRight',
		'justifyFull'
	];

	function isSelectionInEditor(): boolean {
		if (typeof window === 'undefined' || !editorElement) return false;
		const sel = window.getSelection();
		if (!sel || sel.rangeCount === 0) return false;
		const node = sel.anchorNode;
		return node != null && editorElement.contains(node);
	}

	/** Sync toolbar active state from the actual document selection (queryCommandState + DOM for sub/sup). */
	function syncActiveStatesFromDocument() {
		if (typeof document === 'undefined' || !editorElement) return;
		if (!isSelectionInEditor()) return;

		const sel = window.getSelection();
		if (sel && sel.rangeCount > 0) {
			lastEditorRange = sel.getRangeAt(0).cloneRange();
		}

		const next: ActiveStates = {};

		for (const cmd of QUERYABLE_COMMANDS) {
			try {
				next[cmd] = document.queryCommandState(cmd as string);
			} catch {
				next[cmd] = false;
			}
		}

		try {
			const blockTag = (document.queryCommandValue('formatBlock') || '').toLowerCase();
			next.paragraph = blockTag === 'p' || blockTag === 'paragraph';
			next.heading1 = blockTag === 'h1';
			next.heading2 = blockTag === 'h2';
			next.heading3 = blockTag === 'h3';
		} catch {
			next.paragraph = false;
			next.heading1 = false;
			next.heading2 = false;
			next.heading3 = false;
		}

		// queryCommandState for subscript/superscript is unreliable; check DOM for <sub>/<sup> ancestry
		let foundTable = false;
		if (sel && sel.rangeCount > 0) {
			let node: Node | null = sel.anchorNode;
			while (node && node !== editorElement) {
				if (node.nodeType === Node.ELEMENT_NODE) {
					const tag = (node as Element).tagName;
					if (tag === 'SUB') next.subscript = true;
					if (tag === 'SUP') next.superscript = true;
					if (tag === 'TD' || tag === 'TH' || tag === 'TABLE') {
						foundTable = true;
					}
				}
				node = node.parentNode;
			}
		}

		activeStates = next;
		isInTable = foundTable;
	}

	function onSelectionChange() {
		if (isSelectionInEditor()) {
			syncActiveStatesFromDocument();
		}
	}

	onMount(() => {
		if (editorElement) {
			editorElement.innerHTML = value ?? '';
		}
		if (typeof document !== 'undefined') {
			document.addEventListener('selectionchange', onSelectionChange);
			editorElement?.addEventListener('focus', syncActiveStatesFromDocument);
		}
	});

	onDestroy(() => {
		if (typeof document !== 'undefined') {
			document.removeEventListener('selectionchange', onSelectionChange);
			editorElement?.removeEventListener('focus', syncActiveStatesFromDocument);
		}
	});

	function syncFromDom() {
		if (!editorElement) return;

		const html = editorElement.innerHTML;
		value = html;
		dispatch('input', { value: html });
	}

	/** Move cursor after the element and insert a breaking char so the next typed character is normal (not subscript). */
	function exitSubOrSup(el: Element, selection: Selection) {
		const parent = el.parentNode;
		if (!parent) return;
		// Insert a zero-width space after </sub> or </sup> so the browser's typing context is clearly outside
		const breaker = document.createTextNode('\u200b');
		parent.insertBefore(breaker, el.nextSibling);
		const newRange = document.createRange();
		newRange.setStart(breaker, 1);
		newRange.collapse(true);
		selection.removeAllRanges();
		selection.addRange(newRange);
	}

	/** Unwrap the <sub> or <sup> and place cursor after the unwrapped content so typing doesn't replace it. */
	function unwrapSubOrSup(el: Element, selection: Selection) {
		const parent = el.parentNode;
		if (!parent) return;
		const lastChild = el.lastChild;
		while (el.firstChild) {
			parent.insertBefore(el.firstChild, el);
		}
		parent.removeChild(el);
		selection.removeAllRanges();
		// Place cursor after the unwrapped content so user can type normal text
		if (lastChild) {
			const newRange = document.createRange();
			if (lastChild.nodeType === Node.TEXT_NODE) {
				newRange.setStart(lastChild, (lastChild as Text).length);
			} else {
				newRange.setStartAfter(lastChild);
			}
			newRange.collapse(true);
			selection.addRange(newRange);
		}
	}

	/** Wrap selection in <sub> or <sup>; if already inside that tag, exit or unwrap. Uses Range API for reliable cross-browser behavior. */
	function applySubscriptOrSuperscript(tagName: 'sub' | 'sup') {
		const selection = window.getSelection();
		if (!selection || selection.rangeCount === 0 || !editorElement) return;

		const range = selection.getRangeAt(0);
		if (!editorElement.contains(range.commonAncestorContainer)) return;

		const tag = tagName.toUpperCase();

		// Cursor or selection is inside a <sub> or <sup> of the same type
		let node: Node | null = range.commonAncestorContainer;
		while (node && node !== editorElement) {
			if (node.nodeType === Node.ELEMENT_NODE && (node as Element).tagName === tag) {
				const el = node as Element;
				if (range.collapsed) {
					// Cursor only: "exit" — move cursor after the tag so they can type normal text (e.g. after SPO₂)
					exitSubOrSup(el, selection);
				} else {
					// Selection: unwrap and put cursor after so they don't replace the text
					unwrapSubOrSup(el, selection);
				}
				return;
			}
			node = node.parentNode;
		}

		// If selection is collapsed (cursor only), insert empty tag and place cursor inside
		if (range.collapsed) {
			const el = document.createElement(tagName);
			el.appendChild(document.createTextNode('\u200b')); // zero-width space so element isn't removed when empty
			range.insertNode(el);
			range.setStart(el.firstChild!, 1);
			range.setEnd(el.firstChild!, 1);
			selection.removeAllRanges();
			selection.addRange(range);
			return;
		}

		// Wrap selection in <tagName>
		try {
			const contents = range.extractContents();
			const wrapper = document.createElement(tagName);
			wrapper.appendChild(contents);
			range.insertNode(wrapper);
			range.setStart(wrapper, 0);
			range.setEnd(wrapper, wrapper.childNodes.length);
			selection.removeAllRanges();
			selection.addRange(range);
		} catch {
			document.execCommand(tagName === 'sub' ? 'subscript' : 'superscript', false);
		}
	}

	function applyFontSizePx(sizePx: number) {
		if (typeof window === 'undefined' || typeof document === 'undefined' || !editorElement) {
			return;
		}
		const selection = window.getSelection();
		if (!selection || selection.rangeCount === 0) return;

		const range = selection.getRangeAt(0);
		// Only operate when there is an actual selection inside the editor
		if (range.collapsed || !editorElement.contains(range.commonAncestorContainer)) return;

		try {
			const contents = range.extractContents();
			const span = document.createElement('span');
			span.style.fontSize = `${sizePx}px`;
			span.appendChild(contents);
			range.insertNode(span);
			const newRange = document.createRange();
			newRange.selectNodeContents(span);
			selection.removeAllRanges();
			selection.addRange(newRange);
		} catch {
			// best-effort fallback using execCommand
			document.execCommand('fontSize', false, '3');
		}
	}

	function insertTable() {
		if (typeof window === 'undefined' || typeof document === 'undefined' || !editorElement) {
			return;
		}

		const rowsInput = window.prompt('Number of rows (1–20):', '2');
		const colsInput = window.prompt('Number of columns (1–10):', '2');

		const rows = rowsInput ? parseInt(rowsInput, 10) : NaN;
		const cols = colsInput ? parseInt(colsInput, 10) : NaN;

		if (Number.isNaN(rows) || Number.isNaN(cols)) return;

		const r = Math.min(20, Math.max(1, rows));
		const c = Math.min(10, Math.max(1, cols));

		const selection = window.getSelection();
		let range: Range | null = null;

		if (selection && selection.rangeCount > 0 && editorElement.contains(selection.anchorNode)) {
			range = selection.getRangeAt(0);
		} else if (lastEditorRange) {
			range = lastEditorRange.cloneRange();
		} else {
			range = document.createRange();
			range.selectNodeContents(editorElement);
			range.collapse(false);
		}

		if (!range) return;

		// Build table DOM with visible cell borders (column grid)
		const table = document.createElement('table');
		table.className = 'table w-full border border-base-300 border-collapse';
		const tbody = document.createElement('tbody');

		for (let i = 0; i < r; i++) {
			const tr = document.createElement('tr');
			for (let j = 0; j < c; j++) {
				const td = document.createElement('td');
				td.className = 'border border-base-300 px-2 py-1 align-top';
				td.innerHTML = '&nbsp;';
				tr.appendChild(td);
			}
			tbody.appendChild(tr);
		}

		table.appendChild(tbody);

		// Insert table at range
		range.deleteContents();
		range.insertNode(table);

		// Place caret into first cell
		const firstCell = tbody.rows[0]?.cells[0];
		if (firstCell) {
			const newRange = document.createRange();
			newRange.selectNodeContents(firstCell);
			newRange.collapse(true);
			selection?.removeAllRanges();
			selection?.addRange(newRange);
			lastEditorRange = newRange.cloneRange();
		}
	}

	function getTableContext() {
		if (typeof window === 'undefined' || !editorElement) return null;
		const sel = window.getSelection();
		if (!sel || sel.rangeCount === 0) return null;
		let node: Node | null = sel.anchorNode;
		while (node && node !== editorElement) {
			if (node.nodeType === Node.ELEMENT_NODE) {
				const el = node as HTMLElement;
				if (el.tagName === 'TD' || el.tagName === 'TH') {
					const cell = el as HTMLTableCellElement;
					const row = cell.parentElement as HTMLTableRowElement | null;
					if (!row) return null;
					const table = row.closest('table') as HTMLTableElement | null;
					if (!table) return null;
					const tbody = row.parentElement as HTMLTableSectionElement | null;
					if (!tbody) return null;

					const rowIndex = Array.prototype.indexOf.call(tbody.rows, row);
					const colIndex = Array.prototype.indexOf.call(row.cells, cell);

					return { table, tbody, row, cell, rowIndex, colIndex };
				}
			}
			node = node.parentNode;
		}
		return null;
	}

	function addRowBelow() {
		const ctx = getTableContext();
		if (!ctx) return;
		const { tbody, row, rowIndex } = ctx;
		const newRow = tbody.insertRow(rowIndex + 1);
		for (let i = 0; i < row.cells.length; i++) {
			const td = document.createElement('td');
			td.className = 'border border-base-300 px-2 py-1 align-top';
			td.innerHTML = '&nbsp;';
			newRow.appendChild(td);
		}
		const sel = window.getSelection();
		const range = document.createRange();
		range.selectNodeContents(newRow.cells[0]);
		range.collapse(true);
		sel?.removeAllRanges();
		sel?.addRange(range);
		lastEditorRange = range.cloneRange();
	}

	function removeRow() {
		const ctx = getTableContext();
		if (!ctx) return;
		const { table, tbody, rowIndex } = ctx;
		if (tbody.rows.length <= 1) {
			// remove whole table
			table.remove();
			return;
		}
		tbody.deleteRow(rowIndex);
	}

	function addColRight() {
		const ctx = getTableContext();
		if (!ctx) return;
		const { tbody, colIndex } = ctx;
		for (const tr of Array.from(tbody.rows) as HTMLTableRowElement[]) {
			const td = document.createElement('td');
			td.className = 'border border-base-300 px-2 py-1 align-top';
			td.innerHTML = '&nbsp;';
			if (colIndex + 1 >= tr.cells.length) {
				tr.appendChild(td);
			} else {
				tr.insertBefore(td, tr.cells[colIndex + 1]);
			}
		}
	}

	function removeCol() {
		const ctx = getTableContext();
		if (!ctx) return;
		const { tbody, colIndex } = ctx;
		const firstRow = tbody.rows[0];
		if (!firstRow || firstRow.cells.length <= 1) {
			// remove whole table
			const table = tbody.parentElement as HTMLTableElement | null;
			table?.remove();
			return;
		}
		for (const tr of Array.from(tbody.rows) as HTMLTableRowElement[]) {
			if (colIndex < tr.cells.length) {
				tr.deleteCell(colIndex);
			}
		}
	}

	function handleCommand(event: CustomEvent<ToolbarCommandDetail>) {
		const { name, value: cmdValue } = event.detail;

		if (!editorElement || typeof window === 'undefined' || typeof document === 'undefined') {
			return;
		}

		editorElement.focus();

		const selection = window.getSelection();
		if (!selection || selection.rangeCount === 0 || !editorElement.contains(selection.anchorNode)) {
			const range = document.createRange();
			range.selectNodeContents(editorElement);
			selection?.removeAllRanges();
			selection?.addRange(range);
		}

		if (name === 'paragraph') {
			document.execCommand('formatBlock', false, 'p');
		} else if (name === 'heading1') {
			document.execCommand('formatBlock', false, 'h1');
		} else if (name === 'heading2') {
			document.execCommand('formatBlock', false, 'h2');
		} else if (name === 'heading3') {
			document.execCommand('formatBlock', false, 'h3');
		} else if (name === 'subscript') {
			applySubscriptOrSuperscript('sub');
		} else if (name === 'superscript') {
			applySubscriptOrSuperscript('sup');
		} else if (name === 'fontSizeIncrease') {
			fontSize = Math.min(fontSize + 1, 200);
			applyFontSizePx(fontSize);
		} else if (name === 'fontSizeDecrease') {
			fontSize = Math.max(fontSize - 1, 8);
			applyFontSizePx(fontSize);
		} else if (name === 'fontSizeSet') {
			if (cmdValue != null && !Number.isNaN(cmdValue)) {
				const clamped = Math.min(200, Math.max(8, Math.round(cmdValue)));
				fontSize = clamped;
				applyFontSizePx(fontSize);
			}
		} else if (name === 'link') {
			const url = window.prompt('Enter URL');
			if (url) {
				document.execCommand('createLink', false, url);
			}
		} else if (name === 'image') {
			const src = window.prompt('Enter image URL');
			if (src) {
				document.execCommand('insertImage', false, src);
			}
		} else if (name === 'table') {
			insertTable();
		} else if (name === 'tableAddRowBelow') {
			addRowBelow();
		} else if (name === 'tableRemoveRow') {
			removeRow();
		} else if (name === 'tableAddColRight') {
			addColRight();
		} else if (name === 'tableRemoveCol') {
			removeCol();
		} else {
			document.execCommand(name, false);
		}

		syncFromDom();
		dispatch('change', { value });

		// Sync toolbar from document so buttons reflect real state (after browser applies command)
		requestAnimationFrame(() => {
			syncActiveStatesFromDocument();
		});
	}

	$effect(() => {
		if (editorElement && editorElement.innerHTML !== (value ?? '')) {
			editorElement.innerHTML = value ?? '';
		}
	});
</script>

<div class="flex flex-col gap-2 {className}">
	<MariRichEditorController
		on:command={handleCommand}
		{activeStates}
		{fontSize}
		isInTable={isInTable}
	/>

	<!-- Editor surface styled to match preview (.prose inside a rounded, bordered card) -->
	<div class="mt-2 rounded-box border border-base-300 bg-base-100 p-4">
		<div
			class="prose max-w-none focus:outline-none {editorClassName}"
			contenteditable="true"
			bind:this={editorElement}
			{placeholder}
			on:input={syncFromDom}
		>
		</div>
	</div>

	{#if showPreview}
		<MariRichEditorPreview {value} />
	{/if}
</div>
