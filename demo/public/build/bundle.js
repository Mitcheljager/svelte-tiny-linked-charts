
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function set_store_value(store, ret, value) {
        store.set(value);
        return ret;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }
    class HtmlTag {
        constructor() {
            this.e = this.n = null;
        }
        c(html) {
            this.h(html);
        }
        m(html, target, anchor = null) {
            if (!this.e) {
                this.e = element(target.nodeName);
                this.t = target;
                this.c(html);
            }
            this.i(anchor);
        }
        h(html) {
            this.e.innerHTML = html;
            this.n = Array.from(this.e.childNodes);
        }
        i(anchor) {
            for (let i = 0; i < this.n.length; i += 1) {
                insert(this.t, this.n[i], anchor);
            }
        }
        p(html) {
            this.d();
            this.h(html);
            this.i(this.a);
        }
        d() {
            this.n.forEach(detach);
        }
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : options.context || []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.42.1' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = new Set();
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (const subscriber of subscribers) {
                        subscriber[1]();
                        subscriber_queue.push(subscriber, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.add(subscriber);
            if (subscribers.size === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                subscribers.delete(subscriber);
                if (subscribers.size === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    const hoveringKey = writable([]);

    /* ..\src\LinkedChart.svelte generated by Svelte v3.42.1 */

    const { Object: Object_1$1 } = globals;
    const file$1 = "..\\src\\LinkedChart.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[28] = list[i][0];
    	child_ctx[29] = list[i][1];
    	child_ctx[31] = i;
    	return child_ctx;
    }

    // (55:4) { #each Object.entries(data) as [key, value], i }
    function create_each_block(ctx) {
    	let rect;
    	let rect_style_value;
    	let rect_opacity_value;
    	let rect_height_value;
    	let rect_y_value;
    	let rect_x_value;
    	let mounted;
    	let dispose;

    	function mouseover_handler() {
    		return /*mouseover_handler*/ ctx[20](/*key*/ ctx[28]);
    	}

    	function focus_handler() {
    		return /*focus_handler*/ ctx[21](/*key*/ ctx[28]);
    	}

    	const block = {
    		c: function create() {
    			rect = svg_element("rect");

    			attr_dev(rect, "style", rect_style_value = /*transition*/ ctx[7]
    			? `transition: all ${/*transition*/ ctx[7]}ms`
    			: null);

    			attr_dev(rect, "opacity", rect_opacity_value = /*hover*/ ctx[6] && /*$hoveringKey*/ ctx[11][/*linkedKey*/ ctx[9]] && /*$hoveringKey*/ ctx[11][/*linkedKey*/ ctx[9]] != /*key*/ ctx[28]
    			? /*fadeOpacity*/ ctx[5]
    			: 1);

    			attr_dev(rect, "width", /*barWidth*/ ctx[8]);
    			attr_dev(rect, "height", rect_height_value = /*getHeight*/ ctx[12](/*value*/ ctx[29]));
    			attr_dev(rect, "y", rect_y_value = /*height*/ ctx[1] - /*getHeight*/ ctx[12](/*value*/ ctx[29]));
    			attr_dev(rect, "x", rect_x_value = (parseInt(/*gap*/ ctx[3]) + /*barWidth*/ ctx[8]) * /*i*/ ctx[31]);
    			add_location(rect, file$1, 55, 6, 1732);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, rect, anchor);

    			if (!mounted) {
    				dispose = [
    					listen_dev(rect, "mouseover", mouseover_handler, false, false, false),
    					listen_dev(rect, "focus", focus_handler, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty[0] & /*transition*/ 128 && rect_style_value !== (rect_style_value = /*transition*/ ctx[7]
    			? `transition: all ${/*transition*/ ctx[7]}ms`
    			: null)) {
    				attr_dev(rect, "style", rect_style_value);
    			}

    			if (dirty[0] & /*hover, $hoveringKey, linkedKey, data, fadeOpacity*/ 2657 && rect_opacity_value !== (rect_opacity_value = /*hover*/ ctx[6] && /*$hoveringKey*/ ctx[11][/*linkedKey*/ ctx[9]] && /*$hoveringKey*/ ctx[11][/*linkedKey*/ ctx[9]] != /*key*/ ctx[28]
    			? /*fadeOpacity*/ ctx[5]
    			: 1)) {
    				attr_dev(rect, "opacity", rect_opacity_value);
    			}

    			if (dirty[0] & /*barWidth*/ 256) {
    				attr_dev(rect, "width", /*barWidth*/ ctx[8]);
    			}

    			if (dirty[0] & /*data*/ 1 && rect_height_value !== (rect_height_value = /*getHeight*/ ctx[12](/*value*/ ctx[29]))) {
    				attr_dev(rect, "height", rect_height_value);
    			}

    			if (dirty[0] & /*height, data*/ 3 && rect_y_value !== (rect_y_value = /*height*/ ctx[1] - /*getHeight*/ ctx[12](/*value*/ ctx[29]))) {
    				attr_dev(rect, "y", rect_y_value);
    			}

    			if (dirty[0] & /*gap, barWidth*/ 264 && rect_x_value !== (rect_x_value = (parseInt(/*gap*/ ctx[3]) + /*barWidth*/ ctx[8]) * /*i*/ ctx[31])) {
    				attr_dev(rect, "x", rect_x_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(rect);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(55:4) { #each Object.entries(data) as [key, value], i }",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let svg;
    	let g;
    	let g_transform_value;
    	let svg_viewBox_value;
    	let mounted;
    	let dispose;
    	let each_value = Object.entries(/*data*/ ctx[0]);
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			g = svg_element("g");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(g, "transform", g_transform_value = "translate(" + /*alignmentOffset*/ ctx[10] + ", 0)");
    			attr_dev(g, "fill", /*fill*/ ctx[4]);
    			add_location(g, file$1, 53, 2, 1611);
    			attr_dev(svg, "height", /*height*/ ctx[1]);
    			attr_dev(svg, "width", /*width*/ ctx[2]);
    			attr_dev(svg, "viewBox", svg_viewBox_value = "0 0 " + /*width*/ ctx[2] + " " + /*height*/ ctx[1]);
    			attr_dev(svg, "preserveAspectRatio", "none");
    			add_location(svg, file$1, 45, 0, 1387);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, g);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(g, null);
    			}

    			if (!mounted) {
    				dispose = [
    					listen_dev(svg, "mouseleave", /*mouseleave_handler*/ ctx[22], false, false, false),
    					listen_dev(svg, "blur", /*blur_handler*/ ctx[23], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*transition, hover, $hoveringKey, linkedKey, data, fadeOpacity, barWidth, getHeight, height, gap*/ 7147) {
    				each_value = Object.entries(/*data*/ ctx[0]);
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(g, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty[0] & /*alignmentOffset*/ 1024 && g_transform_value !== (g_transform_value = "translate(" + /*alignmentOffset*/ ctx[10] + ", 0)")) {
    				attr_dev(g, "transform", g_transform_value);
    			}

    			if (dirty[0] & /*fill*/ 16) {
    				attr_dev(g, "fill", /*fill*/ ctx[4]);
    			}

    			if (dirty[0] & /*height*/ 2) {
    				attr_dev(svg, "height", /*height*/ ctx[1]);
    			}

    			if (dirty[0] & /*width*/ 4) {
    				attr_dev(svg, "width", /*width*/ ctx[2]);
    			}

    			if (dirty[0] & /*width, height*/ 6 && svg_viewBox_value !== (svg_viewBox_value = "0 0 " + /*width*/ ctx[2] + " " + /*height*/ ctx[1])) {
    				attr_dev(svg, "viewBox", svg_viewBox_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let dataLength;
    	let barWidth;
    	let highestValue;
    	let alignmentOffset;
    	let linkedKey;
    	let $hoveringKey;
    	validate_store(hoveringKey, 'hoveringKey');
    	component_subscribe($$self, hoveringKey, $$value => $$invalidate(11, $hoveringKey = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('LinkedChart', slots, []);
    	let { data = {} } = $$props;
    	let { labels = [] } = $$props;
    	let { values = [] } = $$props;
    	let { height = 40 } = $$props;
    	let { width = 150 } = $$props;
    	let { barMinWidth = 4 } = $$props;
    	let { grow = false } = $$props;
    	let { align = "right" } = $$props;
    	let { gap = 1 } = $$props;
    	let { fill = "#ff3e00" } = $$props;
    	let { fadeOpacity = 0.5 } = $$props;
    	let { linked = false } = $$props;
    	let { hover = true } = $$props;
    	let { transition = 0 } = $$props;

    	function getHighestValue() {
    		return Math.max(...Object.values(data));
    	}

    	function getHeight(value) {
    		return Math.round(parseInt(height) / highestValue * value);
    	}

    	function getBarWidth() {
    		return Math.max((parseInt(width) - dataLength * parseInt(gap)) / dataLength, parseInt(barMinWidth));
    	}

    	function getAlignment() {
    		if (align == "left") return 0;
    		return parseInt(gap) + parseInt(width) - (parseInt(gap) + barWidth) * dataLength;
    	}

    	const writable_props = [
    		'data',
    		'labels',
    		'values',
    		'height',
    		'width',
    		'barMinWidth',
    		'grow',
    		'align',
    		'gap',
    		'fill',
    		'fadeOpacity',
    		'linked',
    		'hover',
    		'transition'
    	];

    	Object_1$1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<LinkedChart> was created with unknown prop '${key}'`);
    	});

    	const mouseover_handler = key => {
    		set_store_value(hoveringKey, $hoveringKey[linkedKey] = key, $hoveringKey);
    	};

    	const focus_handler = key => {
    		set_store_value(hoveringKey, $hoveringKey[linkedKey] = key, $hoveringKey);
    	};

    	const mouseleave_handler = () => {
    		set_store_value(hoveringKey, $hoveringKey[linkedKey] = null, $hoveringKey);
    	};

    	const blur_handler = () => {
    		set_store_value(hoveringKey, $hoveringKey[linkedKey] = null, $hoveringKey);
    	};

    	$$self.$$set = $$props => {
    		if ('data' in $$props) $$invalidate(0, data = $$props.data);
    		if ('labels' in $$props) $$invalidate(13, labels = $$props.labels);
    		if ('values' in $$props) $$invalidate(14, values = $$props.values);
    		if ('height' in $$props) $$invalidate(1, height = $$props.height);
    		if ('width' in $$props) $$invalidate(2, width = $$props.width);
    		if ('barMinWidth' in $$props) $$invalidate(15, barMinWidth = $$props.barMinWidth);
    		if ('grow' in $$props) $$invalidate(16, grow = $$props.grow);
    		if ('align' in $$props) $$invalidate(17, align = $$props.align);
    		if ('gap' in $$props) $$invalidate(3, gap = $$props.gap);
    		if ('fill' in $$props) $$invalidate(4, fill = $$props.fill);
    		if ('fadeOpacity' in $$props) $$invalidate(5, fadeOpacity = $$props.fadeOpacity);
    		if ('linked' in $$props) $$invalidate(18, linked = $$props.linked);
    		if ('hover' in $$props) $$invalidate(6, hover = $$props.hover);
    		if ('transition' in $$props) $$invalidate(7, transition = $$props.transition);
    	};

    	$$self.$capture_state = () => ({
    		hoveringKey,
    		data,
    		labels,
    		values,
    		height,
    		width,
    		barMinWidth,
    		grow,
    		align,
    		gap,
    		fill,
    		fadeOpacity,
    		linked,
    		hover,
    		transition,
    		getHighestValue,
    		getHeight,
    		getBarWidth,
    		getAlignment,
    		dataLength,
    		barWidth,
    		highestValue,
    		linkedKey,
    		alignmentOffset,
    		$hoveringKey
    	});

    	$$self.$inject_state = $$props => {
    		if ('data' in $$props) $$invalidate(0, data = $$props.data);
    		if ('labels' in $$props) $$invalidate(13, labels = $$props.labels);
    		if ('values' in $$props) $$invalidate(14, values = $$props.values);
    		if ('height' in $$props) $$invalidate(1, height = $$props.height);
    		if ('width' in $$props) $$invalidate(2, width = $$props.width);
    		if ('barMinWidth' in $$props) $$invalidate(15, barMinWidth = $$props.barMinWidth);
    		if ('grow' in $$props) $$invalidate(16, grow = $$props.grow);
    		if ('align' in $$props) $$invalidate(17, align = $$props.align);
    		if ('gap' in $$props) $$invalidate(3, gap = $$props.gap);
    		if ('fill' in $$props) $$invalidate(4, fill = $$props.fill);
    		if ('fadeOpacity' in $$props) $$invalidate(5, fadeOpacity = $$props.fadeOpacity);
    		if ('linked' in $$props) $$invalidate(18, linked = $$props.linked);
    		if ('hover' in $$props) $$invalidate(6, hover = $$props.hover);
    		if ('transition' in $$props) $$invalidate(7, transition = $$props.transition);
    		if ('dataLength' in $$props) $$invalidate(19, dataLength = $$props.dataLength);
    		if ('barWidth' in $$props) $$invalidate(8, barWidth = $$props.barWidth);
    		if ('highestValue' in $$props) highestValue = $$props.highestValue;
    		if ('linkedKey' in $$props) $$invalidate(9, linkedKey = $$props.linkedKey);
    		if ('alignmentOffset' in $$props) $$invalidate(10, alignmentOffset = $$props.alignmentOffset);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*labels, values*/ 24576) {
    			if (labels.length && values.length) $$invalidate(0, data = Object.fromEntries(labels.map((_, i) => [labels[i], values[i]])));
    		}

    		if ($$self.$$.dirty[0] & /*data*/ 1) {
    			$$invalidate(19, dataLength = Object.keys(data).length);
    		}

    		if ($$self.$$.dirty[0] & /*grow, dataLength, barMinWidth*/ 622592) {
    			$$invalidate(8, barWidth = grow ? getBarWidth() : parseInt(barMinWidth));
    		}

    		if ($$self.$$.dirty[0] & /*dataLength*/ 524288) {
    			highestValue = dataLength ? getHighestValue() : 0;
    		}

    		if ($$self.$$.dirty[0] & /*dataLength*/ 524288) {
    			$$invalidate(10, alignmentOffset = dataLength ? getAlignment() : 0);
    		}

    		if ($$self.$$.dirty[0] & /*linked*/ 262144) {
    			$$invalidate(9, linkedKey = linked || (Math.random() + 1).toString(36).substring(7));
    		}
    	};

    	return [
    		data,
    		height,
    		width,
    		gap,
    		fill,
    		fadeOpacity,
    		hover,
    		transition,
    		barWidth,
    		linkedKey,
    		alignmentOffset,
    		$hoveringKey,
    		getHeight,
    		labels,
    		values,
    		barMinWidth,
    		grow,
    		align,
    		linked,
    		dataLength,
    		mouseover_handler,
    		focus_handler,
    		mouseleave_handler,
    		blur_handler
    	];
    }

    class LinkedChart extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(
    			this,
    			options,
    			instance$2,
    			create_fragment$2,
    			safe_not_equal,
    			{
    				data: 0,
    				labels: 13,
    				values: 14,
    				height: 1,
    				width: 2,
    				barMinWidth: 15,
    				grow: 16,
    				align: 17,
    				gap: 3,
    				fill: 4,
    				fadeOpacity: 5,
    				linked: 18,
    				hover: 6,
    				transition: 7
    			},
    			null,
    			[-1, -1]
    		);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "LinkedChart",
    			options,
    			id: create_fragment$2.name
    		});
    	}

    	get data() {
    		throw new Error("<LinkedChart>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set data(value) {
    		throw new Error("<LinkedChart>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get labels() {
    		throw new Error("<LinkedChart>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set labels(value) {
    		throw new Error("<LinkedChart>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get values() {
    		throw new Error("<LinkedChart>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set values(value) {
    		throw new Error("<LinkedChart>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get height() {
    		throw new Error("<LinkedChart>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set height(value) {
    		throw new Error("<LinkedChart>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get width() {
    		throw new Error("<LinkedChart>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set width(value) {
    		throw new Error("<LinkedChart>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get barMinWidth() {
    		throw new Error("<LinkedChart>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set barMinWidth(value) {
    		throw new Error("<LinkedChart>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get grow() {
    		throw new Error("<LinkedChart>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set grow(value) {
    		throw new Error("<LinkedChart>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get align() {
    		throw new Error("<LinkedChart>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set align(value) {
    		throw new Error("<LinkedChart>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get gap() {
    		throw new Error("<LinkedChart>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set gap(value) {
    		throw new Error("<LinkedChart>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get fill() {
    		throw new Error("<LinkedChart>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set fill(value) {
    		throw new Error("<LinkedChart>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get fadeOpacity() {
    		throw new Error("<LinkedChart>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set fadeOpacity(value) {
    		throw new Error("<LinkedChart>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get linked() {
    		throw new Error("<LinkedChart>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set linked(value) {
    		throw new Error("<LinkedChart>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get hover() {
    		throw new Error("<LinkedChart>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set hover(value) {
    		throw new Error("<LinkedChart>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get transition() {
    		throw new Error("<LinkedChart>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set transition(value) {
    		throw new Error("<LinkedChart>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* ..\src\LinkedLabel.svelte generated by Svelte v3.42.1 */

    // (14:0) { :else }
    function create_else_block(ctx) {
    	let html_tag;
    	let html_anchor;

    	const block = {
    		c: function create() {
    			html_tag = new HtmlTag();
    			html_anchor = empty();
    			html_tag.a = html_anchor;
    		},
    		m: function mount(target, anchor) {
    			html_tag.m(/*empty*/ ctx[0], target, anchor);
    			insert_dev(target, html_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*empty*/ 1) html_tag.p(/*empty*/ ctx[0]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(html_anchor);
    			if (detaching) html_tag.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(14:0) { :else }",
    		ctx
    	});

    	return block;
    }

    // (12:0) { #if label }
    function create_if_block(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text(/*label*/ ctx[1]);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*label*/ 2) set_data_dev(t, /*label*/ ctx[1]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(12:0) { #if label }",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let if_block_anchor;

    	function select_block_type(ctx, dirty) {
    		if (/*label*/ ctx[1]) return create_if_block;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, [dirty]) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let label;
    	let $hoveringKey;
    	validate_store(hoveringKey, 'hoveringKey');
    	component_subscribe($$self, hoveringKey, $$value => $$invalidate(3, $hoveringKey = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('LinkedLabel', slots, []);
    	let { linked } = $$props;
    	let { empty = "&nbsp;" } = $$props;
    	const writable_props = ['linked', 'empty'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<LinkedLabel> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('linked' in $$props) $$invalidate(2, linked = $$props.linked);
    		if ('empty' in $$props) $$invalidate(0, empty = $$props.empty);
    	};

    	$$self.$capture_state = () => ({
    		hoveringKey,
    		linked,
    		empty,
    		label,
    		$hoveringKey
    	});

    	$$self.$inject_state = $$props => {
    		if ('linked' in $$props) $$invalidate(2, linked = $$props.linked);
    		if ('empty' in $$props) $$invalidate(0, empty = $$props.empty);
    		if ('label' in $$props) $$invalidate(1, label = $$props.label);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$hoveringKey, linked*/ 12) {
    			$$invalidate(1, label = $hoveringKey[linked]);
    		}
    	};

    	return [empty, label, linked, $hoveringKey];
    }

    class LinkedLabel extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { linked: 2, empty: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "LinkedLabel",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*linked*/ ctx[2] === undefined && !('linked' in props)) {
    			console.warn("<LinkedLabel> was created without expected prop 'linked'");
    		}
    	}

    	get linked() {
    		throw new Error("<LinkedLabel>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set linked(value) {
    		throw new Error("<LinkedLabel>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get empty() {
    		throw new Error("<LinkedLabel>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set empty(value) {
    		throw new Error("<LinkedLabel>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\App.svelte generated by Svelte v3.42.1 */

    const { Object: Object_1 } = globals;
    const file = "src\\App.svelte";

    function create_fragment(ctx) {
    	let div76;
    	let div0;
    	let h1;
    	let t0;
    	let mark0;
    	let t2;
    	let linkedchart0;
    	let t3;
    	let div1;
    	let p0;
    	let t5;
    	let h20;
    	let t7;
    	let p1;
    	let t9;
    	let code0;
    	let t10;
    	let mark1;
    	let t12;
    	let code1;
    	let t13;
    	let mark2;
    	let t15;
    	let p2;
    	let t17;
    	let code2;
    	let t18;
    	let mark3;
    	let t20;
    	let t21;
    	let code3;
    	let t22;
    	let mark4;
    	let t24;
    	let mark5;
    	let t26;
    	let mark6;
    	let t28;
    	let t29;
    	let div2;
    	let p3;
    	let t31;
    	let code4;
    	let t32;
    	let br0;
    	let t33;
    	let br1;
    	let t34;
    	let br2;
    	let t35;
    	let br3;
    	let t36;
    	let br4;
    	let t37;
    	let br5;
    	let t38;
    	let t39;
    	let code5;
    	let t41;
    	let p4;
    	let t43;
    	let code6;
    	let t44;
    	let br6;
    	let t45;
    	let br7;
    	let t46;
    	let br8;
    	let t47;
    	let br9;
    	let t48;
    	let br10;
    	let t49;
    	let br11;
    	let t50;
    	let t51;
    	let code7;
    	let t52;
    	let br12;
    	let t53;
    	let br13;
    	let t54;
    	let br14;
    	let t55;
    	let br15;
    	let t56;
    	let br16;
    	let t57;
    	let br17;
    	let t58;
    	let t59;
    	let code8;
    	let t61;
    	let h21;
    	let t63;
    	let div4;
    	let div3;
    	let t64;
    	let code9;
    	let t66;
    	let linkedchart1;
    	let t67;
    	let div11;
    	let div5;
    	let t68;
    	let code10;
    	let t69;
    	let br18;
    	let t70;
    	let br19;
    	let t71;
    	let br20;
    	let t72;
    	let t73;
    	let div10;
    	let div6;
    	let linkedchart2;
    	let t74;
    	let div7;
    	let linkedchart3;
    	let t75;
    	let div8;
    	let linkedchart4;
    	let t76;
    	let div9;
    	let linkedchart5;
    	let t77;
    	let div17;
    	let div12;
    	let t78;
    	let code11;
    	let t79;
    	let br21;
    	let t80;
    	let br22;
    	let t81;
    	let br23;
    	let t82;
    	let t83;
    	let br24;
    	let t84;
    	let t85;
    	let div16;
    	let div13;
    	let linkedlabel;
    	let t86;
    	let div14;
    	let linkedchart6;
    	let t87;
    	let div15;
    	let linkedchart7;
    	let t88;
    	let div19;
    	let div18;
    	let t89;
    	let code12;
    	let t91;
    	let linkedchart8;
    	let t92;
    	let div21;
    	let div20;
    	let t93;
    	let code13;
    	let t95;
    	let linkedchart9;
    	let t96;
    	let div26;
    	let div22;
    	let t97;
    	let code14;
    	let t98;
    	let br25;
    	let t99;
    	let br26;
    	let t100;
    	let br27;
    	let t101;
    	let t102;
    	let div25;
    	let div23;
    	let linkedchart10;
    	let t103;
    	let div24;
    	let linkedchart11;
    	let t104;
    	let div31;
    	let div27;
    	let t105;
    	let code15;
    	let t106;
    	let br28;
    	let t107;
    	let br29;
    	let t108;
    	let br30;
    	let t109;
    	let t110;
    	let code16;
    	let t111;
    	let br31;
    	let t112;
    	let br32;
    	let t113;
    	let br33;
    	let t114;
    	let t115;
    	let br34;
    	let t116;
    	let code17;
    	let t117;
    	let br35;
    	let t118;
    	let br36;
    	let t119;
    	let br37;
    	let t120;
    	let t121;
    	let div30;
    	let div28;
    	let linkedchart12;
    	let t122;
    	let div29;
    	let linkedchart13;
    	let t123;
    	let div36;
    	let div32;
    	let t124;
    	let code18;
    	let t125;
    	let br38;
    	let t126;
    	let t127;
    	let div35;
    	let div33;
    	let linkedchart14;
    	let t128;
    	let div34;
    	let linkedchart15;
    	let t129;
    	let div41;
    	let div37;
    	let t130;
    	let code19;
    	let t132;
    	let div40;
    	let div38;
    	let linkedchart16;
    	let t133;
    	let div39;
    	let linkedchart17;
    	let t134;
    	let div52;
    	let div42;
    	let t135;
    	let code20;
    	let t136;
    	let br39;
    	let t137;
    	let br40;
    	let t138;
    	let t139;
    	let div51;
    	let div43;
    	let linkedchart18;
    	let t140;
    	let div44;
    	let linkedchart19;
    	let t141;
    	let div45;
    	let linkedchart20;
    	let t142;
    	let div46;
    	let linkedchart21;
    	let t143;
    	let div47;
    	let linkedchart22;
    	let t144;
    	let div48;
    	let linkedchart23;
    	let t145;
    	let div49;
    	let linkedchart24;
    	let t146;
    	let div50;
    	let linkedchart25;
    	let t147;
    	let div54;
    	let div53;
    	let t148;
    	let code21;
    	let t150;
    	let linkedchart26;
    	let t151;
    	let div56;
    	let div55;
    	let t152;
    	let code22;
    	let t154;
    	let linkedchart27;
    	let t155;
    	let div58;
    	let div57;
    	let t156;
    	let br41;
    	let t157;
    	let code23;
    	let t159;
    	let linkedchart28;
    	let t160;
    	let div74;
    	let p5;
    	let t162;
    	let div73;
    	let strong0;
    	let t164;
    	let strong1;
    	let t166;
    	let strong2;
    	let t168;
    	let code24;
    	let t170;
    	let code25;
    	let t172;
    	let div59;
    	let t174;
    	let code26;
    	let t176;
    	let code27;
    	let t178;
    	let div60;
    	let t180;
    	let code28;
    	let t182;
    	let code29;
    	let t184;
    	let div61;
    	let t186;
    	let code30;
    	let t188;
    	let code31;
    	let t190;
    	let div62;
    	let t192;
    	let code32;
    	let t194;
    	let code33;
    	let t196;
    	let div63;
    	let t198;
    	let code34;
    	let t200;
    	let code35;
    	let t202;
    	let div64;
    	let t204;
    	let code36;
    	let t206;
    	let code37;
    	let t208;
    	let div65;
    	let t210;
    	let code38;
    	let t212;
    	let code39;
    	let t214;
    	let div66;
    	let t216;
    	let code40;
    	let t218;
    	let code41;
    	let t220;
    	let div67;
    	let t222;
    	let code42;
    	let t224;
    	let code43;
    	let t226;
    	let div68;
    	let t228;
    	let code44;
    	let t230;
    	let code45;
    	let t232;
    	let div69;
    	let t234;
    	let code46;
    	let t236;
    	let code47;
    	let t238;
    	let div70;
    	let t240;
    	let code48;
    	let t242;
    	let code49;
    	let t244;
    	let div71;
    	let t246;
    	let code50;
    	let t248;
    	let code51;
    	let t250;
    	let div72;
    	let t252;
    	let div75;
    	let t253;
    	let a;
    	let current;

    	linkedchart0 = new LinkedChart({
    			props: {
    				data: fakeData(108),
    				width: "540",
    				height: "5",
    				hover: false
    			},
    			$$inline: true
    		});

    	linkedchart1 = new LinkedChart({
    			props: { data: fakeData(30) },
    			$$inline: true
    		});

    	linkedchart2 = new LinkedChart({
    			props: { data: fakeData(30), linked: "link-1" },
    			$$inline: true
    		});

    	linkedchart3 = new LinkedChart({
    			props: { data: fakeData(10), linked: "link-1" },
    			$$inline: true
    		});

    	linkedchart4 = new LinkedChart({
    			props: { data: fakeData(30), linked: "link-1" },
    			$$inline: true
    		});

    	linkedchart5 = new LinkedChart({
    			props: { data: fakeData(30), linked: "link-1" },
    			$$inline: true
    		});

    	linkedlabel = new LinkedLabel({
    			props: {
    				linked: "link-2",
    				empty: "Start hovering"
    			},
    			$$inline: true
    		});

    	linkedchart6 = new LinkedChart({
    			props: { data: fakeData(30), linked: "link-2" },
    			$$inline: true
    		});

    	linkedchart7 = new LinkedChart({
    			props: { data: fakeData(30), linked: "link-2" },
    			$$inline: true
    		});

    	linkedchart8 = new LinkedChart({
    			props: { data: fakeData(5), grow: true },
    			$$inline: true
    		});

    	linkedchart9 = new LinkedChart({
    			props: { data: fakeData(50), barMinWidth: "2" },
    			$$inline: true
    		});

    	linkedchart10 = new LinkedChart({
    			props: {
    				data: fakeData(75),
    				grow: true,
    				barMinWidth: "0"
    			},
    			$$inline: true
    		});

    	linkedchart11 = new LinkedChart({
    			props: {
    				data: fakeData(10),
    				grow: true,
    				barMinWidth: "0"
    			},
    			$$inline: true
    		});

    	linkedchart12 = new LinkedChart({
    			props: {
    				data: fakeData(50),
    				height: "100",
    				width: "250",
    				linked: "linked-3"
    			},
    			$$inline: true
    		});

    	linkedchart13 = new LinkedChart({
    			props: {
    				data: fakeData(50),
    				height: "10",
    				width: "250",
    				linked: "linked-3"
    			},
    			$$inline: true
    		});

    	linkedchart14 = new LinkedChart({
    			props: { data: fakeData(11), gap: "10" },
    			$$inline: true
    		});

    	linkedchart15 = new LinkedChart({
    			props: { data: fakeData(36), gap: "0" },
    			$$inline: true
    		});

    	linkedchart16 = new LinkedChart({
    			props: { data: fakeData(20) },
    			$$inline: true
    		});

    	linkedchart17 = new LinkedChart({
    			props: { data: fakeData(20), align: "left" },
    			$$inline: true
    		});

    	linkedchart18 = new LinkedChart({
    			props: {
    				data: fakeData(30),
    				fill: "#e6261f",
    				linked: "link-4"
    			},
    			$$inline: true
    		});

    	linkedchart19 = new LinkedChart({
    			props: {
    				data: fakeData(30),
    				fill: "#eb7532",
    				linked: "link-4"
    			},
    			$$inline: true
    		});

    	linkedchart20 = new LinkedChart({
    			props: {
    				data: fakeData(30),
    				fill: "#f7d038",
    				linked: "link-4"
    			},
    			$$inline: true
    		});

    	linkedchart21 = new LinkedChart({
    			props: {
    				data: fakeData(30),
    				fill: "#a3e048",
    				linked: "link-4"
    			},
    			$$inline: true
    		});

    	linkedchart22 = new LinkedChart({
    			props: {
    				data: fakeData(30),
    				fill: "#49da9a",
    				linked: "link-4"
    			},
    			$$inline: true
    		});

    	linkedchart23 = new LinkedChart({
    			props: {
    				data: fakeData(30),
    				fill: "#34bbe6",
    				linked: "link-4"
    			},
    			$$inline: true
    		});

    	linkedchart24 = new LinkedChart({
    			props: {
    				data: fakeData(30),
    				fill: "#4355db",
    				linked: "link-4"
    			},
    			$$inline: true
    		});

    	linkedchart25 = new LinkedChart({
    			props: {
    				data: fakeData(30),
    				fill: "hsla(290, 55%, 50%, 1)",
    				linked: "link-4"
    			},
    			$$inline: true
    		});

    	linkedchart26 = new LinkedChart({
    			props: { data: fakeData(30), fadeOpacity: "0.15" },
    			$$inline: true
    		});

    	linkedchart27 = new LinkedChart({
    			props: { data: fakeData(30), hover: false },
    			$$inline: true
    		});

    	linkedchart28 = new LinkedChart({
    			props: {
    				data: /*transitioningData*/ ctx[0],
    				fill: "hsl(" + /*transitionColor*/ ctx[1] + ", 60%, 50%)",
    				transition: "500"
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div76 = element("div");
    			div0 = element("div");
    			h1 = element("h1");
    			t0 = text("Tiny Linked Charts for ");
    			mark0 = element("mark");
    			mark0.textContent = "Svelte";
    			t2 = space();
    			create_component(linkedchart0.$$.fragment);
    			t3 = space();
    			div1 = element("div");
    			p0 = element("p");
    			p0.textContent = "This is a library to display tiny bar charts. These charts are more so meant for graphical aids, rather than scientific representations. There's no axis labels, no extensive data visualisation, just bars.";
    			t5 = space();
    			h20 = element("h2");
    			h20.textContent = "Installation";
    			t7 = space();
    			p1 = element("p");
    			p1.textContent = "Install using Yarn or NPM.";
    			t9 = space();
    			code0 = element("code");
    			t10 = text("yarn add ");
    			mark1 = element("mark");
    			mark1.textContent = "svelte-tiny-linked-charts";
    			t12 = space();
    			code1 = element("code");
    			t13 = text("npm install --save ");
    			mark2 = element("mark");
    			mark2.textContent = "svelte-tiny-linked-charts";
    			t15 = space();
    			p2 = element("p");
    			p2.textContent = "Include the chart in your app.";
    			t17 = space();
    			code2 = element("code");
    			t18 = text("<");
    			mark3 = element("mark");
    			mark3.textContent = "LinkedChart";
    			t20 = text(" { data } />");
    			t21 = space();
    			code3 = element("code");
    			t22 = text("import { ");
    			mark4 = element("mark");
    			mark4.textContent = "LinkedChart";
    			t24 = text(", ");
    			mark5 = element("mark");
    			mark5.textContent = "LinkedLabel";
    			t26 = text(" } from \"");
    			mark6 = element("mark");
    			mark6.textContent = "svelte-tiny-linked-charts";
    			t28 = text("\"");
    			t29 = space();
    			div2 = element("div");
    			p3 = element("p");
    			p3.textContent = "Supply your data in a simple key:value object:";
    			t31 = space();
    			code4 = element("code");
    			t32 = text("let data = { ");
    			br0 = element("br");
    			t33 = text("\r\n\t\t\t  \"2005-01-01\": 25, ");
    			br1 = element("br");
    			t34 = text("\r\n\t\t\t  \"2005-01-02\": 20, ");
    			br2 = element("br");
    			t35 = text("\r\n\t\t\t  \"2005-01-03\": 18, ");
    			br3 = element("br");
    			t36 = text("\r\n\t\t\t  \"2005-01-04\": 17, ");
    			br4 = element("br");
    			t37 = text("\r\n\t\t\t  \"2005-01-05\": 21 ");
    			br5 = element("br");
    			t38 = text("\r\n\t\t\t}");
    			t39 = space();
    			code5 = element("code");
    			code5.textContent = "<LinkedChart { data } />";
    			t41 = space();
    			p4 = element("p");
    			p4.textContent = "Or if you prefer supply the labels and values separately:";
    			t43 = space();
    			code6 = element("code");
    			t44 = text("let labels = [ ");
    			br6 = element("br");
    			t45 = text("\r\n\t\t\t  \"2005-01-01\", ");
    			br7 = element("br");
    			t46 = text("\r\n\t\t\t  \"2005-01-02\", ");
    			br8 = element("br");
    			t47 = text("\r\n\t\t\t  \"2005-01-03\", ");
    			br9 = element("br");
    			t48 = text("\r\n\t\t\t  \"2005-01-04\", ");
    			br10 = element("br");
    			t49 = text("\r\n\t\t\t  \"2005-01-05\" ");
    			br11 = element("br");
    			t50 = text("\r\n\t\t\t]");
    			t51 = space();
    			code7 = element("code");
    			t52 = text("let values = [ ");
    			br12 = element("br");
    			t53 = text("\r\n\t\t\t  25, ");
    			br13 = element("br");
    			t54 = text("\r\n\t\t\t  20, ");
    			br14 = element("br");
    			t55 = text("\r\n\t\t\t  18, ");
    			br15 = element("br");
    			t56 = text("\r\n\t\t\t  17, ");
    			br16 = element("br");
    			t57 = text("\r\n\t\t\t  21 ");
    			br17 = element("br");
    			t58 = text("\r\n\t\t\t]");
    			t59 = space();
    			code8 = element("code");
    			code8.textContent = "<LinkedChart { labels } { values } />";
    			t61 = space();
    			h21 = element("h2");
    			h21.textContent = "Usage";
    			t63 = space();
    			div4 = element("div");
    			div3 = element("div");
    			t64 = text("The chart in it's most basic form.\r\n\r\n\t\t\t");
    			code9 = element("code");
    			code9.textContent = "<LinkedChart { data } />";
    			t66 = space();
    			create_component(linkedchart1.$$.fragment);
    			t67 = space();
    			div11 = element("div");
    			div5 = element("div");
    			t68 = text("You can link multiple charts together, hovering one will also highlight others.\r\n\r\n\t\t\t");
    			code10 = element("code");
    			t69 = text("<LinkedChart { data } linked=\"link-1\" /> ");
    			br18 = element("br");
    			t70 = text("\r\n\t\t\t\t<LinkedChart { data } linked=\"link-1\" /> ");
    			br19 = element("br");
    			t71 = text("\r\n\t\t\t\t<LinkedChart { data } linked=\"link-1\" /> ");
    			br20 = element("br");
    			t72 = text("\r\n\t\t\t\t<LinkedChart { data } linked=\"link-1\" />");
    			t73 = space();
    			div10 = element("div");
    			div6 = element("div");
    			create_component(linkedchart2.$$.fragment);
    			t74 = space();
    			div7 = element("div");
    			create_component(linkedchart3.$$.fragment);
    			t75 = space();
    			div8 = element("div");
    			create_component(linkedchart4.$$.fragment);
    			t76 = space();
    			div9 = element("div");
    			create_component(linkedchart5.$$.fragment);
    			t77 = space();
    			div17 = element("div");
    			div12 = element("div");
    			t78 = text("You can optionally display a label, which will display the label of what you're currently hovering.\r\n\r\n\t\t\t");
    			code11 = element("code");
    			t79 = text("<LinkedLabel linked=\"link-2\" /> ");
    			br21 = element("br");
    			t80 = space();
    			br22 = element("br");
    			t81 = text("\r\n\t\t\t\t<LinkedChart { data } linked=\"link-2\" /> ");
    			br23 = element("br");
    			t82 = text("\r\n\t\t\t\t<LinkedChart { data } linked=\"link-2\" />");
    			t83 = space();
    			br24 = element("br");
    			t84 = text("\r\n\t\t\tThe label has no styling by default.");
    			t85 = space();
    			div16 = element("div");
    			div13 = element("div");
    			create_component(linkedlabel.$$.fragment);
    			t86 = space();
    			div14 = element("div");
    			create_component(linkedchart6.$$.fragment);
    			t87 = space();
    			div15 = element("div");
    			create_component(linkedchart7.$$.fragment);
    			t88 = space();
    			div19 = element("div");
    			div18 = element("div");
    			t89 = text("The width of the bars is fixed by default, but can be set to grow to fill the chart.\r\n\r\n\t\t\t");
    			code12 = element("code");
    			code12.textContent = "<LinkedChart data={ ... } grow={ true } />";
    			t91 = space();
    			create_component(linkedchart8.$$.fragment);
    			t92 = space();
    			div21 = element("div");
    			div20 = element("div");
    			t93 = text("To make the bars smaller you can set the \"barMinWidth\" property.\r\n\r\n\t\t\t");
    			code13 = element("code");
    			code13.textContent = "<LinkedChart data={ ... } barMinWidth=\"2\" />";
    			t95 = space();
    			create_component(linkedchart9.$$.fragment);
    			t96 = space();
    			div26 = element("div");
    			div22 = element("div");
    			t97 = text("To always fill out the content, growing and shrinking, you can set both the \"grow\" and \"barMinWidth\" properties.\r\n\r\n\t\t\t");
    			code14 = element("code");
    			t98 = text("<LinkedChart");
    			br25 = element("br");
    			t99 = text("\r\n\t\t\t\t  data={ ... } ");
    			br26 = element("br");
    			t100 = text("\r\n\t\t\t\t  grow={ true } ");
    			br27 = element("br");
    			t101 = text("\r\n\t\t\t\t  barMinWidth=\"0\" />");
    			t102 = space();
    			div25 = element("div");
    			div23 = element("div");
    			create_component(linkedchart10.$$.fragment);
    			t103 = space();
    			div24 = element("div");
    			create_component(linkedchart11.$$.fragment);
    			t104 = space();
    			div31 = element("div");
    			div27 = element("div");
    			t105 = text("The charts can be resized to any size you like. It renders as an SVG, so they can easily be made responsive with some CSS.\r\n\r\n\t\t\t");
    			code15 = element("code");
    			t106 = text("<LinkedChart");
    			br28 = element("br");
    			t107 = text("\r\n\t\t\t\t  data={ ... } ");
    			br29 = element("br");
    			t108 = text("\r\n\t\t\t\t  width=\"250\" ");
    			br30 = element("br");
    			t109 = text("\r\n\t\t\t\t  height=\"100\" />");
    			t110 = space();
    			code16 = element("code");
    			t111 = text("svg { ");
    			br31 = element("br");
    			t112 = text("\r\n\t\t\t\t  width: 100%; ");
    			br32 = element("br");
    			t113 = text("\r\n\t\t\t\t  height: auto; ");
    			br33 = element("br");
    			t114 = text("\r\n\t\t\t\t}");
    			t115 = space();
    			br34 = element("br");
    			t116 = text("\r\n\t\t\tor for a fixed height;\r\n\r\n\t\t\t");
    			code17 = element("code");
    			t117 = text("svg { ");
    			br35 = element("br");
    			t118 = text("\r\n\t\t\t\t  width: 100%; ");
    			br36 = element("br");
    			t119 = text("\r\n\t\t\t\t  height: 50px; ");
    			br37 = element("br");
    			t120 = text("\r\n\t\t\t\t}");
    			t121 = space();
    			div30 = element("div");
    			div28 = element("div");
    			create_component(linkedchart12.$$.fragment);
    			t122 = space();
    			div29 = element("div");
    			create_component(linkedchart13.$$.fragment);
    			t123 = space();
    			div36 = element("div");
    			div32 = element("div");
    			t124 = text("The gap in between bars can also be adjusted.\r\n\r\n\t\t\t");
    			code18 = element("code");
    			t125 = text("<LinkedChart { data } gap=\"10\" /> ");
    			br38 = element("br");
    			t126 = text("\r\n\t\t\t\t<LinkedChart { data } gap=\"0\" />");
    			t127 = space();
    			div35 = element("div");
    			div33 = element("div");
    			create_component(linkedchart14.$$.fragment);
    			t128 = space();
    			div34 = element("div");
    			create_component(linkedchart15.$$.fragment);
    			t129 = space();
    			div41 = element("div");
    			div37 = element("div");
    			t130 = text("When the bars do not fill the width of the graph they are aligned to the right by default. This can be set to be left aligned instead.\r\n\r\n\t\t\t");
    			code19 = element("code");
    			code19.textContent = "<LinkedChart { data } align=\"left\" />";
    			t132 = space();
    			div40 = element("div");
    			div38 = element("div");
    			create_component(linkedchart16.$$.fragment);
    			t133 = space();
    			div39 = element("div");
    			create_component(linkedchart17.$$.fragment);
    			t134 = space();
    			div52 = element("div");
    			div42 = element("div");
    			t135 = text("The bars can be colored any way you wish.\r\n\r\n\t\t\t");
    			code20 = element("code");
    			t136 = text("<LinkedChart fill=\"#ff00ff\" /> ");
    			br39 = element("br");
    			t137 = text("\r\n\t\t\t\t<LinkedChart fill=\"rgb(255, 255, 0)\" /> ");
    			br40 = element("br");
    			t138 = text("\r\n\t\t\t\t<LinkedChart fill=\"hsla(290, 55%, 50%, 1)\" />");
    			t139 = space();
    			div51 = element("div");
    			div43 = element("div");
    			create_component(linkedchart18.$$.fragment);
    			t140 = space();
    			div44 = element("div");
    			create_component(linkedchart19.$$.fragment);
    			t141 = space();
    			div45 = element("div");
    			create_component(linkedchart20.$$.fragment);
    			t142 = space();
    			div46 = element("div");
    			create_component(linkedchart21.$$.fragment);
    			t143 = space();
    			div47 = element("div");
    			create_component(linkedchart22.$$.fragment);
    			t144 = space();
    			div48 = element("div");
    			create_component(linkedchart23.$$.fragment);
    			t145 = space();
    			div49 = element("div");
    			create_component(linkedchart24.$$.fragment);
    			t146 = space();
    			div50 = element("div");
    			create_component(linkedchart25.$$.fragment);
    			t147 = space();
    			div54 = element("div");
    			div53 = element("div");
    			t148 = text("The opacity of faded out bars can be adjusted using \"fadeOpacity\".\r\n\r\n\t\t\t");
    			code21 = element("code");
    			code21.textContent = "<LinkedChart { data } fadeOpacity=\"0.15\" />";
    			t150 = space();
    			create_component(linkedchart26.$$.fragment);
    			t151 = space();
    			div56 = element("div");
    			div55 = element("div");
    			t152 = text("The hover effect can be disabled altogether using \"hover\".\r\n\r\n\t\t\t");
    			code22 = element("code");
    			code22.textContent = "<LinkedChart { data } hover={ false } />";
    			t154 = space();
    			create_component(linkedchart27.$$.fragment);
    			t155 = space();
    			div58 = element("div");
    			div57 = element("div");
    			t156 = text("Bars can be set to transition between states. ");
    			br41 = element("br");
    			t157 = text("\r\n\t\t\tValue is speed in milliseconds.\r\n\r\n\t\t\t");
    			code23 = element("code");
    			code23.textContent = "<LinkedChart { data } transition=\"500\" />";
    			t159 = space();
    			create_component(linkedchart28.$$.fragment);
    			t160 = space();
    			div74 = element("div");
    			p5 = element("p");
    			p5.textContent = "This is a list of all configurable properties on the \"LinkedChart\" component.";
    			t162 = space();
    			div73 = element("div");
    			strong0 = element("strong");
    			strong0.textContent = "Property";
    			t164 = space();
    			strong1 = element("strong");
    			strong1.textContent = "Default";
    			t166 = space();
    			strong2 = element("strong");
    			strong2.textContent = "Description";
    			t168 = space();
    			code24 = element("code");
    			code24.textContent = "data";
    			t170 = space();
    			code25 = element("code");
    			code25.textContent = "{}";
    			t172 = space();
    			div59 = element("div");
    			div59.textContent = "Data that will be displayed in the chart supplied in key:value object.";
    			t174 = space();
    			code26 = element("code");
    			code26.textContent = "labels";
    			t176 = space();
    			code27 = element("code");
    			code27.textContent = "[]";
    			t178 = space();
    			div60 = element("div");
    			div60.textContent = "Labels supplied separately, to be used together with \"values\" property.";
    			t180 = space();
    			code28 = element("code");
    			code28.textContent = "values";
    			t182 = space();
    			code29 = element("code");
    			code29.textContent = "[]";
    			t184 = space();
    			div61 = element("div");
    			div61.textContent = "Values supplied separately, to be used together with \"labels\" property.";
    			t186 = space();
    			code30 = element("code");
    			code30.textContent = "linked";
    			t188 = space();
    			code31 = element("code");
    			code31.textContent = "false";
    			t190 = space();
    			div62 = element("div");
    			div62.textContent = "Key to link this chart to other charts with the same key.";
    			t192 = space();
    			code32 = element("code");
    			code32.textContent = "height";
    			t194 = space();
    			code33 = element("code");
    			code33.textContent = "40";
    			t196 = space();
    			div63 = element("div");
    			div63.textContent = "Height of the chart in pixels.";
    			t198 = space();
    			code34 = element("code");
    			code34.textContent = "width";
    			t200 = space();
    			code35 = element("code");
    			code35.textContent = "150";
    			t202 = space();
    			div64 = element("div");
    			div64.textContent = "Width of the chart in pixels.";
    			t204 = space();
    			code36 = element("code");
    			code36.textContent = "barMinWidth";
    			t206 = space();
    			code37 = element("code");
    			code37.textContent = "4";
    			t208 = space();
    			div65 = element("div");
    			div65.textContent = "Width of the bars in the chart in pixels.";
    			t210 = space();
    			code38 = element("code");
    			code38.textContent = "grow";
    			t212 = space();
    			code39 = element("code");
    			code39.textContent = "false";
    			t214 = space();
    			div66 = element("div");
    			div66.textContent = "Whether or not the bar should grow to fill out the full width of the chart.";
    			t216 = space();
    			code40 = element("code");
    			code40.textContent = "align";
    			t218 = space();
    			code41 = element("code");
    			code41.textContent = "right";
    			t220 = space();
    			div67 = element("div");
    			div67.textContent = "The side the bars should align to when they do not completely fill out the chart.";
    			t222 = space();
    			code42 = element("code");
    			code42.textContent = "gap";
    			t224 = space();
    			code43 = element("code");
    			code43.textContent = "1";
    			t226 = space();
    			div68 = element("div");
    			div68.textContent = "Gap between the bars in pixels.";
    			t228 = space();
    			code44 = element("code");
    			code44.textContent = "fill";
    			t230 = space();
    			code45 = element("code");
    			code45.textContent = "#ff3e00";
    			t232 = space();
    			div69 = element("div");
    			div69.textContent = "Color of the bars, can be any valid CSS color.";
    			t234 = space();
    			code46 = element("code");
    			code46.textContent = "fadeOpacity";
    			t236 = space();
    			code47 = element("code");
    			code47.textContent = "0.5";
    			t238 = space();
    			div70 = element("div");
    			div70.textContent = "The opacity the faded out bars should display in.";
    			t240 = space();
    			code48 = element("code");
    			code48.textContent = "hover";
    			t242 = space();
    			code49 = element("code");
    			code49.textContent = "true";
    			t244 = space();
    			div71 = element("div");
    			div71.textContent = "Boolean whether or not this chart can be hovered at all.";
    			t246 = space();
    			code50 = element("code");
    			code50.textContent = "transition";
    			t248 = space();
    			code51 = element("code");
    			code51.textContent = "0";
    			t250 = space();
    			div72 = element("div");
    			div72.textContent = "Transition the chart between different stats. Value is time in milliseconds.";
    			t252 = space();
    			div75 = element("div");
    			t253 = text("Made by ");
    			a = element("a");
    			a.textContent = "Mitchel Jager";
    			attr_dev(mark0, "class", "svelte-1g0lvp9");
    			add_location(mark0, file, 39, 29, 958);
    			attr_dev(h1, "class", "svelte-1g0lvp9");
    			add_location(h1, file, 39, 2, 931);
    			attr_dev(div0, "class", "header svelte-1g0lvp9");
    			add_location(div0, file, 38, 1, 907);
    			attr_dev(p0, "class", "svelte-1g0lvp9");
    			add_location(p0, file, 44, 2, 1114);
    			attr_dev(h20, "class", "svelte-1g0lvp9");
    			add_location(h20, file, 46, 2, 1331);
    			attr_dev(p1, "class", "svelte-1g0lvp9");
    			add_location(p1, file, 48, 2, 1358);
    			attr_dev(mark1, "class", "svelte-1g0lvp9");
    			add_location(mark1, file, 51, 12, 1430);
    			attr_dev(code0, "class", "well svelte-1g0lvp9");
    			add_location(code0, file, 50, 2, 1397);
    			attr_dev(mark2, "class", "svelte-1g0lvp9");
    			add_location(mark2, file, 55, 22, 1528);
    			attr_dev(code1, "class", "well svelte-1g0lvp9");
    			add_location(code1, file, 54, 2, 1485);
    			attr_dev(p2, "class", "svelte-1g0lvp9");
    			add_location(p2, file, 58, 2, 1583);
    			attr_dev(mark3, "class", "svelte-1g0lvp9");
    			add_location(mark3, file, 61, 7, 1654);
    			attr_dev(code2, "class", "well svelte-1g0lvp9");
    			add_location(code2, file, 60, 2, 1626);
    			attr_dev(mark4, "class", "svelte-1g0lvp9");
    			add_location(mark4, file, 65, 17, 1758);
    			attr_dev(mark5, "class", "svelte-1g0lvp9");
    			add_location(mark5, file, 65, 43, 1784);
    			attr_dev(mark6, "class", "svelte-1g0lvp9");
    			add_location(mark6, file, 65, 81, 1822);
    			attr_dev(code3, "class", "well svelte-1g0lvp9");
    			add_location(code3, file, 64, 2, 1720);
    			attr_dev(div1, "class", "block block--single svelte-1g0lvp9");
    			add_location(div1, file, 43, 1, 1077);
    			attr_dev(p3, "class", "svelte-1g0lvp9");
    			add_location(p3, file, 70, 2, 1923);
    			add_location(br0, file, 75, 21, 2033);
    			add_location(br1, file, 76, 28, 2067);
    			add_location(br2, file, 77, 28, 2101);
    			add_location(br3, file, 78, 28, 2135);
    			add_location(br4, file, 79, 28, 2169);
    			add_location(br5, file, 80, 27, 2202);
    			attr_dev(code4, "class", "well svelte-1g0lvp9");
    			add_location(code4, file, 74, 2, 1991);
    			attr_dev(code5, "class", "well svelte-1g0lvp9");
    			add_location(code5, file, 84, 2, 2234);
    			attr_dev(p4, "class", "svelte-1g0lvp9");
    			add_location(p4, file, 88, 2, 2315);
    			add_location(br6, file, 91, 18, 2424);
    			add_location(br7, file, 92, 24, 2454);
    			add_location(br8, file, 93, 24, 2484);
    			add_location(br9, file, 94, 24, 2514);
    			add_location(br10, file, 95, 24, 2544);
    			add_location(br11, file, 96, 23, 2573);
    			attr_dev(code6, "class", "well svelte-1g0lvp9");
    			add_location(code6, file, 90, 2, 2385);
    			add_location(br12, file, 101, 18, 2639);
    			add_location(br13, file, 102, 14, 2659);
    			add_location(br14, file, 103, 14, 2679);
    			add_location(br15, file, 104, 14, 2699);
    			add_location(br16, file, 105, 14, 2719);
    			add_location(br17, file, 106, 13, 2738);
    			attr_dev(code7, "class", "well svelte-1g0lvp9");
    			add_location(code7, file, 100, 2, 2600);
    			attr_dev(code8, "class", "well svelte-1g0lvp9");
    			add_location(code8, file, 110, 2, 2765);
    			attr_dev(div2, "class", "block block--single svelte-1g0lvp9");
    			add_location(div2, file, 69, 1, 1886);
    			attr_dev(h21, "class", "svelte-1g0lvp9");
    			add_location(h21, file, 115, 1, 2877);
    			attr_dev(code9, "class", "svelte-1g0lvp9");
    			add_location(code9, file, 121, 3, 2990);
    			attr_dev(div3, "class", "description");
    			add_location(div3, file, 118, 2, 2919);
    			attr_dev(div4, "class", "block svelte-1g0lvp9");
    			add_location(div4, file, 117, 1, 2896);
    			add_location(br18, file, 134, 61, 3329);
    			add_location(br19, file, 135, 61, 3396);
    			add_location(br20, file, 136, 61, 3463);
    			attr_dev(code10, "class", "svelte-1g0lvp9");
    			add_location(code10, file, 133, 3, 3260);
    			attr_dev(div5, "class", "description");
    			add_location(div5, file, 130, 2, 3144);
    			attr_dev(div6, "class", "chart svelte-1g0lvp9");
    			add_location(div6, file, 142, 3, 3567);
    			attr_dev(div7, "class", "chart svelte-1g0lvp9");
    			add_location(div7, file, 143, 3, 3650);
    			attr_dev(div8, "class", "chart svelte-1g0lvp9");
    			add_location(div8, file, 144, 3, 3733);
    			attr_dev(div9, "class", "chart svelte-1g0lvp9");
    			add_location(div9, file, 145, 3, 3816);
    			add_location(div10, file, 141, 2, 3557);
    			attr_dev(div11, "class", "block svelte-1g0lvp9");
    			add_location(div11, file, 129, 1, 3121);
    			add_location(br21, file, 154, 42, 4127);
    			add_location(br22, file, 155, 4, 4137);
    			add_location(br23, file, 156, 61, 4204);
    			attr_dev(code11, "class", "svelte-1g0lvp9");
    			add_location(code11, file, 153, 3, 4077);
    			add_location(br24, file, 159, 3, 4288);
    			attr_dev(div12, "class", "description");
    			add_location(div12, file, 150, 2, 3941);
    			attr_dev(div13, "class", "label svelte-1g0lvp9");
    			add_location(div13, file, 164, 3, 4359);
    			attr_dev(div14, "class", "chart svelte-1g0lvp9");
    			add_location(div14, file, 166, 3, 4445);
    			attr_dev(div15, "class", "chart svelte-1g0lvp9");
    			add_location(div15, file, 167, 3, 4528);
    			add_location(div16, file, 163, 2, 4349);
    			attr_dev(div17, "class", "block svelte-1g0lvp9");
    			add_location(div17, file, 149, 1, 3918);
    			attr_dev(code12, "class", "svelte-1g0lvp9");
    			add_location(code12, file, 175, 3, 4774);
    			attr_dev(div18, "class", "description");
    			add_location(div18, file, 172, 2, 4653);
    			attr_dev(div19, "class", "block svelte-1g0lvp9");
    			add_location(div19, file, 171, 1, 4630);
    			attr_dev(code13, "class", "svelte-1g0lvp9");
    			add_location(code13, file, 187, 3, 5068);
    			attr_dev(div20, "class", "description");
    			add_location(div20, file, 184, 2, 4967);
    			attr_dev(div21, "class", "block svelte-1g0lvp9");
    			add_location(div21, file, 183, 1, 4944);
    			add_location(br25, file, 200, 19, 5433);
    			add_location(br26, file, 201, 33, 5472);
    			add_location(br27, file, 202, 34, 5512);
    			attr_dev(code14, "class", "svelte-1g0lvp9");
    			add_location(code14, file, 199, 3, 5406);
    			attr_dev(div22, "class", "description");
    			add_location(div22, file, 196, 2, 5257);
    			attr_dev(div23, "class", "chart svelte-1g0lvp9");
    			add_location(div23, file, 208, 3, 5588);
    			attr_dev(div24, "class", "chart svelte-1g0lvp9");
    			add_location(div24, file, 209, 3, 5685);
    			add_location(div25, file, 207, 2, 5578);
    			attr_dev(div26, "class", "block svelte-1g0lvp9");
    			add_location(div26, file, 195, 1, 5234);
    			add_location(br28, file, 218, 19, 6010);
    			add_location(br29, file, 219, 33, 6049);
    			add_location(br30, file, 220, 23, 6078);
    			attr_dev(code15, "class", "svelte-1g0lvp9");
    			add_location(code15, file, 217, 3, 5983);
    			add_location(br31, file, 225, 15, 6155);
    			add_location(br32, file, 226, 24, 6185);
    			add_location(br33, file, 227, 25, 6216);
    			attr_dev(code16, "class", "svelte-1g0lvp9");
    			add_location(code16, file, 224, 3, 6132);
    			add_location(br34, file, 231, 3, 6251);
    			add_location(br35, file, 235, 15, 6312);
    			add_location(br36, file, 236, 24, 6342);
    			add_location(br37, file, 237, 25, 6373);
    			attr_dev(code17, "class", "svelte-1g0lvp9");
    			add_location(code17, file, 234, 3, 6289);
    			attr_dev(div27, "class", "description");
    			add_location(div27, file, 214, 2, 5824);
    			attr_dev(div28, "class", "chart chart--responsive svelte-1g0lvp9");
    			add_location(div28, file, 243, 3, 6427);
    			attr_dev(div29, "class", "chart chart--responsive svelte-1g0lvp9");
    			add_location(div29, file, 244, 3, 6555);
    			add_location(div30, file, 242, 2, 6417);
    			attr_dev(div31, "class", "block svelte-1g0lvp9");
    			add_location(div31, file, 213, 1, 5801);
    			add_location(br38, file, 253, 54, 6868);
    			attr_dev(code18, "class", "svelte-1g0lvp9");
    			add_location(code18, file, 252, 3, 6806);
    			attr_dev(div32, "class", "description");
    			add_location(div32, file, 249, 2, 6724);
    			attr_dev(div33, "class", "chart svelte-1g0lvp9");
    			add_location(div33, file, 259, 3, 6964);
    			attr_dev(div34, "class", "chart svelte-1g0lvp9");
    			add_location(div34, file, 260, 3, 7040);
    			add_location(div35, file, 258, 2, 6954);
    			attr_dev(div36, "class", "block svelte-1g0lvp9");
    			add_location(div36, file, 248, 1, 6701);
    			attr_dev(code19, "class", "svelte-1g0lvp9");
    			add_location(code19, file, 268, 3, 7328);
    			attr_dev(div37, "class", "description");
    			add_location(div37, file, 265, 2, 7157);
    			attr_dev(div38, "class", "chart svelte-1g0lvp9");
    			add_location(div38, file, 274, 3, 7431);
    			attr_dev(div39, "class", "chart svelte-1g0lvp9");
    			add_location(div39, file, 275, 3, 7498);
    			add_location(div40, file, 273, 2, 7421);
    			attr_dev(div41, "class", "block svelte-1g0lvp9");
    			add_location(div41, file, 264, 1, 7134);
    			add_location(br39, file, 284, 41, 7747);
    			add_location(br40, file, 285, 50, 7803);
    			attr_dev(code20, "class", "svelte-1g0lvp9");
    			add_location(code20, file, 283, 3, 7698);
    			attr_dev(div42, "class", "description");
    			add_location(div42, file, 280, 2, 7620);
    			attr_dev(div43, "class", "chart svelte-1g0lvp9");
    			add_location(div43, file, 291, 3, 7902);
    			attr_dev(div44, "class", "chart svelte-1g0lvp9");
    			add_location(div44, file, 292, 3, 8000);
    			attr_dev(div45, "class", "chart svelte-1g0lvp9");
    			add_location(div45, file, 293, 3, 8098);
    			attr_dev(div46, "class", "chart svelte-1g0lvp9");
    			add_location(div46, file, 294, 3, 8196);
    			attr_dev(div47, "class", "chart svelte-1g0lvp9");
    			add_location(div47, file, 295, 3, 8294);
    			attr_dev(div48, "class", "chart svelte-1g0lvp9");
    			add_location(div48, file, 296, 3, 8392);
    			attr_dev(div49, "class", "chart svelte-1g0lvp9");
    			add_location(div49, file, 297, 3, 8490);
    			attr_dev(div50, "class", "chart svelte-1g0lvp9");
    			add_location(div50, file, 298, 3, 8588);
    			add_location(div51, file, 290, 2, 7892);
    			attr_dev(div52, "class", "block svelte-1g0lvp9");
    			add_location(div52, file, 279, 1, 7597);
    			attr_dev(code21, "class", "svelte-1g0lvp9");
    			add_location(code21, file, 306, 3, 8846);
    			attr_dev(div53, "class", "description");
    			add_location(div53, file, 303, 2, 8743);
    			attr_dev(div54, "class", "block svelte-1g0lvp9");
    			add_location(div54, file, 302, 1, 8720);
    			attr_dev(code22, "class", "svelte-1g0lvp9");
    			add_location(code22, file, 318, 3, 9133);
    			attr_dev(div55, "class", "description");
    			add_location(div55, file, 315, 2, 9038);
    			attr_dev(div56, "class", "block svelte-1g0lvp9");
    			add_location(div56, file, 314, 1, 9015);
    			add_location(br41, file, 328, 49, 9405);
    			attr_dev(code23, "class", "svelte-1g0lvp9");
    			add_location(code23, file, 331, 3, 9452);
    			attr_dev(div57, "class", "description");
    			add_location(div57, file, 327, 2, 9329);
    			attr_dev(div58, "class", "block svelte-1g0lvp9");
    			add_location(div58, file, 326, 1, 9306);
    			attr_dev(p5, "class", "svelte-1g0lvp9");
    			add_location(p5, file, 340, 2, 9701);
    			attr_dev(strong0, "class", "svelte-1g0lvp9");
    			add_location(strong0, file, 343, 3, 9815);
    			attr_dev(strong1, "class", "svelte-1g0lvp9");
    			add_location(strong1, file, 343, 29, 9841);
    			attr_dev(strong2, "class", "svelte-1g0lvp9");
    			add_location(strong2, file, 343, 54, 9866);
    			attr_dev(code24, "class", "svelte-1g0lvp9");
    			add_location(code24, file, 344, 3, 9899);
    			attr_dev(code25, "class", "svelte-1g0lvp9");
    			add_location(code25, file, 344, 21, 9917);
    			add_location(div59, file, 344, 47, 9943);
    			attr_dev(code26, "class", "svelte-1g0lvp9");
    			add_location(code26, file, 345, 3, 10029);
    			attr_dev(code27, "class", "svelte-1g0lvp9");
    			add_location(code27, file, 345, 23, 10049);
    			add_location(div60, file, 345, 39, 10065);
    			attr_dev(code28, "class", "svelte-1g0lvp9");
    			add_location(code28, file, 346, 3, 10152);
    			attr_dev(code29, "class", "svelte-1g0lvp9");
    			add_location(code29, file, 346, 23, 10172);
    			add_location(div61, file, 346, 39, 10188);
    			attr_dev(code30, "class", "svelte-1g0lvp9");
    			add_location(code30, file, 347, 3, 10275);
    			attr_dev(code31, "class", "svelte-1g0lvp9");
    			add_location(code31, file, 347, 23, 10295);
    			add_location(div62, file, 347, 42, 10314);
    			attr_dev(code32, "class", "svelte-1g0lvp9");
    			add_location(code32, file, 348, 3, 10387);
    			attr_dev(code33, "class", "svelte-1g0lvp9");
    			add_location(code33, file, 348, 23, 10407);
    			add_location(div63, file, 348, 39, 10423);
    			attr_dev(code34, "class", "svelte-1g0lvp9");
    			add_location(code34, file, 349, 3, 10469);
    			attr_dev(code35, "class", "svelte-1g0lvp9");
    			add_location(code35, file, 349, 22, 10488);
    			add_location(div64, file, 349, 39, 10505);
    			attr_dev(code36, "class", "svelte-1g0lvp9");
    			add_location(code36, file, 350, 3, 10550);
    			attr_dev(code37, "class", "svelte-1g0lvp9");
    			add_location(code37, file, 350, 28, 10575);
    			add_location(div65, file, 350, 43, 10590);
    			attr_dev(code38, "class", "svelte-1g0lvp9");
    			add_location(code38, file, 351, 3, 10647);
    			attr_dev(code39, "class", "svelte-1g0lvp9");
    			add_location(code39, file, 351, 21, 10665);
    			add_location(div66, file, 351, 40, 10684);
    			attr_dev(code40, "class", "svelte-1g0lvp9");
    			add_location(code40, file, 352, 3, 10775);
    			attr_dev(code41, "class", "svelte-1g0lvp9");
    			add_location(code41, file, 352, 22, 10794);
    			add_location(div67, file, 352, 41, 10813);
    			attr_dev(code42, "class", "svelte-1g0lvp9");
    			add_location(code42, file, 353, 3, 10910);
    			attr_dev(code43, "class", "svelte-1g0lvp9");
    			add_location(code43, file, 353, 20, 10927);
    			add_location(div68, file, 353, 35, 10942);
    			attr_dev(code44, "class", "svelte-1g0lvp9");
    			add_location(code44, file, 354, 3, 10989);
    			attr_dev(code45, "class", "svelte-1g0lvp9");
    			add_location(code45, file, 354, 21, 11007);
    			add_location(div69, file, 354, 42, 11028);
    			attr_dev(code46, "class", "svelte-1g0lvp9");
    			add_location(code46, file, 355, 3, 11090);
    			attr_dev(code47, "class", "svelte-1g0lvp9");
    			add_location(code47, file, 355, 28, 11115);
    			add_location(div70, file, 355, 45, 11132);
    			attr_dev(code48, "class", "svelte-1g0lvp9");
    			add_location(code48, file, 356, 3, 11197);
    			attr_dev(code49, "class", "svelte-1g0lvp9");
    			add_location(code49, file, 356, 22, 11216);
    			add_location(div71, file, 356, 40, 11234);
    			attr_dev(code50, "class", "svelte-1g0lvp9");
    			add_location(code50, file, 357, 3, 11306);
    			attr_dev(code51, "class", "svelte-1g0lvp9");
    			add_location(code51, file, 357, 27, 11330);
    			add_location(div72, file, 357, 42, 11345);
    			attr_dev(div73, "class", "table svelte-1g0lvp9");
    			add_location(div73, file, 342, 2, 9791);
    			attr_dev(div74, "class", "block block--single svelte-1g0lvp9");
    			add_location(div74, file, 339, 1, 9664);
    			attr_dev(a, "href", "https://github.com/Mitcheljager");
    			attr_dev(a, "class", "svelte-1g0lvp9");
    			add_location(a, file, 362, 10, 11502);
    			attr_dev(div75, "class", "block block--single svelte-1g0lvp9");
    			add_location(div75, file, 361, 1, 11457);
    			attr_dev(div76, "class", "wrapper svelte-1g0lvp9");
    			add_location(div76, file, 37, 0, 883);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div76, anchor);
    			append_dev(div76, div0);
    			append_dev(div0, h1);
    			append_dev(h1, t0);
    			append_dev(h1, mark0);
    			append_dev(div0, t2);
    			mount_component(linkedchart0, div0, null);
    			append_dev(div76, t3);
    			append_dev(div76, div1);
    			append_dev(div1, p0);
    			append_dev(div1, t5);
    			append_dev(div1, h20);
    			append_dev(div1, t7);
    			append_dev(div1, p1);
    			append_dev(div1, t9);
    			append_dev(div1, code0);
    			append_dev(code0, t10);
    			append_dev(code0, mark1);
    			append_dev(div1, t12);
    			append_dev(div1, code1);
    			append_dev(code1, t13);
    			append_dev(code1, mark2);
    			append_dev(div1, t15);
    			append_dev(div1, p2);
    			append_dev(div1, t17);
    			append_dev(div1, code2);
    			append_dev(code2, t18);
    			append_dev(code2, mark3);
    			append_dev(code2, t20);
    			append_dev(div1, t21);
    			append_dev(div1, code3);
    			append_dev(code3, t22);
    			append_dev(code3, mark4);
    			append_dev(code3, t24);
    			append_dev(code3, mark5);
    			append_dev(code3, t26);
    			append_dev(code3, mark6);
    			append_dev(code3, t28);
    			append_dev(div76, t29);
    			append_dev(div76, div2);
    			append_dev(div2, p3);
    			append_dev(div2, t31);
    			append_dev(div2, code4);
    			append_dev(code4, t32);
    			append_dev(code4, br0);
    			append_dev(code4, t33);
    			append_dev(code4, br1);
    			append_dev(code4, t34);
    			append_dev(code4, br2);
    			append_dev(code4, t35);
    			append_dev(code4, br3);
    			append_dev(code4, t36);
    			append_dev(code4, br4);
    			append_dev(code4, t37);
    			append_dev(code4, br5);
    			append_dev(code4, t38);
    			append_dev(div2, t39);
    			append_dev(div2, code5);
    			append_dev(div2, t41);
    			append_dev(div2, p4);
    			append_dev(div2, t43);
    			append_dev(div2, code6);
    			append_dev(code6, t44);
    			append_dev(code6, br6);
    			append_dev(code6, t45);
    			append_dev(code6, br7);
    			append_dev(code6, t46);
    			append_dev(code6, br8);
    			append_dev(code6, t47);
    			append_dev(code6, br9);
    			append_dev(code6, t48);
    			append_dev(code6, br10);
    			append_dev(code6, t49);
    			append_dev(code6, br11);
    			append_dev(code6, t50);
    			append_dev(div2, t51);
    			append_dev(div2, code7);
    			append_dev(code7, t52);
    			append_dev(code7, br12);
    			append_dev(code7, t53);
    			append_dev(code7, br13);
    			append_dev(code7, t54);
    			append_dev(code7, br14);
    			append_dev(code7, t55);
    			append_dev(code7, br15);
    			append_dev(code7, t56);
    			append_dev(code7, br16);
    			append_dev(code7, t57);
    			append_dev(code7, br17);
    			append_dev(code7, t58);
    			append_dev(div2, t59);
    			append_dev(div2, code8);
    			append_dev(div76, t61);
    			append_dev(div76, h21);
    			append_dev(div76, t63);
    			append_dev(div76, div4);
    			append_dev(div4, div3);
    			append_dev(div3, t64);
    			append_dev(div3, code9);
    			append_dev(div4, t66);
    			mount_component(linkedchart1, div4, null);
    			append_dev(div76, t67);
    			append_dev(div76, div11);
    			append_dev(div11, div5);
    			append_dev(div5, t68);
    			append_dev(div5, code10);
    			append_dev(code10, t69);
    			append_dev(code10, br18);
    			append_dev(code10, t70);
    			append_dev(code10, br19);
    			append_dev(code10, t71);
    			append_dev(code10, br20);
    			append_dev(code10, t72);
    			append_dev(div11, t73);
    			append_dev(div11, div10);
    			append_dev(div10, div6);
    			mount_component(linkedchart2, div6, null);
    			append_dev(div10, t74);
    			append_dev(div10, div7);
    			mount_component(linkedchart3, div7, null);
    			append_dev(div10, t75);
    			append_dev(div10, div8);
    			mount_component(linkedchart4, div8, null);
    			append_dev(div10, t76);
    			append_dev(div10, div9);
    			mount_component(linkedchart5, div9, null);
    			append_dev(div76, t77);
    			append_dev(div76, div17);
    			append_dev(div17, div12);
    			append_dev(div12, t78);
    			append_dev(div12, code11);
    			append_dev(code11, t79);
    			append_dev(code11, br21);
    			append_dev(code11, t80);
    			append_dev(code11, br22);
    			append_dev(code11, t81);
    			append_dev(code11, br23);
    			append_dev(code11, t82);
    			append_dev(div12, t83);
    			append_dev(div12, br24);
    			append_dev(div12, t84);
    			append_dev(div17, t85);
    			append_dev(div17, div16);
    			append_dev(div16, div13);
    			mount_component(linkedlabel, div13, null);
    			append_dev(div16, t86);
    			append_dev(div16, div14);
    			mount_component(linkedchart6, div14, null);
    			append_dev(div16, t87);
    			append_dev(div16, div15);
    			mount_component(linkedchart7, div15, null);
    			append_dev(div76, t88);
    			append_dev(div76, div19);
    			append_dev(div19, div18);
    			append_dev(div18, t89);
    			append_dev(div18, code12);
    			append_dev(div19, t91);
    			mount_component(linkedchart8, div19, null);
    			append_dev(div76, t92);
    			append_dev(div76, div21);
    			append_dev(div21, div20);
    			append_dev(div20, t93);
    			append_dev(div20, code13);
    			append_dev(div21, t95);
    			mount_component(linkedchart9, div21, null);
    			append_dev(div76, t96);
    			append_dev(div76, div26);
    			append_dev(div26, div22);
    			append_dev(div22, t97);
    			append_dev(div22, code14);
    			append_dev(code14, t98);
    			append_dev(code14, br25);
    			append_dev(code14, t99);
    			append_dev(code14, br26);
    			append_dev(code14, t100);
    			append_dev(code14, br27);
    			append_dev(code14, t101);
    			append_dev(div26, t102);
    			append_dev(div26, div25);
    			append_dev(div25, div23);
    			mount_component(linkedchart10, div23, null);
    			append_dev(div25, t103);
    			append_dev(div25, div24);
    			mount_component(linkedchart11, div24, null);
    			append_dev(div76, t104);
    			append_dev(div76, div31);
    			append_dev(div31, div27);
    			append_dev(div27, t105);
    			append_dev(div27, code15);
    			append_dev(code15, t106);
    			append_dev(code15, br28);
    			append_dev(code15, t107);
    			append_dev(code15, br29);
    			append_dev(code15, t108);
    			append_dev(code15, br30);
    			append_dev(code15, t109);
    			append_dev(div27, t110);
    			append_dev(div27, code16);
    			append_dev(code16, t111);
    			append_dev(code16, br31);
    			append_dev(code16, t112);
    			append_dev(code16, br32);
    			append_dev(code16, t113);
    			append_dev(code16, br33);
    			append_dev(code16, t114);
    			append_dev(div27, t115);
    			append_dev(div27, br34);
    			append_dev(div27, t116);
    			append_dev(div27, code17);
    			append_dev(code17, t117);
    			append_dev(code17, br35);
    			append_dev(code17, t118);
    			append_dev(code17, br36);
    			append_dev(code17, t119);
    			append_dev(code17, br37);
    			append_dev(code17, t120);
    			append_dev(div31, t121);
    			append_dev(div31, div30);
    			append_dev(div30, div28);
    			mount_component(linkedchart12, div28, null);
    			append_dev(div30, t122);
    			append_dev(div30, div29);
    			mount_component(linkedchart13, div29, null);
    			append_dev(div76, t123);
    			append_dev(div76, div36);
    			append_dev(div36, div32);
    			append_dev(div32, t124);
    			append_dev(div32, code18);
    			append_dev(code18, t125);
    			append_dev(code18, br38);
    			append_dev(code18, t126);
    			append_dev(div36, t127);
    			append_dev(div36, div35);
    			append_dev(div35, div33);
    			mount_component(linkedchart14, div33, null);
    			append_dev(div35, t128);
    			append_dev(div35, div34);
    			mount_component(linkedchart15, div34, null);
    			append_dev(div76, t129);
    			append_dev(div76, div41);
    			append_dev(div41, div37);
    			append_dev(div37, t130);
    			append_dev(div37, code19);
    			append_dev(div41, t132);
    			append_dev(div41, div40);
    			append_dev(div40, div38);
    			mount_component(linkedchart16, div38, null);
    			append_dev(div40, t133);
    			append_dev(div40, div39);
    			mount_component(linkedchart17, div39, null);
    			append_dev(div76, t134);
    			append_dev(div76, div52);
    			append_dev(div52, div42);
    			append_dev(div42, t135);
    			append_dev(div42, code20);
    			append_dev(code20, t136);
    			append_dev(code20, br39);
    			append_dev(code20, t137);
    			append_dev(code20, br40);
    			append_dev(code20, t138);
    			append_dev(div52, t139);
    			append_dev(div52, div51);
    			append_dev(div51, div43);
    			mount_component(linkedchart18, div43, null);
    			append_dev(div51, t140);
    			append_dev(div51, div44);
    			mount_component(linkedchart19, div44, null);
    			append_dev(div51, t141);
    			append_dev(div51, div45);
    			mount_component(linkedchart20, div45, null);
    			append_dev(div51, t142);
    			append_dev(div51, div46);
    			mount_component(linkedchart21, div46, null);
    			append_dev(div51, t143);
    			append_dev(div51, div47);
    			mount_component(linkedchart22, div47, null);
    			append_dev(div51, t144);
    			append_dev(div51, div48);
    			mount_component(linkedchart23, div48, null);
    			append_dev(div51, t145);
    			append_dev(div51, div49);
    			mount_component(linkedchart24, div49, null);
    			append_dev(div51, t146);
    			append_dev(div51, div50);
    			mount_component(linkedchart25, div50, null);
    			append_dev(div76, t147);
    			append_dev(div76, div54);
    			append_dev(div54, div53);
    			append_dev(div53, t148);
    			append_dev(div53, code21);
    			append_dev(div54, t150);
    			mount_component(linkedchart26, div54, null);
    			append_dev(div76, t151);
    			append_dev(div76, div56);
    			append_dev(div56, div55);
    			append_dev(div55, t152);
    			append_dev(div55, code22);
    			append_dev(div56, t154);
    			mount_component(linkedchart27, div56, null);
    			append_dev(div76, t155);
    			append_dev(div76, div58);
    			append_dev(div58, div57);
    			append_dev(div57, t156);
    			append_dev(div57, br41);
    			append_dev(div57, t157);
    			append_dev(div57, code23);
    			append_dev(div58, t159);
    			mount_component(linkedchart28, div58, null);
    			append_dev(div76, t160);
    			append_dev(div76, div74);
    			append_dev(div74, p5);
    			append_dev(div74, t162);
    			append_dev(div74, div73);
    			append_dev(div73, strong0);
    			append_dev(div73, t164);
    			append_dev(div73, strong1);
    			append_dev(div73, t166);
    			append_dev(div73, strong2);
    			append_dev(div73, t168);
    			append_dev(div73, code24);
    			append_dev(div73, t170);
    			append_dev(div73, code25);
    			append_dev(div73, t172);
    			append_dev(div73, div59);
    			append_dev(div73, t174);
    			append_dev(div73, code26);
    			append_dev(div73, t176);
    			append_dev(div73, code27);
    			append_dev(div73, t178);
    			append_dev(div73, div60);
    			append_dev(div73, t180);
    			append_dev(div73, code28);
    			append_dev(div73, t182);
    			append_dev(div73, code29);
    			append_dev(div73, t184);
    			append_dev(div73, div61);
    			append_dev(div73, t186);
    			append_dev(div73, code30);
    			append_dev(div73, t188);
    			append_dev(div73, code31);
    			append_dev(div73, t190);
    			append_dev(div73, div62);
    			append_dev(div73, t192);
    			append_dev(div73, code32);
    			append_dev(div73, t194);
    			append_dev(div73, code33);
    			append_dev(div73, t196);
    			append_dev(div73, div63);
    			append_dev(div73, t198);
    			append_dev(div73, code34);
    			append_dev(div73, t200);
    			append_dev(div73, code35);
    			append_dev(div73, t202);
    			append_dev(div73, div64);
    			append_dev(div73, t204);
    			append_dev(div73, code36);
    			append_dev(div73, t206);
    			append_dev(div73, code37);
    			append_dev(div73, t208);
    			append_dev(div73, div65);
    			append_dev(div73, t210);
    			append_dev(div73, code38);
    			append_dev(div73, t212);
    			append_dev(div73, code39);
    			append_dev(div73, t214);
    			append_dev(div73, div66);
    			append_dev(div73, t216);
    			append_dev(div73, code40);
    			append_dev(div73, t218);
    			append_dev(div73, code41);
    			append_dev(div73, t220);
    			append_dev(div73, div67);
    			append_dev(div73, t222);
    			append_dev(div73, code42);
    			append_dev(div73, t224);
    			append_dev(div73, code43);
    			append_dev(div73, t226);
    			append_dev(div73, div68);
    			append_dev(div73, t228);
    			append_dev(div73, code44);
    			append_dev(div73, t230);
    			append_dev(div73, code45);
    			append_dev(div73, t232);
    			append_dev(div73, div69);
    			append_dev(div73, t234);
    			append_dev(div73, code46);
    			append_dev(div73, t236);
    			append_dev(div73, code47);
    			append_dev(div73, t238);
    			append_dev(div73, div70);
    			append_dev(div73, t240);
    			append_dev(div73, code48);
    			append_dev(div73, t242);
    			append_dev(div73, code49);
    			append_dev(div73, t244);
    			append_dev(div73, div71);
    			append_dev(div73, t246);
    			append_dev(div73, code50);
    			append_dev(div73, t248);
    			append_dev(div73, code51);
    			append_dev(div73, t250);
    			append_dev(div73, div72);
    			append_dev(div76, t252);
    			append_dev(div76, div75);
    			append_dev(div75, t253);
    			append_dev(div75, a);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const linkedchart28_changes = {};
    			if (dirty & /*transitioningData*/ 1) linkedchart28_changes.data = /*transitioningData*/ ctx[0];
    			if (dirty & /*transitionColor*/ 2) linkedchart28_changes.fill = "hsl(" + /*transitionColor*/ ctx[1] + ", 60%, 50%)";
    			linkedchart28.$set(linkedchart28_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(linkedchart0.$$.fragment, local);
    			transition_in(linkedchart1.$$.fragment, local);
    			transition_in(linkedchart2.$$.fragment, local);
    			transition_in(linkedchart3.$$.fragment, local);
    			transition_in(linkedchart4.$$.fragment, local);
    			transition_in(linkedchart5.$$.fragment, local);
    			transition_in(linkedlabel.$$.fragment, local);
    			transition_in(linkedchart6.$$.fragment, local);
    			transition_in(linkedchart7.$$.fragment, local);
    			transition_in(linkedchart8.$$.fragment, local);
    			transition_in(linkedchart9.$$.fragment, local);
    			transition_in(linkedchart10.$$.fragment, local);
    			transition_in(linkedchart11.$$.fragment, local);
    			transition_in(linkedchart12.$$.fragment, local);
    			transition_in(linkedchart13.$$.fragment, local);
    			transition_in(linkedchart14.$$.fragment, local);
    			transition_in(linkedchart15.$$.fragment, local);
    			transition_in(linkedchart16.$$.fragment, local);
    			transition_in(linkedchart17.$$.fragment, local);
    			transition_in(linkedchart18.$$.fragment, local);
    			transition_in(linkedchart19.$$.fragment, local);
    			transition_in(linkedchart20.$$.fragment, local);
    			transition_in(linkedchart21.$$.fragment, local);
    			transition_in(linkedchart22.$$.fragment, local);
    			transition_in(linkedchart23.$$.fragment, local);
    			transition_in(linkedchart24.$$.fragment, local);
    			transition_in(linkedchart25.$$.fragment, local);
    			transition_in(linkedchart26.$$.fragment, local);
    			transition_in(linkedchart27.$$.fragment, local);
    			transition_in(linkedchart28.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(linkedchart0.$$.fragment, local);
    			transition_out(linkedchart1.$$.fragment, local);
    			transition_out(linkedchart2.$$.fragment, local);
    			transition_out(linkedchart3.$$.fragment, local);
    			transition_out(linkedchart4.$$.fragment, local);
    			transition_out(linkedchart5.$$.fragment, local);
    			transition_out(linkedlabel.$$.fragment, local);
    			transition_out(linkedchart6.$$.fragment, local);
    			transition_out(linkedchart7.$$.fragment, local);
    			transition_out(linkedchart8.$$.fragment, local);
    			transition_out(linkedchart9.$$.fragment, local);
    			transition_out(linkedchart10.$$.fragment, local);
    			transition_out(linkedchart11.$$.fragment, local);
    			transition_out(linkedchart12.$$.fragment, local);
    			transition_out(linkedchart13.$$.fragment, local);
    			transition_out(linkedchart14.$$.fragment, local);
    			transition_out(linkedchart15.$$.fragment, local);
    			transition_out(linkedchart16.$$.fragment, local);
    			transition_out(linkedchart17.$$.fragment, local);
    			transition_out(linkedchart18.$$.fragment, local);
    			transition_out(linkedchart19.$$.fragment, local);
    			transition_out(linkedchart20.$$.fragment, local);
    			transition_out(linkedchart21.$$.fragment, local);
    			transition_out(linkedchart22.$$.fragment, local);
    			transition_out(linkedchart23.$$.fragment, local);
    			transition_out(linkedchart24.$$.fragment, local);
    			transition_out(linkedchart25.$$.fragment, local);
    			transition_out(linkedchart26.$$.fragment, local);
    			transition_out(linkedchart27.$$.fragment, local);
    			transition_out(linkedchart28.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div76);
    			destroy_component(linkedchart0);
    			destroy_component(linkedchart1);
    			destroy_component(linkedchart2);
    			destroy_component(linkedchart3);
    			destroy_component(linkedchart4);
    			destroy_component(linkedchart5);
    			destroy_component(linkedlabel);
    			destroy_component(linkedchart6);
    			destroy_component(linkedchart7);
    			destroy_component(linkedchart8);
    			destroy_component(linkedchart9);
    			destroy_component(linkedchart10);
    			destroy_component(linkedchart11);
    			destroy_component(linkedchart12);
    			destroy_component(linkedchart13);
    			destroy_component(linkedchart14);
    			destroy_component(linkedchart15);
    			destroy_component(linkedchart16);
    			destroy_component(linkedchart17);
    			destroy_component(linkedchart18);
    			destroy_component(linkedchart19);
    			destroy_component(linkedchart20);
    			destroy_component(linkedchart21);
    			destroy_component(linkedchart22);
    			destroy_component(linkedchart23);
    			destroy_component(linkedchart24);
    			destroy_component(linkedchart25);
    			destroy_component(linkedchart26);
    			destroy_component(linkedchart27);
    			destroy_component(linkedchart28);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function fakeData(times) {
    	const data = {};
    	const date = new Date("1985-05-01T00:00:00Z");

    	for (let i = 0; i < times; i++) {
    		const setDate = date.setDate(date.getDate() - 1);
    		const formattedDate = new Date(setDate).toISOString().substring(0, 10);
    		data[formattedDate] = Math.floor(Math.random() * 50) + 50;
    	}

    	const reversedData = {};

    	for (let i = 0; i < times; i++) {
    		reversedData[Object.keys(data)[times - 1 - i]] = Object.values(data)[times - 1 - i];
    	}

    	return reversedData;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let transitioningData = fakeData(30);
    	let transitionColor = 50;

    	onMount(() => {
    		setInterval(
    			() => {
    				$$invalidate(0, transitioningData = fakeData(30));
    				$$invalidate(1, transitionColor = Math.floor(Math.random() * 360));
    			},
    			1000
    		);
    	});

    	const writable_props = [];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		onMount,
    		LinkedChart,
    		LinkedLabel,
    		transitioningData,
    		transitionColor,
    		fakeData
    	});

    	$$self.$inject_state = $$props => {
    		if ('transitioningData' in $$props) $$invalidate(0, transitioningData = $$props.transitioningData);
    		if ('transitionColor' in $$props) $$invalidate(1, transitionColor = $$props.transitionColor);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [transitioningData, transitionColor];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
