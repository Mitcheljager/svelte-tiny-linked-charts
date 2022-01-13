<script>
	import { onMount } from "svelte"

	import { LinkedChart, LinkedLabel, LinkedValue } from "svelte-tiny-linked-charts"

	let transitioningData = fakeData(30)
	let transitionColor = 50

	onMount(() => {
		setInterval(() => {
			transitioningData = fakeData(30)
			transitionColor = Math.floor(Math.random() * 360)
		}, 1000)
	})

	function fakeData(times, maxValue = 100, minValue = 50) {
		const data = {}
		const date = new Date("2005-05-01T00:00:00Z")

    for(let i = 0; i < times; i++) {
			const setDate = date.setDate(date.getDate() - 1)
			const formattedDate = new Date(setDate).toISOString().substring(0, 10)

      data[formattedDate] = Math.floor(Math.random() * (maxValue - minValue)) + minValue
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
		<LinkedChart data={ fakeData(108) } width="540" height="5" hover={ false } />
	</div>

	<div class="block block--single">
		<p>This is a library to display tiny bar charts. These charts are more so meant for graphic aids, rather than scientific representations. There's no axis labels, no extensive data visualisation, just bars.</p>

		<p><em>Inspired by steamcharts.com</em></p>

		<p><a href="https://github.com/Mitcheljager/svelte-tiny-linked-charts">GitHub</a></p>

		<h2>Demo</h2>

		<table class="preview-table">
			<tr>
				<th>Name</th>
				<th width="150"><LinkedLabel linked="table" empty="30 day period" /></th>
				<th>Value</th>
			</tr>

			<tr>
				<td class="label">I am a thing</td>
				<td><LinkedChart data={ fakeData(30) } linked="table" uid="table-1" /></td>
				<td><LinkedValue uid="table-1" empty={ Object.values(fakeData(30)).reduce((a, b) => a + b) } /></td>
			</tr>

			<tr>
				<td class="label">I am another thing</td>
				<td><LinkedChart data={ fakeData(30) } linked="table" uid="table-2" /></td>
				<td><LinkedValue uid="table-2" empty={ Object.values(fakeData(30)).reduce((a, b) => a + b) } /></td>
			</tr>

			<tr>
				<td class="label">I am a third thing</td>
				<td><LinkedChart data={ fakeData(30) } linked="table" uid="table-3" /></td>
				<td><LinkedValue uid="table-3" empty={ Object.values(fakeData(30)).reduce((a, b) => a + b) }  /></td>
			</tr>
		</table>

		<h2>Installation</h2>

		<p>Install using Yarn or NPM.</p>

		<code class="well">
			yarn add <mark>svelte-tiny-linked-charts</mark>
		</code>

		<code class="well">
			npm install --save <mark>svelte-tiny-linked-charts</mark>
		</code>

		<p>Include the chart in your app.</p>

		<code class="well">
			&lt;<mark>LinkedChart</mark> &#123; data &#125; /&gt;
		</code>

		<code class="well">
			import &#123; <mark>LinkedChart</mark>, <mark>LinkedLabel</mark>, <mark>LinkedValue</mark> &#125; from "<mark>svelte-tiny-linked-charts</mark>"
		</code>
	</div>

	<div class="block block--single">
		<p>
			Supply your data in a simple key:value object:
		</p>

		<code class="well">
			let data = &#123; <br>
			&nbsp; "2005-01-01": 25, <br>
			&nbsp; "2005-01-02": 20, <br>
			&nbsp; "2005-01-03": 18, <br>
			&nbsp; "2005-01-04": 17, <br>
			&nbsp; "2005-01-05": 21 <br>
			&#125;
		</code>

		<code class="well">
			&lt;LinkedChart &#123; data &#125; /&gt;
		</code>

		<p>Or if you prefer supply the labels and values separately:</p>

		<code class="well">
			let labels = [ <br>
			&nbsp; "2005-01-01", <br>
			&nbsp; "2005-01-02", <br>
			&nbsp; "2005-01-03", <br>
			&nbsp; "2005-01-04", <br>
			&nbsp; "2005-01-05" <br>
			]
		</code>

		<code class="well">
			let values = [ <br>
			&nbsp; 25, <br>
			&nbsp; 20, <br>
			&nbsp; 18, <br>
			&nbsp; 17, <br>
			&nbsp; 21 <br>
			]
		</code>

		<code class="well">
			&lt;LinkedChart &#123; labels &#125; &#123; values &#125; /&gt;
		</code>
	</div>

	<h2>Usage</h2>

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
				&lt;LinkedChart &#123; data &#125; linked="link-1" /&gt;
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
			The highest value in the chart is automatically determined by the highest value in your data. To overwrite this use "scaleMax".

			<code>
				&lt;LinkedChart &#123; data &#125; scaleMax="100" /&gt; <br>
				&lt;LinkedChart &#123; data &#125; scaleMax="100" /&gt;
			</code>
		</div>

		<div>
			<div class="chart"><LinkedChart data={ fakeData(30) } linked="link-8" scaleMax="100" /></div>
			<div class="chart"><LinkedChart data={ fakeData(30, 30, 10) } linked="link-8" scaleMax="100" /></div>
		</div>
	</div>

	<h2>Label</h2>

	<div class="block">
		<div class="description">
			You can optionally display a label, which will display the label of what you're currently hovering.

			<code>
				&lt;LinkedLabel linked="link-2" /&gt; <br>
				<br>
				&lt;LinkedChart &#123; data &#125; linked="link-2" /&gt; <br>
				&lt;LinkedChart &#123; data &#125; linked="link-2" /&gt;
			</code>
			<br>
			The label has no styling by default.
		</div>

		<div>
			<LinkedLabel linked="link-2" empty="Start hovering" />

			<div class="chart"><LinkedChart data={ fakeData(30) } linked="link-2" /></div>
			<div class="chart"><LinkedChart data={ fakeData(30) } linked="link-2" /></div>
		</div>
	</div>

	<div class="block">
		<div class="description">
			You can enable a the value you're hovering using "showValue".

			<code>
				&lt;LinkedChart &#123; data &#125; showValue=&#123; true &#125; /&gt;
			</code>

			<br>
			This can be further enhanced with "valueDefault", "valuePrepend", and "valueAppend".

			<code>
				&lt;LinkedChart <br>
				&nbsp; &#123; data &#125;  <br>
				&nbsp; showValue=&#123; true &#125; <br>
				&nbsp; valueDefault="Empty label" <br>
				&nbsp; valuePrepend="Thing:" <br>
				&nbsp; valueAppend="views" /&gt;
			</code>
			<br>
			This value has no styling by default.
		</div>

		<div>
			<div class="chart"><LinkedChart data={ fakeData(30) } linked="link-5" showValue={ true } /></div>
			<div class="chart"><LinkedChart data={ fakeData(30) } linked="link-5" showValue={ true } valueDefault="Empty label" valuePrepend="Thing:" valueAppend="views" /></div>
		</div>
	</div>

	<div class="block">
		<div class="description">
			The value can be position at the location of the hover using "valuePosition".

			<code>
				&lt;LinkedChart &#123; data &#125; showLabel=&#123; true &#125; /&gt;
			</code>

			<br>
			This can be further enhanced with "labelDefault", "labelPrepend", and "labelAppend".

			<code>
				&lt;LinkedChart <br>
				&nbsp; &#123; data &#125;  <br>
				&nbsp; showValue=&#123; true &#125; <br>
				&nbsp; valuePosition="floating" /&gt;
			</code>
			<br>
			You're expected to style this value further yourself.
		</div>

		<div>
			<div class="chart"><LinkedChart data={ fakeData(30) } linked="link-7" showValue={ true } valuePosition="floating" /></div>
			<br>
			<div class="chart"><LinkedChart data={ fakeData(30) } linked="link-7" showValue={ true } valuePosition="floating" /></div>
		</div>
	</div>

	<div class="block block--single">
		Alternatively you can show the value as a separate element wherever you like using the "LinkedValue" component. Use "uid" to link the chart and value together.

		<code>
			&lt;LinkedChart &#123; data &#125; uid="some-id" /&gt;
			<br>
			&lt;LinkedValue uid="some-id" /&gt; <br>
		</code>
		<br>
		This value has no styling by default.

		<br><br>

		<div>
			<LinkedChart data={ fakeData(30) } linked="link-6" uid="test" />

			<strong><LinkedValue empty="Separate value" uid="test" /></strong>
		</div>

		<div>
			<LinkedChart data={ fakeData(30) } linked="link-6" uid="test-2" />

			<strong><LinkedValue empty="Separate value" uid="test-2" /></strong>
		</div>
	</div>

	<h2>Styling</h2>

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
			To change the size of the bars set the "barMinWidth" property.

			<code>
				&lt;LinkedChart data=&#123 ... &#125; barMinWidth="2" /&gt; <br>
				&lt;LinkedChart data=&#123 ... &#125; barMinWidth="14" /&gt;
			</code>
		</div>

		<div>
			<div class="chart"><LinkedChart data={ fakeData(50) } barMinWidth="2" /></div>
			<div class="chart"><LinkedChart data={ fakeData(10) } barMinWidth="14" /></div>
		</div>
	</div>

	<div class="block">
		<div class="description">
			To always fill out the content, giving the bars a dynamic width, you can set both the "grow" and "barMinWidth" properties.

			<code>
				&lt;LinkedChart<br>
				&nbsp; data=&#123 ... &#125; <br>
				&nbsp; grow=&#123 true &#125; <br>
				&nbsp; barMinWidth="0" /&gt;
			</code>
		</div>

		<div>
			<div class="chart"><LinkedChart data={ fakeData(75) } grow={ true } barMinWidth="0" /></div>
			<div class="chart"><LinkedChart data={ fakeData(7) } grow={ true } barMinWidth="0" /></div>
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
				&lt;LinkedChart &#123; data &#125; gap="10" /&gt; <br>
				&lt;LinkedChart &#123; data &#125; gap="0" /&gt;
			</code>
		</div>

		<div>
			<div class="chart"><LinkedChart data={ fakeData(11) } gap="10" /></div>
			<div class="chart"><LinkedChart data={ fakeData(36) } gap="0" /></div>
		</div>
	</div>

	<div class="block">
		<div class="description">
			When the bars do not fill the width of the graph they are aligned to the right by default. This can be set to be left aligned instead.

			<code>
				&lt;LinkedChart &#123; data &#125; align="left" /&gt;
			</code>
		</div>

		<div>
			<div class="chart"><LinkedChart data={ fakeData(20) } /></div>
			<div class="chart"><LinkedChart data={ fakeData(20) } align="left" /></div>
		</div>
	</div>

	<div class="block">
		<div class="description">
			The bars can be colored any way you wish.

			<code>
				&lt;LinkedChart fill="#ff00ff" /&gt; <br>
				&lt;LinkedChart fill="rgb(255, 255, 0)" /&gt; <br>
				&lt;LinkedChart fill="hsla(290, 55%, 50%, 1)" /&gt;
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

	<div class="block">
		<div class="description">
			The opacity of faded out bars can be adjusted using "fadeOpacity".

			<code>
				&lt;LinkedChart &#123; data &#125; fadeOpacity="0.15" /&gt;
			</code>
		</div>

		<LinkedChart data={ fakeData(30) } fadeOpacity="0.15" />
	</div>

	<div class="block">
		<div class="description">
			The hover effect can be disabled altogether using "hover".

			<code>
				&lt;LinkedChart &#123; data &#125; hover=&#123; false &#125; /&gt;
			</code>
		</div>

		<LinkedChart data={ fakeData(30) } hover={ false } />
	</div>

	<div class="block">
		<div class="description">
			Bars can be set to transition between states. <br>
			Value is speed in milliseconds.

			<code>
				&lt;LinkedChart &#123; data &#125; transition="500" /&gt;
			</code>
		</div>

		<LinkedChart data={ transitioningData } fill="hsl({ transitionColor }, 60%, 50%)" transition="500" />
	</div>

	<div class="block">
		<div class="description">
			To improve accessibility you can set "tabindex=0", allowing navigating to each data point using the keyboard.

			<code>
				&lt;LinkedChart &#123; data &#125; tabindex="0" /&gt; <br>
			</code>
		</div>

		<div>
			<div class="chart"><LinkedChart data={ fakeData(30) } linked="link-10" showValue valuePosition="floating" tabindex="0" /></div>
		</div>
	</div>

	<div class="block">
		<div class="description">
			Instead of bars you can also opt for a line-chart using "type=line". "lineColor" can be used to color the line, "fill" to color the points. This can have all of the bar properties as well.

			<code>
				&lt;LinkedChart &#123; data &#125; type="line" /&gt; <br>
				&lt;LinkedChart <br>
				&nbsp; &#123; data &#125; <br>
				&nbsp; type="line" <br>
				&nbsp; lineColor="#4355db" <br>
				&nbsp; fill="white" /&gt;
			</code>
		</div>

		<div>
			<div class="chart"><LinkedChart data={ fakeData(30) } linked="link-9" type="line" /></div>
			<div class="chart"><LinkedChart data={ fakeData(30) } linked="link-9" type="line" /></div>
			<div class="chart"><LinkedChart data={ fakeData(30) } linked="link-9" type="line" /></div>
			<div class="chart"><LinkedChart data={ fakeData(30) } linked="link-9" type="line" lineColor="#4355db" fill="white" showValue="true" valuePosition="floating" /></div>
		</div>
	</div>

	<h2>Events</h2>

	<div class="block">
		<div class="description">
			By enable "dispatchEvents" on the LinkedChart component you can dispatch several events when the state of the chart changes.

			<code class="well">
				&lt;LinkedChart <br>
				&nbsp; dispatchEvents=&#123; true &#125; <br>
				&nbsp; on:hover=&#123; event =&gt; console.log(event.detail) &#125; <br>
				&nbsp; on:blur=&#123; event =&gt; console.log(event.detail) &#125; <br>
				&nbsp; on:value-update=&#123; event =&gt; console.log(event.detail) &#125; /&gt;
			</code>

			<p>This could be used to construct your own value element that can be formatted as you wish. For example in this example the values are given as cents, but the value is formatted as dollars.</p>

			<div>
				<LinkedChart
					data={ fakeData(30, 100000, 10000) }
					dispatchEvents
					on:hover={ event => document.querySelector("[data-role='currency']").innerHTML = (event.detail.value / 100).toLocaleString("en-US", { style: "currency", currency: "USD" }) }
					on:blur={ event => document.querySelector("[data-role='currency']").innerHTML = "&nbsp;" } />

				<span data-role="currency">&nbsp;</span>
			</div>

			<code class="well">
				&lt;LinkedChart <br>
				&nbsp; dispatchEvents <br>
				&nbsp; on:hover=&#123; event =&gt; <br>
				&nbsp;&nbsp;&nbsp	document.querySelector("[data-role='currency']") <br>
				&nbsp;&nbsp;&nbsp .innerHTML = (event.detail.value / 100).toLocaleString("en-US", &#123; <br>
				&nbsp;&nbsp;&nbsp&nbsp;&nbsp; style: "currency", currency: "USD"<br>
				&nbsp;&nbsp;&nbsp &#125;) <br>
				&nbsp; &#125; <br>
				&nbsp; on:blur=&#123; event =&gt; <br>
				&nbsp;&nbsp;&nbsp document.querySelector("[data-role='currency']").innerHTML = "&nbsp;" <br>
				&nbsp; &#125; /&gt;
			</code>

			<br>

			<p>In this example we format the value element inside the chart directly to make use of "toLocaleString()" to format the number. Ideally you would supply the value already formatted to avoid having to do this, but that's not always possible.</p>

			<div>
				<LinkedChart
					data={ fakeData(30, 100000, 10000) }
					dispatchEvents
					showValue
					valuePosition="floating"
					valuePrepend="Value: "
					on:value-update={ event => { if (event.detail.valueElement) event.detail.valueElement.innerText = event.detail.value?.toLocaleString() } } />
			</div>

			<code class="well">
				&lt;LinkedChart <br>
				&nbsp; dispatchEvents <br>
				&nbsp; showValue <br>
				&nbsp; valuePosition="floating" <br>
				&nbsp; valuePrepend="Value: " <br>
				&nbsp; on:value-update=&#123; event =&gt; &#123; <br>
				&nbsp;&nbsp;&nbsp; if (event.detail.valueElement) <br>
				&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; event.detail.valueElement.innerText = <br>
				&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; event.detail.value?.toLocaleString() <br>
				&nbsp; &#125; &#125; /&gt;
			</code>

			<br>

			<h3>All events</h3>

			<div class="table">
				<strong>Property</strong> <strong>Description</strong> <strong>Return</strong>
				<code>on:hover</code> <div>On hover of bars</div> <code>uid, key, index, linkedKey, value, valueElement, eventElement</code>
				<code>on:blur</code> <div>On blur of the chart</div> <code>uid, linkedKey, valueElement, eventElement</code>
				<code>on:value-update</code> <div>Any time the value updates</div> <code>value, uid, linkedKey, valueElement</code>
			</div>
		</div>
	</div>

	<h2>Properties</h2>

	<div class="block block--single">
		<p>This is a list of all configurable properties on the "LinkedChart" component.</p>

		<div class="table">
			<strong>Property</strong> <strong>Default</strong> <strong>Description</strong>
			<code>data</code> <code>&#123;&#125;</code> <div>Data that will be displayed in the chart supplied in key:value object.</div>
			<code>labels</code> <code>[]</code> <div>Labels supplied separately, to be used together with "values" property.</div>
			<code>values</code> <code>[]</code> <div>Values supplied separately, to be used together with "labels" property.</div>
			<code>linked</code> <code></code> <div>Key to link this chart to other charts with the same key.</div>
			<code>uid</code> <code></code> <div>Unique ID to link this chart to a LinkedValue component with the same uid.</div>
			<code>height</code> <code>40</code> <div>Height of the chart in pixels.</div>
			<code>width</code> <code>150</code> <div>Width of the chart in pixels.</div>
			<code>barMinWidth</code> <code>4</code> <div>Width of the bars in the chart in pixels.</div>
			<code>grow</code> <code>false</code> <div>Whether or not the bar should grow to fill out the full width of the chart.</div>
			<code>align</code> <code>right</code> <div>The side the bars should align to when they do not completely fill out the chart.</div>
			<code>gap</code> <code>1</code> <div>Gap between the bars in pixels.</div>
			<code>fill</code> <code>#ff3e00</code> <div>Color of the bars, can be any valid CSS color.</div>
			<code>fadeOpacity</code> <code>0.5</code> <div>The opacity the faded out bars should display in.</div>
			<code>hover</code> <code>true</code> <div>Boolean whether or not this chart can be hovered at all.</div>
			<code>transition</code> <code>0</code> <div>Transition the chart between different stats. Value is time in milliseconds.</div>
			<code>showValue</code> <code>false</code> <div>Boolean whether or not a value will be shown.</div>
			<code>valueDefault</code> <code>"&nbsp;"</code> <div>Default value when not hovering.</div>
			<code>valuePrepend</code> <code></code> <div>String to prepend the value.</div>
			<code>valueAppend</code> <code></code> <div>String to append to the value.</div>
			<code>valuePosition</code> <code>static</code> <div>Can be set to "floating" to follow the position of the hover.</div>
			<code>scaleMax</code> <code>0</code> <div>Use this to overwrite the automatic scale set to the highest value in your array.</div>
			<code>type</code> <code>bar</code> <div>Can be set to "line" to display a line chart instead.</div>
			<code>lineColor</code> <code>fill</code> <div>Color of the line if used with type="line".</div>
			<code>tabindex</code> <code>-1</code> <div>Sets the tabindex of each bar.</div>
			<code>dispatchEvents</code> <code>false</code> <div>Boolean whether or not to dispatch events on certain actions (explained above).</div>
		</div>
	</div>

	<div class="block block--single">
		<p>This is a list of all configurable properties on the "LinkedLabel" component.</p>

		<div class="table">
			<strong>Property</strong> <strong>Default</strong> <strong>Description</strong>
			<code>linked</code> <code></code> <div>Key to link this label to charts with the same key.</div>
			<code>empty</code> <code>&amp;nbsp;</code> <div>String that will be displayed when no bar is being hovered.</div>
		</div>
	</div>

	<div class="block block--single">
		<p>This is a list of all configurable properties on the "LinkedValue" component.</p>

		<div class="table">
			<strong>Property</strong> <strong>Default</strong> <strong>Description</strong>
			<code>uid</code> <code></code> <div>Unique ID to link this value to a chart with the same uid.</div>
			<code>empty</code> <code>&amp;nbsp;</code> <div>String that will be displayed when no bar is being hovered.</div>
		</div>
	</div>

	<div class="block block--single">
		Made by <a href="https://github.com/Mitcheljager">Mitchel Jager</a>
	</div>
</div>



<style>
	:global(:root) {
		--primary: #ff3e00;
		--text-color: #444;
		--text-color-light: #999;
		--border-color: #edf3f0;
		--bg-well: #f6fafd;
		--bg-body: #fff;
	}

	@media (prefers-color-scheme: dark) {
		:global(:root) {
			--text-color: #b7c0d1;
			--text-color-light: #8e99af;
			--border-color: #363d49;
			--bg-well: #21242c;
			--bg-body: #16181d;
		}
	}

	:global(body) {
		padding: 0;
		margin: 0;
		background: var(--bg-body);
		color: var(--text-color);
		font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
	}

	h1 {
		margin: 0;
		color: white;
	}

	h2 {
		margin: 3rem 0 1.5rem;
		color: white;
	}

	code {
		display: block;
		margin-top: 1rem;
		color: var(--text-color-light);
		font-size: .75rem;
		line-height: 1.5em;
	}

	mark {
		background: none;
		color: var(--primary);
	}

	a {
		color: var(--primary);
	}

	p:first-child {
		margin-top: 0;
	}

	.well {
		padding: .35rem .5rem;
		border-radius: .5rem;
		border: 1px solid var(--border-color);
		background: var(--bg-well);
	}

	.header {
		margin: 6rem 0 0;
	}

	:global(.header svg) {
		width: 100%;
		height: 5px;
	}

	.wrapper {
		max-width: 540px;
		margin: 0 auto;
		padding: 0 1rem 6rem;
	}

	.block {
		padding: 3rem 0;
		border-bottom: 1px solid var(--border-color);
	}

	@media (min-width: 600px) {
		.block {
			display: grid;
			grid-template-columns: 1fr auto;
			grid-gap: 1.5rem;
			justify-content: space-between;
		}
	}

	.block--single {
		display: block;
	}

	.description {
		margin-bottom: 1rem;
	}

	@media (min-width: 600px) {
		.description {
			margin-bottom: 0;
		}
	}

	.table {
		display: grid;
		grid-template-columns: 1fr 1fr 3fr;
		grid-gap: 1rem .5rem;
	}

	.table strong {
		color: var(--text-color);
	}

	.table code {
		margin-top: 0;
		line-height: 1.3rem;
	}

	.chart {
		margin-top: .5rem;
	}

	:global(.chart--responsive svg) {
		width: 100%;
		height: auto;
	}

	table {
		width: 100%;
		border: 1px solid var(--border-color);
		border-radius: .5rem;
		border-collapse: collapse;
		background: var(--bg-well);
		font-size: clamp(0.75rem, 3vw, 1rem);
		color: var(--text-color-light);
		font-style: italic;
	}

	table tr:nth-child(even) td {
		background: var(--bg-body);
	}

	table tr td,
	table tr th {
		border: 0;
		padding: 0.5rem 0 0.5rem 1rem;
		text-align: left;
	}

	table :global(svg) {
		max-width: 100%;
		height: auto;
	}

	table .label {
		color: var(--text-color);
		font-style: normal;
	}
</style>
