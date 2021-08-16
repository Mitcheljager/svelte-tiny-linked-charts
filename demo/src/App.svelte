<script>
	import { LinkedChart, LinkedLabel } from "svelte-tiny-linked-charts"

	function fakeData(times) {
		let data = {}

    for(let i = 0; i < times; i++) {
      data[i] = Math.floor(Math.random() * 100)
    }

		return data
  }
</script>


<div class="chart">
	<LinkedChart data={ fakeData(10) } />
</div>

<div class="label">
	<LinkedLabel linked="test" />
</div>

<div class="chart">
	<LinkedChart data={ fakeData(15) } linked="test" />
</div>

<div class="chart">
	<LinkedChart data={ fakeData(20) } linked="test" />
</div>

<div class="chart">
	<LinkedChart data={ fakeData(10) } fadeOpacity="0.75" />
</div>

<div class="chart">
	<LinkedChart data={ fakeData(5) } grow={ true } hover={ false } barMinWidth="0" />
</div>



<style>
	:global(body) {
		background: black;
		color: white;
	}

	.chart {
		border: 1px solid gray;
	}
</style>
