<script lang="ts">
	import { createEventDispatcher, onMount, onDestroy } from 'svelte';
	import MariRichEditorController from './MariRichEditorController.svelte';
	import MariRichEditorPreview from './MariRichEditorPreview.svelte';

	let {
		value = $bindable(''),
		placeholder,
		showPreview = false,
		showMenuBar = true,
		documentTitle = 'Document',
		className,
		editorClassName,
		disabled = false
	} = $props<{
		value?: string;
		placeholder?: string;
		showPreview?: boolean;
		showMenuBar?: boolean;
		documentTitle?: string;
		className?: string;
		editorClassName?: string;
		disabled?: boolean;
	}>();

	const dispatch = createEventDispatcher<{
		input: { value: string };
		change: { value: string };
		export: { format: 'pdf' | 'html' | 'md'; content: string };
	}>();

	let editorElement: HTMLDivElement;
	let lastEditorRange: Range | null = null;
	let activeMenu: string | null = $state(null);

	type ToolbarCommandDetail = {
		name:
			| 'paragraph'
			| 'heading1'
			| 'heading2'
			| 'heading3'
			| 'heading4'
			| 'heading5'
			| 'heading6'
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
			| 'fontFamilySet'
			| 'foreColor'
			| 'backColor'
			| 'code'
			| 'blockquote'
			| 'horizontalRule'
			| 'indent'
			| 'outdent'
			| 'removeFormat'
			| 'tableAddRowBelow'
			| 'tableRemoveRow'
			| 'tableAddColRight'
			| 'tableRemoveCol'
			| 'link'
			| 'unlink'
			| 'image'
			| 'table';
		value?: number;
		stringValue?: string;
	};

	type ActiveStates = Partial<
		Record<ToolbarCommandDetail['name'], boolean>
	>;
	let activeStates = $state<ActiveStates>({});
	let fontSize = $state(14);
	// Default editor font to match UI expectation.
	let fontFamily = $state('Adwaita-sans, sans-serif');
	let textColor = $state('#000000');
	let bgColor = $state('');
	let isInTable = $state(false);
	let showLinkDialog = $state(false);
	let showImageDialog = $state(false);
	let linkUrl = $state('');
	let linkText = $state('');
	let imageUrl = $state('');
	let imageAlt = $state('');

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

	/** Sync toolbar active state from the actual document selection (queryCommandState + DOM). */
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
			const blockTag = (
				document.queryCommandValue('formatBlock') || ''
			).toLowerCase();
			next.paragraph =
				blockTag === 'p' ||
				blockTag === 'paragraph' ||
				blockTag === '';
			next.heading1 = blockTag === 'h1';
			next.heading2 = blockTag === 'h2';
			next.heading3 = blockTag === 'h3';
			next.heading4 = blockTag === 'h4';
			next.heading5 = blockTag === 'h5';
			next.heading6 = blockTag === 'h6';
			next.blockquote = blockTag === 'blockquote';
		} catch {
			next.paragraph = true;
		}

		let foundTable = false;
		let foundCode = false;
		let foundBlockquote = false;
		if (sel && sel.rangeCount > 0) {
			let node: Node | null = sel.anchorNode;
			while (node && node !== editorElement) {
				if (node.nodeType === Node.ELEMENT_NODE) {
					const tag = (node as Element).tagName;
					if (tag === 'SUB') next.subscript = true;
					if (tag === 'SUP') next.superscript = true;
					if (tag === 'TD' || tag === 'TH' || tag === 'TABLE')
						foundTable = true;
					if (tag === 'PRE' || tag === 'CODE') foundCode = true;
					if (tag === 'BLOCKQUOTE') foundBlockquote = true;
				}
				node = node.parentNode;
			}
		}

		next.code = foundCode;
		if (foundBlockquote) next.blockquote = true;

		activeStates = next;
		isInTable = foundTable;
	}

	function onSelectionChange() {
		if (isSelectionInEditor()) {
			syncActiveStatesFromDocument();
		}
	}

	function handleClickOutside(e: MouseEvent) {
		const target = e.target as HTMLElement;
		if (activeMenu && !target.closest('.relative')) {
			activeMenu = null;
		}
	}

	onMount(() => {
		if (editorElement) {
			editorElement.innerHTML = value ?? '';
		}
		if (typeof document !== 'undefined') {
			document.addEventListener('selectionchange', onSelectionChange);
			document.addEventListener('click', handleClickOutside);
			editorElement?.addEventListener(
				'focus',
				syncActiveStatesFromDocument
			);
		}
	});

	onDestroy(() => {
		if (typeof document !== 'undefined') {
			document.removeEventListener(
				'selectionchange',
				onSelectionChange
			);
			document.removeEventListener('click', handleClickOutside);
			editorElement?.removeEventListener(
				'focus',
				syncActiveStatesFromDocument
			);
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
		if (!selection || selection.rangeCount === 0 || !editorElement)
			return;

		const range = selection.getRangeAt(0);
		if (!editorElement.contains(range.commonAncestorContainer))
			return;

		const tag = tagName.toUpperCase();

		// Cursor or selection is inside a <sub> or <sup> of the same type
		let node: Node | null = range.commonAncestorContainer;
		while (node && node !== editorElement) {
			if (
				node.nodeType === Node.ELEMENT_NODE &&
				(node as Element).tagName === tag
			) {
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
			document.execCommand(
				tagName === 'sub' ? 'subscript' : 'superscript',
				false
			);
		}
	}

	function applyFontSizePx(sizePx: number) {
		if (
			typeof window === 'undefined' ||
			typeof document === 'undefined' ||
			!editorElement
		) {
			return;
		}
		const selection = window.getSelection();
		if (!selection || selection.rangeCount === 0) return;

		const range = selection.getRangeAt(0);
		// Only operate when there is an actual selection inside the editor
		if (
			range.collapsed ||
			!editorElement.contains(range.commonAncestorContainer)
		)
			return;

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
		if (
			typeof window === 'undefined' ||
			typeof document === 'undefined' ||
			!editorElement
		) {
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

		if (
			selection &&
			selection.rangeCount > 0 &&
			editorElement.contains(selection.anchorNode)
		) {
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
		table.className =
			'table w-full border border-base-300 border-collapse';
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
					const row =
						cell.parentElement as HTMLTableRowElement | null;
					if (!row) return null;
					const table = row.closest(
						'table'
					) as HTMLTableElement | null;
					if (!table) return null;
					const tbody =
						row.parentElement as HTMLTableSectionElement | null;
					if (!tbody) return null;

					const rowIndex = Array.prototype.indexOf.call(
						tbody.rows,
						row
					);
					const colIndex = Array.prototype.indexOf.call(
						row.cells,
						cell
					);

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
		for (const tr of Array.from(
			tbody.rows
		) as HTMLTableRowElement[]) {
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
		for (const tr of Array.from(
			tbody.rows
		) as HTMLTableRowElement[]) {
			if (colIndex < tr.cells.length) {
				tr.deleteCell(colIndex);
			}
		}
	}

	function handleCommand(event: CustomEvent<ToolbarCommandDetail>) {
		const { name, value: cmdValue, stringValue } = event.detail;

		if (
			!editorElement ||
			typeof window === 'undefined' ||
			typeof document === 'undefined'
		) {
			return;
		}

		editorElement.focus();

		const selection = window.getSelection();
		if (
			!selection ||
			selection.rangeCount === 0 ||
			!editorElement.contains(selection.anchorNode)
		) {
			if (lastEditorRange) {
				selection?.removeAllRanges();
				selection?.addRange(lastEditorRange);
			} else {
				const range = document.createRange();
				range.selectNodeContents(editorElement);
				range.collapse(false);
				selection?.removeAllRanges();
				selection?.addRange(range);
			}
		}

		if (name === 'paragraph') {
			document.execCommand('formatBlock', false, 'p');
		} else if (name === 'heading1') {
			document.execCommand('formatBlock', false, 'h1');
		} else if (name === 'heading2') {
			document.execCommand('formatBlock', false, 'h2');
		} else if (name === 'heading3') {
			document.execCommand('formatBlock', false, 'h3');
		} else if (name === 'heading4') {
			document.execCommand('formatBlock', false, 'h4');
		} else if (name === 'heading5') {
			document.execCommand('formatBlock', false, 'h5');
		} else if (name === 'heading6') {
			document.execCommand('formatBlock', false, 'h6');
		} else if (name === 'code') {
			insertCodeBlock();
		} else if (name === 'blockquote') {
			document.execCommand('formatBlock', false, 'blockquote');
		} else if (name === 'subscript') {
			if (activeStates.superscript) return;
			applySubscriptOrSuperscript('sub');
		} else if (name === 'superscript') {
			if (activeStates.subscript) return;
			applySubscriptOrSuperscript('sup');
		} else if (name === 'fontSizeIncrease') {
			fontSize = Math.min(fontSize + 2, 200);
			applyFontSizePx(fontSize);
		} else if (name === 'fontSizeDecrease') {
			fontSize = Math.max(fontSize - 2, 8);
			applyFontSizePx(fontSize);
		} else if (name === 'fontSizeSet') {
			if (cmdValue != null && !Number.isNaN(cmdValue)) {
				const clamped = Math.min(
					200,
					Math.max(8, Math.round(cmdValue))
				);
				fontSize = clamped;
				applyFontSizePx(fontSize);
			}
		} else if (name === 'fontFamilySet') {
			if (stringValue != null) {
				fontFamily = stringValue;
				applyFontFamily(stringValue);
			}
		} else if (name === 'foreColor') {
			if (stringValue) {
				textColor = stringValue;
				document.execCommand('foreColor', false, stringValue);
			}
		} else if (name === 'backColor') {
			if (stringValue) {
				bgColor = stringValue;
				document.execCommand('hiliteColor', false, stringValue);
			}
		} else if (name === 'horizontalRule') {
			document.execCommand('insertHorizontalRule', false);
		} else if (name === 'indent') {
			document.execCommand('indent', false);
		} else if (name === 'outdent') {
			document.execCommand('outdent', false);
		} else if (name === 'removeFormat') {
			document.execCommand('removeFormat', false);
		} else if (name === 'link') {
			openLinkDialog();
		} else if (name === 'unlink') {
			document.execCommand('unlink', false);
		} else if (name === 'image') {
			openImageDialog();
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

		requestAnimationFrame(() => {
			syncActiveStatesFromDocument();
		});
	}

	function insertCodeBlock() {
		const selection = window.getSelection();
		if (!selection || selection.rangeCount === 0 || !editorElement)
			return;
		const range = selection.getRangeAt(0);
		if (!editorElement.contains(range.commonAncestorContainer))
			return;

		const pre = document.createElement('pre');
		pre.className =
			'bg-base-200 p-3 rounded font-mono text-sm overflow-x-auto';
		const code = document.createElement('code');

		if (range.collapsed) {
			code.textContent = '\u200b';
		} else {
			code.textContent = range.toString();
			range.deleteContents();
		}

		pre.appendChild(code);
		range.insertNode(pre);

		const newRange = document.createRange();
		newRange.selectNodeContents(code);
		newRange.collapse(false);
		selection.removeAllRanges();
		selection.addRange(newRange);
	}

	function openLinkDialog() {
		const selection = window.getSelection();
		if (selection && selection.rangeCount > 0) {
			linkText = selection.toString() || '';
		}
		linkUrl = '';
		showLinkDialog = true;
	}

	function insertLink() {
		if (!linkUrl) return;

		editorElement.focus();
		const selection = window.getSelection();

		if (lastEditorRange) {
			selection?.removeAllRanges();
			selection?.addRange(lastEditorRange);
		}

		if (linkText && (!selection || selection.toString() === '')) {
			const a = document.createElement('a');
			a.href = linkUrl;
			a.textContent = linkText;
			a.target = '_blank';
			a.rel = 'noopener noreferrer';

			const range = selection?.getRangeAt(0);
			range?.insertNode(a);
		} else {
			document.execCommand('createLink', false, linkUrl);
			const links = editorElement.querySelectorAll(
				'a[href="' + linkUrl + '"]'
			);
			links.forEach((link) => {
				link.setAttribute('target', '_blank');
				link.setAttribute('rel', 'noopener noreferrer');
			});
		}

		showLinkDialog = false;
		linkUrl = '';
		linkText = '';
		syncFromDom();
	}

	function openImageDialog() {
		imageUrl = '';
		imageAlt = '';
		showImageDialog = true;
	}

	function insertImage() {
		if (!imageUrl) return;

		editorElement.focus();
		const selection = window.getSelection();

		if (lastEditorRange) {
			selection?.removeAllRanges();
			selection?.addRange(lastEditorRange);
		}

		const img = document.createElement('img');
		img.src = imageUrl;
		img.alt = imageAlt || '';
		img.className = 'max-w-full h-auto rounded';
		img.style.maxWidth = '100%';

		const range = selection?.getRangeAt(0);
		range?.insertNode(img);

		showImageDialog = false;
		imageUrl = '';
		imageAlt = '';
		syncFromDom();
	}

	function handleImageUpload(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		if (!file.type.startsWith('image/')) {
			alert('Please select an image file');
			return;
		}

		const reader = new FileReader();
		reader.onload = (event) => {
			imageUrl = event.target?.result as string;
		};
		reader.readAsDataURL(file);
	}

	$effect(() => {
		if (editorElement && editorElement.innerHTML !== (value ?? '')) {
			editorElement.innerHTML = value ?? '';
		}
	});

	function applyFontFamily(family: string) {
		if (
			typeof window === 'undefined' ||
			typeof document === 'undefined' ||
			!editorElement
		) {
			return;
		}

		const selection = window.getSelection();
		if (!selection || selection.rangeCount === 0) return;

		const range = selection.getRangeAt(0);
		if (!editorElement.contains(range.commonAncestorContainer))
			return;

		// Only apply to selected text
		if (!range.collapsed) {
			try {
				const contents = range.extractContents();
				const span = document.createElement('span');
				span.style.setProperty('font-family', family, 'important');
				span.appendChild(contents);
				range.insertNode(span);
				const newRange = document.createRange();
				newRange.selectNodeContents(span);
				selection.removeAllRanges();
				selection.addRange(newRange);
				syncFromDom();
			} catch {
				// fallback - do nothing
			}
		}
	}

	function htmlToMarkdown(html: string): string {
		let md = html;
		md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n');
		md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n');
		md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n');
		md = md.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n');
		md = md.replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n');
		md = md.replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n');
		md = md.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
		md = md.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
		md = md.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
		md = md.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');
		md = md.replace(/<u[^>]*>(.*?)<\/u>/gi, '<u>$1</u>');
		md = md.replace(/<s[^>]*>(.*?)<\/s>/gi, '~~$1~~');
		md = md.replace(/<strike[^>]*>(.*?)<\/strike>/gi, '~~$1~~');
		md = md.replace(/<del[^>]*>(.*?)<\/del>/gi, '~~$1~~');
		md = md.replace(
			/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi,
			'[$2]($1)'
		);
		md = md.replace(
			/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi,
			'![$2]($1)'
		);
		md = md.replace(/<img[^>]*src="([^"]*)"[^>]*\/?>/gi, '![]($1)');
		md = md.replace(/<br\s*\/?>/gi, '\n');
		md = md.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n');
		md = md.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');
		md = md.replace(/<\/?ul[^>]*>/gi, '\n');
		md = md.replace(/<\/?ol[^>]*>/gi, '\n');
		md = md.replace(/<hr\s*\/?>/gi, '\n---\n');
		md = md.replace(
			/<blockquote[^>]*>(.*?)<\/blockquote>/gi,
			'> $1\n'
		);
		md = md.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');
		md = md.replace(/<pre[^>]*>(.*?)<\/pre>/gi, '```\n$1\n```\n');
		md = md.replace(/<sub[^>]*>(.*?)<\/sub>/gi, '~$1~');
		md = md.replace(/<sup[^>]*>(.*?)<\/sup>/gi, '^$1^');
		md = md.replace(/<[^>]+>/g, '');
		md = md.replace(/&nbsp;/g, ' ');
		md = md.replace(/&amp;/g, '&');
		md = md.replace(/&lt;/g, '<');
		md = md.replace(/&gt;/g, '>');
		md = md.replace(/&quot;/g, '"');
		md = md.replace(/\n{3,}/g, '\n\n');
		return md.trim();
	}

	function getFullHtmlDocument(content: string): string {
		const fontFamilyStyle = fontFamily
			? fontFamily
			: 'system-ui, -apple-system, sans-serif';
		return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${documentTitle}</title>
<style>
body { font-family: ${fontFamilyStyle}; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
table { border-collapse: collapse; width: 100%; margin: 1em 0; }
td, th { border: 1px solid #ddd; padding: 8px; text-align: left; }
img { max-width: 100%; height: auto; }
</style>
</head>
<body>
${content}
</body>
</html>`;
	}

	function downloadFile(
		content: string,
		filename: string,
		mimeType: string
	) {
		const blob = new Blob([content], { type: mimeType });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	function exportAsHtml() {
		const content = getFullHtmlDocument(value);
		downloadFile(content, `${documentTitle}.html`, 'text/html');
		dispatch('export', { format: 'html', content });
		activeMenu = null;
	}

	function exportAsMarkdown() {
		const content = htmlToMarkdown(value);
		downloadFile(content, `${documentTitle}.md`, 'text/markdown');
		dispatch('export', { format: 'md', content });
		activeMenu = null;
	}

	function exportAsPdf() {
		const printWindow = window.open('', '_blank');
		if (!printWindow) {
			alert('Please allow popups to export as PDF');
			return;
		}
		printWindow.document.write(getFullHtmlDocument(value));
		printWindow.document.close();
		printWindow.onload = () => {
			printWindow.print();
			printWindow.onafterprint = () => printWindow.close();
		};
		dispatch('export', { format: 'pdf', content: value });
		activeMenu = null;
	}

	function handleUndo() {
		document.execCommand('undo', false);
		syncFromDom();
		activeMenu = null;
	}

	function handleRedo() {
		document.execCommand('redo', false);
		syncFromDom();
		activeMenu = null;
	}

	function handleSelectAll() {
		if (!editorElement) return;
		editorElement.focus();
		const range = document.createRange();
		range.selectNodeContents(editorElement);
		const sel = window.getSelection();
		sel?.removeAllRanges();
		sel?.addRange(range);
		activeMenu = null;
	}

	function toggleMenu(menu: string) {
		activeMenu = activeMenu === menu ? null : menu;
	}

	function closeMenus() {
		activeMenu = null;
	}

	function handleMenuKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			activeMenu = null;
		}
	}

	function handleEditorShortcuts(e: KeyboardEvent) {
		// Only handle common editor shortcuts when user is holding Ctrl/Cmd.
		if (!(e.ctrlKey || e.metaKey) || e.altKey) return;

		const k = e.key.toLowerCase();
		if (k === 'b') {
			e.preventDefault();
			e.stopPropagation();
			void handleCommand({ detail: { name: 'bold' } } as any);
		} else if (k === 'i') {
			e.preventDefault();
			e.stopPropagation();
			void handleCommand({ detail: { name: 'italic' } } as any);
		} else if (k === 'u') {
			e.preventDefault();
			e.stopPropagation();
			void handleCommand({ detail: { name: 'underline' } } as any);
		} else if (k === 'z') {
			e.preventDefault();
			e.stopPropagation();
			handleUndo();
		} else if (k === 'y') {
			e.preventDefault();
			e.stopPropagation();
			handleRedo();
		} else if (k === 'a') {
			e.preventDefault();
			e.stopPropagation();
			handleSelectAll();
		} else if (k === 'p') {
			e.preventDefault();
			e.stopPropagation();
			exportAsPdf();
		}
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="flex flex-col gap-2 {className}"
	onkeydown={handleMenuKeydown}
	style={`font-family:${fontFamily};`}
>
	{#if showMenuBar}
		<!-- Menu Bar -->
		<div
			class="flex items-center gap-0 border-b border-base-300 bg-base-200 text-sm"
		>
			<!-- File Menu -->
			<div class="relative">
				<button
					type="button"
					class="px-4 py-2 hover:bg-base-300 {activeMenu === 'file'
						? 'bg-base-300'
						: ''}"
					onclick={() => toggleMenu('file')}
				>
					File
				</button>
				{#if activeMenu === 'file'}
					<div
						class="absolute top-full left-0 z-50 min-w-48 rounded-b-lg border border-base-300 bg-base-100 shadow-lg"
					>
						<button
							type="button"
							class="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-base-200"
							onclick={exportAsPdf}
						>
							<span class="w-4">📄</span>
							<span>Export as PDF</span>
							<span class="ml-auto text-xs text-base-content/50"
								>Ctrl+P</span
							>
						</button>
						<button
							type="button"
							class="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-base-200"
							onclick={exportAsHtml}
						>
							<span class="w-4">🌐</span>
							<span>Export as HTML</span>
						</button>
						<button
							type="button"
							class="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-base-200"
							onclick={exportAsMarkdown}
						>
							<span class="w-4">📝</span>
							<span>Export as Markdown</span>
						</button>
					</div>
				{/if}
			</div>

			<!-- Edit Menu -->
			<div class="relative">
				<button
					type="button"
					class="px-4 py-2 hover:bg-base-300 {activeMenu === 'edit'
						? 'bg-base-300'
						: ''}"
					onclick={() => toggleMenu('edit')}
				>
					Edit
				</button>
				{#if activeMenu === 'edit'}
					<div
						class="absolute top-full left-0 z-50 min-w-48 rounded-b-lg border border-base-300 bg-base-100 shadow-lg"
					>
						<button
							type="button"
							class="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-base-200"
							onclick={handleUndo}
						>
							<span class="w-4">↩️</span>
							<span>Undo</span>
							<span class="ml-auto text-xs text-base-content/50"
								>Ctrl+Z</span
							>
						</button>
						<button
							type="button"
							class="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-base-200"
							onclick={handleRedo}
						>
							<span class="w-4">↪️</span>
							<span>Redo</span>
							<span class="ml-auto text-xs text-base-content/50"
								>Ctrl+Y</span
							>
						</button>
						<div class="my-1 border-t border-base-300"></div>
						<button
							type="button"
							class="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-base-200"
							onclick={handleSelectAll}
						>
							<span class="w-4">📋</span>
							<span>Select All</span>
							<span class="ml-auto text-xs text-base-content/50"
								>Ctrl+A</span
							>
						</button>
					</div>
				{/if}
			</div>

			<!-- View Menu -->
			<div class="relative">
				<button
					type="button"
					class="px-4 py-2 hover:bg-base-300 {activeMenu === 'view'
						? 'bg-base-300'
						: ''}"
					onclick={() => toggleMenu('view')}
				>
					View
				</button>
				{#if activeMenu === 'view'}
					<div
						class="absolute top-full left-0 z-50 min-w-48 rounded-b-lg border border-base-300 bg-base-100 shadow-lg"
					>
						<button
							type="button"
							class="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-base-200"
							onclick={() => {
								showPreview = !showPreview;
								activeMenu = null;
							}}
						>
							<span class="w-4">{showPreview ? '✓' : ''}</span>
							<span>Show Preview</span>
						</button>
					</div>
				{/if}
			</div>

			<!-- Help Menu -->
			<div class="relative">
				<button
					type="button"
					class="px-4 py-2 hover:bg-base-300 {activeMenu === 'help'
						? 'bg-base-300'
						: ''}"
					onclick={() => toggleMenu('help')}
				>
					Help
				</button>
				{#if activeMenu === 'help'}
					<div
						class="absolute top-full left-0 z-50 min-w-56 rounded-b-lg border border-base-300 bg-base-100 shadow-lg"
					>
						<div class="px-4 py-2 text-base-content/70">
							<p class="font-semibold">Keyboard Shortcuts</p>
							<div class="mt-2 space-y-1 text-xs">
								<p><kbd class="kbd kbd-xs">Ctrl+B</kbd> Bold</p>
								<p><kbd class="kbd kbd-xs">Ctrl+I</kbd> Italic</p>
								<p><kbd class="kbd kbd-xs">Ctrl+U</kbd> Underline</p>
								<p><kbd class="kbd kbd-xs">Ctrl+Z</kbd> Undo</p>
								<p><kbd class="kbd kbd-xs">Ctrl+Y</kbd> Redo</p>
								<p><kbd class="kbd kbd-xs">Ctrl+A</kbd> Select All</p>
								<p><kbd class="kbd kbd-xs">Ctrl+P</kbd> Print/PDF</p>
							</div>
						</div>
					</div>
				{/if}
			</div>
		</div>
	{/if}

	{#if !disabled}
		<MariRichEditorController
			on:command={handleCommand}
			{activeStates}
			{fontSize}
			{fontFamily}
			{textColor}
			{bgColor}
			{isInTable}
		/>
	{/if}

	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- Editor surface styled to match preview (.prose inside a rounded, bordered card) -->
	<div
		class="mt-2 rounded-box border border-base-300 bg-base-100 p-4"
		onclick={closeMenus}
	>
		<div
			class="prose max-w-none focus:outline-none {editorClassName} {disabled
				? 'cursor-not-allowed opacity-70'
				: ''}"
			contenteditable={!disabled}
			bind:this={editorElement}
			{placeholder}
			oninput={syncFromDom}
			onkeydown={handleEditorShortcuts}
		></div>
	</div>

	{#if showPreview}
		<MariRichEditorPreview {value} />
	{/if}
</div>

<!-- Link Dialog -->
{#if showLinkDialog}
	<div class="d-modal-open d-modal">
		<div class="d-modal-box max-w-md">
			<h3 class="mb-4 text-lg font-bold">Insert Link</h3>
			<div class="space-y-4">
				<div>
					<label class="d-label" for="linkText">
						<span class="d-label-text">Link Text</span>
					</label>
					<input
						id="linkText"
						type="text"
						class="d-input-bordered d-input w-full"
						placeholder="Display text (optional)"
						bind:value={linkText}
					/>
				</div>
				<div>
					<label class="d-label" for="linkUrl">
						<span class="d-label-text"
							>URL <span class="text-error">*</span></span
						>
					</label>
					<input
						id="linkUrl"
						type="url"
						class="d-input-bordered d-input w-full"
						placeholder="https://example.com"
						bind:value={linkUrl}
					/>
				</div>
			</div>
			<div class="d-modal-action">
				<button
					type="button"
					class="d-btn d-btn-ghost"
					onclick={() => {
						showLinkDialog = false;
						linkUrl = '';
						linkText = '';
					}}
				>
					Cancel
				</button>
				<button
					type="button"
					class="d-btn d-btn-primary"
					onclick={insertLink}
					disabled={!linkUrl}
				>
					Insert Link
				</button>
			</div>
		</div>
		<div
			class="d-modal-backdrop"
			onclick={() => (showLinkDialog = false)}
			onkeydown={(e) =>
				e.key === 'Escape' && (showLinkDialog = false)}
			role="button"
			tabindex="-1"
		></div>
	</div>
{/if}

<!-- Image Dialog -->
{#if showImageDialog}
	<div class="d-modal-open d-modal">
		<div class="d-modal-box max-w-md">
			<h3 class="mb-4 text-lg font-bold">Insert Image</h3>
			<div class="space-y-4">
				<div>
					<label class="d-label" for="mari-rich-insert-image-file">
						<span class="d-label-text">Upload Image</span>
					</label>
					<input
						id="mari-rich-insert-image-file"
						type="file"
						accept="image/*"
						class="d-file-input-bordered d-file-input w-full"
						onchange={handleImageUpload}
					/>
				</div>
				<div class="d-divider">OR</div>
				<div>
					<label class="d-label" for="imageUrl">
						<span class="d-label-text">Image URL</span>
					</label>
					<input
						id="imageUrl"
						type="url"
						class="d-input-bordered d-input w-full"
						placeholder="https://example.com/image.jpg"
						bind:value={imageUrl}
					/>
				</div>
				<div>
					<label class="d-label" for="imageAlt">
						<span class="d-label-text"
							>Alt Text (for accessibility)</span
						>
					</label>
					<input
						id="imageAlt"
						type="text"
						class="d-input-bordered d-input w-full"
						placeholder="Image description"
						bind:value={imageAlt}
					/>
				</div>
				{#if imageUrl}
					<div class="rounded border p-2">
						<p class="mb-2 text-xs text-base-content/70">Preview:</p>
						<img
							src={imageUrl}
							alt={imageAlt}
							class="mx-auto max-h-32"
						/>
					</div>
				{/if}
			</div>
			<div class="d-modal-action">
				<button
					type="button"
					class="d-btn d-btn-ghost"
					onclick={() => {
						showImageDialog = false;
						imageUrl = '';
						imageAlt = '';
					}}
				>
					Cancel
				</button>
				<button
					type="button"
					class="d-btn d-btn-primary"
					onclick={insertImage}
					disabled={!imageUrl}
				>
					Insert Image
				</button>
			</div>
		</div>
		<div
			class="d-modal-backdrop"
			onclick={() => (showImageDialog = false)}
			onkeydown={(e) =>
				e.key === 'Escape' && (showImageDialog = false)}
			role="button"
			tabindex="-1"
		></div>
	</div>
{/if}
