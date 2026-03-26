<script lang="ts">
	let { valueNo, displayText, className } = $props<{
		valueNo: number;
		displayText: string;
		className?: string;
	}>();
</script>

<div
	class="d-radial-progress"
	style="--d-value:{valueNo};"
	aria-valuenow={valueNo}
	role="progressbar"
>
	{displayText}
</div>
