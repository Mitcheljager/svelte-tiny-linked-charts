<script>
	import { LinkedChart, LinkedLabel } from "svelte-tiny-linked-charts"

	function fakeData(times) {
		const data = {}
		const date = new Date("1985-05-01T00:00:00Z")

    for(let i = 0; i < times; i++) {
			const setDate = date.setDate(date.getDate() - 1)
			const formattedDate = new Date(setDate).toISOString().substring(0, 10)

      data[formattedDate] = Math.floor(Math.random() * 100)
    }

		const reversedData = {}
		for(let i = 0; i < times; i++) {
			reversedData[Object.keys(data)[times - 1 - i]] = Object.values(data)[times - 1 - i]
		}

		return reversedData
  }
</script>



<div class="wrapper">
	<h1>Tiny Linked Charts for <mark>Svelte</mark></h1>

	<div class="block">
		<div class="description">
			The chart in it's most basic form.

			<code>
				&lt;LinkedChart &#123; data &#125; /&gt;
			</code>
		</div>

		<LinkedChart data={ fakeData(30) } />
	</div>

	<div class="block">
		<div class="description">
			You can link multiple charts together, hovering one will also highlight others.

			<code>
				&lt;LinkedLabel linked="link-1" /&gt; <br>
				<br>
				&lt;LinkedChart &#123; data &#125; linked="link-1" /&gt; <br>
				&lt;LinkedChart &#123; data &#125; linked="link-1" /&gt; <br>
				&lt;LinkedChart &#123; data &#125; linked="link-1" /&gt; <br>
				&lt;LinkedChart &#123; data &#125; linked="link-1" /&gt; <br>
			</code>
		</div>

		<div>
			<div class="label"><LinkedLabel linked="link-1" empty="Start hovering" /></div>

			<div class="chart"><LinkedChart data={ fakeData(30) } linked="link-1" /></div>
			<div class="chart"><LinkedChart data={ fakeData(10) } linked="link-1" /></div>
			<div class="chart"><LinkedChart data={ fakeData(30) } linked="link-1" /></div>
			<div class="chart"><LinkedChart data={ fakeData(30) } linked="link-1" /></div>
		</div>
	</div>

	<div class="chart">
		<LinkedChart data={ fakeData(10) } fadeOpacity="0.75" />
	</div>

	<div class="chart">
		<LinkedChart data={ fakeData(5) } grow={ true } hover={ false } barMinWidth="0" />
	</div>
</div>



<style>
	:global(body) {
		background: #222;
		color: white;
		font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
	}

	code {
		display: block;
		margin-top: 1rem;
		color: rgba(255, 255, 255, 0.75);
		font-size: .75rem;
	}

	mark {
		background: none;
		color: #ff3e00;
	}

	.wrapper {
		max-width: 480px;
		margin: 0 auto;
		padding: 0 1.5rem;
	}

	.block {
		display: grid;
		grid-template-columns: 1fr auto;
		grid-gap: 1.5rem;
		justify-content: space-between;
		padding: 1.5rem 0;
		border-bottom: 1px solid rgba(255, 255, 255, 0.15);
	}

	.chart {
		margin-top: .5rem;
	}

	.label {
		text-align: right;
		color: rgba(255, 255, 255, 0.75);
	}
</style>
