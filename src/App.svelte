<script>
	import Chart from "./Chart.svelte"
	import LinkedLabel from "./LinkedLabel.svelte"
</script>



<Chart times={ 15 } linked="test" />
<Chart times={ 20 } linked="test" />
<Chart times={ 25 } linked="test" />
<Chart times={ 30 } fadeOpacity="0.75" />
<Chart times={ 5 } grow={ true } hover={ false } barMinWidth="0" />

<LinkedLabel linked="test" />



<style>
	:global(body) {
		background: black;
		color: white;
	}
</style>
