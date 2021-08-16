
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
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
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
    	child_ctx[25] = list[i][0];
    	child_ctx[26] = list[i][1];
    	child_ctx[28] = i;
    	return child_ctx;
    }

    // (49:4) { #each Object.entries(data) as [key, value], i }
    function create_each_block(ctx) {
    	let rect;
    	let rect_height_value;
    	let rect_y_value;
    	let rect_x_value;
    	let mounted;
    	let dispose;

    	function mouseover_handler() {
    		return /*mouseover_handler*/ ctx[17](/*key*/ ctx[25]);
    	}

    	function focus_handler() {
    		return /*focus_handler*/ ctx[18](/*key*/ ctx[25]);
    	}

    	const block = {
    		c: function create() {
    			rect = svg_element("rect");
    			set_style(rect, "--fade-opacity", /*fadeOpacity*/ ctx[5]);
    			attr_dev(rect, "width", /*barWidth*/ ctx[7]);
    			attr_dev(rect, "height", rect_height_value = /*getHeight*/ ctx[11](/*value*/ ctx[26]));
    			attr_dev(rect, "y", rect_y_value = /*height*/ ctx[1] - /*getHeight*/ ctx[11](/*value*/ ctx[26]));
    			attr_dev(rect, "x", rect_x_value = (/*gap*/ ctx[3] + /*barWidth*/ ctx[7]) * /*i*/ ctx[28]);
    			attr_dev(rect, "fill", /*fill*/ ctx[4]);
    			attr_dev(rect, "class", "svelte-gqsdy3");
    			toggle_class(rect, "faded", /*hover*/ ctx[6] && /*$hoveringKey*/ ctx[10][/*linkedKey*/ ctx[8]] && /*$hoveringKey*/ ctx[10][/*linkedKey*/ ctx[8]] != /*key*/ ctx[25]);
    			add_location(rect, file$1, 49, 6, 1380);
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

    			if (dirty & /*fadeOpacity*/ 32) {
    				set_style(rect, "--fade-opacity", /*fadeOpacity*/ ctx[5]);
    			}

    			if (dirty & /*barWidth*/ 128) {
    				attr_dev(rect, "width", /*barWidth*/ ctx[7]);
    			}

    			if (dirty & /*data*/ 1 && rect_height_value !== (rect_height_value = /*getHeight*/ ctx[11](/*value*/ ctx[26]))) {
    				attr_dev(rect, "height", rect_height_value);
    			}

    			if (dirty & /*height, data*/ 3 && rect_y_value !== (rect_y_value = /*height*/ ctx[1] - /*getHeight*/ ctx[11](/*value*/ ctx[26]))) {
    				attr_dev(rect, "y", rect_y_value);
    			}

    			if (dirty & /*gap, barWidth*/ 136 && rect_x_value !== (rect_x_value = (/*gap*/ ctx[3] + /*barWidth*/ ctx[7]) * /*i*/ ctx[28])) {
    				attr_dev(rect, "x", rect_x_value);
    			}

    			if (dirty & /*fill*/ 16) {
    				attr_dev(rect, "fill", /*fill*/ ctx[4]);
    			}

    			if (dirty & /*hover, $hoveringKey, linkedKey, Object, data*/ 1345) {
    				toggle_class(rect, "faded", /*hover*/ ctx[6] && /*$hoveringKey*/ ctx[10][/*linkedKey*/ ctx[8]] && /*$hoveringKey*/ ctx[10][/*linkedKey*/ ctx[8]] != /*key*/ ctx[25]);
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
    		source: "(49:4) { #each Object.entries(data) as [key, value], i }",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let svg;
    	let g;
    	let g_transform_value;
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

    			attr_dev(g, "transform", g_transform_value = "translate(" + /*alignmentOffset*/ ctx[9] + ", 0)");
    			add_location(g, file$1, 47, 2, 1268);
    			attr_dev(svg, "height", /*height*/ ctx[1]);
    			attr_dev(svg, "width", /*width*/ ctx[2]);
    			attr_dev(svg, "class", "svelte-gqsdy3");
    			add_location(svg, file$1, 41, 0, 1112);
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
    					listen_dev(svg, "mouseleave", /*mouseleave_handler*/ ctx[19], false, false, false),
    					listen_dev(svg, "blur", /*blur_handler*/ ctx[20], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*fadeOpacity, barWidth, getHeight, Object, data, height, gap, fill, hover, $hoveringKey, linkedKey*/ 3579) {
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

    			if (dirty & /*alignmentOffset*/ 512 && g_transform_value !== (g_transform_value = "translate(" + /*alignmentOffset*/ ctx[9] + ", 0)")) {
    				attr_dev(g, "transform", g_transform_value);
    			}

    			if (dirty & /*height*/ 2) {
    				attr_dev(svg, "height", /*height*/ ctx[1]);
    			}

    			if (dirty & /*width*/ 4) {
    				attr_dev(svg, "width", /*width*/ ctx[2]);
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
    	component_subscribe($$self, hoveringKey, $$value => $$invalidate(10, $hoveringKey = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('LinkedChart', slots, []);
    	let { data = {} } = $$props;
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

    	function getHighestValue() {
    		return Math.max(...Object.values(data));
    	}

    	function getHeight(value) {
    		return Math.round(height / highestValue * value);
    	}

    	function getBarWidth() {
    		return Math.max((width - dataLength * gap) / dataLength, barMinWidth);
    	}

    	function getAlignment() {
    		if (align == "left") return 0;
    		return gap + width - (gap + barWidth) * dataLength;
    	}

    	const writable_props = [
    		'data',
    		'height',
    		'width',
    		'barMinWidth',
    		'grow',
    		'align',
    		'gap',
    		'fill',
    		'fadeOpacity',
    		'linked',
    		'hover'
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
    		if ('height' in $$props) $$invalidate(1, height = $$props.height);
    		if ('width' in $$props) $$invalidate(2, width = $$props.width);
    		if ('barMinWidth' in $$props) $$invalidate(12, barMinWidth = $$props.barMinWidth);
    		if ('grow' in $$props) $$invalidate(13, grow = $$props.grow);
    		if ('align' in $$props) $$invalidate(14, align = $$props.align);
    		if ('gap' in $$props) $$invalidate(3, gap = $$props.gap);
    		if ('fill' in $$props) $$invalidate(4, fill = $$props.fill);
    		if ('fadeOpacity' in $$props) $$invalidate(5, fadeOpacity = $$props.fadeOpacity);
    		if ('linked' in $$props) $$invalidate(15, linked = $$props.linked);
    		if ('hover' in $$props) $$invalidate(6, hover = $$props.hover);
    	};

    	$$self.$capture_state = () => ({
    		hoveringKey,
    		data,
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
    		if ('height' in $$props) $$invalidate(1, height = $$props.height);
    		if ('width' in $$props) $$invalidate(2, width = $$props.width);
    		if ('barMinWidth' in $$props) $$invalidate(12, barMinWidth = $$props.barMinWidth);
    		if ('grow' in $$props) $$invalidate(13, grow = $$props.grow);
    		if ('align' in $$props) $$invalidate(14, align = $$props.align);
    		if ('gap' in $$props) $$invalidate(3, gap = $$props.gap);
    		if ('fill' in $$props) $$invalidate(4, fill = $$props.fill);
    		if ('fadeOpacity' in $$props) $$invalidate(5, fadeOpacity = $$props.fadeOpacity);
    		if ('linked' in $$props) $$invalidate(15, linked = $$props.linked);
    		if ('hover' in $$props) $$invalidate(6, hover = $$props.hover);
    		if ('dataLength' in $$props) $$invalidate(16, dataLength = $$props.dataLength);
    		if ('barWidth' in $$props) $$invalidate(7, barWidth = $$props.barWidth);
    		if ('highestValue' in $$props) highestValue = $$props.highestValue;
    		if ('linkedKey' in $$props) $$invalidate(8, linkedKey = $$props.linkedKey);
    		if ('alignmentOffset' in $$props) $$invalidate(9, alignmentOffset = $$props.alignmentOffset);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*data*/ 1) {
    			$$invalidate(16, dataLength = Object.keys(data).length);
    		}

    		if ($$self.$$.dirty & /*grow, dataLength, barMinWidth*/ 77824) {
    			$$invalidate(7, barWidth = grow ? getBarWidth() : barMinWidth);
    		}

    		if ($$self.$$.dirty & /*dataLength*/ 65536) {
    			highestValue = dataLength ? getHighestValue() : 0;
    		}

    		if ($$self.$$.dirty & /*dataLength*/ 65536) {
    			$$invalidate(9, alignmentOffset = dataLength ? getAlignment() : 0);
    		}

    		if ($$self.$$.dirty & /*linked*/ 32768) {
    			$$invalidate(8, linkedKey = linked || (Math.random() + 1).toString(36).substring(7));
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
    		barWidth,
    		linkedKey,
    		alignmentOffset,
    		$hoveringKey,
    		getHeight,
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

    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {
    			data: 0,
    			height: 1,
    			width: 2,
    			barMinWidth: 12,
    			grow: 13,
    			align: 14,
    			gap: 3,
    			fill: 4,
    			fadeOpacity: 5,
    			linked: 15,
    			hover: 6
    		});

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
    	let div12;
    	let h1;
    	let t0;
    	let mark;
    	let t2;
    	let div1;
    	let div0;
    	let t3;
    	let code0;
    	let t5;
    	let linkedchart0;
    	let t6;
    	let div9;
    	let div2;
    	let t7;
    	let code1;
    	let t8;
    	let br0;
    	let t9;
    	let br1;
    	let t10;
    	let br2;
    	let t11;
    	let br3;
    	let t12;
    	let br4;
    	let t13;
    	let br5;
    	let t14;
    	let div8;
    	let div3;
    	let linkedlabel;
    	let t15;
    	let div4;
    	let linkedchart1;
    	let t16;
    	let div5;
    	let linkedchart2;
    	let t17;
    	let div6;
    	let linkedchart3;
    	let t18;
    	let div7;
    	let linkedchart4;
    	let t19;
    	let div10;
    	let linkedchart5;
    	let t20;
    	let div11;
    	let linkedchart6;
    	let current;

    	linkedchart0 = new LinkedChart({
    			props: { data: fakeData(30) },
    			$$inline: true
    		});

    	linkedlabel = new LinkedLabel({
    			props: {
    				linked: "link-1",
    				empty: "Start hovering"
    			},
    			$$inline: true
    		});

    	linkedchart1 = new LinkedChart({
    			props: { data: fakeData(30), linked: "link-1" },
    			$$inline: true
    		});

    	linkedchart2 = new LinkedChart({
    			props: { data: fakeData(10), linked: "link-1" },
    			$$inline: true
    		});

    	linkedchart3 = new LinkedChart({
    			props: { data: fakeData(30), linked: "link-1" },
    			$$inline: true
    		});

    	linkedchart4 = new LinkedChart({
    			props: { data: fakeData(30), linked: "link-1" },
    			$$inline: true
    		});

    	linkedchart5 = new LinkedChart({
    			props: { data: fakeData(10), fadeOpacity: "0.75" },
    			$$inline: true
    		});

    	linkedchart6 = new LinkedChart({
    			props: {
    				data: fakeData(5),
    				grow: true,
    				hover: false,
    				barMinWidth: "0"
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div12 = element("div");
    			h1 = element("h1");
    			t0 = text("Tiny Linked Charts for ");
    			mark = element("mark");
    			mark.textContent = "Svelte";
    			t2 = space();
    			div1 = element("div");
    			div0 = element("div");
    			t3 = text("The chart in it's most basic form.\r\n\r\n\t\t\t");
    			code0 = element("code");
    			code0.textContent = "<LinkedChart { data } />";
    			t5 = space();
    			create_component(linkedchart0.$$.fragment);
    			t6 = space();
    			div9 = element("div");
    			div2 = element("div");
    			t7 = text("You can link multiple charts together, hovering one will also highlight others.\r\n\r\n\t\t\t");
    			code1 = element("code");
    			t8 = text("<LinkedLabel linked=\"link-1\" /> ");
    			br0 = element("br");
    			t9 = space();
    			br1 = element("br");
    			t10 = text("\r\n\t\t\t\t<LinkedChart { data } linked=\"link-1\" /> ");
    			br2 = element("br");
    			t11 = text("\r\n\t\t\t\t<LinkedChart { data } linked=\"link-1\" /> ");
    			br3 = element("br");
    			t12 = text("\r\n\t\t\t\t<LinkedChart { data } linked=\"link-1\" /> ");
    			br4 = element("br");
    			t13 = text("\r\n\t\t\t\t<LinkedChart { data } linked=\"link-1\" /> ");
    			br5 = element("br");
    			t14 = space();
    			div8 = element("div");
    			div3 = element("div");
    			create_component(linkedlabel.$$.fragment);
    			t15 = space();
    			div4 = element("div");
    			create_component(linkedchart1.$$.fragment);
    			t16 = space();
    			div5 = element("div");
    			create_component(linkedchart2.$$.fragment);
    			t17 = space();
    			div6 = element("div");
    			create_component(linkedchart3.$$.fragment);
    			t18 = space();
    			div7 = element("div");
    			create_component(linkedchart4.$$.fragment);
    			t19 = space();
    			div10 = element("div");
    			create_component(linkedchart5.$$.fragment);
    			t20 = space();
    			div11 = element("div");
    			create_component(linkedchart6.$$.fragment);
    			attr_dev(mark, "class", "svelte-15rmn37");
    			add_location(mark, file, 26, 28, 674);
    			add_location(h1, file, 26, 1, 647);
    			attr_dev(code0, "class", "svelte-15rmn37");
    			add_location(code0, file, 32, 3, 797);
    			attr_dev(div0, "class", "description");
    			add_location(div0, file, 29, 2, 726);
    			attr_dev(div1, "class", "block svelte-15rmn37");
    			add_location(div1, file, 28, 1, 703);
    			add_location(br0, file, 45, 42, 1117);
    			add_location(br1, file, 46, 4, 1127);
    			add_location(br2, file, 47, 61, 1194);
    			add_location(br3, file, 48, 61, 1261);
    			add_location(br4, file, 49, 61, 1328);
    			add_location(br5, file, 50, 61, 1395);
    			attr_dev(code1, "class", "svelte-15rmn37");
    			add_location(code1, file, 44, 3, 1067);
    			attr_dev(div2, "class", "description");
    			add_location(div2, file, 41, 2, 951);
    			attr_dev(div3, "class", "label svelte-15rmn37");
    			add_location(div3, file, 55, 3, 1437);
    			attr_dev(div4, "class", "chart svelte-15rmn37");
    			add_location(div4, file, 57, 3, 1523);
    			attr_dev(div5, "class", "chart svelte-15rmn37");
    			add_location(div5, file, 58, 3, 1606);
    			attr_dev(div6, "class", "chart svelte-15rmn37");
    			add_location(div6, file, 59, 3, 1689);
    			attr_dev(div7, "class", "chart svelte-15rmn37");
    			add_location(div7, file, 60, 3, 1772);
    			add_location(div8, file, 54, 2, 1427);
    			attr_dev(div9, "class", "block svelte-15rmn37");
    			add_location(div9, file, 40, 1, 928);
    			attr_dev(div10, "class", "chart svelte-15rmn37");
    			add_location(div10, file, 64, 1, 1874);
    			attr_dev(div11, "class", "chart svelte-15rmn37");
    			add_location(div11, file, 68, 1, 1967);
    			attr_dev(div12, "class", "wrapper svelte-15rmn37");
    			add_location(div12, file, 25, 0, 623);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div12, anchor);
    			append_dev(div12, h1);
    			append_dev(h1, t0);
    			append_dev(h1, mark);
    			append_dev(div12, t2);
    			append_dev(div12, div1);
    			append_dev(div1, div0);
    			append_dev(div0, t3);
    			append_dev(div0, code0);
    			append_dev(div1, t5);
    			mount_component(linkedchart0, div1, null);
    			append_dev(div12, t6);
    			append_dev(div12, div9);
    			append_dev(div9, div2);
    			append_dev(div2, t7);
    			append_dev(div2, code1);
    			append_dev(code1, t8);
    			append_dev(code1, br0);
    			append_dev(code1, t9);
    			append_dev(code1, br1);
    			append_dev(code1, t10);
    			append_dev(code1, br2);
    			append_dev(code1, t11);
    			append_dev(code1, br3);
    			append_dev(code1, t12);
    			append_dev(code1, br4);
    			append_dev(code1, t13);
    			append_dev(code1, br5);
    			append_dev(div9, t14);
    			append_dev(div9, div8);
    			append_dev(div8, div3);
    			mount_component(linkedlabel, div3, null);
    			append_dev(div8, t15);
    			append_dev(div8, div4);
    			mount_component(linkedchart1, div4, null);
    			append_dev(div8, t16);
    			append_dev(div8, div5);
    			mount_component(linkedchart2, div5, null);
    			append_dev(div8, t17);
    			append_dev(div8, div6);
    			mount_component(linkedchart3, div6, null);
    			append_dev(div8, t18);
    			append_dev(div8, div7);
    			mount_component(linkedchart4, div7, null);
    			append_dev(div12, t19);
    			append_dev(div12, div10);
    			mount_component(linkedchart5, div10, null);
    			append_dev(div12, t20);
    			append_dev(div12, div11);
    			mount_component(linkedchart6, div11, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(linkedchart0.$$.fragment, local);
    			transition_in(linkedlabel.$$.fragment, local);
    			transition_in(linkedchart1.$$.fragment, local);
    			transition_in(linkedchart2.$$.fragment, local);
    			transition_in(linkedchart3.$$.fragment, local);
    			transition_in(linkedchart4.$$.fragment, local);
    			transition_in(linkedchart5.$$.fragment, local);
    			transition_in(linkedchart6.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(linkedchart0.$$.fragment, local);
    			transition_out(linkedlabel.$$.fragment, local);
    			transition_out(linkedchart1.$$.fragment, local);
    			transition_out(linkedchart2.$$.fragment, local);
    			transition_out(linkedchart3.$$.fragment, local);
    			transition_out(linkedchart4.$$.fragment, local);
    			transition_out(linkedchart5.$$.fragment, local);
    			transition_out(linkedchart6.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div12);
    			destroy_component(linkedchart0);
    			destroy_component(linkedlabel);
    			destroy_component(linkedchart1);
    			destroy_component(linkedchart2);
    			destroy_component(linkedchart3);
    			destroy_component(linkedchart4);
    			destroy_component(linkedchart5);
    			destroy_component(linkedchart6);
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
    		data[formattedDate] = Math.floor(Math.random() * 100);
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
    	const writable_props = [];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ LinkedChart, LinkedLabel, fakeData });
    	return [];
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
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
