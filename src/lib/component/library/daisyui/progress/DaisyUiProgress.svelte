<script lang="ts">
	let { className, valueNo, maxNo } = $props<{
		className?: string;
		valueNo: number;
		maxNo: number;
	}>();
</script>

<progress class="d-progress {className}" value={valueNo} max={maxNo}
></progress>
