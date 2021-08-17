
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

    const hoveringKey = writable({});
    const hoveringValue = writable({});

    /* ..\src\LinkedChart.svelte generated by Svelte v3.42.1 */

    const { Object: Object_1$1 } = globals;
    const file$1 = "..\\src\\LinkedChart.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[38] = list[i][0];
    	child_ctx[39] = list[i][1];
    	child_ctx[41] = i;
    	return child_ctx;
    }

    // (84:4) { #each Object.entries(data) as [key, value], i }
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
    		return /*mouseover_handler*/ ctx[31](/*key*/ ctx[38], /*i*/ ctx[41]);
    	}

    	function focus_handler() {
    		return /*focus_handler*/ ctx[32](/*key*/ ctx[38], /*i*/ ctx[41]);
    	}

    	function touchstart_handler() {
    		return /*touchstart_handler*/ ctx[33](/*key*/ ctx[38], /*i*/ ctx[41]);
    	}

    	const block = {
    		c: function create() {
    			rect = svg_element("rect");

    			attr_dev(rect, "style", rect_style_value = /*transition*/ ctx[8]
    			? `transition: all ${/*transition*/ ctx[8]}ms`
    			: null);

    			attr_dev(rect, "opacity", rect_opacity_value = /*hover*/ ctx[7] && /*$hoveringKey*/ ctx[16][/*linkedKey*/ ctx[14]] && /*$hoveringKey*/ ctx[16][/*linkedKey*/ ctx[14]] != /*key*/ ctx[38]
    			? /*fadeOpacity*/ ctx[6]
    			: 1);

    			attr_dev(rect, "width", /*barWidth*/ ctx[15]);
    			attr_dev(rect, "height", rect_height_value = /*getHeight*/ ctx[20](/*value*/ ctx[39]));
    			attr_dev(rect, "y", rect_y_value = /*height*/ ctx[2] - /*getHeight*/ ctx[20](/*value*/ ctx[39]));
    			attr_dev(rect, "x", rect_x_value = (parseInt(/*gap*/ ctx[4]) + /*barWidth*/ ctx[15]) * /*i*/ ctx[41]);
    			add_location(rect, file$1, 84, 6, 2536);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, rect, anchor);

    			if (!mounted) {
    				dispose = [
    					listen_dev(rect, "mouseover", mouseover_handler, false, false, false),
    					listen_dev(rect, "focus", focus_handler, false, false, false),
    					listen_dev(rect, "touchstart", touchstart_handler, { passive: true }, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty[0] & /*transition*/ 256 && rect_style_value !== (rect_style_value = /*transition*/ ctx[8]
    			? `transition: all ${/*transition*/ ctx[8]}ms`
    			: null)) {
    				attr_dev(rect, "style", rect_style_value);
    			}

    			if (dirty[0] & /*hover, $hoveringKey, linkedKey, data, fadeOpacity*/ 82113 && rect_opacity_value !== (rect_opacity_value = /*hover*/ ctx[7] && /*$hoveringKey*/ ctx[16][/*linkedKey*/ ctx[14]] && /*$hoveringKey*/ ctx[16][/*linkedKey*/ ctx[14]] != /*key*/ ctx[38]
    			? /*fadeOpacity*/ ctx[6]
    			: 1)) {
    				attr_dev(rect, "opacity", rect_opacity_value);
    			}

    			if (dirty[0] & /*barWidth*/ 32768) {
    				attr_dev(rect, "width", /*barWidth*/ ctx[15]);
    			}

    			if (dirty[0] & /*data*/ 1 && rect_height_value !== (rect_height_value = /*getHeight*/ ctx[20](/*value*/ ctx[39]))) {
    				attr_dev(rect, "height", rect_height_value);
    			}

    			if (dirty[0] & /*height, data*/ 5 && rect_y_value !== (rect_y_value = /*height*/ ctx[2] - /*getHeight*/ ctx[20](/*value*/ ctx[39]))) {
    				attr_dev(rect, "y", rect_y_value);
    			}

    			if (dirty[0] & /*gap, barWidth*/ 32784 && rect_x_value !== (rect_x_value = (parseInt(/*gap*/ ctx[4]) + /*barWidth*/ ctx[15]) * /*i*/ ctx[41])) {
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
    		source: "(84:4) { #each Object.entries(data) as [key, value], i }",
    		ctx
    	});

    	return block;
    }

    // (99:0) { #if showValue }
    function create_if_block$2(ctx) {
    	let div;
    	let div_style_value;

    	function select_block_type(ctx, dirty) {
    		if (/*$hoveringValue*/ ctx[19][/*uid*/ ctx[1]]) return create_if_block_1;
    		return create_else_block$2;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if_block.c();
    			attr_dev(div, "class", "tiny-linked-charts-value");

    			attr_dev(div, "style", div_style_value = /*valuePosition*/ ctx[13] == "floating"
    			? `position: absolute; transform: translateX(${/*valuePositionOffset*/ ctx[17]}px)`
    			: null);

    			add_location(div, file$1, 99, 2, 3083);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if_block.m(div, null);
    		},
    		p: function update(ctx, dirty) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div, null);
    				}
    			}

    			if (dirty[0] & /*valuePosition, valuePositionOffset*/ 139264 && div_style_value !== (div_style_value = /*valuePosition*/ ctx[13] == "floating"
    			? `position: absolute; transform: translateX(${/*valuePositionOffset*/ ctx[17]}px)`
    			: null)) {
    				attr_dev(div, "style", div_style_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(99:0) { #if showValue }",
    		ctx
    	});

    	return block;
    }

    // (105:4) { :else }
    function create_else_block$2(ctx) {
    	let html_tag;
    	let html_anchor;

    	const block = {
    		c: function create() {
    			html_tag = new HtmlTag();
    			html_anchor = empty();
    			html_tag.a = html_anchor;
    		},
    		m: function mount(target, anchor) {
    			html_tag.m(/*valueDefault*/ ctx[10], target, anchor);
    			insert_dev(target, html_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*valueDefault*/ 1024) html_tag.p(/*valueDefault*/ ctx[10]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(html_anchor);
    			if (detaching) html_tag.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$2.name,
    		type: "else",
    		source: "(105:4) { :else }",
    		ctx
    	});

    	return block;
    }

    // (101:4) { #if $hoveringValue[uid] }
    function create_if_block_1(ctx) {
    	let t0;
    	let t1;
    	let t2_value = /*$hoveringValue*/ ctx[19][/*uid*/ ctx[1]] + "";
    	let t2;
    	let t3;
    	let t4;

    	const block = {
    		c: function create() {
    			t0 = text(/*valuePrepend*/ ctx[11]);
    			t1 = space();
    			t2 = text(t2_value);
    			t3 = space();
    			t4 = text(/*valueAppend*/ ctx[12]);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, t4, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*valuePrepend*/ 2048) set_data_dev(t0, /*valuePrepend*/ ctx[11]);
    			if (dirty[0] & /*$hoveringValue, uid*/ 524290 && t2_value !== (t2_value = /*$hoveringValue*/ ctx[19][/*uid*/ ctx[1]] + "")) set_data_dev(t2, t2_value);
    			if (dirty[0] & /*valueAppend*/ 4096) set_data_dev(t4, /*valueAppend*/ ctx[12]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(t4);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(101:4) { #if $hoveringValue[uid] }",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let svg;
    	let g;
    	let g_transform_value;
    	let svg_viewBox_value;
    	let t;
    	let if_block_anchor;
    	let mounted;
    	let dispose;
    	let each_value = Object.entries(/*data*/ ctx[0]);
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	let if_block = /*showValue*/ ctx[9] && create_if_block$2(ctx);

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			g = svg_element("g");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t = space();
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    			attr_dev(g, "transform", g_transform_value = "translate(" + /*alignmentOffset*/ ctx[18] + ", 0)");
    			attr_dev(g, "fill", /*fill*/ ctx[5]);
    			add_location(g, file$1, 82, 2, 2415);
    			attr_dev(svg, "height", /*height*/ ctx[2]);
    			attr_dev(svg, "width", /*width*/ ctx[3]);
    			attr_dev(svg, "viewBox", svg_viewBox_value = "0 0 " + /*width*/ ctx[3] + " " + /*height*/ ctx[2]);
    			attr_dev(svg, "preserveAspectRatio", "none");
    			add_location(svg, file$1, 74, 0, 2255);
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

    			insert_dev(target, t, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);

    			if (!mounted) {
    				dispose = [
    					listen_dev(svg, "mouseleave", /*endHover*/ ctx[22], false, false, false),
    					listen_dev(svg, "blur", /*endHover*/ ctx[22], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*transition, hover, $hoveringKey, linkedKey, data, fadeOpacity, barWidth, getHeight, height, gap, startHover*/ 3260885) {
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

    			if (dirty[0] & /*alignmentOffset*/ 262144 && g_transform_value !== (g_transform_value = "translate(" + /*alignmentOffset*/ ctx[18] + ", 0)")) {
    				attr_dev(g, "transform", g_transform_value);
    			}

    			if (dirty[0] & /*fill*/ 32) {
    				attr_dev(g, "fill", /*fill*/ ctx[5]);
    			}

    			if (dirty[0] & /*height*/ 4) {
    				attr_dev(svg, "height", /*height*/ ctx[2]);
    			}

    			if (dirty[0] & /*width*/ 8) {
    				attr_dev(svg, "width", /*width*/ ctx[3]);
    			}

    			if (dirty[0] & /*width, height*/ 12 && svg_viewBox_value !== (svg_viewBox_value = "0 0 " + /*width*/ ctx[3] + " " + /*height*/ ctx[2])) {
    				attr_dev(svg, "viewBox", svg_viewBox_value);
    			}

    			if (/*showValue*/ ctx[9]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$2(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(t);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let dataLength;
    	let barWidth;
    	let highestValue;
    	let alignmentOffset;
    	let linkedKey;
    	let $hoveringKey;
    	let $hoveringValue;
    	validate_store(hoveringKey, 'hoveringKey');
    	component_subscribe($$self, hoveringKey, $$value => $$invalidate(16, $hoveringKey = $$value));
    	validate_store(hoveringValue, 'hoveringValue');
    	component_subscribe($$self, hoveringValue, $$value => $$invalidate(19, $hoveringValue = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('LinkedChart', slots, []);
    	let { uid = (Math.random() + 1).toString(36).substring(7) } = $$props;
    	let { data = {} } = $$props;
    	let { labels = [] } = $$props;
    	let { values = [] } = $$props;
    	let { linked = "" } = $$props;
    	let { height = 40 } = $$props;
    	let { width = 150 } = $$props;
    	let { barMinWidth = 4 } = $$props;
    	let { grow = false } = $$props;
    	let { align = "right" } = $$props;
    	let { gap = 1 } = $$props;
    	let { fill = "#ff3e00" } = $$props;
    	let { fadeOpacity = 0.5 } = $$props;
    	let { hover = true } = $$props;
    	let { transition = 0 } = $$props;
    	let { showValue = false } = $$props;
    	let { valueDefault = "&nbsp;" } = $$props;
    	let { valuePrepend = "" } = $$props;
    	let { valueAppend = "" } = $$props;
    	let { valuePosition = "static" } = $$props;
    	let { scaleMax = 0 } = $$props;
    	let valuePositionOffset = 0;

    	function getHighestValue() {
    		if (scaleMax) return scaleMax;
    		if (dataLength) return Math.max(...Object.values(data));
    		return 0;
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

    	function startHover(key, index) {
    		if (!hover) return;
    		set_store_value(hoveringKey, $hoveringKey[linkedKey] = key, $hoveringKey);
    	}

    	function endHover() {
    		if (!hover) return;
    		set_store_value(hoveringKey, $hoveringKey[linkedKey] = null, $hoveringKey);
    	}

    	const writable_props = [
    		'uid',
    		'data',
    		'labels',
    		'values',
    		'linked',
    		'height',
    		'width',
    		'barMinWidth',
    		'grow',
    		'align',
    		'gap',
    		'fill',
    		'fadeOpacity',
    		'hover',
    		'transition',
    		'showValue',
    		'valueDefault',
    		'valuePrepend',
    		'valueAppend',
    		'valuePosition',
    		'scaleMax'
    	];

    	Object_1$1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<LinkedChart> was created with unknown prop '${key}'`);
    	});

    	const mouseover_handler = (key, i) => startHover(key);
    	const focus_handler = (key, i) => startHover(key);
    	const touchstart_handler = (key, i) => startHover(key);

    	$$self.$$set = $$props => {
    		if ('uid' in $$props) $$invalidate(1, uid = $$props.uid);
    		if ('data' in $$props) $$invalidate(0, data = $$props.data);
    		if ('labels' in $$props) $$invalidate(23, labels = $$props.labels);
    		if ('values' in $$props) $$invalidate(24, values = $$props.values);
    		if ('linked' in $$props) $$invalidate(25, linked = $$props.linked);
    		if ('height' in $$props) $$invalidate(2, height = $$props.height);
    		if ('width' in $$props) $$invalidate(3, width = $$props.width);
    		if ('barMinWidth' in $$props) $$invalidate(26, barMinWidth = $$props.barMinWidth);
    		if ('grow' in $$props) $$invalidate(27, grow = $$props.grow);
    		if ('align' in $$props) $$invalidate(28, align = $$props.align);
    		if ('gap' in $$props) $$invalidate(4, gap = $$props.gap);
    		if ('fill' in $$props) $$invalidate(5, fill = $$props.fill);
    		if ('fadeOpacity' in $$props) $$invalidate(6, fadeOpacity = $$props.fadeOpacity);
    		if ('hover' in $$props) $$invalidate(7, hover = $$props.hover);
    		if ('transition' in $$props) $$invalidate(8, transition = $$props.transition);
    		if ('showValue' in $$props) $$invalidate(9, showValue = $$props.showValue);
    		if ('valueDefault' in $$props) $$invalidate(10, valueDefault = $$props.valueDefault);
    		if ('valuePrepend' in $$props) $$invalidate(11, valuePrepend = $$props.valuePrepend);
    		if ('valueAppend' in $$props) $$invalidate(12, valueAppend = $$props.valueAppend);
    		if ('valuePosition' in $$props) $$invalidate(13, valuePosition = $$props.valuePosition);
    		if ('scaleMax' in $$props) $$invalidate(29, scaleMax = $$props.scaleMax);
    	};

    	$$self.$capture_state = () => ({
    		hoveringKey,
    		hoveringValue,
    		uid,
    		data,
    		labels,
    		values,
    		linked,
    		height,
    		width,
    		barMinWidth,
    		grow,
    		align,
    		gap,
    		fill,
    		fadeOpacity,
    		hover,
    		transition,
    		showValue,
    		valueDefault,
    		valuePrepend,
    		valueAppend,
    		valuePosition,
    		scaleMax,
    		valuePositionOffset,
    		getHighestValue,
    		getHeight,
    		getBarWidth,
    		getAlignment,
    		startHover,
    		endHover,
    		linkedKey,
    		dataLength,
    		barWidth,
    		highestValue,
    		alignmentOffset,
    		$hoveringKey,
    		$hoveringValue
    	});

    	$$self.$inject_state = $$props => {
    		if ('uid' in $$props) $$invalidate(1, uid = $$props.uid);
    		if ('data' in $$props) $$invalidate(0, data = $$props.data);
    		if ('labels' in $$props) $$invalidate(23, labels = $$props.labels);
    		if ('values' in $$props) $$invalidate(24, values = $$props.values);
    		if ('linked' in $$props) $$invalidate(25, linked = $$props.linked);
    		if ('height' in $$props) $$invalidate(2, height = $$props.height);
    		if ('width' in $$props) $$invalidate(3, width = $$props.width);
    		if ('barMinWidth' in $$props) $$invalidate(26, barMinWidth = $$props.barMinWidth);
    		if ('grow' in $$props) $$invalidate(27, grow = $$props.grow);
    		if ('align' in $$props) $$invalidate(28, align = $$props.align);
    		if ('gap' in $$props) $$invalidate(4, gap = $$props.gap);
    		if ('fill' in $$props) $$invalidate(5, fill = $$props.fill);
    		if ('fadeOpacity' in $$props) $$invalidate(6, fadeOpacity = $$props.fadeOpacity);
    		if ('hover' in $$props) $$invalidate(7, hover = $$props.hover);
    		if ('transition' in $$props) $$invalidate(8, transition = $$props.transition);
    		if ('showValue' in $$props) $$invalidate(9, showValue = $$props.showValue);
    		if ('valueDefault' in $$props) $$invalidate(10, valueDefault = $$props.valueDefault);
    		if ('valuePrepend' in $$props) $$invalidate(11, valuePrepend = $$props.valuePrepend);
    		if ('valueAppend' in $$props) $$invalidate(12, valueAppend = $$props.valueAppend);
    		if ('valuePosition' in $$props) $$invalidate(13, valuePosition = $$props.valuePosition);
    		if ('scaleMax' in $$props) $$invalidate(29, scaleMax = $$props.scaleMax);
    		if ('valuePositionOffset' in $$props) $$invalidate(17, valuePositionOffset = $$props.valuePositionOffset);
    		if ('linkedKey' in $$props) $$invalidate(14, linkedKey = $$props.linkedKey);
    		if ('dataLength' in $$props) $$invalidate(30, dataLength = $$props.dataLength);
    		if ('barWidth' in $$props) $$invalidate(15, barWidth = $$props.barWidth);
    		if ('highestValue' in $$props) highestValue = $$props.highestValue;
    		if ('alignmentOffset' in $$props) $$invalidate(18, alignmentOffset = $$props.alignmentOffset);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*labels, values*/ 25165824) {
    			if (labels.length && values.length) $$invalidate(0, data = Object.fromEntries(labels.map((_, i) => [labels[i], values[i]])));
    		}

    		if ($$self.$$.dirty[0] & /*data*/ 1) {
    			$$invalidate(30, dataLength = Object.keys(data).length);
    		}

    		if ($$self.$$.dirty[0] & /*grow, dataLength, barMinWidth*/ 1275068416) {
    			$$invalidate(15, barWidth = grow ? getBarWidth() : parseInt(barMinWidth));
    		}

    		if ($$self.$$.dirty[0] & /*dataLength*/ 1073741824) {
    			highestValue = getHighestValue();
    		}

    		if ($$self.$$.dirty[0] & /*dataLength*/ 1073741824) {
    			$$invalidate(18, alignmentOffset = dataLength ? getAlignment() : 0);
    		}

    		if ($$self.$$.dirty[0] & /*linked*/ 33554432) {
    			$$invalidate(14, linkedKey = linked || (Math.random() + 1).toString(36).substring(7));
    		}

    		if ($$self.$$.dirty[0] & /*valuePosition, gap, barWidth, data, $hoveringKey, linkedKey*/ 122897) {
    			if (valuePosition == "floating") $$invalidate(17, valuePositionOffset = (parseInt(gap) + barWidth) * Object.keys(data).indexOf($hoveringKey[linkedKey]));
    		}

    		if ($$self.$$.dirty[0] & /*$hoveringKey, linkedKey, uid, data*/ 81923) {
    			{
    				if ($hoveringKey[linkedKey]) {
    					set_store_value(hoveringValue, $hoveringValue[uid] = data[$hoveringKey[linkedKey]], $hoveringValue);
    				} else {
    					set_store_value(hoveringValue, $hoveringValue[uid] = null, $hoveringValue);
    				}
    			}
    		}
    	};

    	return [
    		data,
    		uid,
    		height,
    		width,
    		gap,
    		fill,
    		fadeOpacity,
    		hover,
    		transition,
    		showValue,
    		valueDefault,
    		valuePrepend,
    		valueAppend,
    		valuePosition,
    		linkedKey,
    		barWidth,
    		$hoveringKey,
    		valuePositionOffset,
    		alignmentOffset,
    		$hoveringValue,
    		getHeight,
    		startHover,
    		endHover,
    		labels,
    		values,
    		linked,
    		barMinWidth,
    		grow,
    		align,
    		scaleMax,
    		dataLength,
    		mouseover_handler,
    		focus_handler,
    		touchstart_handler
    	];
    }

    class LinkedChart extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(
    			this,
    			options,
    			instance$3,
    			create_fragment$3,
    			safe_not_equal,
    			{
    				uid: 1,
    				data: 0,
    				labels: 23,
    				values: 24,
    				linked: 25,
    				height: 2,
    				width: 3,
    				barMinWidth: 26,
    				grow: 27,
    				align: 28,
    				gap: 4,
    				fill: 5,
    				fadeOpacity: 6,
    				hover: 7,
    				transition: 8,
    				showValue: 9,
    				valueDefault: 10,
    				valuePrepend: 11,
    				valueAppend: 12,
    				valuePosition: 13,
    				scaleMax: 29
    			},
    			null,
    			[-1, -1]
    		);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "LinkedChart",
    			options,
    			id: create_fragment$3.name
    		});
    	}

    	get uid() {
    		throw new Error("<LinkedChart>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set uid(value) {
    		throw new Error("<LinkedChart>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
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

    	get linked() {
    		throw new Error("<LinkedChart>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set linked(value) {
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

    	get showValue() {
    		throw new Error("<LinkedChart>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set showValue(value) {
    		throw new Error("<LinkedChart>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get valueDefault() {
    		throw new Error("<LinkedChart>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set valueDefault(value) {
    		throw new Error("<LinkedChart>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get valuePrepend() {
    		throw new Error("<LinkedChart>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set valuePrepend(value) {
    		throw new Error("<LinkedChart>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get valueAppend() {
    		throw new Error("<LinkedChart>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set valueAppend(value) {
    		throw new Error("<LinkedChart>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get valuePosition() {
    		throw new Error("<LinkedChart>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set valuePosition(value) {
    		throw new Error("<LinkedChart>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get scaleMax() {
    		throw new Error("<LinkedChart>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set scaleMax(value) {
    		throw new Error("<LinkedChart>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* ..\src\LinkedLabel.svelte generated by Svelte v3.42.1 */

    // (14:0) { :else }
    function create_else_block$1(ctx) {
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
    		id: create_else_block$1.name,
    		type: "else",
    		source: "(14:0) { :else }",
    		ctx
    	});

    	return block;
    }

    // (12:0) { #if label }
    function create_if_block$1(ctx) {
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
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(12:0) { #if label }",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let if_block_anchor;

    	function select_block_type(ctx, dirty) {
    		if (/*label*/ ctx[1]) return create_if_block$1;
    		return create_else_block$1;
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
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { linked: 2, empty: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "LinkedLabel",
    			options,
    			id: create_fragment$2.name
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

    /* ..\src\LinkedValue.svelte generated by Svelte v3.42.1 */

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

    // (12:0) { #if value }
    function create_if_block(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text(/*value*/ ctx[1]);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*value*/ 2) set_data_dev(t, /*value*/ ctx[1]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(12:0) { #if value }",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let if_block_anchor;

    	function select_block_type(ctx, dirty) {
    		if (/*value*/ ctx[1]) return create_if_block;
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
    	let value;
    	let $hoveringValue;
    	validate_store(hoveringValue, 'hoveringValue');
    	component_subscribe($$self, hoveringValue, $$value => $$invalidate(3, $hoveringValue = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('LinkedValue', slots, []);
    	let { uid } = $$props;
    	let { empty = "&nbsp;" } = $$props;
    	const writable_props = ['uid', 'empty'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<LinkedValue> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('uid' in $$props) $$invalidate(2, uid = $$props.uid);
    		if ('empty' in $$props) $$invalidate(0, empty = $$props.empty);
    	};

    	$$self.$capture_state = () => ({
    		hoveringValue,
    		uid,
    		empty,
    		value,
    		$hoveringValue
    	});

    	$$self.$inject_state = $$props => {
    		if ('uid' in $$props) $$invalidate(2, uid = $$props.uid);
    		if ('empty' in $$props) $$invalidate(0, empty = $$props.empty);
    		if ('value' in $$props) $$invalidate(1, value = $$props.value);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$hoveringValue, uid*/ 12) {
    			$$invalidate(1, value = $hoveringValue[uid]);
    		}
    	};

    	return [empty, value, uid, $hoveringValue];
    }

    class LinkedValue extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { uid: 2, empty: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "LinkedValue",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*uid*/ ctx[2] === undefined && !('uid' in props)) {
    			console.warn("<LinkedValue> was created without expected prop 'uid'");
    		}
    	}

    	get uid() {
    		throw new Error("<LinkedValue>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set uid(value) {
    		throw new Error("<LinkedValue>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get empty() {
    		throw new Error("<LinkedValue>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set empty(value) {
    		throw new Error("<LinkedValue>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\App.svelte generated by Svelte v3.42.1 */

    const { Object: Object_1 } = globals;
    const file = "src\\App.svelte";

    function create_fragment(ctx) {
    	let div111;
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
    	let p1;
    	let a0;
    	let t7;
    	let h20;
    	let t9;
    	let p2;
    	let t11;
    	let code0;
    	let t12;
    	let mark1;
    	let t14;
    	let code1;
    	let t15;
    	let mark2;
    	let t17;
    	let p3;
    	let t19;
    	let code2;
    	let t20;
    	let mark3;
    	let t22;
    	let t23;
    	let code3;
    	let t24;
    	let mark4;
    	let t26;
    	let mark5;
    	let t28;
    	let mark6;
    	let t30;
    	let t31;
    	let div2;
    	let p4;
    	let t33;
    	let code4;
    	let t34;
    	let br0;
    	let t35;
    	let br1;
    	let t36;
    	let br2;
    	let t37;
    	let br3;
    	let t38;
    	let br4;
    	let t39;
    	let br5;
    	let t40;
    	let t41;
    	let code5;
    	let t43;
    	let p5;
    	let t45;
    	let code6;
    	let t46;
    	let br6;
    	let t47;
    	let br7;
    	let t48;
    	let br8;
    	let t49;
    	let br9;
    	let t50;
    	let br10;
    	let t51;
    	let br11;
    	let t52;
    	let t53;
    	let code7;
    	let t54;
    	let br12;
    	let t55;
    	let br13;
    	let t56;
    	let br14;
    	let t57;
    	let br15;
    	let t58;
    	let br16;
    	let t59;
    	let br17;
    	let t60;
    	let t61;
    	let code8;
    	let t63;
    	let h21;
    	let t65;
    	let div4;
    	let div3;
    	let t66;
    	let code9;
    	let t68;
    	let linkedchart1;
    	let t69;
    	let div11;
    	let div5;
    	let t70;
    	let code10;
    	let t71;
    	let br18;
    	let t72;
    	let br19;
    	let t73;
    	let br20;
    	let t74;
    	let t75;
    	let div10;
    	let div6;
    	let linkedchart2;
    	let t76;
    	let div7;
    	let linkedchart3;
    	let t77;
    	let div8;
    	let linkedchart4;
    	let t78;
    	let div9;
    	let linkedchart5;
    	let t79;
    	let div16;
    	let div12;
    	let t80;
    	let code11;
    	let t81;
    	let br21;
    	let t82;
    	let t83;
    	let div15;
    	let div13;
    	let linkedchart6;
    	let t84;
    	let div14;
    	let linkedchart7;
    	let t85;
    	let h22;
    	let t87;
    	let div21;
    	let div17;
    	let t88;
    	let code12;
    	let t89;
    	let br22;
    	let t90;
    	let br23;
    	let t91;
    	let br24;
    	let t92;
    	let t93;
    	let br25;
    	let t94;
    	let t95;
    	let div20;
    	let linkedlabel;
    	let t96;
    	let div18;
    	let linkedchart8;
    	let t97;
    	let div19;
    	let linkedchart9;
    	let t98;
    	let div26;
    	let div22;
    	let t99;
    	let code13;
    	let t101;
    	let br26;
    	let t102;
    	let code14;
    	let t103;
    	let br27;
    	let t104;
    	let br28;
    	let t105;
    	let br29;
    	let t106;
    	let br30;
    	let t107;
    	let br31;
    	let t108;
    	let t109;
    	let br32;
    	let t110;
    	let t111;
    	let div25;
    	let div23;
    	let linkedchart10;
    	let t112;
    	let div24;
    	let linkedchart11;
    	let t113;
    	let div31;
    	let div27;
    	let t114;
    	let code15;
    	let t116;
    	let br33;
    	let t117;
    	let code16;
    	let t118;
    	let br34;
    	let t119;
    	let br35;
    	let t120;
    	let br36;
    	let t121;
    	let t122;
    	let br37;
    	let t123;
    	let t124;
    	let div30;
    	let div28;
    	let linkedchart12;
    	let t125;
    	let br38;
    	let t126;
    	let div29;
    	let linkedchart13;
    	let t127;
    	let div34;
    	let t128;
    	let code17;
    	let t129;
    	let br39;
    	let t130;
    	let br40;
    	let t131;
    	let br41;
    	let t132;
    	let br42;
    	let br43;
    	let t133;
    	let div32;
    	let linkedchart14;
    	let t134;
    	let strong0;
    	let linkedvalue0;
    	let t135;
    	let div33;
    	let linkedchart15;
    	let t136;
    	let strong1;
    	let linkedvalue1;
    	let t137;
    	let h23;
    	let t139;
    	let div36;
    	let div35;
    	let t140;
    	let code18;
    	let t142;
    	let linkedchart16;
    	let t143;
    	let div41;
    	let div37;
    	let t144;
    	let code19;
    	let t145;
    	let br44;
    	let t146;
    	let t147;
    	let div40;
    	let div38;
    	let linkedchart17;
    	let t148;
    	let div39;
    	let linkedchart18;
    	let t149;
    	let div46;
    	let div42;
    	let t150;
    	let code20;
    	let t151;
    	let br45;
    	let t152;
    	let br46;
    	let t153;
    	let br47;
    	let t154;
    	let t155;
    	let div45;
    	let div43;
    	let linkedchart19;
    	let t156;
    	let div44;
    	let linkedchart20;
    	let t157;
    	let div51;
    	let div47;
    	let t158;
    	let code21;
    	let t159;
    	let br48;
    	let t160;
    	let br49;
    	let t161;
    	let br50;
    	let t162;
    	let t163;
    	let code22;
    	let t164;
    	let br51;
    	let t165;
    	let br52;
    	let t166;
    	let br53;
    	let t167;
    	let t168;
    	let br54;
    	let t169;
    	let code23;
    	let t170;
    	let br55;
    	let t171;
    	let br56;
    	let t172;
    	let br57;
    	let t173;
    	let t174;
    	let div50;
    	let div48;
    	let linkedchart21;
    	let t175;
    	let div49;
    	let linkedchart22;
    	let t176;
    	let div56;
    	let div52;
    	let t177;
    	let code24;
    	let t178;
    	let br58;
    	let t179;
    	let t180;
    	let div55;
    	let div53;
    	let linkedchart23;
    	let t181;
    	let div54;
    	let linkedchart24;
    	let t182;
    	let div61;
    	let div57;
    	let t183;
    	let code25;
    	let t185;
    	let div60;
    	let div58;
    	let linkedchart25;
    	let t186;
    	let div59;
    	let linkedchart26;
    	let t187;
    	let div72;
    	let div62;
    	let t188;
    	let code26;
    	let t189;
    	let br59;
    	let t190;
    	let br60;
    	let t191;
    	let t192;
    	let div71;
    	let div63;
    	let linkedchart27;
    	let t193;
    	let div64;
    	let linkedchart28;
    	let t194;
    	let div65;
    	let linkedchart29;
    	let t195;
    	let div66;
    	let linkedchart30;
    	let t196;
    	let div67;
    	let linkedchart31;
    	let t197;
    	let div68;
    	let linkedchart32;
    	let t198;
    	let div69;
    	let linkedchart33;
    	let t199;
    	let div70;
    	let linkedchart34;
    	let t200;
    	let div74;
    	let div73;
    	let t201;
    	let code27;
    	let t203;
    	let linkedchart35;
    	let t204;
    	let div76;
    	let div75;
    	let t205;
    	let code28;
    	let t207;
    	let linkedchart36;
    	let t208;
    	let div78;
    	let div77;
    	let t209;
    	let br61;
    	let t210;
    	let code29;
    	let t212;
    	let linkedchart37;
    	let t213;
    	let div101;
    	let p6;
    	let t215;
    	let div100;
    	let strong2;
    	let t217;
    	let strong3;
    	let t219;
    	let strong4;
    	let t221;
    	let code30;
    	let t223;
    	let code31;
    	let t225;
    	let div79;
    	let t227;
    	let code32;
    	let t229;
    	let code33;
    	let t231;
    	let div80;
    	let t233;
    	let code34;
    	let t235;
    	let code35;
    	let t237;
    	let div81;
    	let t239;
    	let code36;
    	let t241;
    	let code37;
    	let t242;
    	let div82;
    	let t244;
    	let code38;
    	let t246;
    	let code39;
    	let t247;
    	let div83;
    	let t249;
    	let code40;
    	let t251;
    	let code41;
    	let t253;
    	let div84;
    	let t255;
    	let code42;
    	let t257;
    	let code43;
    	let t259;
    	let div85;
    	let t261;
    	let code44;
    	let t263;
    	let code45;
    	let t265;
    	let div86;
    	let t267;
    	let code46;
    	let t269;
    	let code47;
    	let t271;
    	let div87;
    	let t273;
    	let code48;
    	let t275;
    	let code49;
    	let t277;
    	let div88;
    	let t279;
    	let code50;
    	let t281;
    	let code51;
    	let t283;
    	let div89;
    	let t285;
    	let code52;
    	let t287;
    	let code53;
    	let t289;
    	let div90;
    	let t291;
    	let code54;
    	let t293;
    	let code55;
    	let t295;
    	let div91;
    	let t297;
    	let code56;
    	let t299;
    	let code57;
    	let t301;
    	let div92;
    	let t303;
    	let code58;
    	let t305;
    	let code59;
    	let t307;
    	let div93;
    	let t309;
    	let code60;
    	let t311;
    	let code61;
    	let t313;
    	let div94;
    	let t315;
    	let code62;
    	let t317;
    	let code63;
    	let t319;
    	let div95;
    	let t321;
    	let code64;
    	let t323;
    	let code65;
    	let t324;
    	let div96;
    	let t326;
    	let code66;
    	let t328;
    	let code67;
    	let t329;
    	let div97;
    	let t331;
    	let code68;
    	let t333;
    	let code69;
    	let t335;
    	let div98;
    	let t337;
    	let code70;
    	let t339;
    	let code71;
    	let t341;
    	let div99;
    	let t343;
    	let div105;
    	let p7;
    	let t345;
    	let div104;
    	let strong5;
    	let t347;
    	let strong6;
    	let t349;
    	let strong7;
    	let t351;
    	let code72;
    	let t353;
    	let code73;
    	let t354;
    	let div102;
    	let t356;
    	let code74;
    	let t358;
    	let code75;
    	let t360;
    	let div103;
    	let t362;
    	let div109;
    	let p8;
    	let t364;
    	let div108;
    	let strong8;
    	let t366;
    	let strong9;
    	let t368;
    	let strong10;
    	let t370;
    	let code76;
    	let t372;
    	let code77;
    	let t373;
    	let div106;
    	let t375;
    	let code78;
    	let t377;
    	let code79;
    	let t379;
    	let div107;
    	let t381;
    	let div110;
    	let t382;
    	let a1;
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

    	linkedchart6 = new LinkedChart({
    			props: {
    				data: fakeData(30),
    				linked: "link-8",
    				scaleMax: "100"
    			},
    			$$inline: true
    		});

    	linkedchart7 = new LinkedChart({
    			props: {
    				data: fakeData(30, 30, 10),
    				linked: "link-8",
    				scaleMax: "100"
    			},
    			$$inline: true
    		});

    	linkedlabel = new LinkedLabel({
    			props: {
    				linked: "link-2",
    				empty: "Start hovering"
    			},
    			$$inline: true
    		});

    	linkedchart8 = new LinkedChart({
    			props: { data: fakeData(30), linked: "link-2" },
    			$$inline: true
    		});

    	linkedchart9 = new LinkedChart({
    			props: { data: fakeData(30), linked: "link-2" },
    			$$inline: true
    		});

    	linkedchart10 = new LinkedChart({
    			props: {
    				data: fakeData(30),
    				linked: "link-5",
    				showValue: true
    			},
    			$$inline: true
    		});

    	linkedchart11 = new LinkedChart({
    			props: {
    				data: fakeData(30),
    				linked: "link-5",
    				showValue: true,
    				valueDefault: "Empty label",
    				valuePrepend: "Thing:",
    				valueAppend: "views"
    			},
    			$$inline: true
    		});

    	linkedchart12 = new LinkedChart({
    			props: {
    				data: fakeData(30),
    				linked: "link-7",
    				showValue: true,
    				valuePosition: "floating"
    			},
    			$$inline: true
    		});

    	linkedchart13 = new LinkedChart({
    			props: {
    				data: fakeData(30),
    				linked: "link-7",
    				showValue: true,
    				valuePosition: "floating"
    			},
    			$$inline: true
    		});

    	linkedchart14 = new LinkedChart({
    			props: {
    				data: fakeData(30),
    				linked: "link-6",
    				uid: "test"
    			},
    			$$inline: true
    		});

    	linkedvalue0 = new LinkedValue({
    			props: { empty: "Separate value", uid: "test" },
    			$$inline: true
    		});

    	linkedchart15 = new LinkedChart({
    			props: {
    				data: fakeData(30),
    				linked: "link-6",
    				uid: "test-2"
    			},
    			$$inline: true
    		});

    	linkedvalue1 = new LinkedValue({
    			props: { empty: "Separate value", uid: "test-2" },
    			$$inline: true
    		});

    	linkedchart16 = new LinkedChart({
    			props: { data: fakeData(5), grow: true },
    			$$inline: true
    		});

    	linkedchart17 = new LinkedChart({
    			props: { data: fakeData(50), barMinWidth: "2" },
    			$$inline: true
    		});

    	linkedchart18 = new LinkedChart({
    			props: { data: fakeData(10), barMinWidth: "14" },
    			$$inline: true
    		});

    	linkedchart19 = new LinkedChart({
    			props: {
    				data: fakeData(75),
    				grow: true,
    				barMinWidth: "0"
    			},
    			$$inline: true
    		});

    	linkedchart20 = new LinkedChart({
    			props: {
    				data: fakeData(7),
    				grow: true,
    				barMinWidth: "0"
    			},
    			$$inline: true
    		});

    	linkedchart21 = new LinkedChart({
    			props: {
    				data: fakeData(50),
    				height: "100",
    				width: "250",
    				linked: "linked-3"
    			},
    			$$inline: true
    		});

    	linkedchart22 = new LinkedChart({
    			props: {
    				data: fakeData(50),
    				height: "10",
    				width: "250",
    				linked: "linked-3"
    			},
    			$$inline: true
    		});

    	linkedchart23 = new LinkedChart({
    			props: { data: fakeData(11), gap: "10" },
    			$$inline: true
    		});

    	linkedchart24 = new LinkedChart({
    			props: { data: fakeData(36), gap: "0" },
    			$$inline: true
    		});

    	linkedchart25 = new LinkedChart({
    			props: { data: fakeData(20) },
    			$$inline: true
    		});

    	linkedchart26 = new LinkedChart({
    			props: { data: fakeData(20), align: "left" },
    			$$inline: true
    		});

    	linkedchart27 = new LinkedChart({
    			props: {
    				data: fakeData(30),
    				fill: "#e6261f",
    				linked: "link-4"
    			},
    			$$inline: true
    		});

    	linkedchart28 = new LinkedChart({
    			props: {
    				data: fakeData(30),
    				fill: "#eb7532",
    				linked: "link-4"
    			},
    			$$inline: true
    		});

    	linkedchart29 = new LinkedChart({
    			props: {
    				data: fakeData(30),
    				fill: "#f7d038",
    				linked: "link-4"
    			},
    			$$inline: true
    		});

    	linkedchart30 = new LinkedChart({
    			props: {
    				data: fakeData(30),
    				fill: "#a3e048",
    				linked: "link-4"
    			},
    			$$inline: true
    		});

    	linkedchart31 = new LinkedChart({
    			props: {
    				data: fakeData(30),
    				fill: "#49da9a",
    				linked: "link-4"
    			},
    			$$inline: true
    		});

    	linkedchart32 = new LinkedChart({
    			props: {
    				data: fakeData(30),
    				fill: "#34bbe6",
    				linked: "link-4"
    			},
    			$$inline: true
    		});

    	linkedchart33 = new LinkedChart({
    			props: {
    				data: fakeData(30),
    				fill: "#4355db",
    				linked: "link-4"
    			},
    			$$inline: true
    		});

    	linkedchart34 = new LinkedChart({
    			props: {
    				data: fakeData(30),
    				fill: "hsla(290, 55%, 50%, 1)",
    				linked: "link-4"
    			},
    			$$inline: true
    		});

    	linkedchart35 = new LinkedChart({
    			props: { data: fakeData(30), fadeOpacity: "0.15" },
    			$$inline: true
    		});

    	linkedchart36 = new LinkedChart({
    			props: { data: fakeData(30), hover: false },
    			$$inline: true
    		});

    	linkedchart37 = new LinkedChart({
    			props: {
    				data: /*transitioningData*/ ctx[0],
    				fill: "hsl(" + /*transitionColor*/ ctx[1] + ", 60%, 50%)",
    				transition: "500"
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div111 = element("div");
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
    			p1 = element("p");
    			a0 = element("a");
    			a0.textContent = "GitHub";
    			t7 = space();
    			h20 = element("h2");
    			h20.textContent = "Installation";
    			t9 = space();
    			p2 = element("p");
    			p2.textContent = "Install using Yarn or NPM.";
    			t11 = space();
    			code0 = element("code");
    			t12 = text("yarn add ");
    			mark1 = element("mark");
    			mark1.textContent = "svelte-tiny-linked-charts";
    			t14 = space();
    			code1 = element("code");
    			t15 = text("npm install --save ");
    			mark2 = element("mark");
    			mark2.textContent = "svelte-tiny-linked-charts";
    			t17 = space();
    			p3 = element("p");
    			p3.textContent = "Include the chart in your app.";
    			t19 = space();
    			code2 = element("code");
    			t20 = text("<");
    			mark3 = element("mark");
    			mark3.textContent = "LinkedChart";
    			t22 = text(" { data } />");
    			t23 = space();
    			code3 = element("code");
    			t24 = text("import { ");
    			mark4 = element("mark");
    			mark4.textContent = "LinkedChart";
    			t26 = text(", ");
    			mark5 = element("mark");
    			mark5.textContent = "LinkedLabel";
    			t28 = text(" } from \"");
    			mark6 = element("mark");
    			mark6.textContent = "svelte-tiny-linked-charts";
    			t30 = text("\"");
    			t31 = space();
    			div2 = element("div");
    			p4 = element("p");
    			p4.textContent = "Supply your data in a simple key:value object:";
    			t33 = space();
    			code4 = element("code");
    			t34 = text("let data = { ");
    			br0 = element("br");
    			t35 = text("\r\n\t\t\t  \"2005-01-01\": 25, ");
    			br1 = element("br");
    			t36 = text("\r\n\t\t\t  \"2005-01-02\": 20, ");
    			br2 = element("br");
    			t37 = text("\r\n\t\t\t  \"2005-01-03\": 18, ");
    			br3 = element("br");
    			t38 = text("\r\n\t\t\t  \"2005-01-04\": 17, ");
    			br4 = element("br");
    			t39 = text("\r\n\t\t\t  \"2005-01-05\": 21 ");
    			br5 = element("br");
    			t40 = text("\r\n\t\t\t}");
    			t41 = space();
    			code5 = element("code");
    			code5.textContent = "<LinkedChart { data } />";
    			t43 = space();
    			p5 = element("p");
    			p5.textContent = "Or if you prefer supply the labels and values separately:";
    			t45 = space();
    			code6 = element("code");
    			t46 = text("let labels = [ ");
    			br6 = element("br");
    			t47 = text("\r\n\t\t\t  \"2005-01-01\", ");
    			br7 = element("br");
    			t48 = text("\r\n\t\t\t  \"2005-01-02\", ");
    			br8 = element("br");
    			t49 = text("\r\n\t\t\t  \"2005-01-03\", ");
    			br9 = element("br");
    			t50 = text("\r\n\t\t\t  \"2005-01-04\", ");
    			br10 = element("br");
    			t51 = text("\r\n\t\t\t  \"2005-01-05\" ");
    			br11 = element("br");
    			t52 = text("\r\n\t\t\t]");
    			t53 = space();
    			code7 = element("code");
    			t54 = text("let values = [ ");
    			br12 = element("br");
    			t55 = text("\r\n\t\t\t  25, ");
    			br13 = element("br");
    			t56 = text("\r\n\t\t\t  20, ");
    			br14 = element("br");
    			t57 = text("\r\n\t\t\t  18, ");
    			br15 = element("br");
    			t58 = text("\r\n\t\t\t  17, ");
    			br16 = element("br");
    			t59 = text("\r\n\t\t\t  21 ");
    			br17 = element("br");
    			t60 = text("\r\n\t\t\t]");
    			t61 = space();
    			code8 = element("code");
    			code8.textContent = "<LinkedChart { labels } { values } />";
    			t63 = space();
    			h21 = element("h2");
    			h21.textContent = "Usage";
    			t65 = space();
    			div4 = element("div");
    			div3 = element("div");
    			t66 = text("The chart in it's most basic form.\r\n\r\n\t\t\t");
    			code9 = element("code");
    			code9.textContent = "<LinkedChart { data } />";
    			t68 = space();
    			create_component(linkedchart1.$$.fragment);
    			t69 = space();
    			div11 = element("div");
    			div5 = element("div");
    			t70 = text("You can link multiple charts together, hovering one will also highlight others.\r\n\r\n\t\t\t");
    			code10 = element("code");
    			t71 = text("<LinkedChart { data } linked=\"link-1\" /> ");
    			br18 = element("br");
    			t72 = text("\r\n\t\t\t\t<LinkedChart { data } linked=\"link-1\" /> ");
    			br19 = element("br");
    			t73 = text("\r\n\t\t\t\t<LinkedChart { data } linked=\"link-1\" /> ");
    			br20 = element("br");
    			t74 = text("\r\n\t\t\t\t<LinkedChart { data } linked=\"link-1\" />");
    			t75 = space();
    			div10 = element("div");
    			div6 = element("div");
    			create_component(linkedchart2.$$.fragment);
    			t76 = space();
    			div7 = element("div");
    			create_component(linkedchart3.$$.fragment);
    			t77 = space();
    			div8 = element("div");
    			create_component(linkedchart4.$$.fragment);
    			t78 = space();
    			div9 = element("div");
    			create_component(linkedchart5.$$.fragment);
    			t79 = space();
    			div16 = element("div");
    			div12 = element("div");
    			t80 = text("The highest value in the chart is automatically determined by the highest value in your data. To overwrite this use \"scaleMax\".\r\n\r\n\t\t\t");
    			code11 = element("code");
    			t81 = text("<LinkedChart { data } scaleMax=\"100\" /> ");
    			br21 = element("br");
    			t82 = text("\r\n\t\t\t\t<LinkedChart { data } scaleMax=\"100\" />");
    			t83 = space();
    			div15 = element("div");
    			div13 = element("div");
    			create_component(linkedchart6.$$.fragment);
    			t84 = space();
    			div14 = element("div");
    			create_component(linkedchart7.$$.fragment);
    			t85 = space();
    			h22 = element("h2");
    			h22.textContent = "Label";
    			t87 = space();
    			div21 = element("div");
    			div17 = element("div");
    			t88 = text("You can optionally display a label, which will display the label of what you're currently hovering.\r\n\r\n\t\t\t");
    			code12 = element("code");
    			t89 = text("<LinkedLabel linked=\"link-2\" /> ");
    			br22 = element("br");
    			t90 = space();
    			br23 = element("br");
    			t91 = text("\r\n\t\t\t\t<LinkedChart { data } linked=\"link-2\" /> ");
    			br24 = element("br");
    			t92 = text("\r\n\t\t\t\t<LinkedChart { data } linked=\"link-2\" />");
    			t93 = space();
    			br25 = element("br");
    			t94 = text("\r\n\t\t\tThe label has no styling by default.");
    			t95 = space();
    			div20 = element("div");
    			create_component(linkedlabel.$$.fragment);
    			t96 = space();
    			div18 = element("div");
    			create_component(linkedchart8.$$.fragment);
    			t97 = space();
    			div19 = element("div");
    			create_component(linkedchart9.$$.fragment);
    			t98 = space();
    			div26 = element("div");
    			div22 = element("div");
    			t99 = text("You can enable a the value you're hovering using \"showLabel\".\r\n\r\n\t\t\t");
    			code13 = element("code");
    			code13.textContent = "<LinkedChart { data } showLabel={ true } />";
    			t101 = space();
    			br26 = element("br");
    			t102 = text("\r\n\t\t\tThis can be further enhanced with \"valueDefault\", \"valuePrepend\", and \"valueAppend\".\r\n\r\n\t\t\t");
    			code14 = element("code");
    			t103 = text("<LinkedChart { ");
    			br27 = element("br");
    			t104 = text("\r\n\t\t\t\t  data }  ");
    			br28 = element("br");
    			t105 = text("\r\n\t\t\t\t  showValue={ true } ");
    			br29 = element("br");
    			t106 = text("\r\n\t\t\t\t  valueDefault=\"Empty label\" ");
    			br30 = element("br");
    			t107 = text("\r\n\t\t\t\t  valuePrepend=\"Thing:\" ");
    			br31 = element("br");
    			t108 = text("\r\n\t\t\t\t  valueAppend=\"views\" />");
    			t109 = space();
    			br32 = element("br");
    			t110 = text("\r\n\t\t\tThis value has no styling by default.");
    			t111 = space();
    			div25 = element("div");
    			div23 = element("div");
    			create_component(linkedchart10.$$.fragment);
    			t112 = space();
    			div24 = element("div");
    			create_component(linkedchart11.$$.fragment);
    			t113 = space();
    			div31 = element("div");
    			div27 = element("div");
    			t114 = text("The value can be position at the location of the hover using \"valuePosition\".\r\n\r\n\t\t\t");
    			code15 = element("code");
    			code15.textContent = "<LinkedChart { data } showLabel={ true } />";
    			t116 = space();
    			br33 = element("br");
    			t117 = text("\r\n\t\t\tThis can be further enhanced with \"labelDefault\", \"labelPrepend\", and \"labelAppend\".\r\n\r\n\t\t\t");
    			code16 = element("code");
    			t118 = text("<LinkedChart { ");
    			br34 = element("br");
    			t119 = text("\r\n\t\t\t\t  data }  ");
    			br35 = element("br");
    			t120 = text("\r\n\t\t\t\t  showValue={ true } ");
    			br36 = element("br");
    			t121 = text("\r\n\t\t\t\t  valuePosition=\"Floating\" />");
    			t122 = space();
    			br37 = element("br");
    			t123 = text("\r\n\t\t\tYou're expected to style this value further yourself.");
    			t124 = space();
    			div30 = element("div");
    			div28 = element("div");
    			create_component(linkedchart12.$$.fragment);
    			t125 = space();
    			br38 = element("br");
    			t126 = space();
    			div29 = element("div");
    			create_component(linkedchart13.$$.fragment);
    			t127 = space();
    			div34 = element("div");
    			t128 = text("Alternatively you can show the value as a separate element wherever you like using the \"LinkedValue\" component. Use \"uid\" to link the chart and value together.\r\n\r\n\t\t");
    			code17 = element("code");
    			t129 = text("<LinkedChart { data } uid=\"some-id\" />\r\n\t\t\t");
    			br39 = element("br");
    			t130 = text("\r\n\t\t\t<LinkedValue uid=\"some-id\" /> ");
    			br40 = element("br");
    			t131 = space();
    			br41 = element("br");
    			t132 = text("\r\n\t\tThis value has no styling by default.\r\n\r\n\t\t");
    			br42 = element("br");
    			br43 = element("br");
    			t133 = space();
    			div32 = element("div");
    			create_component(linkedchart14.$$.fragment);
    			t134 = space();
    			strong0 = element("strong");
    			create_component(linkedvalue0.$$.fragment);
    			t135 = space();
    			div33 = element("div");
    			create_component(linkedchart15.$$.fragment);
    			t136 = space();
    			strong1 = element("strong");
    			create_component(linkedvalue1.$$.fragment);
    			t137 = space();
    			h23 = element("h2");
    			h23.textContent = "Styling";
    			t139 = space();
    			div36 = element("div");
    			div35 = element("div");
    			t140 = text("The width of the bars is fixed by default, but can be set to grow to fill the chart.\r\n\r\n\t\t\t");
    			code18 = element("code");
    			code18.textContent = "<LinkedChart data={ ... } grow={ true } />";
    			t142 = space();
    			create_component(linkedchart16.$$.fragment);
    			t143 = space();
    			div41 = element("div");
    			div37 = element("div");
    			t144 = text("To change the size of the bars set the \"barMinWidth\" property.\r\n\r\n\t\t\t");
    			code19 = element("code");
    			t145 = text("<LinkedChart data={ ... } barMinWidth=\"2\" /> ");
    			br44 = element("br");
    			t146 = text("\r\n\t\t\t\t<LinkedChart data={ ... } barMinWidth=\"14\" />");
    			t147 = space();
    			div40 = element("div");
    			div38 = element("div");
    			create_component(linkedchart17.$$.fragment);
    			t148 = space();
    			div39 = element("div");
    			create_component(linkedchart18.$$.fragment);
    			t149 = space();
    			div46 = element("div");
    			div42 = element("div");
    			t150 = text("To always fill out the content, giving the bars a dynamic width, you can set both the \"grow\" and \"barMinWidth\" properties.\r\n\r\n\t\t\t");
    			code20 = element("code");
    			t151 = text("<LinkedChart");
    			br45 = element("br");
    			t152 = text("\r\n\t\t\t\t  data={ ... } ");
    			br46 = element("br");
    			t153 = text("\r\n\t\t\t\t  grow={ true } ");
    			br47 = element("br");
    			t154 = text("\r\n\t\t\t\t  barMinWidth=\"0\" />");
    			t155 = space();
    			div45 = element("div");
    			div43 = element("div");
    			create_component(linkedchart19.$$.fragment);
    			t156 = space();
    			div44 = element("div");
    			create_component(linkedchart20.$$.fragment);
    			t157 = space();
    			div51 = element("div");
    			div47 = element("div");
    			t158 = text("The charts can be resized to any size you like. It renders as an SVG, so they can easily be made responsive with some CSS.\r\n\r\n\t\t\t");
    			code21 = element("code");
    			t159 = text("<LinkedChart");
    			br48 = element("br");
    			t160 = text("\r\n\t\t\t\t  data={ ... } ");
    			br49 = element("br");
    			t161 = text("\r\n\t\t\t\t  width=\"250\" ");
    			br50 = element("br");
    			t162 = text("\r\n\t\t\t\t  height=\"100\" />");
    			t163 = space();
    			code22 = element("code");
    			t164 = text("svg { ");
    			br51 = element("br");
    			t165 = text("\r\n\t\t\t\t  width: 100%; ");
    			br52 = element("br");
    			t166 = text("\r\n\t\t\t\t  height: auto; ");
    			br53 = element("br");
    			t167 = text("\r\n\t\t\t\t}");
    			t168 = space();
    			br54 = element("br");
    			t169 = text("\r\n\t\t\tor for a fixed height;\r\n\r\n\t\t\t");
    			code23 = element("code");
    			t170 = text("svg { ");
    			br55 = element("br");
    			t171 = text("\r\n\t\t\t\t  width: 100%; ");
    			br56 = element("br");
    			t172 = text("\r\n\t\t\t\t  height: 50px; ");
    			br57 = element("br");
    			t173 = text("\r\n\t\t\t\t}");
    			t174 = space();
    			div50 = element("div");
    			div48 = element("div");
    			create_component(linkedchart21.$$.fragment);
    			t175 = space();
    			div49 = element("div");
    			create_component(linkedchart22.$$.fragment);
    			t176 = space();
    			div56 = element("div");
    			div52 = element("div");
    			t177 = text("The gap in between bars can also be adjusted.\r\n\r\n\t\t\t");
    			code24 = element("code");
    			t178 = text("<LinkedChart { data } gap=\"10\" /> ");
    			br58 = element("br");
    			t179 = text("\r\n\t\t\t\t<LinkedChart { data } gap=\"0\" />");
    			t180 = space();
    			div55 = element("div");
    			div53 = element("div");
    			create_component(linkedchart23.$$.fragment);
    			t181 = space();
    			div54 = element("div");
    			create_component(linkedchart24.$$.fragment);
    			t182 = space();
    			div61 = element("div");
    			div57 = element("div");
    			t183 = text("When the bars do not fill the width of the graph they are aligned to the right by default. This can be set to be left aligned instead.\r\n\r\n\t\t\t");
    			code25 = element("code");
    			code25.textContent = "<LinkedChart { data } align=\"left\" />";
    			t185 = space();
    			div60 = element("div");
    			div58 = element("div");
    			create_component(linkedchart25.$$.fragment);
    			t186 = space();
    			div59 = element("div");
    			create_component(linkedchart26.$$.fragment);
    			t187 = space();
    			div72 = element("div");
    			div62 = element("div");
    			t188 = text("The bars can be colored any way you wish.\r\n\r\n\t\t\t");
    			code26 = element("code");
    			t189 = text("<LinkedChart fill=\"#ff00ff\" /> ");
    			br59 = element("br");
    			t190 = text("\r\n\t\t\t\t<LinkedChart fill=\"rgb(255, 255, 0)\" /> ");
    			br60 = element("br");
    			t191 = text("\r\n\t\t\t\t<LinkedChart fill=\"hsla(290, 55%, 50%, 1)\" />");
    			t192 = space();
    			div71 = element("div");
    			div63 = element("div");
    			create_component(linkedchart27.$$.fragment);
    			t193 = space();
    			div64 = element("div");
    			create_component(linkedchart28.$$.fragment);
    			t194 = space();
    			div65 = element("div");
    			create_component(linkedchart29.$$.fragment);
    			t195 = space();
    			div66 = element("div");
    			create_component(linkedchart30.$$.fragment);
    			t196 = space();
    			div67 = element("div");
    			create_component(linkedchart31.$$.fragment);
    			t197 = space();
    			div68 = element("div");
    			create_component(linkedchart32.$$.fragment);
    			t198 = space();
    			div69 = element("div");
    			create_component(linkedchart33.$$.fragment);
    			t199 = space();
    			div70 = element("div");
    			create_component(linkedchart34.$$.fragment);
    			t200 = space();
    			div74 = element("div");
    			div73 = element("div");
    			t201 = text("The opacity of faded out bars can be adjusted using \"fadeOpacity\".\r\n\r\n\t\t\t");
    			code27 = element("code");
    			code27.textContent = "<LinkedChart { data } fadeOpacity=\"0.15\" />";
    			t203 = space();
    			create_component(linkedchart35.$$.fragment);
    			t204 = space();
    			div76 = element("div");
    			div75 = element("div");
    			t205 = text("The hover effect can be disabled altogether using \"hover\".\r\n\r\n\t\t\t");
    			code28 = element("code");
    			code28.textContent = "<LinkedChart { data } hover={ false } />";
    			t207 = space();
    			create_component(linkedchart36.$$.fragment);
    			t208 = space();
    			div78 = element("div");
    			div77 = element("div");
    			t209 = text("Bars can be set to transition between states. ");
    			br61 = element("br");
    			t210 = text("\r\n\t\t\tValue is speed in milliseconds.\r\n\r\n\t\t\t");
    			code29 = element("code");
    			code29.textContent = "<LinkedChart { data } transition=\"500\" />";
    			t212 = space();
    			create_component(linkedchart37.$$.fragment);
    			t213 = space();
    			div101 = element("div");
    			p6 = element("p");
    			p6.textContent = "This is a list of all configurable properties on the \"LinkedChart\" component.";
    			t215 = space();
    			div100 = element("div");
    			strong2 = element("strong");
    			strong2.textContent = "Property";
    			t217 = space();
    			strong3 = element("strong");
    			strong3.textContent = "Default";
    			t219 = space();
    			strong4 = element("strong");
    			strong4.textContent = "Description";
    			t221 = space();
    			code30 = element("code");
    			code30.textContent = "data";
    			t223 = space();
    			code31 = element("code");
    			code31.textContent = "{}";
    			t225 = space();
    			div79 = element("div");
    			div79.textContent = "Data that will be displayed in the chart supplied in key:value object.";
    			t227 = space();
    			code32 = element("code");
    			code32.textContent = "labels";
    			t229 = space();
    			code33 = element("code");
    			code33.textContent = "[]";
    			t231 = space();
    			div80 = element("div");
    			div80.textContent = "Labels supplied separately, to be used together with \"values\" property.";
    			t233 = space();
    			code34 = element("code");
    			code34.textContent = "values";
    			t235 = space();
    			code35 = element("code");
    			code35.textContent = "[]";
    			t237 = space();
    			div81 = element("div");
    			div81.textContent = "Values supplied separately, to be used together with \"labels\" property.";
    			t239 = space();
    			code36 = element("code");
    			code36.textContent = "linked";
    			t241 = space();
    			code37 = element("code");
    			t242 = space();
    			div82 = element("div");
    			div82.textContent = "Key to link this chart to other charts with the same key.";
    			t244 = space();
    			code38 = element("code");
    			code38.textContent = "uid";
    			t246 = space();
    			code39 = element("code");
    			t247 = space();
    			div83 = element("div");
    			div83.textContent = "Unique ID to link this chart to a LinkedValue component with the same uid.";
    			t249 = space();
    			code40 = element("code");
    			code40.textContent = "height";
    			t251 = space();
    			code41 = element("code");
    			code41.textContent = "40";
    			t253 = space();
    			div84 = element("div");
    			div84.textContent = "Height of the chart in pixels.";
    			t255 = space();
    			code42 = element("code");
    			code42.textContent = "width";
    			t257 = space();
    			code43 = element("code");
    			code43.textContent = "150";
    			t259 = space();
    			div85 = element("div");
    			div85.textContent = "Width of the chart in pixels.";
    			t261 = space();
    			code44 = element("code");
    			code44.textContent = "barMinWidth";
    			t263 = space();
    			code45 = element("code");
    			code45.textContent = "4";
    			t265 = space();
    			div86 = element("div");
    			div86.textContent = "Width of the bars in the chart in pixels.";
    			t267 = space();
    			code46 = element("code");
    			code46.textContent = "grow";
    			t269 = space();
    			code47 = element("code");
    			code47.textContent = "false";
    			t271 = space();
    			div87 = element("div");
    			div87.textContent = "Whether or not the bar should grow to fill out the full width of the chart.";
    			t273 = space();
    			code48 = element("code");
    			code48.textContent = "align";
    			t275 = space();
    			code49 = element("code");
    			code49.textContent = "right";
    			t277 = space();
    			div88 = element("div");
    			div88.textContent = "The side the bars should align to when they do not completely fill out the chart.";
    			t279 = space();
    			code50 = element("code");
    			code50.textContent = "gap";
    			t281 = space();
    			code51 = element("code");
    			code51.textContent = "1";
    			t283 = space();
    			div89 = element("div");
    			div89.textContent = "Gap between the bars in pixels.";
    			t285 = space();
    			code52 = element("code");
    			code52.textContent = "fill";
    			t287 = space();
    			code53 = element("code");
    			code53.textContent = "#ff3e00";
    			t289 = space();
    			div90 = element("div");
    			div90.textContent = "Color of the bars, can be any valid CSS color.";
    			t291 = space();
    			code54 = element("code");
    			code54.textContent = "fadeOpacity";
    			t293 = space();
    			code55 = element("code");
    			code55.textContent = "0.5";
    			t295 = space();
    			div91 = element("div");
    			div91.textContent = "The opacity the faded out bars should display in.";
    			t297 = space();
    			code56 = element("code");
    			code56.textContent = "hover";
    			t299 = space();
    			code57 = element("code");
    			code57.textContent = "true";
    			t301 = space();
    			div92 = element("div");
    			div92.textContent = "Boolean whether or not this chart can be hovered at all.";
    			t303 = space();
    			code58 = element("code");
    			code58.textContent = "transition";
    			t305 = space();
    			code59 = element("code");
    			code59.textContent = "0";
    			t307 = space();
    			div93 = element("div");
    			div93.textContent = "Transition the chart between different stats. Value is time in milliseconds.";
    			t309 = space();
    			code60 = element("code");
    			code60.textContent = "showValue";
    			t311 = space();
    			code61 = element("code");
    			code61.textContent = "false";
    			t313 = space();
    			div94 = element("div");
    			div94.textContent = "Boolean whether or not a value will be shown.";
    			t315 = space();
    			code62 = element("code");
    			code62.textContent = "valueDefault";
    			t317 = space();
    			code63 = element("code");
    			code63.textContent = "\" \"";
    			t319 = space();
    			div95 = element("div");
    			div95.textContent = "Default value when not hovering.";
    			t321 = space();
    			code64 = element("code");
    			code64.textContent = "valuePrepend";
    			t323 = space();
    			code65 = element("code");
    			t324 = space();
    			div96 = element("div");
    			div96.textContent = "String to prepend the value.";
    			t326 = space();
    			code66 = element("code");
    			code66.textContent = "valueAppend";
    			t328 = space();
    			code67 = element("code");
    			t329 = space();
    			div97 = element("div");
    			div97.textContent = "String to append to the value.";
    			t331 = space();
    			code68 = element("code");
    			code68.textContent = "valuePosition";
    			t333 = space();
    			code69 = element("code");
    			code69.textContent = "static";
    			t335 = space();
    			div98 = element("div");
    			div98.textContent = "Can be set to \"floating\" to follow the position of the hover.";
    			t337 = space();
    			code70 = element("code");
    			code70.textContent = "scaleMax";
    			t339 = space();
    			code71 = element("code");
    			code71.textContent = "0";
    			t341 = space();
    			div99 = element("div");
    			div99.textContent = "Use this to overwrite the automatic scale set to the highest value in your array.";
    			t343 = space();
    			div105 = element("div");
    			p7 = element("p");
    			p7.textContent = "This is a list of all configurable properties on the \"LinkedLabel\" component.";
    			t345 = space();
    			div104 = element("div");
    			strong5 = element("strong");
    			strong5.textContent = "Property";
    			t347 = space();
    			strong6 = element("strong");
    			strong6.textContent = "Default";
    			t349 = space();
    			strong7 = element("strong");
    			strong7.textContent = "Description";
    			t351 = space();
    			code72 = element("code");
    			code72.textContent = "linked";
    			t353 = space();
    			code73 = element("code");
    			t354 = space();
    			div102 = element("div");
    			div102.textContent = "Key to link this label to charts with the same key.";
    			t356 = space();
    			code74 = element("code");
    			code74.textContent = "empty";
    			t358 = space();
    			code75 = element("code");
    			code75.textContent = "&nbsp;";
    			t360 = space();
    			div103 = element("div");
    			div103.textContent = "String that will be displayed when no bar is being hovered.";
    			t362 = space();
    			div109 = element("div");
    			p8 = element("p");
    			p8.textContent = "This is a list of all configurable properties on the \"LinkedValue\" component.";
    			t364 = space();
    			div108 = element("div");
    			strong8 = element("strong");
    			strong8.textContent = "Property";
    			t366 = space();
    			strong9 = element("strong");
    			strong9.textContent = "Default";
    			t368 = space();
    			strong10 = element("strong");
    			strong10.textContent = "Description";
    			t370 = space();
    			code76 = element("code");
    			code76.textContent = "uid";
    			t372 = space();
    			code77 = element("code");
    			t373 = space();
    			div106 = element("div");
    			div106.textContent = "Unique ID to link this value to a chart with the same uid.";
    			t375 = space();
    			code78 = element("code");
    			code78.textContent = "empty";
    			t377 = space();
    			code79 = element("code");
    			code79.textContent = "&nbsp;";
    			t379 = space();
    			div107 = element("div");
    			div107.textContent = "String that will be displayed when no bar is being hovered.";
    			t381 = space();
    			div110 = element("div");
    			t382 = text("Made by ");
    			a1 = element("a");
    			a1.textContent = "Mitchel Jager";
    			attr_dev(mark0, "class", "svelte-194erzg");
    			add_location(mark0, file, 39, 29, 1027);
    			attr_dev(h1, "class", "svelte-194erzg");
    			add_location(h1, file, 39, 2, 1000);
    			attr_dev(div0, "class", "header svelte-194erzg");
    			add_location(div0, file, 38, 1, 976);
    			attr_dev(p0, "class", "svelte-194erzg");
    			add_location(p0, file, 44, 2, 1183);
    			attr_dev(a0, "href", "https://github.com/Mitcheljager/svelte-tiny-linked-charts");
    			attr_dev(a0, "class", "svelte-194erzg");
    			add_location(a0, file, 46, 5, 1403);
    			attr_dev(p1, "class", "svelte-194erzg");
    			add_location(p1, file, 46, 2, 1400);
    			attr_dev(h20, "class", "svelte-194erzg");
    			add_location(h20, file, 48, 2, 1491);
    			attr_dev(p2, "class", "svelte-194erzg");
    			add_location(p2, file, 50, 2, 1518);
    			attr_dev(mark1, "class", "svelte-194erzg");
    			add_location(mark1, file, 53, 12, 1590);
    			attr_dev(code0, "class", "well svelte-194erzg");
    			add_location(code0, file, 52, 2, 1557);
    			attr_dev(mark2, "class", "svelte-194erzg");
    			add_location(mark2, file, 57, 22, 1688);
    			attr_dev(code1, "class", "well svelte-194erzg");
    			add_location(code1, file, 56, 2, 1645);
    			attr_dev(p3, "class", "svelte-194erzg");
    			add_location(p3, file, 60, 2, 1743);
    			attr_dev(mark3, "class", "svelte-194erzg");
    			add_location(mark3, file, 63, 7, 1814);
    			attr_dev(code2, "class", "well svelte-194erzg");
    			add_location(code2, file, 62, 2, 1786);
    			attr_dev(mark4, "class", "svelte-194erzg");
    			add_location(mark4, file, 67, 17, 1918);
    			attr_dev(mark5, "class", "svelte-194erzg");
    			add_location(mark5, file, 67, 43, 1944);
    			attr_dev(mark6, "class", "svelte-194erzg");
    			add_location(mark6, file, 67, 81, 1982);
    			attr_dev(code3, "class", "well svelte-194erzg");
    			add_location(code3, file, 66, 2, 1880);
    			attr_dev(div1, "class", "block block--single svelte-194erzg");
    			add_location(div1, file, 43, 1, 1146);
    			attr_dev(p4, "class", "svelte-194erzg");
    			add_location(p4, file, 72, 2, 2083);
    			add_location(br0, file, 77, 21, 2193);
    			add_location(br1, file, 78, 28, 2227);
    			add_location(br2, file, 79, 28, 2261);
    			add_location(br3, file, 80, 28, 2295);
    			add_location(br4, file, 81, 28, 2329);
    			add_location(br5, file, 82, 27, 2362);
    			attr_dev(code4, "class", "well svelte-194erzg");
    			add_location(code4, file, 76, 2, 2151);
    			attr_dev(code5, "class", "well svelte-194erzg");
    			add_location(code5, file, 86, 2, 2394);
    			attr_dev(p5, "class", "svelte-194erzg");
    			add_location(p5, file, 90, 2, 2475);
    			add_location(br6, file, 93, 18, 2584);
    			add_location(br7, file, 94, 24, 2614);
    			add_location(br8, file, 95, 24, 2644);
    			add_location(br9, file, 96, 24, 2674);
    			add_location(br10, file, 97, 24, 2704);
    			add_location(br11, file, 98, 23, 2733);
    			attr_dev(code6, "class", "well svelte-194erzg");
    			add_location(code6, file, 92, 2, 2545);
    			add_location(br12, file, 103, 18, 2799);
    			add_location(br13, file, 104, 14, 2819);
    			add_location(br14, file, 105, 14, 2839);
    			add_location(br15, file, 106, 14, 2859);
    			add_location(br16, file, 107, 14, 2879);
    			add_location(br17, file, 108, 13, 2898);
    			attr_dev(code7, "class", "well svelte-194erzg");
    			add_location(code7, file, 102, 2, 2760);
    			attr_dev(code8, "class", "well svelte-194erzg");
    			add_location(code8, file, 112, 2, 2925);
    			attr_dev(div2, "class", "block block--single svelte-194erzg");
    			add_location(div2, file, 71, 1, 2046);
    			attr_dev(h21, "class", "svelte-194erzg");
    			add_location(h21, file, 117, 1, 3037);
    			attr_dev(code9, "class", "svelte-194erzg");
    			add_location(code9, file, 123, 3, 3150);
    			attr_dev(div3, "class", "description svelte-194erzg");
    			add_location(div3, file, 120, 2, 3079);
    			attr_dev(div4, "class", "block svelte-194erzg");
    			add_location(div4, file, 119, 1, 3056);
    			add_location(br18, file, 136, 61, 3489);
    			add_location(br19, file, 137, 61, 3556);
    			add_location(br20, file, 138, 61, 3623);
    			attr_dev(code10, "class", "svelte-194erzg");
    			add_location(code10, file, 135, 3, 3420);
    			attr_dev(div5, "class", "description svelte-194erzg");
    			add_location(div5, file, 132, 2, 3304);
    			attr_dev(div6, "class", "chart svelte-194erzg");
    			add_location(div6, file, 144, 3, 3727);
    			attr_dev(div7, "class", "chart svelte-194erzg");
    			add_location(div7, file, 145, 3, 3810);
    			attr_dev(div8, "class", "chart svelte-194erzg");
    			add_location(div8, file, 146, 3, 3893);
    			attr_dev(div9, "class", "chart svelte-194erzg");
    			add_location(div9, file, 147, 3, 3976);
    			add_location(div10, file, 143, 2, 3717);
    			attr_dev(div11, "class", "block svelte-194erzg");
    			add_location(div11, file, 131, 1, 3281);
    			add_location(br21, file, 156, 60, 4333);
    			attr_dev(code11, "class", "svelte-194erzg");
    			add_location(code11, file, 155, 3, 4265);
    			attr_dev(div12, "class", "description svelte-194erzg");
    			add_location(div12, file, 152, 2, 4101);
    			attr_dev(div13, "class", "chart svelte-194erzg");
    			add_location(div13, file, 162, 3, 4436);
    			attr_dev(div14, "class", "chart svelte-194erzg");
    			add_location(div14, file, 163, 3, 4534);
    			add_location(div15, file, 161, 2, 4426);
    			attr_dev(div16, "class", "block svelte-194erzg");
    			add_location(div16, file, 151, 1, 4078);
    			attr_dev(h22, "class", "svelte-194erzg");
    			add_location(h22, file, 167, 1, 4659);
    			add_location(br22, file, 174, 42, 4887);
    			add_location(br23, file, 175, 4, 4897);
    			add_location(br24, file, 176, 61, 4964);
    			attr_dev(code12, "class", "svelte-194erzg");
    			add_location(code12, file, 173, 3, 4837);
    			add_location(br25, file, 179, 3, 5048);
    			attr_dev(div17, "class", "description svelte-194erzg");
    			add_location(div17, file, 170, 2, 4701);
    			attr_dev(div18, "class", "chart svelte-194erzg");
    			add_location(div18, file, 186, 3, 5180);
    			attr_dev(div19, "class", "chart svelte-194erzg");
    			add_location(div19, file, 187, 3, 5263);
    			add_location(div20, file, 183, 2, 5109);
    			attr_dev(div21, "class", "block svelte-194erzg");
    			add_location(div21, file, 169, 1, 4678);
    			attr_dev(code13, "class", "svelte-194erzg");
    			add_location(code13, file, 195, 3, 5486);
    			add_location(br26, file, 199, 3, 5586);
    			add_location(br27, file, 203, 27, 5721);
    			add_location(br28, file, 204, 24, 5751);
    			add_location(br29, file, 205, 40, 5797);
    			add_location(br30, file, 206, 38, 5841);
    			add_location(br31, file, 207, 33, 5880);
    			attr_dev(code14, "class", "svelte-194erzg");
    			add_location(code14, file, 202, 3, 5686);
    			add_location(br32, file, 210, 3, 5939);
    			attr_dev(div22, "class", "description svelte-194erzg");
    			add_location(div22, file, 192, 2, 5388);
    			attr_dev(div23, "class", "chart svelte-194erzg");
    			add_location(div23, file, 215, 3, 6011);
    			attr_dev(div24, "class", "chart svelte-194erzg");
    			add_location(div24, file, 216, 3, 6113);
    			add_location(div25, file, 214, 2, 6001);
    			attr_dev(div26, "class", "block svelte-194erzg");
    			add_location(div26, file, 191, 1, 5365);
    			attr_dev(code15, "class", "svelte-194erzg");
    			add_location(code15, file, 224, 3, 6440);
    			add_location(br33, file, 228, 3, 6540);
    			add_location(br34, file, 232, 27, 6675);
    			add_location(br35, file, 233, 24, 6705);
    			add_location(br36, file, 234, 40, 6751);
    			attr_dev(code16, "class", "svelte-194erzg");
    			add_location(code16, file, 231, 3, 6640);
    			add_location(br37, file, 237, 3, 6815);
    			attr_dev(div27, "class", "description svelte-194erzg");
    			add_location(div27, file, 221, 2, 6326);
    			attr_dev(div28, "class", "chart svelte-194erzg");
    			add_location(div28, file, 242, 3, 6903);
    			add_location(br38, file, 243, 3, 7030);
    			attr_dev(div29, "class", "chart svelte-194erzg");
    			add_location(div29, file, 244, 3, 7039);
    			add_location(div30, file, 241, 2, 6893);
    			attr_dev(div31, "class", "block svelte-194erzg");
    			add_location(div31, file, 220, 1, 6303);
    			add_location(br39, file, 253, 3, 7457);
    			add_location(br40, file, 254, 39, 7502);
    			attr_dev(code17, "class", "svelte-194erzg");
    			add_location(code17, file, 251, 2, 7387);
    			add_location(br41, file, 256, 2, 7521);
    			add_location(br42, file, 259, 2, 7572);
    			add_location(br43, file, 259, 6, 7576);
    			add_location(strong0, file, 264, 3, 7667);
    			add_location(div32, file, 261, 2, 7586);
    			add_location(strong1, file, 270, 3, 7832);
    			add_location(div33, file, 267, 2, 7749);
    			attr_dev(div34, "class", "block block--single svelte-194erzg");
    			add_location(div34, file, 248, 1, 7185);
    			attr_dev(h23, "class", "svelte-194erzg");
    			add_location(h23, file, 274, 1, 7924);
    			attr_dev(code18, "class", "svelte-194erzg");
    			add_location(code18, file, 280, 3, 8089);
    			attr_dev(div35, "class", "description svelte-194erzg");
    			add_location(div35, file, 277, 2, 7968);
    			attr_dev(div36, "class", "block svelte-194erzg");
    			add_location(div36, file, 276, 1, 7945);
    			add_location(br44, file, 293, 64, 8453);
    			attr_dev(code19, "class", "svelte-194erzg");
    			add_location(code19, file, 292, 3, 8381);
    			attr_dev(div37, "class", "description svelte-194erzg");
    			add_location(div37, file, 289, 2, 8282);
    			attr_dev(div38, "class", "chart svelte-194erzg");
    			add_location(div38, file, 299, 3, 8561);
    			attr_dev(div39, "class", "chart svelte-194erzg");
    			add_location(div39, file, 300, 3, 8644);
    			add_location(div40, file, 298, 2, 8551);
    			attr_dev(div41, "class", "block svelte-194erzg");
    			add_location(div41, file, 288, 1, 8259);
    			add_location(br45, file, 309, 19, 8956);
    			add_location(br46, file, 310, 33, 8995);
    			add_location(br47, file, 311, 34, 9035);
    			attr_dev(code20, "class", "svelte-194erzg");
    			add_location(code20, file, 308, 3, 8929);
    			attr_dev(div42, "class", "description svelte-194erzg");
    			add_location(div42, file, 305, 2, 8770);
    			attr_dev(div43, "class", "chart svelte-194erzg");
    			add_location(div43, file, 317, 3, 9111);
    			attr_dev(div44, "class", "chart svelte-194erzg");
    			add_location(div44, file, 318, 3, 9208);
    			add_location(div45, file, 316, 2, 9101);
    			attr_dev(div46, "class", "block svelte-194erzg");
    			add_location(div46, file, 304, 1, 8747);
    			add_location(br48, file, 327, 19, 9532);
    			add_location(br49, file, 328, 33, 9571);
    			add_location(br50, file, 329, 23, 9600);
    			attr_dev(code21, "class", "svelte-194erzg");
    			add_location(code21, file, 326, 3, 9505);
    			add_location(br51, file, 334, 15, 9677);
    			add_location(br52, file, 335, 24, 9707);
    			add_location(br53, file, 336, 25, 9738);
    			attr_dev(code22, "class", "svelte-194erzg");
    			add_location(code22, file, 333, 3, 9654);
    			add_location(br54, file, 340, 3, 9773);
    			add_location(br55, file, 344, 15, 9834);
    			add_location(br56, file, 345, 24, 9864);
    			add_location(br57, file, 346, 25, 9895);
    			attr_dev(code23, "class", "svelte-194erzg");
    			add_location(code23, file, 343, 3, 9811);
    			attr_dev(div47, "class", "description svelte-194erzg");
    			add_location(div47, file, 323, 2, 9346);
    			attr_dev(div48, "class", "chart chart--responsive svelte-194erzg");
    			add_location(div48, file, 352, 3, 9949);
    			attr_dev(div49, "class", "chart chart--responsive svelte-194erzg");
    			add_location(div49, file, 353, 3, 10077);
    			add_location(div50, file, 351, 2, 9939);
    			attr_dev(div51, "class", "block svelte-194erzg");
    			add_location(div51, file, 322, 1, 9323);
    			add_location(br58, file, 362, 54, 10390);
    			attr_dev(code24, "class", "svelte-194erzg");
    			add_location(code24, file, 361, 3, 10328);
    			attr_dev(div52, "class", "description svelte-194erzg");
    			add_location(div52, file, 358, 2, 10246);
    			attr_dev(div53, "class", "chart svelte-194erzg");
    			add_location(div53, file, 368, 3, 10486);
    			attr_dev(div54, "class", "chart svelte-194erzg");
    			add_location(div54, file, 369, 3, 10562);
    			add_location(div55, file, 367, 2, 10476);
    			attr_dev(div56, "class", "block svelte-194erzg");
    			add_location(div56, file, 357, 1, 10223);
    			attr_dev(code25, "class", "svelte-194erzg");
    			add_location(code25, file, 377, 3, 10850);
    			attr_dev(div57, "class", "description svelte-194erzg");
    			add_location(div57, file, 374, 2, 10679);
    			attr_dev(div58, "class", "chart svelte-194erzg");
    			add_location(div58, file, 383, 3, 10953);
    			attr_dev(div59, "class", "chart svelte-194erzg");
    			add_location(div59, file, 384, 3, 11020);
    			add_location(div60, file, 382, 2, 10943);
    			attr_dev(div61, "class", "block svelte-194erzg");
    			add_location(div61, file, 373, 1, 10656);
    			add_location(br59, file, 393, 41, 11269);
    			add_location(br60, file, 394, 50, 11325);
    			attr_dev(code26, "class", "svelte-194erzg");
    			add_location(code26, file, 392, 3, 11220);
    			attr_dev(div62, "class", "description svelte-194erzg");
    			add_location(div62, file, 389, 2, 11142);
    			attr_dev(div63, "class", "chart svelte-194erzg");
    			add_location(div63, file, 400, 3, 11424);
    			attr_dev(div64, "class", "chart svelte-194erzg");
    			add_location(div64, file, 401, 3, 11522);
    			attr_dev(div65, "class", "chart svelte-194erzg");
    			add_location(div65, file, 402, 3, 11620);
    			attr_dev(div66, "class", "chart svelte-194erzg");
    			add_location(div66, file, 403, 3, 11718);
    			attr_dev(div67, "class", "chart svelte-194erzg");
    			add_location(div67, file, 404, 3, 11816);
    			attr_dev(div68, "class", "chart svelte-194erzg");
    			add_location(div68, file, 405, 3, 11914);
    			attr_dev(div69, "class", "chart svelte-194erzg");
    			add_location(div69, file, 406, 3, 12012);
    			attr_dev(div70, "class", "chart svelte-194erzg");
    			add_location(div70, file, 407, 3, 12110);
    			add_location(div71, file, 399, 2, 11414);
    			attr_dev(div72, "class", "block svelte-194erzg");
    			add_location(div72, file, 388, 1, 11119);
    			attr_dev(code27, "class", "svelte-194erzg");
    			add_location(code27, file, 415, 3, 12368);
    			attr_dev(div73, "class", "description svelte-194erzg");
    			add_location(div73, file, 412, 2, 12265);
    			attr_dev(div74, "class", "block svelte-194erzg");
    			add_location(div74, file, 411, 1, 12242);
    			attr_dev(code28, "class", "svelte-194erzg");
    			add_location(code28, file, 427, 3, 12655);
    			attr_dev(div75, "class", "description svelte-194erzg");
    			add_location(div75, file, 424, 2, 12560);
    			attr_dev(div76, "class", "block svelte-194erzg");
    			add_location(div76, file, 423, 1, 12537);
    			add_location(br61, file, 437, 49, 12927);
    			attr_dev(code29, "class", "svelte-194erzg");
    			add_location(code29, file, 440, 3, 12974);
    			attr_dev(div77, "class", "description svelte-194erzg");
    			add_location(div77, file, 436, 2, 12851);
    			attr_dev(div78, "class", "block svelte-194erzg");
    			add_location(div78, file, 435, 1, 12828);
    			attr_dev(p6, "class", "svelte-194erzg");
    			add_location(p6, file, 449, 2, 13223);
    			attr_dev(strong2, "class", "svelte-194erzg");
    			add_location(strong2, file, 452, 3, 13337);
    			attr_dev(strong3, "class", "svelte-194erzg");
    			add_location(strong3, file, 452, 29, 13363);
    			attr_dev(strong4, "class", "svelte-194erzg");
    			add_location(strong4, file, 452, 54, 13388);
    			attr_dev(code30, "class", "svelte-194erzg");
    			add_location(code30, file, 453, 3, 13421);
    			attr_dev(code31, "class", "svelte-194erzg");
    			add_location(code31, file, 453, 21, 13439);
    			add_location(div79, file, 453, 47, 13465);
    			attr_dev(code32, "class", "svelte-194erzg");
    			add_location(code32, file, 454, 3, 13551);
    			attr_dev(code33, "class", "svelte-194erzg");
    			add_location(code33, file, 454, 23, 13571);
    			add_location(div80, file, 454, 39, 13587);
    			attr_dev(code34, "class", "svelte-194erzg");
    			add_location(code34, file, 455, 3, 13674);
    			attr_dev(code35, "class", "svelte-194erzg");
    			add_location(code35, file, 455, 23, 13694);
    			add_location(div81, file, 455, 39, 13710);
    			attr_dev(code36, "class", "svelte-194erzg");
    			add_location(code36, file, 456, 3, 13797);
    			attr_dev(code37, "class", "svelte-194erzg");
    			add_location(code37, file, 456, 23, 13817);
    			add_location(div82, file, 456, 37, 13831);
    			attr_dev(code38, "class", "svelte-194erzg");
    			add_location(code38, file, 457, 3, 13904);
    			attr_dev(code39, "class", "svelte-194erzg");
    			add_location(code39, file, 457, 20, 13921);
    			add_location(div83, file, 457, 34, 13935);
    			attr_dev(code40, "class", "svelte-194erzg");
    			add_location(code40, file, 458, 3, 14025);
    			attr_dev(code41, "class", "svelte-194erzg");
    			add_location(code41, file, 458, 23, 14045);
    			add_location(div84, file, 458, 39, 14061);
    			attr_dev(code42, "class", "svelte-194erzg");
    			add_location(code42, file, 459, 3, 14107);
    			attr_dev(code43, "class", "svelte-194erzg");
    			add_location(code43, file, 459, 22, 14126);
    			add_location(div85, file, 459, 39, 14143);
    			attr_dev(code44, "class", "svelte-194erzg");
    			add_location(code44, file, 460, 3, 14188);
    			attr_dev(code45, "class", "svelte-194erzg");
    			add_location(code45, file, 460, 28, 14213);
    			add_location(div86, file, 460, 43, 14228);
    			attr_dev(code46, "class", "svelte-194erzg");
    			add_location(code46, file, 461, 3, 14285);
    			attr_dev(code47, "class", "svelte-194erzg");
    			add_location(code47, file, 461, 21, 14303);
    			add_location(div87, file, 461, 40, 14322);
    			attr_dev(code48, "class", "svelte-194erzg");
    			add_location(code48, file, 462, 3, 14413);
    			attr_dev(code49, "class", "svelte-194erzg");
    			add_location(code49, file, 462, 22, 14432);
    			add_location(div88, file, 462, 41, 14451);
    			attr_dev(code50, "class", "svelte-194erzg");
    			add_location(code50, file, 463, 3, 14548);
    			attr_dev(code51, "class", "svelte-194erzg");
    			add_location(code51, file, 463, 20, 14565);
    			add_location(div89, file, 463, 35, 14580);
    			attr_dev(code52, "class", "svelte-194erzg");
    			add_location(code52, file, 464, 3, 14627);
    			attr_dev(code53, "class", "svelte-194erzg");
    			add_location(code53, file, 464, 21, 14645);
    			add_location(div90, file, 464, 42, 14666);
    			attr_dev(code54, "class", "svelte-194erzg");
    			add_location(code54, file, 465, 3, 14728);
    			attr_dev(code55, "class", "svelte-194erzg");
    			add_location(code55, file, 465, 28, 14753);
    			add_location(div91, file, 465, 45, 14770);
    			attr_dev(code56, "class", "svelte-194erzg");
    			add_location(code56, file, 466, 3, 14835);
    			attr_dev(code57, "class", "svelte-194erzg");
    			add_location(code57, file, 466, 22, 14854);
    			add_location(div92, file, 466, 40, 14872);
    			attr_dev(code58, "class", "svelte-194erzg");
    			add_location(code58, file, 467, 3, 14944);
    			attr_dev(code59, "class", "svelte-194erzg");
    			add_location(code59, file, 467, 27, 14968);
    			add_location(div93, file, 467, 42, 14983);
    			attr_dev(code60, "class", "svelte-194erzg");
    			add_location(code60, file, 468, 3, 15075);
    			attr_dev(code61, "class", "svelte-194erzg");
    			add_location(code61, file, 468, 26, 15098);
    			add_location(div94, file, 468, 45, 15117);
    			attr_dev(code62, "class", "svelte-194erzg");
    			add_location(code62, file, 469, 3, 15178);
    			attr_dev(code63, "class", "svelte-194erzg");
    			add_location(code63, file, 469, 29, 15204);
    			add_location(div95, file, 469, 51, 15226);
    			attr_dev(code64, "class", "svelte-194erzg");
    			add_location(code64, file, 470, 3, 15274);
    			attr_dev(code65, "class", "svelte-194erzg");
    			add_location(code65, file, 470, 29, 15300);
    			add_location(div96, file, 470, 43, 15314);
    			attr_dev(code66, "class", "svelte-194erzg");
    			add_location(code66, file, 471, 3, 15358);
    			attr_dev(code67, "class", "svelte-194erzg");
    			add_location(code67, file, 471, 28, 15383);
    			add_location(div97, file, 471, 42, 15397);
    			attr_dev(code68, "class", "svelte-194erzg");
    			add_location(code68, file, 472, 3, 15443);
    			attr_dev(code69, "class", "svelte-194erzg");
    			add_location(code69, file, 472, 30, 15470);
    			add_location(div98, file, 472, 50, 15490);
    			attr_dev(code70, "class", "svelte-194erzg");
    			add_location(code70, file, 473, 3, 15567);
    			attr_dev(code71, "class", "svelte-194erzg");
    			add_location(code71, file, 473, 25, 15589);
    			add_location(div99, file, 473, 40, 15604);
    			attr_dev(div100, "class", "table svelte-194erzg");
    			add_location(div100, file, 451, 2, 13313);
    			attr_dev(div101, "class", "block block--single svelte-194erzg");
    			add_location(div101, file, 448, 1, 13186);
    			attr_dev(p7, "class", "svelte-194erzg");
    			add_location(p7, file, 478, 2, 15757);
    			attr_dev(strong5, "class", "svelte-194erzg");
    			add_location(strong5, file, 481, 3, 15871);
    			attr_dev(strong6, "class", "svelte-194erzg");
    			add_location(strong6, file, 481, 29, 15897);
    			attr_dev(strong7, "class", "svelte-194erzg");
    			add_location(strong7, file, 481, 54, 15922);
    			attr_dev(code72, "class", "svelte-194erzg");
    			add_location(code72, file, 482, 3, 15955);
    			attr_dev(code73, "class", "svelte-194erzg");
    			add_location(code73, file, 482, 23, 15975);
    			add_location(div102, file, 482, 37, 15989);
    			attr_dev(code74, "class", "svelte-194erzg");
    			add_location(code74, file, 483, 3, 16056);
    			attr_dev(code75, "class", "svelte-194erzg");
    			add_location(code75, file, 483, 22, 16075);
    			add_location(div103, file, 483, 46, 16099);
    			attr_dev(div104, "class", "table svelte-194erzg");
    			add_location(div104, file, 480, 2, 15847);
    			attr_dev(div105, "class", "block block--single svelte-194erzg");
    			add_location(div105, file, 477, 1, 15720);
    			attr_dev(p8, "class", "svelte-194erzg");
    			add_location(p8, file, 488, 2, 16230);
    			attr_dev(strong8, "class", "svelte-194erzg");
    			add_location(strong8, file, 491, 3, 16344);
    			attr_dev(strong9, "class", "svelte-194erzg");
    			add_location(strong9, file, 491, 29, 16370);
    			attr_dev(strong10, "class", "svelte-194erzg");
    			add_location(strong10, file, 491, 54, 16395);
    			attr_dev(code76, "class", "svelte-194erzg");
    			add_location(code76, file, 492, 3, 16428);
    			attr_dev(code77, "class", "svelte-194erzg");
    			add_location(code77, file, 492, 20, 16445);
    			add_location(div106, file, 492, 34, 16459);
    			attr_dev(code78, "class", "svelte-194erzg");
    			add_location(code78, file, 493, 3, 16533);
    			attr_dev(code79, "class", "svelte-194erzg");
    			add_location(code79, file, 493, 22, 16552);
    			add_location(div107, file, 493, 46, 16576);
    			attr_dev(div108, "class", "table svelte-194erzg");
    			add_location(div108, file, 490, 2, 16320);
    			attr_dev(div109, "class", "block block--single svelte-194erzg");
    			add_location(div109, file, 487, 1, 16193);
    			attr_dev(a1, "href", "https://github.com/Mitcheljager");
    			attr_dev(a1, "class", "svelte-194erzg");
    			add_location(a1, file, 498, 10, 16715);
    			attr_dev(div110, "class", "block block--single svelte-194erzg");
    			add_location(div110, file, 497, 1, 16670);
    			attr_dev(div111, "class", "wrapper svelte-194erzg");
    			add_location(div111, file, 37, 0, 952);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div111, anchor);
    			append_dev(div111, div0);
    			append_dev(div0, h1);
    			append_dev(h1, t0);
    			append_dev(h1, mark0);
    			append_dev(div0, t2);
    			mount_component(linkedchart0, div0, null);
    			append_dev(div111, t3);
    			append_dev(div111, div1);
    			append_dev(div1, p0);
    			append_dev(div1, t5);
    			append_dev(div1, p1);
    			append_dev(p1, a0);
    			append_dev(div1, t7);
    			append_dev(div1, h20);
    			append_dev(div1, t9);
    			append_dev(div1, p2);
    			append_dev(div1, t11);
    			append_dev(div1, code0);
    			append_dev(code0, t12);
    			append_dev(code0, mark1);
    			append_dev(div1, t14);
    			append_dev(div1, code1);
    			append_dev(code1, t15);
    			append_dev(code1, mark2);
    			append_dev(div1, t17);
    			append_dev(div1, p3);
    			append_dev(div1, t19);
    			append_dev(div1, code2);
    			append_dev(code2, t20);
    			append_dev(code2, mark3);
    			append_dev(code2, t22);
    			append_dev(div1, t23);
    			append_dev(div1, code3);
    			append_dev(code3, t24);
    			append_dev(code3, mark4);
    			append_dev(code3, t26);
    			append_dev(code3, mark5);
    			append_dev(code3, t28);
    			append_dev(code3, mark6);
    			append_dev(code3, t30);
    			append_dev(div111, t31);
    			append_dev(div111, div2);
    			append_dev(div2, p4);
    			append_dev(div2, t33);
    			append_dev(div2, code4);
    			append_dev(code4, t34);
    			append_dev(code4, br0);
    			append_dev(code4, t35);
    			append_dev(code4, br1);
    			append_dev(code4, t36);
    			append_dev(code4, br2);
    			append_dev(code4, t37);
    			append_dev(code4, br3);
    			append_dev(code4, t38);
    			append_dev(code4, br4);
    			append_dev(code4, t39);
    			append_dev(code4, br5);
    			append_dev(code4, t40);
    			append_dev(div2, t41);
    			append_dev(div2, code5);
    			append_dev(div2, t43);
    			append_dev(div2, p5);
    			append_dev(div2, t45);
    			append_dev(div2, code6);
    			append_dev(code6, t46);
    			append_dev(code6, br6);
    			append_dev(code6, t47);
    			append_dev(code6, br7);
    			append_dev(code6, t48);
    			append_dev(code6, br8);
    			append_dev(code6, t49);
    			append_dev(code6, br9);
    			append_dev(code6, t50);
    			append_dev(code6, br10);
    			append_dev(code6, t51);
    			append_dev(code6, br11);
    			append_dev(code6, t52);
    			append_dev(div2, t53);
    			append_dev(div2, code7);
    			append_dev(code7, t54);
    			append_dev(code7, br12);
    			append_dev(code7, t55);
    			append_dev(code7, br13);
    			append_dev(code7, t56);
    			append_dev(code7, br14);
    			append_dev(code7, t57);
    			append_dev(code7, br15);
    			append_dev(code7, t58);
    			append_dev(code7, br16);
    			append_dev(code7, t59);
    			append_dev(code7, br17);
    			append_dev(code7, t60);
    			append_dev(div2, t61);
    			append_dev(div2, code8);
    			append_dev(div111, t63);
    			append_dev(div111, h21);
    			append_dev(div111, t65);
    			append_dev(div111, div4);
    			append_dev(div4, div3);
    			append_dev(div3, t66);
    			append_dev(div3, code9);
    			append_dev(div4, t68);
    			mount_component(linkedchart1, div4, null);
    			append_dev(div111, t69);
    			append_dev(div111, div11);
    			append_dev(div11, div5);
    			append_dev(div5, t70);
    			append_dev(div5, code10);
    			append_dev(code10, t71);
    			append_dev(code10, br18);
    			append_dev(code10, t72);
    			append_dev(code10, br19);
    			append_dev(code10, t73);
    			append_dev(code10, br20);
    			append_dev(code10, t74);
    			append_dev(div11, t75);
    			append_dev(div11, div10);
    			append_dev(div10, div6);
    			mount_component(linkedchart2, div6, null);
    			append_dev(div10, t76);
    			append_dev(div10, div7);
    			mount_component(linkedchart3, div7, null);
    			append_dev(div10, t77);
    			append_dev(div10, div8);
    			mount_component(linkedchart4, div8, null);
    			append_dev(div10, t78);
    			append_dev(div10, div9);
    			mount_component(linkedchart5, div9, null);
    			append_dev(div111, t79);
    			append_dev(div111, div16);
    			append_dev(div16, div12);
    			append_dev(div12, t80);
    			append_dev(div12, code11);
    			append_dev(code11, t81);
    			append_dev(code11, br21);
    			append_dev(code11, t82);
    			append_dev(div16, t83);
    			append_dev(div16, div15);
    			append_dev(div15, div13);
    			mount_component(linkedchart6, div13, null);
    			append_dev(div15, t84);
    			append_dev(div15, div14);
    			mount_component(linkedchart7, div14, null);
    			append_dev(div111, t85);
    			append_dev(div111, h22);
    			append_dev(div111, t87);
    			append_dev(div111, div21);
    			append_dev(div21, div17);
    			append_dev(div17, t88);
    			append_dev(div17, code12);
    			append_dev(code12, t89);
    			append_dev(code12, br22);
    			append_dev(code12, t90);
    			append_dev(code12, br23);
    			append_dev(code12, t91);
    			append_dev(code12, br24);
    			append_dev(code12, t92);
    			append_dev(div17, t93);
    			append_dev(div17, br25);
    			append_dev(div17, t94);
    			append_dev(div21, t95);
    			append_dev(div21, div20);
    			mount_component(linkedlabel, div20, null);
    			append_dev(div20, t96);
    			append_dev(div20, div18);
    			mount_component(linkedchart8, div18, null);
    			append_dev(div20, t97);
    			append_dev(div20, div19);
    			mount_component(linkedchart9, div19, null);
    			append_dev(div111, t98);
    			append_dev(div111, div26);
    			append_dev(div26, div22);
    			append_dev(div22, t99);
    			append_dev(div22, code13);
    			append_dev(div22, t101);
    			append_dev(div22, br26);
    			append_dev(div22, t102);
    			append_dev(div22, code14);
    			append_dev(code14, t103);
    			append_dev(code14, br27);
    			append_dev(code14, t104);
    			append_dev(code14, br28);
    			append_dev(code14, t105);
    			append_dev(code14, br29);
    			append_dev(code14, t106);
    			append_dev(code14, br30);
    			append_dev(code14, t107);
    			append_dev(code14, br31);
    			append_dev(code14, t108);
    			append_dev(div22, t109);
    			append_dev(div22, br32);
    			append_dev(div22, t110);
    			append_dev(div26, t111);
    			append_dev(div26, div25);
    			append_dev(div25, div23);
    			mount_component(linkedchart10, div23, null);
    			append_dev(div25, t112);
    			append_dev(div25, div24);
    			mount_component(linkedchart11, div24, null);
    			append_dev(div111, t113);
    			append_dev(div111, div31);
    			append_dev(div31, div27);
    			append_dev(div27, t114);
    			append_dev(div27, code15);
    			append_dev(div27, t116);
    			append_dev(div27, br33);
    			append_dev(div27, t117);
    			append_dev(div27, code16);
    			append_dev(code16, t118);
    			append_dev(code16, br34);
    			append_dev(code16, t119);
    			append_dev(code16, br35);
    			append_dev(code16, t120);
    			append_dev(code16, br36);
    			append_dev(code16, t121);
    			append_dev(div27, t122);
    			append_dev(div27, br37);
    			append_dev(div27, t123);
    			append_dev(div31, t124);
    			append_dev(div31, div30);
    			append_dev(div30, div28);
    			mount_component(linkedchart12, div28, null);
    			append_dev(div30, t125);
    			append_dev(div30, br38);
    			append_dev(div30, t126);
    			append_dev(div30, div29);
    			mount_component(linkedchart13, div29, null);
    			append_dev(div111, t127);
    			append_dev(div111, div34);
    			append_dev(div34, t128);
    			append_dev(div34, code17);
    			append_dev(code17, t129);
    			append_dev(code17, br39);
    			append_dev(code17, t130);
    			append_dev(code17, br40);
    			append_dev(div34, t131);
    			append_dev(div34, br41);
    			append_dev(div34, t132);
    			append_dev(div34, br42);
    			append_dev(div34, br43);
    			append_dev(div34, t133);
    			append_dev(div34, div32);
    			mount_component(linkedchart14, div32, null);
    			append_dev(div32, t134);
    			append_dev(div32, strong0);
    			mount_component(linkedvalue0, strong0, null);
    			append_dev(div34, t135);
    			append_dev(div34, div33);
    			mount_component(linkedchart15, div33, null);
    			append_dev(div33, t136);
    			append_dev(div33, strong1);
    			mount_component(linkedvalue1, strong1, null);
    			append_dev(div111, t137);
    			append_dev(div111, h23);
    			append_dev(div111, t139);
    			append_dev(div111, div36);
    			append_dev(div36, div35);
    			append_dev(div35, t140);
    			append_dev(div35, code18);
    			append_dev(div36, t142);
    			mount_component(linkedchart16, div36, null);
    			append_dev(div111, t143);
    			append_dev(div111, div41);
    			append_dev(div41, div37);
    			append_dev(div37, t144);
    			append_dev(div37, code19);
    			append_dev(code19, t145);
    			append_dev(code19, br44);
    			append_dev(code19, t146);
    			append_dev(div41, t147);
    			append_dev(div41, div40);
    			append_dev(div40, div38);
    			mount_component(linkedchart17, div38, null);
    			append_dev(div40, t148);
    			append_dev(div40, div39);
    			mount_component(linkedchart18, div39, null);
    			append_dev(div111, t149);
    			append_dev(div111, div46);
    			append_dev(div46, div42);
    			append_dev(div42, t150);
    			append_dev(div42, code20);
    			append_dev(code20, t151);
    			append_dev(code20, br45);
    			append_dev(code20, t152);
    			append_dev(code20, br46);
    			append_dev(code20, t153);
    			append_dev(code20, br47);
    			append_dev(code20, t154);
    			append_dev(div46, t155);
    			append_dev(div46, div45);
    			append_dev(div45, div43);
    			mount_component(linkedchart19, div43, null);
    			append_dev(div45, t156);
    			append_dev(div45, div44);
    			mount_component(linkedchart20, div44, null);
    			append_dev(div111, t157);
    			append_dev(div111, div51);
    			append_dev(div51, div47);
    			append_dev(div47, t158);
    			append_dev(div47, code21);
    			append_dev(code21, t159);
    			append_dev(code21, br48);
    			append_dev(code21, t160);
    			append_dev(code21, br49);
    			append_dev(code21, t161);
    			append_dev(code21, br50);
    			append_dev(code21, t162);
    			append_dev(div47, t163);
    			append_dev(div47, code22);
    			append_dev(code22, t164);
    			append_dev(code22, br51);
    			append_dev(code22, t165);
    			append_dev(code22, br52);
    			append_dev(code22, t166);
    			append_dev(code22, br53);
    			append_dev(code22, t167);
    			append_dev(div47, t168);
    			append_dev(div47, br54);
    			append_dev(div47, t169);
    			append_dev(div47, code23);
    			append_dev(code23, t170);
    			append_dev(code23, br55);
    			append_dev(code23, t171);
    			append_dev(code23, br56);
    			append_dev(code23, t172);
    			append_dev(code23, br57);
    			append_dev(code23, t173);
    			append_dev(div51, t174);
    			append_dev(div51, div50);
    			append_dev(div50, div48);
    			mount_component(linkedchart21, div48, null);
    			append_dev(div50, t175);
    			append_dev(div50, div49);
    			mount_component(linkedchart22, div49, null);
    			append_dev(div111, t176);
    			append_dev(div111, div56);
    			append_dev(div56, div52);
    			append_dev(div52, t177);
    			append_dev(div52, code24);
    			append_dev(code24, t178);
    			append_dev(code24, br58);
    			append_dev(code24, t179);
    			append_dev(div56, t180);
    			append_dev(div56, div55);
    			append_dev(div55, div53);
    			mount_component(linkedchart23, div53, null);
    			append_dev(div55, t181);
    			append_dev(div55, div54);
    			mount_component(linkedchart24, div54, null);
    			append_dev(div111, t182);
    			append_dev(div111, div61);
    			append_dev(div61, div57);
    			append_dev(div57, t183);
    			append_dev(div57, code25);
    			append_dev(div61, t185);
    			append_dev(div61, div60);
    			append_dev(div60, div58);
    			mount_component(linkedchart25, div58, null);
    			append_dev(div60, t186);
    			append_dev(div60, div59);
    			mount_component(linkedchart26, div59, null);
    			append_dev(div111, t187);
    			append_dev(div111, div72);
    			append_dev(div72, div62);
    			append_dev(div62, t188);
    			append_dev(div62, code26);
    			append_dev(code26, t189);
    			append_dev(code26, br59);
    			append_dev(code26, t190);
    			append_dev(code26, br60);
    			append_dev(code26, t191);
    			append_dev(div72, t192);
    			append_dev(div72, div71);
    			append_dev(div71, div63);
    			mount_component(linkedchart27, div63, null);
    			append_dev(div71, t193);
    			append_dev(div71, div64);
    			mount_component(linkedchart28, div64, null);
    			append_dev(div71, t194);
    			append_dev(div71, div65);
    			mount_component(linkedchart29, div65, null);
    			append_dev(div71, t195);
    			append_dev(div71, div66);
    			mount_component(linkedchart30, div66, null);
    			append_dev(div71, t196);
    			append_dev(div71, div67);
    			mount_component(linkedchart31, div67, null);
    			append_dev(div71, t197);
    			append_dev(div71, div68);
    			mount_component(linkedchart32, div68, null);
    			append_dev(div71, t198);
    			append_dev(div71, div69);
    			mount_component(linkedchart33, div69, null);
    			append_dev(div71, t199);
    			append_dev(div71, div70);
    			mount_component(linkedchart34, div70, null);
    			append_dev(div111, t200);
    			append_dev(div111, div74);
    			append_dev(div74, div73);
    			append_dev(div73, t201);
    			append_dev(div73, code27);
    			append_dev(div74, t203);
    			mount_component(linkedchart35, div74, null);
    			append_dev(div111, t204);
    			append_dev(div111, div76);
    			append_dev(div76, div75);
    			append_dev(div75, t205);
    			append_dev(div75, code28);
    			append_dev(div76, t207);
    			mount_component(linkedchart36, div76, null);
    			append_dev(div111, t208);
    			append_dev(div111, div78);
    			append_dev(div78, div77);
    			append_dev(div77, t209);
    			append_dev(div77, br61);
    			append_dev(div77, t210);
    			append_dev(div77, code29);
    			append_dev(div78, t212);
    			mount_component(linkedchart37, div78, null);
    			append_dev(div111, t213);
    			append_dev(div111, div101);
    			append_dev(div101, p6);
    			append_dev(div101, t215);
    			append_dev(div101, div100);
    			append_dev(div100, strong2);
    			append_dev(div100, t217);
    			append_dev(div100, strong3);
    			append_dev(div100, t219);
    			append_dev(div100, strong4);
    			append_dev(div100, t221);
    			append_dev(div100, code30);
    			append_dev(div100, t223);
    			append_dev(div100, code31);
    			append_dev(div100, t225);
    			append_dev(div100, div79);
    			append_dev(div100, t227);
    			append_dev(div100, code32);
    			append_dev(div100, t229);
    			append_dev(div100, code33);
    			append_dev(div100, t231);
    			append_dev(div100, div80);
    			append_dev(div100, t233);
    			append_dev(div100, code34);
    			append_dev(div100, t235);
    			append_dev(div100, code35);
    			append_dev(div100, t237);
    			append_dev(div100, div81);
    			append_dev(div100, t239);
    			append_dev(div100, code36);
    			append_dev(div100, t241);
    			append_dev(div100, code37);
    			append_dev(div100, t242);
    			append_dev(div100, div82);
    			append_dev(div100, t244);
    			append_dev(div100, code38);
    			append_dev(div100, t246);
    			append_dev(div100, code39);
    			append_dev(div100, t247);
    			append_dev(div100, div83);
    			append_dev(div100, t249);
    			append_dev(div100, code40);
    			append_dev(div100, t251);
    			append_dev(div100, code41);
    			append_dev(div100, t253);
    			append_dev(div100, div84);
    			append_dev(div100, t255);
    			append_dev(div100, code42);
    			append_dev(div100, t257);
    			append_dev(div100, code43);
    			append_dev(div100, t259);
    			append_dev(div100, div85);
    			append_dev(div100, t261);
    			append_dev(div100, code44);
    			append_dev(div100, t263);
    			append_dev(div100, code45);
    			append_dev(div100, t265);
    			append_dev(div100, div86);
    			append_dev(div100, t267);
    			append_dev(div100, code46);
    			append_dev(div100, t269);
    			append_dev(div100, code47);
    			append_dev(div100, t271);
    			append_dev(div100, div87);
    			append_dev(div100, t273);
    			append_dev(div100, code48);
    			append_dev(div100, t275);
    			append_dev(div100, code49);
    			append_dev(div100, t277);
    			append_dev(div100, div88);
    			append_dev(div100, t279);
    			append_dev(div100, code50);
    			append_dev(div100, t281);
    			append_dev(div100, code51);
    			append_dev(div100, t283);
    			append_dev(div100, div89);
    			append_dev(div100, t285);
    			append_dev(div100, code52);
    			append_dev(div100, t287);
    			append_dev(div100, code53);
    			append_dev(div100, t289);
    			append_dev(div100, div90);
    			append_dev(div100, t291);
    			append_dev(div100, code54);
    			append_dev(div100, t293);
    			append_dev(div100, code55);
    			append_dev(div100, t295);
    			append_dev(div100, div91);
    			append_dev(div100, t297);
    			append_dev(div100, code56);
    			append_dev(div100, t299);
    			append_dev(div100, code57);
    			append_dev(div100, t301);
    			append_dev(div100, div92);
    			append_dev(div100, t303);
    			append_dev(div100, code58);
    			append_dev(div100, t305);
    			append_dev(div100, code59);
    			append_dev(div100, t307);
    			append_dev(div100, div93);
    			append_dev(div100, t309);
    			append_dev(div100, code60);
    			append_dev(div100, t311);
    			append_dev(div100, code61);
    			append_dev(div100, t313);
    			append_dev(div100, div94);
    			append_dev(div100, t315);
    			append_dev(div100, code62);
    			append_dev(div100, t317);
    			append_dev(div100, code63);
    			append_dev(div100, t319);
    			append_dev(div100, div95);
    			append_dev(div100, t321);
    			append_dev(div100, code64);
    			append_dev(div100, t323);
    			append_dev(div100, code65);
    			append_dev(div100, t324);
    			append_dev(div100, div96);
    			append_dev(div100, t326);
    			append_dev(div100, code66);
    			append_dev(div100, t328);
    			append_dev(div100, code67);
    			append_dev(div100, t329);
    			append_dev(div100, div97);
    			append_dev(div100, t331);
    			append_dev(div100, code68);
    			append_dev(div100, t333);
    			append_dev(div100, code69);
    			append_dev(div100, t335);
    			append_dev(div100, div98);
    			append_dev(div100, t337);
    			append_dev(div100, code70);
    			append_dev(div100, t339);
    			append_dev(div100, code71);
    			append_dev(div100, t341);
    			append_dev(div100, div99);
    			append_dev(div111, t343);
    			append_dev(div111, div105);
    			append_dev(div105, p7);
    			append_dev(div105, t345);
    			append_dev(div105, div104);
    			append_dev(div104, strong5);
    			append_dev(div104, t347);
    			append_dev(div104, strong6);
    			append_dev(div104, t349);
    			append_dev(div104, strong7);
    			append_dev(div104, t351);
    			append_dev(div104, code72);
    			append_dev(div104, t353);
    			append_dev(div104, code73);
    			append_dev(div104, t354);
    			append_dev(div104, div102);
    			append_dev(div104, t356);
    			append_dev(div104, code74);
    			append_dev(div104, t358);
    			append_dev(div104, code75);
    			append_dev(div104, t360);
    			append_dev(div104, div103);
    			append_dev(div111, t362);
    			append_dev(div111, div109);
    			append_dev(div109, p8);
    			append_dev(div109, t364);
    			append_dev(div109, div108);
    			append_dev(div108, strong8);
    			append_dev(div108, t366);
    			append_dev(div108, strong9);
    			append_dev(div108, t368);
    			append_dev(div108, strong10);
    			append_dev(div108, t370);
    			append_dev(div108, code76);
    			append_dev(div108, t372);
    			append_dev(div108, code77);
    			append_dev(div108, t373);
    			append_dev(div108, div106);
    			append_dev(div108, t375);
    			append_dev(div108, code78);
    			append_dev(div108, t377);
    			append_dev(div108, code79);
    			append_dev(div108, t379);
    			append_dev(div108, div107);
    			append_dev(div111, t381);
    			append_dev(div111, div110);
    			append_dev(div110, t382);
    			append_dev(div110, a1);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const linkedchart37_changes = {};
    			if (dirty & /*transitioningData*/ 1) linkedchart37_changes.data = /*transitioningData*/ ctx[0];
    			if (dirty & /*transitionColor*/ 2) linkedchart37_changes.fill = "hsl(" + /*transitionColor*/ ctx[1] + ", 60%, 50%)";
    			linkedchart37.$set(linkedchart37_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(linkedchart0.$$.fragment, local);
    			transition_in(linkedchart1.$$.fragment, local);
    			transition_in(linkedchart2.$$.fragment, local);
    			transition_in(linkedchart3.$$.fragment, local);
    			transition_in(linkedchart4.$$.fragment, local);
    			transition_in(linkedchart5.$$.fragment, local);
    			transition_in(linkedchart6.$$.fragment, local);
    			transition_in(linkedchart7.$$.fragment, local);
    			transition_in(linkedlabel.$$.fragment, local);
    			transition_in(linkedchart8.$$.fragment, local);
    			transition_in(linkedchart9.$$.fragment, local);
    			transition_in(linkedchart10.$$.fragment, local);
    			transition_in(linkedchart11.$$.fragment, local);
    			transition_in(linkedchart12.$$.fragment, local);
    			transition_in(linkedchart13.$$.fragment, local);
    			transition_in(linkedchart14.$$.fragment, local);
    			transition_in(linkedvalue0.$$.fragment, local);
    			transition_in(linkedchart15.$$.fragment, local);
    			transition_in(linkedvalue1.$$.fragment, local);
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
    			transition_in(linkedchart29.$$.fragment, local);
    			transition_in(linkedchart30.$$.fragment, local);
    			transition_in(linkedchart31.$$.fragment, local);
    			transition_in(linkedchart32.$$.fragment, local);
    			transition_in(linkedchart33.$$.fragment, local);
    			transition_in(linkedchart34.$$.fragment, local);
    			transition_in(linkedchart35.$$.fragment, local);
    			transition_in(linkedchart36.$$.fragment, local);
    			transition_in(linkedchart37.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(linkedchart0.$$.fragment, local);
    			transition_out(linkedchart1.$$.fragment, local);
    			transition_out(linkedchart2.$$.fragment, local);
    			transition_out(linkedchart3.$$.fragment, local);
    			transition_out(linkedchart4.$$.fragment, local);
    			transition_out(linkedchart5.$$.fragment, local);
    			transition_out(linkedchart6.$$.fragment, local);
    			transition_out(linkedchart7.$$.fragment, local);
    			transition_out(linkedlabel.$$.fragment, local);
    			transition_out(linkedchart8.$$.fragment, local);
    			transition_out(linkedchart9.$$.fragment, local);
    			transition_out(linkedchart10.$$.fragment, local);
    			transition_out(linkedchart11.$$.fragment, local);
    			transition_out(linkedchart12.$$.fragment, local);
    			transition_out(linkedchart13.$$.fragment, local);
    			transition_out(linkedchart14.$$.fragment, local);
    			transition_out(linkedvalue0.$$.fragment, local);
    			transition_out(linkedchart15.$$.fragment, local);
    			transition_out(linkedvalue1.$$.fragment, local);
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
    			transition_out(linkedchart29.$$.fragment, local);
    			transition_out(linkedchart30.$$.fragment, local);
    			transition_out(linkedchart31.$$.fragment, local);
    			transition_out(linkedchart32.$$.fragment, local);
    			transition_out(linkedchart33.$$.fragment, local);
    			transition_out(linkedchart34.$$.fragment, local);
    			transition_out(linkedchart35.$$.fragment, local);
    			transition_out(linkedchart36.$$.fragment, local);
    			transition_out(linkedchart37.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div111);
    			destroy_component(linkedchart0);
    			destroy_component(linkedchart1);
    			destroy_component(linkedchart2);
    			destroy_component(linkedchart3);
    			destroy_component(linkedchart4);
    			destroy_component(linkedchart5);
    			destroy_component(linkedchart6);
    			destroy_component(linkedchart7);
    			destroy_component(linkedlabel);
    			destroy_component(linkedchart8);
    			destroy_component(linkedchart9);
    			destroy_component(linkedchart10);
    			destroy_component(linkedchart11);
    			destroy_component(linkedchart12);
    			destroy_component(linkedchart13);
    			destroy_component(linkedchart14);
    			destroy_component(linkedvalue0);
    			destroy_component(linkedchart15);
    			destroy_component(linkedvalue1);
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
    			destroy_component(linkedchart29);
    			destroy_component(linkedchart30);
    			destroy_component(linkedchart31);
    			destroy_component(linkedchart32);
    			destroy_component(linkedchart33);
    			destroy_component(linkedchart34);
    			destroy_component(linkedchart35);
    			destroy_component(linkedchart36);
    			destroy_component(linkedchart37);
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

    function fakeData(times, maxValue = 100, minValue = 50) {
    	const data = {};
    	const date = new Date("1985-05-01T00:00:00Z");

    	for (let i = 0; i < times; i++) {
    		const setDate = date.setDate(date.getDate() - 1);
    		const formattedDate = new Date(setDate).toISOString().substring(0, 10);
    		data[formattedDate] = Math.floor(Math.random() * (maxValue - minValue)) + minValue;
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
    		LinkedValue,
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
