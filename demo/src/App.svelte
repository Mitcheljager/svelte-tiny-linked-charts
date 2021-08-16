<script>
	import { LinkedChart, LinkedLabel } from "svelte-tiny-linked-charts"

	function fakeData(times) {
		const data = {}
		const date = new Date("1985-05-01T00:00:00Z")

    for(let i = 0; i < times; i++) {
			const setDate = date.setDate(date.getDate() - 1)
			const formattedDate = new Date(setDate).toISOString().substring(0, 10)

      data[formattedDate] = Math.floor(Math.random() * 50) + 50
    }

		const reversedData = {}
		for(let i = 0; i < times; i++) {
			reversedData[Object.keys(data)[times - 1 - i]] = Object.values(data)[times - 1 - i]
		}

		return reversedData
  }
</script>



<div class="wrapper">
	<div class="header">
		<h1>Tiny Linked Charts for <mark>Svelte</mark></h1>
		<LinkedChart data={ fakeData(108) } width="540" height="5" />
	</div>

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
				&lt;LinkedChart &#123; data &#125; linked="link-1" /&gt; <br>
				&lt;LinkedChart &#123; data &#125; linked="link-1" /&gt; <br>
				&lt;LinkedChart &#123; data &#125; linked="link-1" /&gt; <br>
				&lt;LinkedChart &#123; data &#125; linked="link-1" /&gt; <br>
			</code>
		</div>

		<div>
			<div class="chart"><LinkedChart data={ fakeData(30) } linked="link-1" /></div>
			<div class="chart"><LinkedChart data={ fakeData(10) } linked="link-1" /></div>
			<div class="chart"><LinkedChart data={ fakeData(30) } linked="link-1" /></div>
			<div class="chart"><LinkedChart data={ fakeData(30) } linked="link-1" /></div>
		</div>
	</div>

	<div class="block">
		<div class="description">
			You can optionally display a label, which will display the label of what you're currently hovering.

			<code>
				&lt;LinkedLabel linked="link-2" /&gt; <br>
				<br>
				&lt;LinkedChart &#123; data &#125; linked="link-2" /&gt; <br>
				&lt;LinkedChart &#123; data &#125; linked="link-2" /&gt; <br>
			</code>
			<br>
			The label has no styling by default.
		</div>

		<div>
			<div class="label"><LinkedLabel linked="link-2" empty="Start hovering" /></div>

			<div class="chart"><LinkedChart data={ fakeData(30) } linked="link-2" /></div>
			<div class="chart"><LinkedChart data={ fakeData(30) } linked="link-2" /></div>
		</div>
	</div>

	<div class="block">
		<div class="description">
			The width of the bars is fixed by default, but can be set to grow to fill the chart.

			<code>
				&lt;LinkedChart data=&#123 ... &#125; grow=&#123 true &#125; /&gt;
			</code>
		</div>

		<LinkedChart data={ fakeData(5) } grow={ true } />
	</div>

	<div class="block">
		<div class="description">
			To make the bars smaller you can set the "barMinWidth" property.

			<code>
				&lt;LinkedChart data=&#123 ... &#125; barMinWidth="2" /&gt;
			</code>
		</div>

		<LinkedChart data={ fakeData(50) } barMinWidth="2" />
	</div>

	<div class="block">
		<div class="description">
			To always fill out the content, growing and shrinking, you can set both the "grow" and "barMinWidth" properties.

			<code>
				&lt;LinkedChart<br>
				&nbsp; data=&#123 ... &#125; <br>
				&nbsp; grow=&#123 true &#125; <br>
				&nbsp; barMinWidth="0" /&gt;
			</code>
		</div>

		<div>
			<div class="chart"><LinkedChart data={ fakeData(75) } grow={ true } barMinWidth="0" /></div>
			<div class="chart"><LinkedChart data={ fakeData(10) } grow={ true } barMinWidth="0" /></div>
		</div>
	</div>

	<div class="block">
		<div class="description">
			The charts can be resized to any size you like. It renders as an SVG, so they can easily be made responsive with some CSS.

			<code>
				&lt;LinkedChart<br>
				&nbsp; data=&#123 ... &#125; <br>
				&nbsp; width="250" <br>
				&nbsp; height="100" /&gt;
			</code>

			<code>
				svg &#123; <br>
				&nbsp; width: 100%; <br>
				&nbsp; height: auto; <br>
				&#125;
			</code>

			<br>
			or for a fixed height;

			<code>
				svg &#123; <br>
				&nbsp; width: 100%; <br>
				&nbsp; height: 50px; <br>
				&#125;
			</code>
		</div>

		<div>
			<div class="chart chart--responsive"><LinkedChart data={ fakeData(50) } height="100" width="250" linked="linked-3" /></div>
			<div class="chart chart--responsive"><LinkedChart data={ fakeData(50) } height="10" width="250" linked="linked-3" /></div>
		</div>
	</div>

	<div class="block">
		<div class="description">
			The gap in between bars can also be adjusted.

			<code>
				&lt;LinkedChart &#123; data &#125; gap="11" /&gt;
			</code>
		</div>

		<LinkedChart data={ fakeData(10) } gap="11" />
	</div>

	<div class="block">
		<div class="description">
			The bars can be colored any way you wish.

			<code>
				&lt;LinkedChart fill="#ff00ff" /&gt; <br>
				&lt;LinkedChart fill="rgb(255, 255, 0)" /&gt; <br>
				&lt;LinkedChart fill="hsla(290, 55%, 50%, 1)" /&gt; <br>
			</code>
		</div>

		<div>
			<div class="chart"><LinkedChart data={ fakeData(30) } fill="#e6261f" linked="link-4" /></div>
			<div class="chart"><LinkedChart data={ fakeData(30) } fill="#eb7532" linked="link-4" /></div>
			<div class="chart"><LinkedChart data={ fakeData(30) } fill="#f7d038" linked="link-4" /></div>
			<div class="chart"><LinkedChart data={ fakeData(30) } fill="#a3e048" linked="link-4" /></div>
			<div class="chart"><LinkedChart data={ fakeData(30) } fill="#49da9a" linked="link-4" /></div>
			<div class="chart"><LinkedChart data={ fakeData(30) } fill="#34bbe6" linked="link-4" /></div>
			<div class="chart"><LinkedChart data={ fakeData(30) } fill="#4355db" linked="link-4" /></div>
			<div class="chart"><LinkedChart data={ fakeData(30) } fill="hsla(290, 55%, 50%, 1)" linked="link-4" /></div>
		</div>
	</div>
</div>



<style>
	:global(body) {
		background: #111;
		color: white;
		font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
	}

	h1 {
		margin: 0;
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

	.header {
		margin: 6rem 0 3rem;
	}

	:global(.header svg) {
		width: 100%;
		height: 5px;
	}

	.wrapper {
		max-width: 540px;
		margin: 0 auto;
		padding: 0 1.5rem;
	}

	.block {
		display: grid;
		grid-template-columns: 1fr auto;
		grid-gap: 1.5rem;
		justify-content: space-between;
		padding: 3rem 0;
		border-bottom: 1px solid rgba(255, 255, 255, 0.15);
	}

	.chart {
		margin-top: .5rem;
	}

	:global(.chart--responsive svg) {
		width: 100%;
		height: auto;
	}

	:global(svg g) {
		fill: blue;
	}

	.label {
		text-align: right;
		color: rgba(255, 255, 255, 0.75);
	}
</style>
