
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
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }
    class HtmlTag {
        constructor(is_svg = false) {
            this.is_svg = false;
            this.is_svg = is_svg;
            this.e = this.n = null;
        }
        c(html) {
            this.h(html);
        }
        m(html, target, anchor = null) {
            if (!this.e) {
                if (this.is_svg)
                    this.e = svg_element(target.nodeName);
                else
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
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail, { cancelable = false } = {}) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail, { cancelable });
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
                return !event.defaultPrevented;
            }
            return true;
        };
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
    function tick() {
        schedule_update();
        return resolved_promise;
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
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
        seen_callbacks.clear();
        set_current_component(saved_component);
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
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
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
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.48.0' }, detail), { bubbles: true }));
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

    /* ..\src\LinkedChart.svelte generated by Svelte v3.48.0 */

    const { Object: Object_1$1, console: console_1 } = globals;
    const file$1 = "..\\src\\LinkedChart.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[52] = list[i][0];
    	child_ctx[53] = list[i][1];
    	child_ctx[55] = i;
    	return child_ctx;
    }

    // (117:4) { #if type == "line" }
    function create_if_block_3(ctx) {
    	let polyline_1;
    	let polyline_1_points_value;

    	const block = {
    		c: function create() {
    			polyline_1 = svg_element("polyline");
    			attr_dev(polyline_1, "points", polyline_1_points_value = /*polyline*/ ctx[26].join(" "));
    			attr_dev(polyline_1, "stroke", /*lineColor*/ ctx[16]);
    			attr_dev(polyline_1, "fill", "transparent");
    			add_location(polyline_1, file$1, 117, 6, 3799);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, polyline_1, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*polyline*/ 67108864 && polyline_1_points_value !== (polyline_1_points_value = /*polyline*/ ctx[26].join(" "))) {
    				attr_dev(polyline_1, "points", polyline_1_points_value);
    			}

    			if (dirty[0] & /*lineColor*/ 65536) {
    				attr_dev(polyline_1, "stroke", /*lineColor*/ ctx[16]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(polyline_1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(117:4) { #if type == \\\"line\\\" }",
    		ctx
    	});

    	return block;
    }

    // (138:6) { #if type == "line" }
    function create_if_block_2(ctx) {
    	let circle;
    	let circle_fill_value;
    	let circle_r_value;
    	let circle_cy_value;
    	let circle_cx_value;

    	const block = {
    		c: function create() {
    			circle = svg_element("circle");

    			attr_dev(circle, "fill", circle_fill_value = /*hover*/ ctx[7] && /*$hoveringKey*/ ctx[23][/*linkedKey*/ ctx[20]] !== null && /*$hoveringKey*/ ctx[23][/*linkedKey*/ ctx[20]] == /*key*/ ctx[52]
    			? /*fill*/ ctx[5]
    			: "transparent");

    			attr_dev(circle, "r", circle_r_value = /*barWidth*/ ctx[21] / 2);
    			attr_dev(circle, "cy", circle_cy_value = /*height*/ ctx[2] - /*getHeight*/ ctx[27](/*value*/ ctx[53]));
    			attr_dev(circle, "cx", circle_cx_value = (parseInt(/*gap*/ ctx[4]) + /*barWidth*/ ctx[21]) * /*i*/ ctx[55]);
    			add_location(circle, file$1, 138, 8, 4782);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, circle, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*hover, $hoveringKey, linkedKey, data, fill*/ 9437345 && circle_fill_value !== (circle_fill_value = /*hover*/ ctx[7] && /*$hoveringKey*/ ctx[23][/*linkedKey*/ ctx[20]] !== null && /*$hoveringKey*/ ctx[23][/*linkedKey*/ ctx[20]] == /*key*/ ctx[52]
    			? /*fill*/ ctx[5]
    			: "transparent")) {
    				attr_dev(circle, "fill", circle_fill_value);
    			}

    			if (dirty[0] & /*barWidth*/ 2097152 && circle_r_value !== (circle_r_value = /*barWidth*/ ctx[21] / 2)) {
    				attr_dev(circle, "r", circle_r_value);
    			}

    			if (dirty[0] & /*height, data*/ 5 && circle_cy_value !== (circle_cy_value = /*height*/ ctx[2] - /*getHeight*/ ctx[27](/*value*/ ctx[53]))) {
    				attr_dev(circle, "cy", circle_cy_value);
    			}

    			if (dirty[0] & /*gap, barWidth*/ 2097168 && circle_cx_value !== (circle_cx_value = (parseInt(/*gap*/ ctx[4]) + /*barWidth*/ ctx[21]) * /*i*/ ctx[55])) {
    				attr_dev(circle, "cx", circle_cx_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(circle);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(138:6) { #if type == \\\"line\\\" }",
    		ctx
    	});

    	return block;
    }

    // (121:4) { #each Object.entries(data) as [key, value], i }
    function create_each_block(ctx) {
    	let rect;
    	let rect_style_value;
    	let rect_opacity_value;
    	let rect_fill_value;
    	let rect_height_value;
    	let rect_y_value;
    	let rect_x_value;
    	let if_block_anchor;
    	let mounted;
    	let dispose;

    	function mouseover_handler() {
    		return /*mouseover_handler*/ ctx[40](/*key*/ ctx[52], /*i*/ ctx[55]);
    	}

    	function focus_handler() {
    		return /*focus_handler*/ ctx[41](/*key*/ ctx[52], /*i*/ ctx[55]);
    	}

    	function touchstart_handler() {
    		return /*touchstart_handler*/ ctx[42](/*key*/ ctx[52], /*i*/ ctx[55]);
    	}

    	function click_handler() {
    		return /*click_handler*/ ctx[43](/*key*/ ctx[52], /*i*/ ctx[55]);
    	}

    	function keypress_handler() {
    		return /*keypress_handler*/ ctx[44](/*key*/ ctx[52], /*i*/ ctx[55]);
    	}

    	let if_block = /*type*/ ctx[15] == "line" && create_if_block_2(ctx);

    	const block = {
    		c: function create() {
    			rect = svg_element("rect");
    			if (if_block) if_block.c();
    			if_block_anchor = empty();

    			attr_dev(rect, "style", rect_style_value = /*transition*/ ctx[8]
    			? `transition: all ${/*transition*/ ctx[8]}ms`
    			: null);

    			attr_dev(rect, "opacity", rect_opacity_value = /*hover*/ ctx[7] && /*$hoveringKey*/ ctx[23][/*linkedKey*/ ctx[20]] && /*$hoveringKey*/ ctx[23][/*linkedKey*/ ctx[20]] != /*key*/ ctx[52]
    			? /*fadeOpacity*/ ctx[6]
    			: 1);

    			attr_dev(rect, "fill", rect_fill_value = /*type*/ ctx[15] == "line"
    			? "transparent"
    			: /*fill*/ ctx[5]);

    			attr_dev(rect, "width", /*barWidth*/ ctx[21]);

    			attr_dev(rect, "height", rect_height_value = /*type*/ ctx[15] == "line"
    			? /*height*/ ctx[2]
    			: /*getHeight*/ ctx[27](/*value*/ ctx[53]));

    			attr_dev(rect, "y", rect_y_value = /*type*/ ctx[15] == "line"
    			? 0
    			: /*height*/ ctx[2] - /*getHeight*/ ctx[27](/*value*/ ctx[53]));

    			attr_dev(rect, "x", rect_x_value = (parseInt(/*gap*/ ctx[4]) + /*barWidth*/ ctx[21]) * /*i*/ ctx[55]);
    			attr_dev(rect, "tabindex", /*tabindex*/ ctx[17]);
    			add_location(rect, file$1, 122, 6, 4021);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, rect, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);

    			if (!mounted) {
    				dispose = [
    					listen_dev(rect, "mouseover", mouseover_handler, false, false, false),
    					listen_dev(rect, "focus", focus_handler, false, false, false),
    					listen_dev(rect, "touchstart", touchstart_handler, { passive: true }, false, false),
    					listen_dev(rect, "click", click_handler, false, false, false),
    					listen_dev(rect, "keypress", keypress_handler, false, false, false)
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

    			if (dirty[0] & /*hover, $hoveringKey, linkedKey, data, fadeOpacity*/ 9437377 && rect_opacity_value !== (rect_opacity_value = /*hover*/ ctx[7] && /*$hoveringKey*/ ctx[23][/*linkedKey*/ ctx[20]] && /*$hoveringKey*/ ctx[23][/*linkedKey*/ ctx[20]] != /*key*/ ctx[52]
    			? /*fadeOpacity*/ ctx[6]
    			: 1)) {
    				attr_dev(rect, "opacity", rect_opacity_value);
    			}

    			if (dirty[0] & /*type, fill*/ 32800 && rect_fill_value !== (rect_fill_value = /*type*/ ctx[15] == "line"
    			? "transparent"
    			: /*fill*/ ctx[5])) {
    				attr_dev(rect, "fill", rect_fill_value);
    			}

    			if (dirty[0] & /*barWidth*/ 2097152) {
    				attr_dev(rect, "width", /*barWidth*/ ctx[21]);
    			}

    			if (dirty[0] & /*type, height, data*/ 32773 && rect_height_value !== (rect_height_value = /*type*/ ctx[15] == "line"
    			? /*height*/ ctx[2]
    			: /*getHeight*/ ctx[27](/*value*/ ctx[53]))) {
    				attr_dev(rect, "height", rect_height_value);
    			}

    			if (dirty[0] & /*type, height, data*/ 32773 && rect_y_value !== (rect_y_value = /*type*/ ctx[15] == "line"
    			? 0
    			: /*height*/ ctx[2] - /*getHeight*/ ctx[27](/*value*/ ctx[53]))) {
    				attr_dev(rect, "y", rect_y_value);
    			}

    			if (dirty[0] & /*gap, barWidth*/ 2097168 && rect_x_value !== (rect_x_value = (parseInt(/*gap*/ ctx[4]) + /*barWidth*/ ctx[21]) * /*i*/ ctx[55])) {
    				attr_dev(rect, "x", rect_x_value);
    			}

    			if (dirty[0] & /*tabindex*/ 131072) {
    				attr_dev(rect, "tabindex", /*tabindex*/ ctx[17]);
    			}

    			if (/*type*/ ctx[15] == "line") {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_2(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(rect);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(121:4) { #each Object.entries(data) as [key, value], i }",
    		ctx
    	});

    	return block;
    }

    // (149:0) { #if showValue && ($hoveringValue[uid] || valueDefault) }
    function create_if_block$2(ctx) {
    	let div;
    	let div_style_value;

    	function select_block_type(ctx, dirty) {
    		if (/*$hoveringValue*/ ctx[24][/*uid*/ ctx[1]] !== null) return create_if_block_1;
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
    			? `position: absolute; transform: translateX(${/*valuePositionOffset*/ ctx[25]}px)`
    			: null);

    			add_location(div, file$1, 149, 2, 5148);
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

    			if (dirty[0] & /*valuePosition, valuePositionOffset*/ 33562624 && div_style_value !== (div_style_value = /*valuePosition*/ ctx[13] == "floating"
    			? `position: absolute; transform: translateX(${/*valuePositionOffset*/ ctx[25]}px)`
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
    		source: "(149:0) { #if showValue && ($hoveringValue[uid] || valueDefault) }",
    		ctx
    	});

    	return block;
    }

    // (155:4) { :else }
    function create_else_block$2(ctx) {
    	let html_tag;
    	let html_anchor;

    	const block = {
    		c: function create() {
    			html_tag = new HtmlTag(false);
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
    		source: "(155:4) { :else }",
    		ctx
    	});

    	return block;
    }

    // (151:4) { #if $hoveringValue[uid] !== null }
    function create_if_block_1(ctx) {
    	let t0;
    	let t1;
    	let span;
    	let t2_value = (/*$hoveringValue*/ ctx[24][/*uid*/ ctx[1]] || /*valueUndefined*/ ctx[14]) + "";
    	let t2;
    	let t3;
    	let t4;

    	const block = {
    		c: function create() {
    			t0 = text(/*valuePrepend*/ ctx[11]);
    			t1 = space();
    			span = element("span");
    			t2 = text(t2_value);
    			t3 = space();
    			t4 = text(/*valueAppend*/ ctx[12]);
    			add_location(span, file$1, 152, 6, 5379);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, span, anchor);
    			append_dev(span, t2);
    			/*span_binding*/ ctx[45](span);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, t4, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*valuePrepend*/ 2048) set_data_dev(t0, /*valuePrepend*/ ctx[11]);
    			if (dirty[0] & /*$hoveringValue, uid, valueUndefined*/ 16793602 && t2_value !== (t2_value = (/*$hoveringValue*/ ctx[24][/*uid*/ ctx[1]] || /*valueUndefined*/ ctx[14]) + "")) set_data_dev(t2, t2_value);
    			if (dirty[0] & /*valueAppend*/ 4096) set_data_dev(t4, /*valueAppend*/ ctx[12]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(span);
    			/*span_binding*/ ctx[45](null);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(t4);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(151:4) { #if $hoveringValue[uid] !== null }",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let svg;
    	let g;
    	let if_block0_anchor;
    	let g_transform_value;
    	let svg_height_value;
    	let svg_viewBox_value;
    	let t;
    	let if_block1_anchor;
    	let mounted;
    	let dispose;
    	let if_block0 = /*type*/ ctx[15] == "line" && create_if_block_3(ctx);
    	let each_value = Object.entries(/*data*/ ctx[0]);
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	let if_block1 = /*showValue*/ ctx[9] && (/*$hoveringValue*/ ctx[24][/*uid*/ ctx[1]] || /*valueDefault*/ ctx[10]) && create_if_block$2(ctx);

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			g = svg_element("g");
    			if (if_block0) if_block0.c();
    			if_block0_anchor = empty();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t = space();
    			if (if_block1) if_block1.c();
    			if_block1_anchor = empty();
    			attr_dev(g, "transform", g_transform_value = "translate(" + /*alignmentOffset*/ ctx[22] + ", 0)");
    			add_location(g, file$1, 115, 2, 3714);
    			attr_dev(svg, "width", /*width*/ ctx[3]);

    			attr_dev(svg, "height", svg_height_value = /*type*/ ctx[15] == "line"
    			? /*height*/ ctx[2] + /*barWidth*/ ctx[21] / 2
    			: /*height*/ ctx[2]);

    			attr_dev(svg, "viewBox", svg_viewBox_value = "0 0 " + /*width*/ ctx[3] + " " + /*height*/ ctx[2]);
    			attr_dev(svg, "preserveAspectRatio", "none");
    			add_location(svg, file$1, 107, 0, 3506);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, g);
    			if (if_block0) if_block0.m(g, null);
    			append_dev(g, if_block0_anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(g, null);
    			}

    			insert_dev(target, t, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert_dev(target, if_block1_anchor, anchor);

    			if (!mounted) {
    				dispose = [
    					listen_dev(svg, "mouseleave", /*endHover*/ ctx[29], false, false, false),
    					listen_dev(svg, "blur", /*endHover*/ ctx[29], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (/*type*/ ctx[15] == "line") {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_3(ctx);
    					if_block0.c();
    					if_block0.m(g, if_block0_anchor);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (dirty[0] & /*hover, $hoveringKey, linkedKey, data, fill, barWidth, height, getHeight, gap, type, transition, fadeOpacity, tabindex, startHover, clickHandler*/ 414614005) {
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

    			if (dirty[0] & /*alignmentOffset*/ 4194304 && g_transform_value !== (g_transform_value = "translate(" + /*alignmentOffset*/ ctx[22] + ", 0)")) {
    				attr_dev(g, "transform", g_transform_value);
    			}

    			if (dirty[0] & /*width*/ 8) {
    				attr_dev(svg, "width", /*width*/ ctx[3]);
    			}

    			if (dirty[0] & /*type, height, barWidth*/ 2129924 && svg_height_value !== (svg_height_value = /*type*/ ctx[15] == "line"
    			? /*height*/ ctx[2] + /*barWidth*/ ctx[21] / 2
    			: /*height*/ ctx[2])) {
    				attr_dev(svg, "height", svg_height_value);
    			}

    			if (dirty[0] & /*width, height*/ 12 && svg_viewBox_value !== (svg_viewBox_value = "0 0 " + /*width*/ ctx[3] + " " + /*height*/ ctx[2])) {
    				attr_dev(svg, "viewBox", svg_viewBox_value);
    			}

    			if (/*showValue*/ ctx[9] && (/*$hoveringValue*/ ctx[24][/*uid*/ ctx[1]] || /*valueDefault*/ ctx[10])) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block$2(ctx);
    					if_block1.c();
    					if_block1.m(if_block1_anchor.parentNode, if_block1_anchor);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    			if (if_block0) if_block0.d();
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(t);
    			if (if_block1) if_block1.d(detaching);
    			if (detaching) detach_dev(if_block1_anchor);
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
    	component_subscribe($$self, hoveringKey, $$value => $$invalidate(23, $hoveringKey = $$value));
    	validate_store(hoveringValue, 'hoveringValue');
    	component_subscribe($$self, hoveringValue, $$value => $$invalidate(24, $hoveringValue = $$value));
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
    	let { barMinHeight = 0 } = $$props;
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
    	let { valueUndefined = 0 } = $$props;
    	let { scaleMax = 0 } = $$props;
    	let { type = "bar" } = $$props;
    	let { lineColor = fill } = $$props;
    	let { tabindex = -1 } = $$props;
    	let { dispatchEvents = false } = $$props;
    	let { clickHandler = (key, i) => null } = $$props;
    	const dispatch = createEventDispatcher();
    	let valuePositionOffset = 0;
    	let polyline = [];
    	let valueElement;

    	function getHighestValue() {
    		if (scaleMax) return scaleMax;
    		if (dataLength) return Math.max(...Object.values(data));
    		return 0;
    	}

    	function getHeight(value) {
    		return Math.max(Math.round(parseInt(height) / highestValue * value - (type == "line" ? barWidth / 2 : 0)) || 0, barMinHeight);
    	}

    	function getBarWidth() {
    		return Math.max((parseInt(width) - dataLength * parseInt(gap)) / dataLength, parseInt(barMinWidth));
    	}

    	function getAlignment() {
    		if (align == "left") return 0;
    		return parseInt(gap) + parseInt(width) - (parseInt(gap) + barWidth) * dataLength;
    	}

    	function getPolyLinePoints() {
    		let points = [];

    		for (let i = 0; i < Object.keys(data).length; i++) {
    			points.push([i * (barWidth + gap), height - getHeight(Object.values(data)[i])]);
    		}

    		return points;
    	}

    	async function startHover(key, index) {
    		if (!hover) return;
    		set_store_value(hoveringKey, $hoveringKey[linkedKey] = key, $hoveringKey);
    		await tick();

    		if (dispatchEvents) dispatch('hover', {
    			uid,
    			key,
    			index,
    			linkedKey,
    			value: $hoveringValue[uid],
    			valueElement,
    			eventElement: event.target
    		});
    	}

    	async function endHover() {
    		if (!hover) return;
    		set_store_value(hoveringKey, $hoveringKey[linkedKey] = null, $hoveringKey);
    		await tick();

    		if (dispatchEvents) dispatch('blur', {
    			uid,
    			linkedKey,
    			valueElement,
    			eventElement: event.target
    		});
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
    		'barMinHeight',
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
    		'valueUndefined',
    		'scaleMax',
    		'type',
    		'lineColor',
    		'tabindex',
    		'dispatchEvents',
    		'clickHandler'
    	];

    	Object_1$1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<LinkedChart> was created with unknown prop '${key}'`);
    	});

    	const mouseover_handler = (key, i) => startHover(key, i);
    	const focus_handler = (key, i) => startHover(key, i);
    	const touchstart_handler = (key, i) => startHover(key, i);
    	const click_handler = (key, i) => clickHandler(key, i);
    	const keypress_handler = (key, i) => clickHandler(key, i);

    	function span_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			valueElement = $$value;
    			$$invalidate(19, valueElement);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ('uid' in $$props) $$invalidate(1, uid = $$props.uid);
    		if ('data' in $$props) $$invalidate(0, data = $$props.data);
    		if ('labels' in $$props) $$invalidate(30, labels = $$props.labels);
    		if ('values' in $$props) $$invalidate(31, values = $$props.values);
    		if ('linked' in $$props) $$invalidate(32, linked = $$props.linked);
    		if ('height' in $$props) $$invalidate(2, height = $$props.height);
    		if ('width' in $$props) $$invalidate(3, width = $$props.width);
    		if ('barMinWidth' in $$props) $$invalidate(33, barMinWidth = $$props.barMinWidth);
    		if ('barMinHeight' in $$props) $$invalidate(34, barMinHeight = $$props.barMinHeight);
    		if ('grow' in $$props) $$invalidate(35, grow = $$props.grow);
    		if ('align' in $$props) $$invalidate(36, align = $$props.align);
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
    		if ('valueUndefined' in $$props) $$invalidate(14, valueUndefined = $$props.valueUndefined);
    		if ('scaleMax' in $$props) $$invalidate(37, scaleMax = $$props.scaleMax);
    		if ('type' in $$props) $$invalidate(15, type = $$props.type);
    		if ('lineColor' in $$props) $$invalidate(16, lineColor = $$props.lineColor);
    		if ('tabindex' in $$props) $$invalidate(17, tabindex = $$props.tabindex);
    		if ('dispatchEvents' in $$props) $$invalidate(38, dispatchEvents = $$props.dispatchEvents);
    		if ('clickHandler' in $$props) $$invalidate(18, clickHandler = $$props.clickHandler);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		tick,
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
    		barMinHeight,
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
    		valueUndefined,
    		scaleMax,
    		type,
    		lineColor,
    		tabindex,
    		dispatchEvents,
    		clickHandler,
    		dispatch,
    		valuePositionOffset,
    		polyline,
    		valueElement,
    		getHighestValue,
    		getHeight,
    		getBarWidth,
    		getAlignment,
    		getPolyLinePoints,
    		startHover,
    		endHover,
    		linkedKey,
    		barWidth,
    		dataLength,
    		highestValue,
    		alignmentOffset,
    		$hoveringKey,
    		$hoveringValue
    	});

    	$$self.$inject_state = $$props => {
    		if ('uid' in $$props) $$invalidate(1, uid = $$props.uid);
    		if ('data' in $$props) $$invalidate(0, data = $$props.data);
    		if ('labels' in $$props) $$invalidate(30, labels = $$props.labels);
    		if ('values' in $$props) $$invalidate(31, values = $$props.values);
    		if ('linked' in $$props) $$invalidate(32, linked = $$props.linked);
    		if ('height' in $$props) $$invalidate(2, height = $$props.height);
    		if ('width' in $$props) $$invalidate(3, width = $$props.width);
    		if ('barMinWidth' in $$props) $$invalidate(33, barMinWidth = $$props.barMinWidth);
    		if ('barMinHeight' in $$props) $$invalidate(34, barMinHeight = $$props.barMinHeight);
    		if ('grow' in $$props) $$invalidate(35, grow = $$props.grow);
    		if ('align' in $$props) $$invalidate(36, align = $$props.align);
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
    		if ('valueUndefined' in $$props) $$invalidate(14, valueUndefined = $$props.valueUndefined);
    		if ('scaleMax' in $$props) $$invalidate(37, scaleMax = $$props.scaleMax);
    		if ('type' in $$props) $$invalidate(15, type = $$props.type);
    		if ('lineColor' in $$props) $$invalidate(16, lineColor = $$props.lineColor);
    		if ('tabindex' in $$props) $$invalidate(17, tabindex = $$props.tabindex);
    		if ('dispatchEvents' in $$props) $$invalidate(38, dispatchEvents = $$props.dispatchEvents);
    		if ('clickHandler' in $$props) $$invalidate(18, clickHandler = $$props.clickHandler);
    		if ('valuePositionOffset' in $$props) $$invalidate(25, valuePositionOffset = $$props.valuePositionOffset);
    		if ('polyline' in $$props) $$invalidate(26, polyline = $$props.polyline);
    		if ('valueElement' in $$props) $$invalidate(19, valueElement = $$props.valueElement);
    		if ('linkedKey' in $$props) $$invalidate(20, linkedKey = $$props.linkedKey);
    		if ('barWidth' in $$props) $$invalidate(21, barWidth = $$props.barWidth);
    		if ('dataLength' in $$props) $$invalidate(39, dataLength = $$props.dataLength);
    		if ('highestValue' in $$props) highestValue = $$props.highestValue;
    		if ('alignmentOffset' in $$props) $$invalidate(22, alignmentOffset = $$props.alignmentOffset);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*labels*/ 1073741824 | $$self.$$.dirty[1] & /*values*/ 1) {
    			if (labels.length && values.length) $$invalidate(0, data = Object.fromEntries(labels.map((_, i) => [labels[i], values[i]])));
    		}

    		if ($$self.$$.dirty[0] & /*data*/ 1) {
    			$$invalidate(39, dataLength = Object.keys(data).length);
    		}

    		if ($$self.$$.dirty[1] & /*grow, dataLength, barMinWidth*/ 276) {
    			$$invalidate(21, barWidth = grow ? getBarWidth() : parseInt(barMinWidth));
    		}

    		if ($$self.$$.dirty[1] & /*dataLength*/ 256) {
    			highestValue = getHighestValue();
    		}

    		if ($$self.$$.dirty[1] & /*dataLength*/ 256) {
    			$$invalidate(22, alignmentOffset = dataLength ? getAlignment() : 0);
    		}

    		if ($$self.$$.dirty[1] & /*linked*/ 2) {
    			$$invalidate(20, linkedKey = linked || (Math.random() + 1).toString(36).substring(7));
    		}

    		if ($$self.$$.dirty[0] & /*valuePosition, gap, barWidth, data, $hoveringKey, linkedKey, alignmentOffset*/ 15736849) {
    			if (valuePosition == "floating") $$invalidate(25, valuePositionOffset = (parseInt(gap) + barWidth) * Object.keys(data).indexOf($hoveringKey[linkedKey]) + alignmentOffset);
    		}

    		if ($$self.$$.dirty[0] & /*type, data*/ 32769) {
    			if (type == "line") $$invalidate(26, polyline = getPolyLinePoints());
    		}

    		if ($$self.$$.dirty[0] & /*$hoveringKey, linkedKey, uid, data*/ 9437187) {
    			{
    				if ($hoveringKey[linkedKey]) {
    					set_store_value(hoveringValue, $hoveringValue[uid] = data[$hoveringKey[linkedKey]], $hoveringValue);
    				} else {
    					set_store_value(hoveringValue, $hoveringValue[uid] = null, $hoveringValue);
    				}
    			}
    		}

    		if ($$self.$$.dirty[0] & /*$hoveringValue, uid, linkedKey, valueElement*/ 18350082 | $$self.$$.dirty[1] & /*dispatchEvents*/ 128) {
    			if (dispatchEvents) dispatch('value-update', {
    				value: $hoveringValue[uid],
    				uid,
    				linkedKey,
    				valueElement
    			});
    		}

    		if ($$self.$$.dirty[0] & /*tabindex*/ 131072) {
    			if (tabindex > 0) console.warn("Tabindex should not be higher than 0");
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
    		valueUndefined,
    		type,
    		lineColor,
    		tabindex,
    		clickHandler,
    		valueElement,
    		linkedKey,
    		barWidth,
    		alignmentOffset,
    		$hoveringKey,
    		$hoveringValue,
    		valuePositionOffset,
    		polyline,
    		getHeight,
    		startHover,
    		endHover,
    		labels,
    		values,
    		linked,
    		barMinWidth,
    		barMinHeight,
    		grow,
    		align,
    		scaleMax,
    		dispatchEvents,
    		dataLength,
    		mouseover_handler,
    		focus_handler,
    		touchstart_handler,
    		click_handler,
    		keypress_handler,
    		span_binding
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
    				labels: 30,
    				values: 31,
    				linked: 32,
    				height: 2,
    				width: 3,
    				barMinWidth: 33,
    				barMinHeight: 34,
    				grow: 35,
    				align: 36,
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
    				valueUndefined: 14,
    				scaleMax: 37,
    				type: 15,
    				lineColor: 16,
    				tabindex: 17,
    				dispatchEvents: 38,
    				clickHandler: 18
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

    	get barMinHeight() {
    		throw new Error("<LinkedChart>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set barMinHeight(value) {
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

    	get valueUndefined() {
    		throw new Error("<LinkedChart>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set valueUndefined(value) {
    		throw new Error("<LinkedChart>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get scaleMax() {
    		throw new Error("<LinkedChart>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set scaleMax(value) {
    		throw new Error("<LinkedChart>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get type() {
    		throw new Error("<LinkedChart>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set type(value) {
    		throw new Error("<LinkedChart>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get lineColor() {
    		throw new Error("<LinkedChart>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set lineColor(value) {
    		throw new Error("<LinkedChart>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get tabindex() {
    		throw new Error("<LinkedChart>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set tabindex(value) {
    		throw new Error("<LinkedChart>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get dispatchEvents() {
    		throw new Error("<LinkedChart>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set dispatchEvents(value) {
    		throw new Error("<LinkedChart>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get clickHandler() {
    		throw new Error("<LinkedChart>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set clickHandler(value) {
    		throw new Error("<LinkedChart>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* ..\src\LinkedLabel.svelte generated by Svelte v3.48.0 */

    // (14:0) { :else }
    function create_else_block$1(ctx) {
    	let html_tag;
    	let html_anchor;

    	const block = {
    		c: function create() {
    			html_tag = new HtmlTag(false);
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

    /* ..\src\LinkedValue.svelte generated by Svelte v3.48.0 */

    // (15:0) { :else }
    function create_else_block(ctx) {
    	let html_tag;
    	let html_anchor;

    	const block = {
    		c: function create() {
    			html_tag = new HtmlTag(false);
    			html_anchor = empty();
    			html_tag.a = html_anchor;
    		},
    		m: function mount(target, anchor) {
    			html_tag.m(/*empty*/ ctx[1], target, anchor);
    			insert_dev(target, html_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*empty*/ 2) html_tag.p(/*empty*/ ctx[1]);
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
    		source: "(15:0) { :else }",
    		ctx
    	});

    	return block;
    }

    // (13:0) { #if uid in $hoveringValue && value !== null }
    function create_if_block(ctx) {
    	let t_value = (/*value*/ ctx[4] || /*valueUndefined*/ ctx[2]) + "";
    	let t;

    	const block = {
    		c: function create() {
    			t = text(t_value);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*value, valueUndefined*/ 20 && t_value !== (t_value = (/*value*/ ctx[4] || /*valueUndefined*/ ctx[2]) + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(13:0) { #if uid in $hoveringValue && value !== null }",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let if_block_anchor;

    	function select_block_type(ctx, dirty) {
    		if (/*uid*/ ctx[0] in /*$hoveringValue*/ ctx[3] && /*value*/ ctx[4] !== null) return create_if_block;
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
    	let { valueUndefined = 0 } = $$props;
    	const writable_props = ['uid', 'empty', 'valueUndefined'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<LinkedValue> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('uid' in $$props) $$invalidate(0, uid = $$props.uid);
    		if ('empty' in $$props) $$invalidate(1, empty = $$props.empty);
    		if ('valueUndefined' in $$props) $$invalidate(2, valueUndefined = $$props.valueUndefined);
    	};

    	$$self.$capture_state = () => ({
    		hoveringValue,
    		uid,
    		empty,
    		valueUndefined,
    		value,
    		$hoveringValue
    	});

    	$$self.$inject_state = $$props => {
    		if ('uid' in $$props) $$invalidate(0, uid = $$props.uid);
    		if ('empty' in $$props) $$invalidate(1, empty = $$props.empty);
    		if ('valueUndefined' in $$props) $$invalidate(2, valueUndefined = $$props.valueUndefined);
    		if ('value' in $$props) $$invalidate(4, value = $$props.value);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$hoveringValue, uid*/ 9) {
    			$$invalidate(4, value = $hoveringValue[uid]);
    		}
    	};

    	return [uid, empty, valueUndefined, $hoveringValue, value];
    }

    class LinkedValue extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { uid: 0, empty: 1, valueUndefined: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "LinkedValue",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*uid*/ ctx[0] === undefined && !('uid' in props)) {
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

    	get valueUndefined() {
    		throw new Error("<LinkedValue>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set valueUndefined(value) {
    		throw new Error("<LinkedValue>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\App.svelte generated by Svelte v3.48.0 */

    const { Object: Object_1 } = globals;
    const file = "src\\App.svelte";

    function create_fragment(ctx) {
    	let div143;
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
    	let em;
    	let t7;
    	let p2;
    	let a0;
    	let t9;
    	let h20;
    	let t11;
    	let table;
    	let tr0;
    	let th0;
    	let t13;
    	let th1;
    	let linkedlabel0;
    	let t14;
    	let th2;
    	let t16;
    	let tr1;
    	let td0;
    	let t18;
    	let td1;
    	let linkedchart1;
    	let t19;
    	let td2;
    	let linkedvalue0;
    	let t20;
    	let tr2;
    	let td3;
    	let t22;
    	let td4;
    	let linkedchart2;
    	let t23;
    	let td5;
    	let linkedvalue1;
    	let t24;
    	let tr3;
    	let td6;
    	let t26;
    	let td7;
    	let linkedchart3;
    	let t27;
    	let td8;
    	let linkedvalue2;
    	let t28;
    	let tr4;
    	let td9;
    	let t30;
    	let td10;
    	let linkedchart4;
    	let t31;
    	let td11;
    	let linkedvalue3;
    	let t32;
    	let tr5;
    	let td12;
    	let t34;
    	let td13;
    	let linkedchart5;
    	let t35;
    	let td14;
    	let linkedvalue4;
    	let t36;
    	let tr6;
    	let td15;
    	let t38;
    	let td16;
    	let linkedchart6;
    	let t39;
    	let td17;
    	let linkedvalue5;
    	let t40;
    	let h21;
    	let t42;
    	let p3;
    	let t44;
    	let code0;
    	let t45;
    	let mark1;
    	let t47;
    	let code1;
    	let t48;
    	let mark2;
    	let t50;
    	let p4;
    	let t52;
    	let code2;
    	let t53;
    	let mark3;
    	let t55;
    	let t56;
    	let code3;
    	let t57;
    	let mark4;
    	let t59;
    	let mark5;
    	let t61;
    	let mark6;
    	let t63;
    	let mark7;
    	let t65;
    	let t66;
    	let div2;
    	let p5;
    	let t68;
    	let code4;
    	let t69;
    	let br0;
    	let t70;
    	let br1;
    	let t71;
    	let br2;
    	let t72;
    	let br3;
    	let t73;
    	let br4;
    	let t74;
    	let br5;
    	let t75;
    	let t76;
    	let code5;
    	let t78;
    	let p6;
    	let t80;
    	let code6;
    	let t81;
    	let br6;
    	let t82;
    	let br7;
    	let t83;
    	let br8;
    	let t84;
    	let br9;
    	let t85;
    	let br10;
    	let t86;
    	let br11;
    	let t87;
    	let t88;
    	let code7;
    	let t89;
    	let br12;
    	let t90;
    	let br13;
    	let t91;
    	let br14;
    	let t92;
    	let br15;
    	let t93;
    	let br16;
    	let t94;
    	let br17;
    	let t95;
    	let t96;
    	let code8;
    	let t98;
    	let h22;
    	let t100;
    	let div4;
    	let div3;
    	let t101;
    	let code9;
    	let t103;
    	let linkedchart7;
    	let t104;
    	let div11;
    	let div5;
    	let t105;
    	let code10;
    	let t106;
    	let br18;
    	let t107;
    	let br19;
    	let t108;
    	let br20;
    	let t109;
    	let t110;
    	let div10;
    	let div6;
    	let linkedchart8;
    	let t111;
    	let div7;
    	let linkedchart9;
    	let t112;
    	let div8;
    	let linkedchart10;
    	let t113;
    	let div9;
    	let linkedchart11;
    	let t114;
    	let div16;
    	let div12;
    	let t115;
    	let code11;
    	let t116;
    	let br21;
    	let t117;
    	let t118;
    	let div15;
    	let div13;
    	let linkedchart12;
    	let t119;
    	let div14;
    	let linkedchart13;
    	let t120;
    	let h23;
    	let t122;
    	let div21;
    	let div17;
    	let t123;
    	let code12;
    	let t124;
    	let br22;
    	let t125;
    	let br23;
    	let t126;
    	let br24;
    	let t127;
    	let t128;
    	let br25;
    	let t129;
    	let t130;
    	let div20;
    	let linkedlabel1;
    	let t131;
    	let div18;
    	let linkedchart14;
    	let t132;
    	let div19;
    	let linkedchart15;
    	let t133;
    	let div26;
    	let div22;
    	let t134;
    	let code13;
    	let t136;
    	let br26;
    	let t137;
    	let code14;
    	let t138;
    	let br27;
    	let t139;
    	let br28;
    	let t140;
    	let br29;
    	let t141;
    	let br30;
    	let t142;
    	let br31;
    	let t143;
    	let t144;
    	let br32;
    	let t145;
    	let t146;
    	let div25;
    	let div23;
    	let linkedchart16;
    	let t147;
    	let div24;
    	let linkedchart17;
    	let t148;
    	let div31;
    	let div27;
    	let t149;
    	let code15;
    	let t150;
    	let br33;
    	let t151;
    	let br34;
    	let t152;
    	let br35;
    	let t153;
    	let t154;
    	let br36;
    	let t155;
    	let t156;
    	let div30;
    	let div28;
    	let linkedchart18;
    	let t157;
    	let br37;
    	let t158;
    	let div29;
    	let linkedchart19;
    	let t159;
    	let div34;
    	let t160;
    	let code16;
    	let t161;
    	let br38;
    	let t162;
    	let br39;
    	let t163;
    	let br40;
    	let t164;
    	let br41;
    	let br42;
    	let t165;
    	let div32;
    	let linkedchart20;
    	let t166;
    	let strong0;
    	let linkedvalue6;
    	let t167;
    	let div33;
    	let linkedchart21;
    	let t168;
    	let strong1;
    	let linkedvalue7;
    	let t169;
    	let h24;
    	let t171;
    	let div36;
    	let div35;
    	let t172;
    	let code17;
    	let t174;
    	let linkedchart22;
    	let t175;
    	let div41;
    	let div37;
    	let t176;
    	let code18;
    	let t177;
    	let br43;
    	let t178;
    	let t179;
    	let div40;
    	let div38;
    	let linkedchart23;
    	let t180;
    	let div39;
    	let linkedchart24;
    	let t181;
    	let div46;
    	let div42;
    	let t182;
    	let code19;
    	let t183;
    	let br44;
    	let t184;
    	let t185;
    	let div45;
    	let div43;
    	let linkedchart25;
    	let t186;
    	let div44;
    	let linkedchart26;
    	let t187;
    	let div51;
    	let div47;
    	let t188;
    	let code20;
    	let t189;
    	let br45;
    	let t190;
    	let br46;
    	let t191;
    	let br47;
    	let t192;
    	let t193;
    	let div50;
    	let div48;
    	let linkedchart27;
    	let t194;
    	let div49;
    	let linkedchart28;
    	let t195;
    	let div56;
    	let div52;
    	let t196;
    	let code21;
    	let t197;
    	let br48;
    	let t198;
    	let br49;
    	let t199;
    	let br50;
    	let t200;
    	let t201;
    	let code22;
    	let t202;
    	let br51;
    	let t203;
    	let br52;
    	let t204;
    	let br53;
    	let t205;
    	let t206;
    	let br54;
    	let t207;
    	let code23;
    	let t208;
    	let br55;
    	let t209;
    	let br56;
    	let t210;
    	let br57;
    	let t211;
    	let t212;
    	let div55;
    	let div53;
    	let linkedchart29;
    	let t213;
    	let div54;
    	let linkedchart30;
    	let t214;
    	let div61;
    	let div57;
    	let t215;
    	let code24;
    	let t216;
    	let br58;
    	let t217;
    	let t218;
    	let div60;
    	let div58;
    	let linkedchart31;
    	let t219;
    	let div59;
    	let linkedchart32;
    	let t220;
    	let div66;
    	let div62;
    	let t221;
    	let code25;
    	let t223;
    	let div65;
    	let div63;
    	let linkedchart33;
    	let t224;
    	let div64;
    	let linkedchart34;
    	let t225;
    	let div77;
    	let div67;
    	let t226;
    	let code26;
    	let t227;
    	let br59;
    	let t228;
    	let br60;
    	let t229;
    	let t230;
    	let div76;
    	let div68;
    	let linkedchart35;
    	let t231;
    	let div69;
    	let linkedchart36;
    	let t232;
    	let div70;
    	let linkedchart37;
    	let t233;
    	let div71;
    	let linkedchart38;
    	let t234;
    	let div72;
    	let linkedchart39;
    	let t235;
    	let div73;
    	let linkedchart40;
    	let t236;
    	let div74;
    	let linkedchart41;
    	let t237;
    	let div75;
    	let linkedchart42;
    	let t238;
    	let div79;
    	let div78;
    	let t239;
    	let code27;
    	let t241;
    	let linkedchart43;
    	let t242;
    	let div81;
    	let div80;
    	let t243;
    	let code28;
    	let t245;
    	let linkedchart44;
    	let t246;
    	let div83;
    	let div82;
    	let t247;
    	let br61;
    	let t248;
    	let code29;
    	let t250;
    	let linkedchart45;
    	let t251;
    	let div87;
    	let div84;
    	let t252;
    	let code30;
    	let t253;
    	let br62;
    	let t254;
    	let div86;
    	let div85;
    	let linkedchart46;
    	let t255;
    	let div94;
    	let div88;
    	let t256;
    	let code31;
    	let t257;
    	let br63;
    	let t258;
    	let br64;
    	let t259;
    	let br65;
    	let t260;
    	let br66;
    	let t261;
    	let br67;
    	let t262;
    	let t263;
    	let div93;
    	let div89;
    	let linkedchart47;
    	let t264;
    	let div90;
    	let linkedchart48;
    	let t265;
    	let div91;
    	let linkedchart49;
    	let t266;
    	let div92;
    	let linkedchart50;
    	let t267;
    	let h25;
    	let t269;
    	let div102;
    	let div101;
    	let t270;
    	let code32;
    	let t271;
    	let br68;
    	let t272;
    	let br69;
    	let t273;
    	let br70;
    	let t274;
    	let br71;
    	let t275;
    	let t276;
    	let p7;
    	let t278;
    	let div95;
    	let linkedchart51;
    	let t279;
    	let span;
    	let t281;
    	let code33;
    	let t282;
    	let br72;
    	let t283;
    	let br73;
    	let t284;
    	let br74;
    	let t285;
    	let br75;
    	let t286;
    	let br76;
    	let t287;
    	let br77;
    	let t288;
    	let br78;
    	let t289;
    	let br79;
    	let t290;
    	let br80;
    	let t291;
    	let br81;
    	let t292;
    	let t293;
    	let br82;
    	let t294;
    	let p8;
    	let t296;
    	let div96;
    	let linkedchart52;
    	let t297;
    	let code34;
    	let t298;
    	let br83;
    	let t299;
    	let br84;
    	let t300;
    	let br85;
    	let t301;
    	let br86;
    	let t302;
    	let br87;
    	let t303;
    	let br88;
    	let t304;
    	let br89;
    	let t305;
    	let br90;
    	let t306;
    	let br91;
    	let t307;
    	let t308;
    	let br92;
    	let t309;
    	let h3;
    	let t311;
    	let div100;
    	let strong2;
    	let t313;
    	let strong3;
    	let t315;
    	let strong4;
    	let t317;
    	let code35;
    	let t319;
    	let div97;
    	let t321;
    	let code36;
    	let t323;
    	let code37;
    	let t325;
    	let div98;
    	let t327;
    	let code38;
    	let t329;
    	let code39;
    	let t331;
    	let div99;
    	let t333;
    	let code40;
    	let t335;
    	let h26;
    	let t337;
    	let div132;
    	let p9;
    	let t339;
    	let div131;
    	let strong5;
    	let t341;
    	let strong6;
    	let t343;
    	let strong7;
    	let t345;
    	let code41;
    	let t347;
    	let code42;
    	let t349;
    	let div103;
    	let t351;
    	let code43;
    	let t353;
    	let code44;
    	let t355;
    	let div104;
    	let t357;
    	let code45;
    	let t359;
    	let code46;
    	let t361;
    	let div105;
    	let t363;
    	let code47;
    	let t365;
    	let code48;
    	let t366;
    	let div106;
    	let t368;
    	let code49;
    	let t370;
    	let code50;
    	let t371;
    	let div107;
    	let t373;
    	let code51;
    	let t375;
    	let code52;
    	let t377;
    	let div108;
    	let t379;
    	let code53;
    	let t381;
    	let code54;
    	let t383;
    	let div109;
    	let t385;
    	let code55;
    	let t387;
    	let code56;
    	let t389;
    	let div110;
    	let t391;
    	let code57;
    	let t393;
    	let code58;
    	let t395;
    	let div111;
    	let t397;
    	let code59;
    	let t399;
    	let code60;
    	let t401;
    	let div112;
    	let t403;
    	let code61;
    	let t405;
    	let code62;
    	let t407;
    	let div113;
    	let t409;
    	let code63;
    	let t411;
    	let code64;
    	let t413;
    	let div114;
    	let t415;
    	let code65;
    	let t417;
    	let code66;
    	let t419;
    	let div115;
    	let t421;
    	let code67;
    	let t423;
    	let code68;
    	let t425;
    	let div116;
    	let t427;
    	let code69;
    	let t429;
    	let code70;
    	let t431;
    	let div117;
    	let t433;
    	let code71;
    	let t435;
    	let code72;
    	let t437;
    	let div118;
    	let t439;
    	let code73;
    	let t441;
    	let code74;
    	let t443;
    	let div119;
    	let t445;
    	let code75;
    	let t447;
    	let code76;
    	let t449;
    	let div120;
    	let t451;
    	let code77;
    	let t453;
    	let code78;
    	let t455;
    	let div121;
    	let t457;
    	let code79;
    	let t459;
    	let code80;
    	let t460;
    	let div122;
    	let t462;
    	let code81;
    	let t464;
    	let code82;
    	let t465;
    	let div123;
    	let t467;
    	let code83;
    	let t469;
    	let code84;
    	let t471;
    	let div124;
    	let t473;
    	let code85;
    	let t475;
    	let code86;
    	let t477;
    	let div125;
    	let t479;
    	let code87;
    	let t481;
    	let code88;
    	let t483;
    	let div126;
    	let t485;
    	let code89;
    	let t487;
    	let code90;
    	let t489;
    	let div127;
    	let t491;
    	let code91;
    	let t493;
    	let code92;
    	let t495;
    	let div128;
    	let t497;
    	let code93;
    	let t499;
    	let code94;
    	let t501;
    	let div129;
    	let t503;
    	let code95;
    	let t505;
    	let code96;
    	let t507;
    	let div130;
    	let t509;
    	let div136;
    	let p10;
    	let t511;
    	let div135;
    	let strong8;
    	let t513;
    	let strong9;
    	let t515;
    	let strong10;
    	let t517;
    	let code97;
    	let t519;
    	let code98;
    	let t520;
    	let div133;
    	let t522;
    	let code99;
    	let t524;
    	let code100;
    	let t526;
    	let div134;
    	let t528;
    	let div141;
    	let p11;
    	let t530;
    	let div140;
    	let strong11;
    	let t532;
    	let strong12;
    	let t534;
    	let strong13;
    	let t536;
    	let code101;
    	let t538;
    	let code102;
    	let t539;
    	let div137;
    	let t541;
    	let code103;
    	let t543;
    	let code104;
    	let t545;
    	let div138;
    	let t547;
    	let code105;
    	let t549;
    	let code106;
    	let t551;
    	let div139;
    	let t553;
    	let div142;
    	let t554;
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

    	linkedlabel0 = new LinkedLabel({
    			props: { linked: "table", empty: "30 day period" },
    			$$inline: true
    		});

    	linkedchart1 = new LinkedChart({
    			props: {
    				data: fakeData(30),
    				linked: "table",
    				uid: "table-1"
    			},
    			$$inline: true
    		});

    	linkedvalue0 = new LinkedValue({
    			props: {
    				uid: "table-1",
    				empty: Object.values(fakeData(30)).reduce(func)
    			},
    			$$inline: true
    		});

    	linkedchart2 = new LinkedChart({
    			props: {
    				data: fakeData(30),
    				linked: "table",
    				uid: "table-2"
    			},
    			$$inline: true
    		});

    	linkedvalue1 = new LinkedValue({
    			props: {
    				uid: "table-2",
    				empty: Object.values(fakeData(30)).reduce(func_1)
    			},
    			$$inline: true
    		});

    	linkedchart3 = new LinkedChart({
    			props: {
    				data: fakeData(30),
    				linked: "table",
    				uid: "table-3"
    			},
    			$$inline: true
    		});

    	linkedvalue2 = new LinkedValue({
    			props: {
    				uid: "table-3",
    				empty: Object.values(fakeData(30)).reduce(func_2)
    			},
    			$$inline: true
    		});

    	linkedchart4 = new LinkedChart({
    			props: {
    				data: fakeData(15),
    				linked: "table",
    				uid: "table-4"
    			},
    			$$inline: true
    		});

    	linkedvalue3 = new LinkedValue({
    			props: {
    				uid: "table-4",
    				empty: Object.values(fakeData(15)).reduce(func_3)
    			},
    			$$inline: true
    		});

    	linkedchart5 = new LinkedChart({
    			props: {
    				data: /*transitioningData*/ ctx[0],
    				linked: "table",
    				uid: "table-5",
    				transition: "100",
    				fill: "hsl(" + /*transitionColor*/ ctx[1] + ", 60%, 50%)"
    			},
    			$$inline: true
    		});

    	linkedvalue4 = new LinkedValue({
    			props: {
    				uid: "table-5",
    				empty: Object.values(/*transitioningData*/ ctx[0]).reduce(func_4)
    			},
    			$$inline: true
    		});

    	linkedchart6 = new LinkedChart({
    			props: {
    				data: fakeData(30),
    				linked: "table",
    				uid: "table-6",
    				type: "line"
    			},
    			$$inline: true
    		});

    	linkedvalue5 = new LinkedValue({
    			props: {
    				uid: "table-6",
    				empty: Object.values(fakeData(30)).reduce(func_5)
    			},
    			$$inline: true
    		});

    	linkedchart7 = new LinkedChart({
    			props: { data: fakeData(30) },
    			$$inline: true
    		});

    	linkedchart8 = new LinkedChart({
    			props: { data: fakeData(30), linked: "link-1" },
    			$$inline: true
    		});

    	linkedchart9 = new LinkedChart({
    			props: { data: fakeData(10), linked: "link-1" },
    			$$inline: true
    		});

    	linkedchart10 = new LinkedChart({
    			props: { data: fakeData(30), linked: "link-1" },
    			$$inline: true
    		});

    	linkedchart11 = new LinkedChart({
    			props: { data: fakeData(30), linked: "link-1" },
    			$$inline: true
    		});

    	linkedchart12 = new LinkedChart({
    			props: {
    				data: fakeData(30),
    				linked: "link-8",
    				scaleMax: "100"
    			},
    			$$inline: true
    		});

    	linkedchart13 = new LinkedChart({
    			props: {
    				data: fakeData(30, 30, 10),
    				linked: "link-8",
    				scaleMax: "100"
    			},
    			$$inline: true
    		});

    	linkedlabel1 = new LinkedLabel({
    			props: {
    				linked: "link-2",
    				empty: "Start hovering"
    			},
    			$$inline: true
    		});

    	linkedchart14 = new LinkedChart({
    			props: { data: fakeData(30), linked: "link-2" },
    			$$inline: true
    		});

    	linkedchart15 = new LinkedChart({
    			props: { data: fakeData(30), linked: "link-2" },
    			$$inline: true
    		});

    	linkedchart16 = new LinkedChart({
    			props: {
    				data: fakeData(30),
    				linked: "link-5",
    				showValue: true
    			},
    			$$inline: true
    		});

    	linkedchart17 = new LinkedChart({
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

    	linkedchart18 = new LinkedChart({
    			props: {
    				data: fakeData(30),
    				linked: "link-7",
    				showValue: true,
    				valuePosition: "floating"
    			},
    			$$inline: true
    		});

    	linkedchart19 = new LinkedChart({
    			props: {
    				data: fakeData(30),
    				linked: "link-7",
    				showValue: true,
    				valuePosition: "floating"
    			},
    			$$inline: true
    		});

    	linkedchart20 = new LinkedChart({
    			props: {
    				data: fakeData(30),
    				linked: "link-6",
    				uid: "test"
    			},
    			$$inline: true
    		});

    	linkedvalue6 = new LinkedValue({
    			props: { empty: "Separate value", uid: "test" },
    			$$inline: true
    		});

    	linkedchart21 = new LinkedChart({
    			props: {
    				data: fakeData(30),
    				linked: "link-6",
    				uid: "test-2"
    			},
    			$$inline: true
    		});

    	linkedvalue7 = new LinkedValue({
    			props: { empty: "Separate value", uid: "test-2" },
    			$$inline: true
    		});

    	linkedchart22 = new LinkedChart({
    			props: { data: fakeData(5), grow: true },
    			$$inline: true
    		});

    	linkedchart23 = new LinkedChart({
    			props: { data: fakeData(50), barMinWidth: "2" },
    			$$inline: true
    		});

    	linkedchart24 = new LinkedChart({
    			props: { data: fakeData(10), barMinWidth: "14" },
    			$$inline: true
    		});

    	linkedchart25 = new LinkedChart({
    			props: {
    				data: {
    					...fakeData(10),
    					...fakeData(20, 0, 0, "2005-06-01T00:00:00Z")
    				},
    				barMinHeight: "0",
    				showValue: true,
    				valuePosition: "floating"
    			},
    			$$inline: true
    		});

    	linkedchart26 = new LinkedChart({
    			props: {
    				data: {
    					...fakeData(10),
    					...fakeData(20, 0, 0, "2005-06-01T00:00:00Z")
    				},
    				barMinHeight: "5",
    				showValue: true,
    				valuePosition: "floating"
    			},
    			$$inline: true
    		});

    	linkedchart27 = new LinkedChart({
    			props: {
    				data: fakeData(75),
    				grow: true,
    				barMinWidth: "0"
    			},
    			$$inline: true
    		});

    	linkedchart28 = new LinkedChart({
    			props: {
    				data: fakeData(7),
    				grow: true,
    				barMinWidth: "0"
    			},
    			$$inline: true
    		});

    	linkedchart29 = new LinkedChart({
    			props: {
    				data: fakeData(50),
    				height: "100",
    				width: "250",
    				linked: "linked-3"
    			},
    			$$inline: true
    		});

    	linkedchart30 = new LinkedChart({
    			props: {
    				data: fakeData(50),
    				height: "10",
    				width: "250",
    				linked: "linked-3"
    			},
    			$$inline: true
    		});

    	linkedchart31 = new LinkedChart({
    			props: { data: fakeData(11), gap: "10" },
    			$$inline: true
    		});

    	linkedchart32 = new LinkedChart({
    			props: { data: fakeData(36), gap: "0" },
    			$$inline: true
    		});

    	linkedchart33 = new LinkedChart({
    			props: { data: fakeData(20) },
    			$$inline: true
    		});

    	linkedchart34 = new LinkedChart({
    			props: { data: fakeData(20), align: "left" },
    			$$inline: true
    		});

    	linkedchart35 = new LinkedChart({
    			props: {
    				data: fakeData(30),
    				fill: "#e6261f",
    				linked: "link-4"
    			},
    			$$inline: true
    		});

    	linkedchart36 = new LinkedChart({
    			props: {
    				data: fakeData(30),
    				fill: "#eb7532",
    				linked: "link-4"
    			},
    			$$inline: true
    		});

    	linkedchart37 = new LinkedChart({
    			props: {
    				data: fakeData(30),
    				fill: "#f7d038",
    				linked: "link-4"
    			},
    			$$inline: true
    		});

    	linkedchart38 = new LinkedChart({
    			props: {
    				data: fakeData(30),
    				fill: "#a3e048",
    				linked: "link-4"
    			},
    			$$inline: true
    		});

    	linkedchart39 = new LinkedChart({
    			props: {
    				data: fakeData(30),
    				fill: "#49da9a",
    				linked: "link-4"
    			},
    			$$inline: true
    		});

    	linkedchart40 = new LinkedChart({
    			props: {
    				data: fakeData(30),
    				fill: "#34bbe6",
    				linked: "link-4"
    			},
    			$$inline: true
    		});

    	linkedchart41 = new LinkedChart({
    			props: {
    				data: fakeData(30),
    				fill: "#4355db",
    				linked: "link-4"
    			},
    			$$inline: true
    		});

    	linkedchart42 = new LinkedChart({
    			props: {
    				data: fakeData(30),
    				fill: "hsla(290, 55%, 50%, 1)",
    				linked: "link-4"
    			},
    			$$inline: true
    		});

    	linkedchart43 = new LinkedChart({
    			props: { data: fakeData(30), fadeOpacity: "0.15" },
    			$$inline: true
    		});

    	linkedchart44 = new LinkedChart({
    			props: { data: fakeData(30), hover: false },
    			$$inline: true
    		});

    	linkedchart45 = new LinkedChart({
    			props: {
    				data: /*transitioningData*/ ctx[0],
    				fill: "hsl(" + /*transitionColor*/ ctx[1] + ", 60%, 50%)",
    				transition: "500"
    			},
    			$$inline: true
    		});

    	linkedchart46 = new LinkedChart({
    			props: {
    				data: fakeData(30),
    				linked: "link-10",
    				showValue: true,
    				valuePosition: "floating",
    				tabindex: "0"
    			},
    			$$inline: true
    		});

    	linkedchart47 = new LinkedChart({
    			props: {
    				data: fakeData(30),
    				linked: "link-9",
    				type: "line"
    			},
    			$$inline: true
    		});

    	linkedchart48 = new LinkedChart({
    			props: {
    				data: fakeData(30),
    				linked: "link-9",
    				type: "line"
    			},
    			$$inline: true
    		});

    	linkedchart49 = new LinkedChart({
    			props: {
    				data: fakeData(30),
    				linked: "link-9",
    				type: "line"
    			},
    			$$inline: true
    		});

    	linkedchart50 = new LinkedChart({
    			props: {
    				data: fakeData(30),
    				linked: "link-9",
    				type: "line",
    				lineColor: "#4355db",
    				fill: "var(--text-color)",
    				showValue: "true",
    				valuePosition: "floating"
    			},
    			$$inline: true
    		});

    	linkedchart51 = new LinkedChart({
    			props: {
    				data: fakeData(30, 100000, 10000),
    				dispatchEvents: true
    			},
    			$$inline: true
    		});

    	linkedchart51.$on("hover", /*hover_handler*/ ctx[2]);
    	linkedchart51.$on("blur", /*blur_handler*/ ctx[3]);

    	linkedchart52 = new LinkedChart({
    			props: {
    				data: fakeData(30, 100000, 10000),
    				dispatchEvents: true,
    				showValue: true,
    				valuePosition: "floating",
    				valuePrepend: "Value: "
    			},
    			$$inline: true
    		});

    	linkedchart52.$on("value-update", value_update_handler);

    	const block = {
    		c: function create() {
    			div143 = element("div");
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
    			p0.textContent = "This is a library to display tiny bar charts. These charts are more so meant for graphic aids, rather than scientific representations. There's no axis labels, no extensive data visualisation, just bars.";
    			t5 = space();
    			p1 = element("p");
    			em = element("em");
    			em.textContent = "Inspired by steamcharts.com";
    			t7 = space();
    			p2 = element("p");
    			a0 = element("a");
    			a0.textContent = "GitHub";
    			t9 = space();
    			h20 = element("h2");
    			h20.textContent = "Demo";
    			t11 = space();
    			table = element("table");
    			tr0 = element("tr");
    			th0 = element("th");
    			th0.textContent = "Name";
    			t13 = space();
    			th1 = element("th");
    			create_component(linkedlabel0.$$.fragment);
    			t14 = space();
    			th2 = element("th");
    			th2.textContent = "Value";
    			t16 = space();
    			tr1 = element("tr");
    			td0 = element("td");
    			td0.textContent = "A thing";
    			t18 = space();
    			td1 = element("td");
    			create_component(linkedchart1.$$.fragment);
    			t19 = space();
    			td2 = element("td");
    			create_component(linkedvalue0.$$.fragment);
    			t20 = space();
    			tr2 = element("tr");
    			td3 = element("td");
    			td3.textContent = "Another thing";
    			t22 = space();
    			td4 = element("td");
    			create_component(linkedchart2.$$.fragment);
    			t23 = space();
    			td5 = element("td");
    			create_component(linkedvalue1.$$.fragment);
    			t24 = space();
    			tr3 = element("tr");
    			td6 = element("td");
    			td6.textContent = "A third thing";
    			t26 = space();
    			td7 = element("td");
    			create_component(linkedchart3.$$.fragment);
    			t27 = space();
    			td8 = element("td");
    			create_component(linkedvalue2.$$.fragment);
    			t28 = space();
    			tr4 = element("tr");
    			td9 = element("td");
    			td9.textContent = "An incomplete thing";
    			t30 = space();
    			td10 = element("td");
    			create_component(linkedchart4.$$.fragment);
    			t31 = space();
    			td11 = element("td");
    			create_component(linkedvalue3.$$.fragment);
    			t32 = space();
    			tr5 = element("tr");
    			td12 = element("td");
    			td12.textContent = "A changing thing";
    			t34 = space();
    			td13 = element("td");
    			create_component(linkedchart5.$$.fragment);
    			t35 = space();
    			td14 = element("td");
    			create_component(linkedvalue4.$$.fragment);
    			t36 = space();
    			tr6 = element("tr");
    			td15 = element("td");
    			td15.textContent = "A thing using lines";
    			t38 = space();
    			td16 = element("td");
    			create_component(linkedchart6.$$.fragment);
    			t39 = space();
    			td17 = element("td");
    			create_component(linkedvalue5.$$.fragment);
    			t40 = space();
    			h21 = element("h2");
    			h21.textContent = "Installation";
    			t42 = space();
    			p3 = element("p");
    			p3.textContent = "Install using Yarn or NPM.";
    			t44 = space();
    			code0 = element("code");
    			t45 = text("yarn add ");
    			mark1 = element("mark");
    			mark1.textContent = "svelte-tiny-linked-charts";
    			t47 = space();
    			code1 = element("code");
    			t48 = text("npm install --save ");
    			mark2 = element("mark");
    			mark2.textContent = "svelte-tiny-linked-charts";
    			t50 = space();
    			p4 = element("p");
    			p4.textContent = "Include the chart in your app.";
    			t52 = space();
    			code2 = element("code");
    			t53 = text("<");
    			mark3 = element("mark");
    			mark3.textContent = "LinkedChart";
    			t55 = text(" { data } />");
    			t56 = space();
    			code3 = element("code");
    			t57 = text("import { ");
    			mark4 = element("mark");
    			mark4.textContent = "LinkedChart";
    			t59 = text(", ");
    			mark5 = element("mark");
    			mark5.textContent = "LinkedLabel";
    			t61 = text(", ");
    			mark6 = element("mark");
    			mark6.textContent = "LinkedValue";
    			t63 = text(" } from \"");
    			mark7 = element("mark");
    			mark7.textContent = "svelte-tiny-linked-charts";
    			t65 = text("\"");
    			t66 = space();
    			div2 = element("div");
    			p5 = element("p");
    			p5.textContent = "Supply your data in a simple key:value object:";
    			t68 = space();
    			code4 = element("code");
    			t69 = text("let data = { ");
    			br0 = element("br");
    			t70 = text("\r\n\t\t\t  \"2005-01-01\": 25, ");
    			br1 = element("br");
    			t71 = text("\r\n\t\t\t  \"2005-01-02\": 20, ");
    			br2 = element("br");
    			t72 = text("\r\n\t\t\t  \"2005-01-03\": 18, ");
    			br3 = element("br");
    			t73 = text("\r\n\t\t\t  \"2005-01-04\": 17, ");
    			br4 = element("br");
    			t74 = text("\r\n\t\t\t  \"2005-01-05\": 21 ");
    			br5 = element("br");
    			t75 = text("\r\n\t\t\t}");
    			t76 = space();
    			code5 = element("code");
    			code5.textContent = "<LinkedChart { data } />";
    			t78 = space();
    			p6 = element("p");
    			p6.textContent = "Or if you prefer supply the labels and values separately:";
    			t80 = space();
    			code6 = element("code");
    			t81 = text("let labels = [ ");
    			br6 = element("br");
    			t82 = text("\r\n\t\t\t  \"2005-01-01\", ");
    			br7 = element("br");
    			t83 = text("\r\n\t\t\t  \"2005-01-02\", ");
    			br8 = element("br");
    			t84 = text("\r\n\t\t\t  \"2005-01-03\", ");
    			br9 = element("br");
    			t85 = text("\r\n\t\t\t  \"2005-01-04\", ");
    			br10 = element("br");
    			t86 = text("\r\n\t\t\t  \"2005-01-05\" ");
    			br11 = element("br");
    			t87 = text("\r\n\t\t\t]");
    			t88 = space();
    			code7 = element("code");
    			t89 = text("let values = [ ");
    			br12 = element("br");
    			t90 = text("\r\n\t\t\t  25, ");
    			br13 = element("br");
    			t91 = text("\r\n\t\t\t  20, ");
    			br14 = element("br");
    			t92 = text("\r\n\t\t\t  18, ");
    			br15 = element("br");
    			t93 = text("\r\n\t\t\t  17, ");
    			br16 = element("br");
    			t94 = text("\r\n\t\t\t  21 ");
    			br17 = element("br");
    			t95 = text("\r\n\t\t\t]");
    			t96 = space();
    			code8 = element("code");
    			code8.textContent = "<LinkedChart { labels } { values } />";
    			t98 = space();
    			h22 = element("h2");
    			h22.textContent = "Usage";
    			t100 = space();
    			div4 = element("div");
    			div3 = element("div");
    			t101 = text("The chart in it's most basic form.\r\n\r\n\t\t\t");
    			code9 = element("code");
    			code9.textContent = "<LinkedChart { data } />";
    			t103 = space();
    			create_component(linkedchart7.$$.fragment);
    			t104 = space();
    			div11 = element("div");
    			div5 = element("div");
    			t105 = text("You can link multiple charts together, hovering one will also highlight others.\r\n\r\n\t\t\t");
    			code10 = element("code");
    			t106 = text("<LinkedChart { data } linked=\"link-1\" /> ");
    			br18 = element("br");
    			t107 = text("\r\n\t\t\t\t<LinkedChart { data } linked=\"link-1\" /> ");
    			br19 = element("br");
    			t108 = text("\r\n\t\t\t\t<LinkedChart { data } linked=\"link-1\" /> ");
    			br20 = element("br");
    			t109 = text("\r\n\t\t\t\t<LinkedChart { data } linked=\"link-1\" />");
    			t110 = space();
    			div10 = element("div");
    			div6 = element("div");
    			create_component(linkedchart8.$$.fragment);
    			t111 = space();
    			div7 = element("div");
    			create_component(linkedchart9.$$.fragment);
    			t112 = space();
    			div8 = element("div");
    			create_component(linkedchart10.$$.fragment);
    			t113 = space();
    			div9 = element("div");
    			create_component(linkedchart11.$$.fragment);
    			t114 = space();
    			div16 = element("div");
    			div12 = element("div");
    			t115 = text("The highest value in the chart is automatically determined by the highest value in your data. To overwrite this use \"scaleMax\".\r\n\r\n\t\t\t");
    			code11 = element("code");
    			t116 = text("<LinkedChart { data } scaleMax=\"100\" /> ");
    			br21 = element("br");
    			t117 = text("\r\n\t\t\t\t<LinkedChart { data } scaleMax=\"100\" />");
    			t118 = space();
    			div15 = element("div");
    			div13 = element("div");
    			create_component(linkedchart12.$$.fragment);
    			t119 = space();
    			div14 = element("div");
    			create_component(linkedchart13.$$.fragment);
    			t120 = space();
    			h23 = element("h2");
    			h23.textContent = "Label";
    			t122 = space();
    			div21 = element("div");
    			div17 = element("div");
    			t123 = text("You can optionally display a label, which will display the label of what you're currently hovering.\r\n\r\n\t\t\t");
    			code12 = element("code");
    			t124 = text("<LinkedLabel linked=\"link-2\" /> ");
    			br22 = element("br");
    			t125 = space();
    			br23 = element("br");
    			t126 = text("\r\n\t\t\t\t<LinkedChart { data } linked=\"link-2\" /> ");
    			br24 = element("br");
    			t127 = text("\r\n\t\t\t\t<LinkedChart { data } linked=\"link-2\" />");
    			t128 = space();
    			br25 = element("br");
    			t129 = text("\r\n\t\t\tThe label has no styling by default.");
    			t130 = space();
    			div20 = element("div");
    			create_component(linkedlabel1.$$.fragment);
    			t131 = space();
    			div18 = element("div");
    			create_component(linkedchart14.$$.fragment);
    			t132 = space();
    			div19 = element("div");
    			create_component(linkedchart15.$$.fragment);
    			t133 = space();
    			div26 = element("div");
    			div22 = element("div");
    			t134 = text("You can enable the value you're hovering using \"showValue\".\r\n\r\n\t\t\t");
    			code13 = element("code");
    			code13.textContent = "<LinkedChart { data } showValue={ true } />";
    			t136 = space();
    			br26 = element("br");
    			t137 = text("\r\n\t\t\tThis can be further enhanced with \"valueDefault\", \"valuePrepend\", and \"valueAppend\".\r\n\r\n\t\t\t");
    			code14 = element("code");
    			t138 = text("<LinkedChart ");
    			br27 = element("br");
    			t139 = text("\r\n\t\t\t\t  { data }  ");
    			br28 = element("br");
    			t140 = text("\r\n\t\t\t\t  showValue={ true } ");
    			br29 = element("br");
    			t141 = text("\r\n\t\t\t\t  valueDefault=\"Empty label\" ");
    			br30 = element("br");
    			t142 = text("\r\n\t\t\t\t  valuePrepend=\"Thing:\" ");
    			br31 = element("br");
    			t143 = text("\r\n\t\t\t\t  valueAppend=\"views\" />");
    			t144 = space();
    			br32 = element("br");
    			t145 = text("\r\n\t\t\tThis value has no styling by default.");
    			t146 = space();
    			div25 = element("div");
    			div23 = element("div");
    			create_component(linkedchart16.$$.fragment);
    			t147 = space();
    			div24 = element("div");
    			create_component(linkedchart17.$$.fragment);
    			t148 = space();
    			div31 = element("div");
    			div27 = element("div");
    			t149 = text("The value can be positioned at the location of the hovered bar using \"valuePosition\".\r\n\r\n\t\t\t");
    			code15 = element("code");
    			t150 = text("<LinkedChart ");
    			br33 = element("br");
    			t151 = text("\r\n\t\t\t\t  { data }  ");
    			br34 = element("br");
    			t152 = text("\r\n\t\t\t\t  showValue={ true } ");
    			br35 = element("br");
    			t153 = text("\r\n\t\t\t\t  valuePosition=\"floating\" />");
    			t154 = space();
    			br36 = element("br");
    			t155 = text("\r\n\t\t\tYou're expected to style this value further yourself.");
    			t156 = space();
    			div30 = element("div");
    			div28 = element("div");
    			create_component(linkedchart18.$$.fragment);
    			t157 = space();
    			br37 = element("br");
    			t158 = space();
    			div29 = element("div");
    			create_component(linkedchart19.$$.fragment);
    			t159 = space();
    			div34 = element("div");
    			t160 = text("Alternatively you can show the value as a separate element wherever you like using the \"LinkedValue\" component. Use \"uid\" to link the chart and value together.\r\n\r\n\t\t");
    			code16 = element("code");
    			t161 = text("<LinkedChart { data } uid=\"some-id\" />\r\n\t\t\t");
    			br38 = element("br");
    			t162 = text("\r\n\t\t\t<LinkedValue uid=\"some-id\" /> ");
    			br39 = element("br");
    			t163 = space();
    			br40 = element("br");
    			t164 = text("\r\n\t\tThis value has no styling by default.\r\n\r\n\t\t");
    			br41 = element("br");
    			br42 = element("br");
    			t165 = space();
    			div32 = element("div");
    			create_component(linkedchart20.$$.fragment);
    			t166 = space();
    			strong0 = element("strong");
    			create_component(linkedvalue6.$$.fragment);
    			t167 = space();
    			div33 = element("div");
    			create_component(linkedchart21.$$.fragment);
    			t168 = space();
    			strong1 = element("strong");
    			create_component(linkedvalue7.$$.fragment);
    			t169 = space();
    			h24 = element("h2");
    			h24.textContent = "Styling";
    			t171 = space();
    			div36 = element("div");
    			div35 = element("div");
    			t172 = text("The width of the bars is fixed by default, but can be set to grow to fill the chart.\r\n\r\n\t\t\t");
    			code17 = element("code");
    			code17.textContent = "<LinkedChart data={ ... } grow={ true } />";
    			t174 = space();
    			create_component(linkedchart22.$$.fragment);
    			t175 = space();
    			div41 = element("div");
    			div37 = element("div");
    			t176 = text("To change the size of the bars set the \"barMinWidth\" property.\r\n\r\n\t\t\t");
    			code18 = element("code");
    			t177 = text("<LinkedChart data={ ... } barMinWidth=\"2\" /> ");
    			br43 = element("br");
    			t178 = text("\r\n\t\t\t\t<LinkedChart data={ ... } barMinWidth=\"14\" />");
    			t179 = space();
    			div40 = element("div");
    			div38 = element("div");
    			create_component(linkedchart23.$$.fragment);
    			t180 = space();
    			div39 = element("div");
    			create_component(linkedchart24.$$.fragment);
    			t181 = space();
    			div46 = element("div");
    			div42 = element("div");
    			t182 = text("A minimum height can be set using the \"barMinHeight\" property. Bars will never be lower than this value, even if it's zero.\r\n\r\n\t\t\t");
    			code19 = element("code");
    			t183 = text("<LinkedChart data={ ... } barMinHeight=\"0\" /> ");
    			br44 = element("br");
    			t184 = text("\r\n\t\t\t\t<LinkedChart data={ ... } barMinHeight=\"5\" />");
    			t185 = space();
    			div45 = element("div");
    			div43 = element("div");
    			create_component(linkedchart25.$$.fragment);
    			t186 = space();
    			div44 = element("div");
    			create_component(linkedchart26.$$.fragment);
    			t187 = space();
    			div51 = element("div");
    			div47 = element("div");
    			t188 = text("To always fill out the content, giving the bars a dynamic width, you can set both the \"grow\" and \"barMinWidth\" properties.\r\n\r\n\t\t\t");
    			code20 = element("code");
    			t189 = text("<LinkedChart");
    			br45 = element("br");
    			t190 = text("\r\n\t\t\t\t  data={ ... } ");
    			br46 = element("br");
    			t191 = text("\r\n\t\t\t\t  grow={ true } ");
    			br47 = element("br");
    			t192 = text("\r\n\t\t\t\t  barMinWidth=\"0\" />");
    			t193 = space();
    			div50 = element("div");
    			div48 = element("div");
    			create_component(linkedchart27.$$.fragment);
    			t194 = space();
    			div49 = element("div");
    			create_component(linkedchart28.$$.fragment);
    			t195 = space();
    			div56 = element("div");
    			div52 = element("div");
    			t196 = text("The charts can be resized to any size you like. It renders as an SVG, so they can easily be made responsive with some CSS.\r\n\r\n\t\t\t");
    			code21 = element("code");
    			t197 = text("<LinkedChart");
    			br48 = element("br");
    			t198 = text("\r\n\t\t\t\t  data={ ... } ");
    			br49 = element("br");
    			t199 = text("\r\n\t\t\t\t  width=\"250\" ");
    			br50 = element("br");
    			t200 = text("\r\n\t\t\t\t  height=\"100\" />");
    			t201 = space();
    			code22 = element("code");
    			t202 = text("svg { ");
    			br51 = element("br");
    			t203 = text("\r\n\t\t\t\t  width: 100%; ");
    			br52 = element("br");
    			t204 = text("\r\n\t\t\t\t  height: auto; ");
    			br53 = element("br");
    			t205 = text("\r\n\t\t\t\t}");
    			t206 = space();
    			br54 = element("br");
    			t207 = text("\r\n\t\t\tor for a fixed height;\r\n\r\n\t\t\t");
    			code23 = element("code");
    			t208 = text("svg { ");
    			br55 = element("br");
    			t209 = text("\r\n\t\t\t\t  width: 100%; ");
    			br56 = element("br");
    			t210 = text("\r\n\t\t\t\t  height: 50px; ");
    			br57 = element("br");
    			t211 = text("\r\n\t\t\t\t}");
    			t212 = space();
    			div55 = element("div");
    			div53 = element("div");
    			create_component(linkedchart29.$$.fragment);
    			t213 = space();
    			div54 = element("div");
    			create_component(linkedchart30.$$.fragment);
    			t214 = space();
    			div61 = element("div");
    			div57 = element("div");
    			t215 = text("The gap in between bars can also be adjusted.\r\n\r\n\t\t\t");
    			code24 = element("code");
    			t216 = text("<LinkedChart { data } gap=\"10\" /> ");
    			br58 = element("br");
    			t217 = text("\r\n\t\t\t\t<LinkedChart { data } gap=\"0\" />");
    			t218 = space();
    			div60 = element("div");
    			div58 = element("div");
    			create_component(linkedchart31.$$.fragment);
    			t219 = space();
    			div59 = element("div");
    			create_component(linkedchart32.$$.fragment);
    			t220 = space();
    			div66 = element("div");
    			div62 = element("div");
    			t221 = text("When the bars do not fill the width of the graph they are aligned to the right by default. This can be set to be left aligned instead.\r\n\r\n\t\t\t");
    			code25 = element("code");
    			code25.textContent = "<LinkedChart { data } align=\"left\" />";
    			t223 = space();
    			div65 = element("div");
    			div63 = element("div");
    			create_component(linkedchart33.$$.fragment);
    			t224 = space();
    			div64 = element("div");
    			create_component(linkedchart34.$$.fragment);
    			t225 = space();
    			div77 = element("div");
    			div67 = element("div");
    			t226 = text("The bars can be colored any way you wish.\r\n\r\n\t\t\t");
    			code26 = element("code");
    			t227 = text("<LinkedChart fill=\"#ff00ff\" /> ");
    			br59 = element("br");
    			t228 = text("\r\n\t\t\t\t<LinkedChart fill=\"rgb(255, 255, 0)\" /> ");
    			br60 = element("br");
    			t229 = text("\r\n\t\t\t\t<LinkedChart fill=\"hsla(290, 55%, 50%, 1)\" />");
    			t230 = space();
    			div76 = element("div");
    			div68 = element("div");
    			create_component(linkedchart35.$$.fragment);
    			t231 = space();
    			div69 = element("div");
    			create_component(linkedchart36.$$.fragment);
    			t232 = space();
    			div70 = element("div");
    			create_component(linkedchart37.$$.fragment);
    			t233 = space();
    			div71 = element("div");
    			create_component(linkedchart38.$$.fragment);
    			t234 = space();
    			div72 = element("div");
    			create_component(linkedchart39.$$.fragment);
    			t235 = space();
    			div73 = element("div");
    			create_component(linkedchart40.$$.fragment);
    			t236 = space();
    			div74 = element("div");
    			create_component(linkedchart41.$$.fragment);
    			t237 = space();
    			div75 = element("div");
    			create_component(linkedchart42.$$.fragment);
    			t238 = space();
    			div79 = element("div");
    			div78 = element("div");
    			t239 = text("The opacity of faded out bars can be adjusted using \"fadeOpacity\".\r\n\r\n\t\t\t");
    			code27 = element("code");
    			code27.textContent = "<LinkedChart { data } fadeOpacity=\"0.15\" />";
    			t241 = space();
    			create_component(linkedchart43.$$.fragment);
    			t242 = space();
    			div81 = element("div");
    			div80 = element("div");
    			t243 = text("The hover effect can be disabled altogether using \"hover\".\r\n\r\n\t\t\t");
    			code28 = element("code");
    			code28.textContent = "<LinkedChart { data } hover={ false } />";
    			t245 = space();
    			create_component(linkedchart44.$$.fragment);
    			t246 = space();
    			div83 = element("div");
    			div82 = element("div");
    			t247 = text("Bars can be set to transition between states. ");
    			br61 = element("br");
    			t248 = text("\r\n\t\t\tValue is speed in milliseconds.\r\n\r\n\t\t\t");
    			code29 = element("code");
    			code29.textContent = "<LinkedChart { data } transition=\"500\" />";
    			t250 = space();
    			create_component(linkedchart45.$$.fragment);
    			t251 = space();
    			div87 = element("div");
    			div84 = element("div");
    			t252 = text("To improve accessibility you can set \"tabindex=0\", allowing navigating to each data point using the keyboard.\r\n\r\n\t\t\t");
    			code30 = element("code");
    			t253 = text("<LinkedChart { data } tabindex=\"0\" /> ");
    			br62 = element("br");
    			t254 = space();
    			div86 = element("div");
    			div85 = element("div");
    			create_component(linkedchart46.$$.fragment);
    			t255 = space();
    			div94 = element("div");
    			div88 = element("div");
    			t256 = text("Instead of bars you can also opt for a line-chart using \"type=line\". \"lineColor\" can be used to color the line, \"fill\" to color the points. This can have all of the bar properties as well.\r\n\r\n\t\t\t");
    			code31 = element("code");
    			t257 = text("<LinkedChart { data } type=\"line\" /> ");
    			br63 = element("br");
    			t258 = text("\r\n\t\t\t\t<LinkedChart ");
    			br64 = element("br");
    			t259 = text("\r\n\t\t\t\t  { data } ");
    			br65 = element("br");
    			t260 = text("\r\n\t\t\t\t  type=\"line\" ");
    			br66 = element("br");
    			t261 = text("\r\n\t\t\t\t  lineColor=\"#4355db\" ");
    			br67 = element("br");
    			t262 = text("\r\n\t\t\t\t  fill=\"var(--text-color)\" />");
    			t263 = space();
    			div93 = element("div");
    			div89 = element("div");
    			create_component(linkedchart47.$$.fragment);
    			t264 = space();
    			div90 = element("div");
    			create_component(linkedchart48.$$.fragment);
    			t265 = space();
    			div91 = element("div");
    			create_component(linkedchart49.$$.fragment);
    			t266 = space();
    			div92 = element("div");
    			create_component(linkedchart50.$$.fragment);
    			t267 = space();
    			h25 = element("h2");
    			h25.textContent = "Events";
    			t269 = space();
    			div102 = element("div");
    			div101 = element("div");
    			t270 = text("By enable \"dispatchEvents\" on the LinkedChart component you can dispatch several events when the state of the chart changes.\r\n\r\n\t\t\t");
    			code32 = element("code");
    			t271 = text("<LinkedChart ");
    			br68 = element("br");
    			t272 = text("\r\n\t\t\t\t  dispatchEvents={ true } ");
    			br69 = element("br");
    			t273 = text("\r\n\t\t\t\t  on:hover={ event => console.log(event.detail) } ");
    			br70 = element("br");
    			t274 = text("\r\n\t\t\t\t  on:blur={ event => console.log(event.detail) } ");
    			br71 = element("br");
    			t275 = text("\r\n\t\t\t\t  on:value-update={ event => console.log(event.detail) } />");
    			t276 = space();
    			p7 = element("p");
    			p7.textContent = "This could be used to construct your own value element that can be formatted as you wish. For example in this example the values are given as cents, but the value is formatted as dollars.";
    			t278 = space();
    			div95 = element("div");
    			create_component(linkedchart51.$$.fragment);
    			t279 = space();
    			span = element("span");
    			span.textContent = " ";
    			t281 = space();
    			code33 = element("code");
    			t282 = text("<LinkedChart ");
    			br72 = element("br");
    			t283 = text("\r\n\t\t\t\t  dispatchEvents ");
    			br73 = element("br");
    			t284 = text("\r\n\t\t\t\t  on:hover={ event => ");
    			br74 = element("br");
    			t285 = text("\r\n\t\t\t\t   \tdocument.querySelector(\"[data-role='currency']\") ");
    			br75 = element("br");
    			t286 = text("\r\n\t\t\t\t    .innerHTML = (event.detail.value / 100).toLocaleString(\"en-US\", { ");
    			br76 = element("br");
    			t287 = text("\r\n\t\t\t\t      style: \"currency\", currency: \"USD\"");
    			br77 = element("br");
    			t288 = text("\r\n\t\t\t\t    }) ");
    			br78 = element("br");
    			t289 = text("\r\n\t\t\t\t  } ");
    			br79 = element("br");
    			t290 = text("\r\n\t\t\t\t  on:blur={ event => ");
    			br80 = element("br");
    			t291 = text("\r\n\t\t\t\t    document.querySelector(\"[data-role='currency']\").innerHTML = \" \" ");
    			br81 = element("br");
    			t292 = text("\r\n\t\t\t\t  } />");
    			t293 = space();
    			br82 = element("br");
    			t294 = space();
    			p8 = element("p");
    			p8.textContent = "In this example we format the value element inside the chart directly to make use of \"toLocaleString()\" to format the number. Ideally you would supply the value already formatted to avoid having to do this, but that's not always possible.";
    			t296 = space();
    			div96 = element("div");
    			create_component(linkedchart52.$$.fragment);
    			t297 = space();
    			code34 = element("code");
    			t298 = text("<LinkedChart ");
    			br83 = element("br");
    			t299 = text("\r\n\t\t\t\t  dispatchEvents ");
    			br84 = element("br");
    			t300 = text("\r\n\t\t\t\t  showValue ");
    			br85 = element("br");
    			t301 = text("\r\n\t\t\t\t  valuePosition=\"floating\" ");
    			br86 = element("br");
    			t302 = text("\r\n\t\t\t\t  valuePrepend=\"Value: \" ");
    			br87 = element("br");
    			t303 = text("\r\n\t\t\t\t  on:value-update={ event => { ");
    			br88 = element("br");
    			t304 = text("\r\n\t\t\t\t    if (event.detail.valueElement) ");
    			br89 = element("br");
    			t305 = text("\r\n\t\t\t\t      event.detail.valueElement.innerText = ");
    			br90 = element("br");
    			t306 = text("\r\n\t\t\t\t        event.detail.value?.toLocaleString() ");
    			br91 = element("br");
    			t307 = text("\r\n\t\t\t\t  } } />");
    			t308 = space();
    			br92 = element("br");
    			t309 = space();
    			h3 = element("h3");
    			h3.textContent = "All events";
    			t311 = space();
    			div100 = element("div");
    			strong2 = element("strong");
    			strong2.textContent = "Property";
    			t313 = space();
    			strong3 = element("strong");
    			strong3.textContent = "Description";
    			t315 = space();
    			strong4 = element("strong");
    			strong4.textContent = "Return";
    			t317 = space();
    			code35 = element("code");
    			code35.textContent = "on:hover";
    			t319 = space();
    			div97 = element("div");
    			div97.textContent = "On hover of bars";
    			t321 = space();
    			code36 = element("code");
    			code36.textContent = "uid, key, index, linkedKey, value, valueElement, eventElement";
    			t323 = space();
    			code37 = element("code");
    			code37.textContent = "on:blur";
    			t325 = space();
    			div98 = element("div");
    			div98.textContent = "On blur of the chart";
    			t327 = space();
    			code38 = element("code");
    			code38.textContent = "uid, linkedKey, valueElement, eventElement";
    			t329 = space();
    			code39 = element("code");
    			code39.textContent = "on:value-update";
    			t331 = space();
    			div99 = element("div");
    			div99.textContent = "Any time the value updates";
    			t333 = space();
    			code40 = element("code");
    			code40.textContent = "value, uid, linkedKey, valueElement";
    			t335 = space();
    			h26 = element("h2");
    			h26.textContent = "Properties";
    			t337 = space();
    			div132 = element("div");
    			p9 = element("p");
    			p9.textContent = "This is a list of all configurable properties on the \"LinkedChart\" component.";
    			t339 = space();
    			div131 = element("div");
    			strong5 = element("strong");
    			strong5.textContent = "Property";
    			t341 = space();
    			strong6 = element("strong");
    			strong6.textContent = "Default";
    			t343 = space();
    			strong7 = element("strong");
    			strong7.textContent = "Description";
    			t345 = space();
    			code41 = element("code");
    			code41.textContent = "data";
    			t347 = space();
    			code42 = element("code");
    			code42.textContent = "{}";
    			t349 = space();
    			div103 = element("div");
    			div103.textContent = "Data that will be displayed in the chart supplied in key:value object.";
    			t351 = space();
    			code43 = element("code");
    			code43.textContent = "labels";
    			t353 = space();
    			code44 = element("code");
    			code44.textContent = "[]";
    			t355 = space();
    			div104 = element("div");
    			div104.textContent = "Labels supplied separately, to be used together with \"values\" property.";
    			t357 = space();
    			code45 = element("code");
    			code45.textContent = "values";
    			t359 = space();
    			code46 = element("code");
    			code46.textContent = "[]";
    			t361 = space();
    			div105 = element("div");
    			div105.textContent = "Values supplied separately, to be used together with \"labels\" property.";
    			t363 = space();
    			code47 = element("code");
    			code47.textContent = "linked";
    			t365 = space();
    			code48 = element("code");
    			t366 = space();
    			div106 = element("div");
    			div106.textContent = "Key to link this chart to other charts with the same key.";
    			t368 = space();
    			code49 = element("code");
    			code49.textContent = "uid";
    			t370 = space();
    			code50 = element("code");
    			t371 = space();
    			div107 = element("div");
    			div107.textContent = "Unique ID to link this chart to a LinkedValue component with the same uid.";
    			t373 = space();
    			code51 = element("code");
    			code51.textContent = "height";
    			t375 = space();
    			code52 = element("code");
    			code52.textContent = "40";
    			t377 = space();
    			div108 = element("div");
    			div108.textContent = "Height of the chart in pixels.";
    			t379 = space();
    			code53 = element("code");
    			code53.textContent = "width";
    			t381 = space();
    			code54 = element("code");
    			code54.textContent = "150";
    			t383 = space();
    			div109 = element("div");
    			div109.textContent = "Width of the chart in pixels.";
    			t385 = space();
    			code55 = element("code");
    			code55.textContent = "barMinWidth";
    			t387 = space();
    			code56 = element("code");
    			code56.textContent = "4";
    			t389 = space();
    			div110 = element("div");
    			div110.textContent = "Width of the bars in the chart in pixels.";
    			t391 = space();
    			code57 = element("code");
    			code57.textContent = "barMinHeight";
    			t393 = space();
    			code58 = element("code");
    			code58.textContent = "0";
    			t395 = space();
    			div111 = element("div");
    			div111.textContent = "Mimumum height of the bars in the chart in pixels.";
    			t397 = space();
    			code59 = element("code");
    			code59.textContent = "grow";
    			t399 = space();
    			code60 = element("code");
    			code60.textContent = "false";
    			t401 = space();
    			div112 = element("div");
    			div112.textContent = "Whether or not the bar should grow to fill out the full width of the chart.";
    			t403 = space();
    			code61 = element("code");
    			code61.textContent = "align";
    			t405 = space();
    			code62 = element("code");
    			code62.textContent = "right";
    			t407 = space();
    			div113 = element("div");
    			div113.textContent = "The side the bars should align to when they do not completely fill out the chart.";
    			t409 = space();
    			code63 = element("code");
    			code63.textContent = "gap";
    			t411 = space();
    			code64 = element("code");
    			code64.textContent = "1";
    			t413 = space();
    			div114 = element("div");
    			div114.textContent = "Gap between the bars in pixels.";
    			t415 = space();
    			code65 = element("code");
    			code65.textContent = "fill";
    			t417 = space();
    			code66 = element("code");
    			code66.textContent = "#ff3e00";
    			t419 = space();
    			div115 = element("div");
    			div115.textContent = "Color of the bars, can be any valid CSS color.";
    			t421 = space();
    			code67 = element("code");
    			code67.textContent = "fadeOpacity";
    			t423 = space();
    			code68 = element("code");
    			code68.textContent = "0.5";
    			t425 = space();
    			div116 = element("div");
    			div116.textContent = "The opacity the faded out bars should display in.";
    			t427 = space();
    			code69 = element("code");
    			code69.textContent = "hover";
    			t429 = space();
    			code70 = element("code");
    			code70.textContent = "true";
    			t431 = space();
    			div117 = element("div");
    			div117.textContent = "Boolean whether or not this chart can be hovered at all.";
    			t433 = space();
    			code71 = element("code");
    			code71.textContent = "transition";
    			t435 = space();
    			code72 = element("code");
    			code72.textContent = "0";
    			t437 = space();
    			div118 = element("div");
    			div118.textContent = "Transition the chart between different stats. Value is time in milliseconds.";
    			t439 = space();
    			code73 = element("code");
    			code73.textContent = "showValue";
    			t441 = space();
    			code74 = element("code");
    			code74.textContent = "false";
    			t443 = space();
    			div119 = element("div");
    			div119.textContent = "Boolean whether or not a value will be shown.";
    			t445 = space();
    			code75 = element("code");
    			code75.textContent = "valueDefault";
    			t447 = space();
    			code76 = element("code");
    			code76.textContent = "\" \"";
    			t449 = space();
    			div120 = element("div");
    			div120.textContent = "Default value when not hovering.";
    			t451 = space();
    			code77 = element("code");
    			code77.textContent = "valueUndefined";
    			t453 = space();
    			code78 = element("code");
    			code78.textContent = "0";
    			t455 = space();
    			div121 = element("div");
    			div121.textContent = "For when the hovering value returns undefined.";
    			t457 = space();
    			code79 = element("code");
    			code79.textContent = "valuePrepend";
    			t459 = space();
    			code80 = element("code");
    			t460 = space();
    			div122 = element("div");
    			div122.textContent = "String to prepend the value.";
    			t462 = space();
    			code81 = element("code");
    			code81.textContent = "valueAppend";
    			t464 = space();
    			code82 = element("code");
    			t465 = space();
    			div123 = element("div");
    			div123.textContent = "String to append to the value.";
    			t467 = space();
    			code83 = element("code");
    			code83.textContent = "valuePosition";
    			t469 = space();
    			code84 = element("code");
    			code84.textContent = "static";
    			t471 = space();
    			div124 = element("div");
    			div124.textContent = "Can be set to \"floating\" to follow the position of the hover.";
    			t473 = space();
    			code85 = element("code");
    			code85.textContent = "scaleMax";
    			t475 = space();
    			code86 = element("code");
    			code86.textContent = "0";
    			t477 = space();
    			div125 = element("div");
    			div125.textContent = "Use this to overwrite the automatic scale set to the highest value in your array.";
    			t479 = space();
    			code87 = element("code");
    			code87.textContent = "type";
    			t481 = space();
    			code88 = element("code");
    			code88.textContent = "bar";
    			t483 = space();
    			div126 = element("div");
    			div126.textContent = "Can be set to \"line\" to display a line chart instead.";
    			t485 = space();
    			code89 = element("code");
    			code89.textContent = "lineColor";
    			t487 = space();
    			code90 = element("code");
    			code90.textContent = "fill";
    			t489 = space();
    			div127 = element("div");
    			div127.textContent = "Color of the line if used with type=\"line\".";
    			t491 = space();
    			code91 = element("code");
    			code91.textContent = "tabindex";
    			t493 = space();
    			code92 = element("code");
    			code92.textContent = "-1";
    			t495 = space();
    			div128 = element("div");
    			div128.textContent = "Sets the tabindex of each bar.";
    			t497 = space();
    			code93 = element("code");
    			code93.textContent = "dispatchEvents";
    			t499 = space();
    			code94 = element("code");
    			code94.textContent = "false";
    			t501 = space();
    			div129 = element("div");
    			div129.textContent = "Boolean whether or not to dispatch events on certain actions (explained above).";
    			t503 = space();
    			code95 = element("code");
    			code95.textContent = "clickHandler";
    			t505 = space();
    			code96 = element("code");
    			code96.textContent = "null";
    			t507 = space();
    			div130 = element("div");
    			div130.textContent = "Function that executes on click and returns the key and index for the clicked data.";
    			t509 = space();
    			div136 = element("div");
    			p10 = element("p");
    			p10.textContent = "This is a list of all configurable properties on the \"LinkedLabel\" component.";
    			t511 = space();
    			div135 = element("div");
    			strong8 = element("strong");
    			strong8.textContent = "Property";
    			t513 = space();
    			strong9 = element("strong");
    			strong9.textContent = "Default";
    			t515 = space();
    			strong10 = element("strong");
    			strong10.textContent = "Description";
    			t517 = space();
    			code97 = element("code");
    			code97.textContent = "linked";
    			t519 = space();
    			code98 = element("code");
    			t520 = space();
    			div133 = element("div");
    			div133.textContent = "Key to link this label to charts with the same key.";
    			t522 = space();
    			code99 = element("code");
    			code99.textContent = "empty";
    			t524 = space();
    			code100 = element("code");
    			code100.textContent = "&nbsp;";
    			t526 = space();
    			div134 = element("div");
    			div134.textContent = "String that will be displayed when no bar is being hovered.";
    			t528 = space();
    			div141 = element("div");
    			p11 = element("p");
    			p11.textContent = "This is a list of all configurable properties on the \"LinkedValue\" component.";
    			t530 = space();
    			div140 = element("div");
    			strong11 = element("strong");
    			strong11.textContent = "Property";
    			t532 = space();
    			strong12 = element("strong");
    			strong12.textContent = "Default";
    			t534 = space();
    			strong13 = element("strong");
    			strong13.textContent = "Description";
    			t536 = space();
    			code101 = element("code");
    			code101.textContent = "uid";
    			t538 = space();
    			code102 = element("code");
    			t539 = space();
    			div137 = element("div");
    			div137.textContent = "Unique ID to link this value to a chart with the same uid.";
    			t541 = space();
    			code103 = element("code");
    			code103.textContent = "empty";
    			t543 = space();
    			code104 = element("code");
    			code104.textContent = "&nbsp;";
    			t545 = space();
    			div138 = element("div");
    			div138.textContent = "String that will be displayed when no bar is being hovered.";
    			t547 = space();
    			code105 = element("code");
    			code105.textContent = "valueUndefined";
    			t549 = space();
    			code106 = element("code");
    			code106.textContent = "0";
    			t551 = space();
    			div139 = element("div");
    			div139.textContent = "For when the hovering value returns undefined.";
    			t553 = space();
    			div142 = element("div");
    			t554 = text("Made by ");
    			a1 = element("a");
    			a1.textContent = "Mitchel Jager";
    			attr_dev(mark0, "class", "svelte-16omhbi");
    			add_location(mark0, file, 39, 29, 1050);
    			attr_dev(h1, "class", "svelte-16omhbi");
    			add_location(h1, file, 39, 2, 1023);
    			attr_dev(div0, "class", "header svelte-16omhbi");
    			add_location(div0, file, 38, 1, 999);
    			attr_dev(p0, "class", "svelte-16omhbi");
    			add_location(p0, file, 44, 2, 1206);
    			add_location(em, file, 46, 5, 1424);
    			attr_dev(p1, "class", "svelte-16omhbi");
    			add_location(p1, file, 46, 2, 1421);
    			attr_dev(a0, "href", "https://github.com/Mitcheljager/svelte-tiny-linked-charts");
    			attr_dev(a0, "class", "svelte-16omhbi");
    			add_location(a0, file, 48, 5, 1473);
    			attr_dev(p2, "class", "svelte-16omhbi");
    			add_location(p2, file, 48, 2, 1470);
    			attr_dev(h20, "class", "svelte-16omhbi");
    			add_location(h20, file, 50, 2, 1561);
    			attr_dev(th0, "class", "svelte-16omhbi");
    			add_location(th0, file, 54, 4, 1624);
    			attr_dev(th1, "width", "150");
    			attr_dev(th1, "class", "svelte-16omhbi");
    			add_location(th1, file, 55, 4, 1643);
    			attr_dev(th2, "class", "svelte-16omhbi");
    			add_location(th2, file, 56, 4, 1722);
    			add_location(tr0, file, 53, 3, 1614);
    			attr_dev(td0, "class", "label svelte-16omhbi");
    			add_location(td0, file, 60, 4, 1763);
    			attr_dev(td1, "class", "svelte-16omhbi");
    			add_location(td1, file, 61, 4, 1799);
    			attr_dev(td2, "class", "svelte-16omhbi");
    			add_location(td2, file, 62, 4, 1880);
    			add_location(tr1, file, 59, 3, 1753);
    			attr_dev(td3, "class", "label svelte-16omhbi");
    			add_location(td3, file, 66, 4, 2007);
    			attr_dev(td4, "class", "svelte-16omhbi");
    			add_location(td4, file, 67, 4, 2049);
    			attr_dev(td5, "class", "svelte-16omhbi");
    			add_location(td5, file, 68, 4, 2130);
    			add_location(tr2, file, 65, 3, 1997);
    			attr_dev(td6, "class", "label svelte-16omhbi");
    			add_location(td6, file, 72, 4, 2257);
    			attr_dev(td7, "class", "svelte-16omhbi");
    			add_location(td7, file, 73, 4, 2299);
    			attr_dev(td8, "class", "svelte-16omhbi");
    			add_location(td8, file, 74, 4, 2380);
    			add_location(tr3, file, 71, 3, 2247);
    			attr_dev(td9, "class", "label svelte-16omhbi");
    			add_location(td9, file, 78, 4, 2508);
    			attr_dev(td10, "class", "svelte-16omhbi");
    			add_location(td10, file, 79, 4, 2556);
    			attr_dev(td11, "class", "svelte-16omhbi");
    			add_location(td11, file, 80, 4, 2637);
    			add_location(tr4, file, 77, 3, 2498);
    			attr_dev(td12, "class", "label svelte-16omhbi");
    			add_location(td12, file, 84, 4, 2765);
    			attr_dev(td13, "class", "svelte-16omhbi");
    			add_location(td13, file, 85, 4, 2810);
    			attr_dev(td14, "class", "svelte-16omhbi");
    			add_location(td14, file, 86, 4, 2953);
    			add_location(tr5, file, 83, 3, 2755);
    			attr_dev(td15, "class", "label svelte-16omhbi");
    			add_location(td15, file, 90, 4, 3086);
    			attr_dev(td16, "class", "svelte-16omhbi");
    			add_location(td16, file, 91, 4, 3134);
    			attr_dev(td17, "class", "svelte-16omhbi");
    			add_location(td17, file, 92, 4, 3227);
    			add_location(tr6, file, 89, 3, 3076);
    			attr_dev(table, "class", "preview-table svelte-16omhbi");
    			add_location(table, file, 52, 2, 1580);
    			attr_dev(h21, "class", "svelte-16omhbi");
    			add_location(h21, file, 96, 2, 3356);
    			attr_dev(p3, "class", "svelte-16omhbi");
    			add_location(p3, file, 98, 2, 3383);
    			attr_dev(mark1, "class", "svelte-16omhbi");
    			add_location(mark1, file, 101, 12, 3455);
    			attr_dev(code0, "class", "well svelte-16omhbi");
    			add_location(code0, file, 100, 2, 3422);
    			attr_dev(mark2, "class", "svelte-16omhbi");
    			add_location(mark2, file, 105, 22, 3553);
    			attr_dev(code1, "class", "well svelte-16omhbi");
    			add_location(code1, file, 104, 2, 3510);
    			attr_dev(p4, "class", "svelte-16omhbi");
    			add_location(p4, file, 108, 2, 3608);
    			attr_dev(mark3, "class", "svelte-16omhbi");
    			add_location(mark3, file, 111, 7, 3679);
    			attr_dev(code2, "class", "well svelte-16omhbi");
    			add_location(code2, file, 110, 2, 3651);
    			attr_dev(mark4, "class", "svelte-16omhbi");
    			add_location(mark4, file, 115, 17, 3783);
    			attr_dev(mark5, "class", "svelte-16omhbi");
    			add_location(mark5, file, 115, 43, 3809);
    			attr_dev(mark6, "class", "svelte-16omhbi");
    			add_location(mark6, file, 115, 69, 3835);
    			attr_dev(mark7, "class", "svelte-16omhbi");
    			add_location(mark7, file, 115, 107, 3873);
    			attr_dev(code3, "class", "well svelte-16omhbi");
    			add_location(code3, file, 114, 2, 3745);
    			attr_dev(div1, "class", "block block--single svelte-16omhbi");
    			add_location(div1, file, 43, 1, 1169);
    			attr_dev(p5, "class", "svelte-16omhbi");
    			add_location(p5, file, 120, 2, 3974);
    			add_location(br0, file, 125, 21, 4084);
    			add_location(br1, file, 126, 28, 4118);
    			add_location(br2, file, 127, 28, 4152);
    			add_location(br3, file, 128, 28, 4186);
    			add_location(br4, file, 129, 28, 4220);
    			add_location(br5, file, 130, 27, 4253);
    			attr_dev(code4, "class", "well svelte-16omhbi");
    			add_location(code4, file, 124, 2, 4042);
    			attr_dev(code5, "class", "well svelte-16omhbi");
    			add_location(code5, file, 134, 2, 4285);
    			attr_dev(p6, "class", "svelte-16omhbi");
    			add_location(p6, file, 138, 2, 4366);
    			add_location(br6, file, 141, 18, 4475);
    			add_location(br7, file, 142, 24, 4505);
    			add_location(br8, file, 143, 24, 4535);
    			add_location(br9, file, 144, 24, 4565);
    			add_location(br10, file, 145, 24, 4595);
    			add_location(br11, file, 146, 23, 4624);
    			attr_dev(code6, "class", "well svelte-16omhbi");
    			add_location(code6, file, 140, 2, 4436);
    			add_location(br12, file, 151, 18, 4690);
    			add_location(br13, file, 152, 14, 4710);
    			add_location(br14, file, 153, 14, 4730);
    			add_location(br15, file, 154, 14, 4750);
    			add_location(br16, file, 155, 14, 4770);
    			add_location(br17, file, 156, 13, 4789);
    			attr_dev(code7, "class", "well svelte-16omhbi");
    			add_location(code7, file, 150, 2, 4651);
    			attr_dev(code8, "class", "well svelte-16omhbi");
    			add_location(code8, file, 160, 2, 4816);
    			attr_dev(div2, "class", "block block--single svelte-16omhbi");
    			add_location(div2, file, 119, 1, 3937);
    			attr_dev(h22, "class", "svelte-16omhbi");
    			add_location(h22, file, 165, 1, 4928);
    			attr_dev(code9, "class", "svelte-16omhbi");
    			add_location(code9, file, 171, 3, 5041);
    			attr_dev(div3, "class", "description svelte-16omhbi");
    			add_location(div3, file, 168, 2, 4970);
    			attr_dev(div4, "class", "block svelte-16omhbi");
    			add_location(div4, file, 167, 1, 4947);
    			add_location(br18, file, 184, 61, 5380);
    			add_location(br19, file, 185, 61, 5447);
    			add_location(br20, file, 186, 61, 5514);
    			attr_dev(code10, "class", "svelte-16omhbi");
    			add_location(code10, file, 183, 3, 5311);
    			attr_dev(div5, "class", "description svelte-16omhbi");
    			add_location(div5, file, 180, 2, 5195);
    			attr_dev(div6, "class", "chart svelte-16omhbi");
    			add_location(div6, file, 192, 3, 5618);
    			attr_dev(div7, "class", "chart svelte-16omhbi");
    			add_location(div7, file, 193, 3, 5701);
    			attr_dev(div8, "class", "chart svelte-16omhbi");
    			add_location(div8, file, 194, 3, 5784);
    			attr_dev(div9, "class", "chart svelte-16omhbi");
    			add_location(div9, file, 195, 3, 5867);
    			add_location(div10, file, 191, 2, 5608);
    			attr_dev(div11, "class", "block svelte-16omhbi");
    			add_location(div11, file, 179, 1, 5172);
    			add_location(br21, file, 204, 60, 6224);
    			attr_dev(code11, "class", "svelte-16omhbi");
    			add_location(code11, file, 203, 3, 6156);
    			attr_dev(div12, "class", "description svelte-16omhbi");
    			add_location(div12, file, 200, 2, 5992);
    			attr_dev(div13, "class", "chart svelte-16omhbi");
    			add_location(div13, file, 210, 3, 6327);
    			attr_dev(div14, "class", "chart svelte-16omhbi");
    			add_location(div14, file, 211, 3, 6425);
    			add_location(div15, file, 209, 2, 6317);
    			attr_dev(div16, "class", "block svelte-16omhbi");
    			add_location(div16, file, 199, 1, 5969);
    			attr_dev(h23, "class", "svelte-16omhbi");
    			add_location(h23, file, 215, 1, 6550);
    			add_location(br22, file, 222, 42, 6778);
    			add_location(br23, file, 223, 4, 6788);
    			add_location(br24, file, 224, 61, 6855);
    			attr_dev(code12, "class", "svelte-16omhbi");
    			add_location(code12, file, 221, 3, 6728);
    			add_location(br25, file, 227, 3, 6938);
    			attr_dev(div17, "class", "description svelte-16omhbi");
    			add_location(div17, file, 218, 2, 6592);
    			attr_dev(div18, "class", "chart svelte-16omhbi");
    			add_location(div18, file, 234, 3, 7070);
    			attr_dev(div19, "class", "chart svelte-16omhbi");
    			add_location(div19, file, 235, 3, 7153);
    			add_location(div20, file, 231, 2, 6999);
    			attr_dev(div21, "class", "block svelte-16omhbi");
    			add_location(div21, file, 217, 1, 6569);
    			attr_dev(code13, "class", "svelte-16omhbi");
    			add_location(code13, file, 243, 3, 7374);
    			add_location(br26, file, 247, 3, 7474);
    			add_location(br27, file, 251, 20, 7602);
    			add_location(br28, file, 252, 31, 7639);
    			add_location(br29, file, 253, 40, 7685);
    			add_location(br30, file, 254, 38, 7729);
    			add_location(br31, file, 255, 33, 7768);
    			attr_dev(code14, "class", "svelte-16omhbi");
    			add_location(code14, file, 250, 3, 7574);
    			add_location(br32, file, 258, 3, 7827);
    			attr_dev(div22, "class", "description svelte-16omhbi");
    			add_location(div22, file, 240, 2, 7278);
    			attr_dev(div23, "class", "chart svelte-16omhbi");
    			add_location(div23, file, 263, 3, 7899);
    			attr_dev(div24, "class", "chart svelte-16omhbi");
    			add_location(div24, file, 264, 3, 8001);
    			add_location(div25, file, 262, 2, 7889);
    			attr_dev(div26, "class", "block svelte-16omhbi");
    			add_location(div26, file, 239, 1, 7255);
    			add_location(br33, file, 273, 20, 8364);
    			add_location(br34, file, 274, 31, 8401);
    			add_location(br35, file, 275, 40, 8447);
    			attr_dev(code15, "class", "svelte-16omhbi");
    			add_location(code15, file, 272, 3, 8336);
    			add_location(br36, file, 278, 3, 8511);
    			attr_dev(div27, "class", "description svelte-16omhbi");
    			add_location(div27, file, 269, 2, 8214);
    			attr_dev(div28, "class", "chart svelte-16omhbi");
    			add_location(div28, file, 283, 3, 8599);
    			add_location(br37, file, 284, 3, 8726);
    			attr_dev(div29, "class", "chart svelte-16omhbi");
    			add_location(div29, file, 285, 3, 8735);
    			add_location(div30, file, 282, 2, 8589);
    			attr_dev(div31, "class", "block svelte-16omhbi");
    			add_location(div31, file, 268, 1, 8191);
    			add_location(br38, file, 294, 3, 9153);
    			add_location(br39, file, 295, 39, 9198);
    			attr_dev(code16, "class", "svelte-16omhbi");
    			add_location(code16, file, 292, 2, 9083);
    			add_location(br40, file, 297, 2, 9217);
    			add_location(br41, file, 300, 2, 9268);
    			add_location(br42, file, 300, 6, 9272);
    			add_location(strong0, file, 305, 3, 9363);
    			add_location(div32, file, 302, 2, 9282);
    			add_location(strong1, file, 311, 3, 9528);
    			add_location(div33, file, 308, 2, 9445);
    			attr_dev(div34, "class", "block block--single svelte-16omhbi");
    			add_location(div34, file, 289, 1, 8881);
    			attr_dev(h24, "class", "svelte-16omhbi");
    			add_location(h24, file, 315, 1, 9620);
    			attr_dev(code17, "class", "svelte-16omhbi");
    			add_location(code17, file, 321, 3, 9785);
    			attr_dev(div35, "class", "description svelte-16omhbi");
    			add_location(div35, file, 318, 2, 9664);
    			attr_dev(div36, "class", "block svelte-16omhbi");
    			add_location(div36, file, 317, 1, 9641);
    			add_location(br43, file, 334, 64, 10149);
    			attr_dev(code18, "class", "svelte-16omhbi");
    			add_location(code18, file, 333, 3, 10077);
    			attr_dev(div37, "class", "description svelte-16omhbi");
    			add_location(div37, file, 330, 2, 9978);
    			attr_dev(div38, "class", "chart svelte-16omhbi");
    			add_location(div38, file, 340, 3, 10257);
    			attr_dev(div39, "class", "chart svelte-16omhbi");
    			add_location(div39, file, 341, 3, 10340);
    			add_location(div40, file, 339, 2, 10247);
    			attr_dev(div41, "class", "block svelte-16omhbi");
    			add_location(div41, file, 329, 1, 9955);
    			add_location(br44, file, 350, 65, 10699);
    			attr_dev(code19, "class", "svelte-16omhbi");
    			add_location(code19, file, 349, 3, 10626);
    			attr_dev(div42, "class", "description svelte-16omhbi");
    			add_location(div42, file, 346, 2, 10466);
    			attr_dev(div43, "class", "chart svelte-16omhbi");
    			add_location(div43, file, 356, 3, 10807);
    			attr_dev(div44, "class", "chart svelte-16omhbi");
    			add_location(div44, file, 357, 3, 10980);
    			add_location(div45, file, 355, 2, 10797);
    			attr_dev(div46, "class", "block svelte-16omhbi");
    			add_location(div46, file, 345, 1, 10443);
    			add_location(br45, file, 366, 19, 11381);
    			add_location(br46, file, 367, 33, 11420);
    			add_location(br47, file, 368, 34, 11460);
    			attr_dev(code20, "class", "svelte-16omhbi");
    			add_location(code20, file, 365, 3, 11354);
    			attr_dev(div47, "class", "description svelte-16omhbi");
    			add_location(div47, file, 362, 2, 11195);
    			attr_dev(div48, "class", "chart svelte-16omhbi");
    			add_location(div48, file, 374, 3, 11536);
    			attr_dev(div49, "class", "chart svelte-16omhbi");
    			add_location(div49, file, 375, 3, 11633);
    			add_location(div50, file, 373, 2, 11526);
    			attr_dev(div51, "class", "block svelte-16omhbi");
    			add_location(div51, file, 361, 1, 11172);
    			add_location(br48, file, 384, 19, 11957);
    			add_location(br49, file, 385, 33, 11996);
    			add_location(br50, file, 386, 23, 12025);
    			attr_dev(code21, "class", "svelte-16omhbi");
    			add_location(code21, file, 383, 3, 11930);
    			add_location(br51, file, 391, 15, 12102);
    			add_location(br52, file, 392, 24, 12132);
    			add_location(br53, file, 393, 25, 12163);
    			attr_dev(code22, "class", "svelte-16omhbi");
    			add_location(code22, file, 390, 3, 12079);
    			add_location(br54, file, 397, 3, 12198);
    			add_location(br55, file, 401, 15, 12259);
    			add_location(br56, file, 402, 24, 12289);
    			add_location(br57, file, 403, 25, 12320);
    			attr_dev(code23, "class", "svelte-16omhbi");
    			add_location(code23, file, 400, 3, 12236);
    			attr_dev(div52, "class", "description svelte-16omhbi");
    			add_location(div52, file, 380, 2, 11771);
    			attr_dev(div53, "class", "chart chart--responsive svelte-16omhbi");
    			add_location(div53, file, 409, 3, 12374);
    			attr_dev(div54, "class", "chart chart--responsive svelte-16omhbi");
    			add_location(div54, file, 410, 3, 12502);
    			add_location(div55, file, 408, 2, 12364);
    			attr_dev(div56, "class", "block svelte-16omhbi");
    			add_location(div56, file, 379, 1, 11748);
    			add_location(br58, file, 419, 54, 12815);
    			attr_dev(code24, "class", "svelte-16omhbi");
    			add_location(code24, file, 418, 3, 12753);
    			attr_dev(div57, "class", "description svelte-16omhbi");
    			add_location(div57, file, 415, 2, 12671);
    			attr_dev(div58, "class", "chart svelte-16omhbi");
    			add_location(div58, file, 425, 3, 12911);
    			attr_dev(div59, "class", "chart svelte-16omhbi");
    			add_location(div59, file, 426, 3, 12987);
    			add_location(div60, file, 424, 2, 12901);
    			attr_dev(div61, "class", "block svelte-16omhbi");
    			add_location(div61, file, 414, 1, 12648);
    			attr_dev(code25, "class", "svelte-16omhbi");
    			add_location(code25, file, 434, 3, 13275);
    			attr_dev(div62, "class", "description svelte-16omhbi");
    			add_location(div62, file, 431, 2, 13104);
    			attr_dev(div63, "class", "chart svelte-16omhbi");
    			add_location(div63, file, 440, 3, 13378);
    			attr_dev(div64, "class", "chart svelte-16omhbi");
    			add_location(div64, file, 441, 3, 13445);
    			add_location(div65, file, 439, 2, 13368);
    			attr_dev(div66, "class", "block svelte-16omhbi");
    			add_location(div66, file, 430, 1, 13081);
    			add_location(br59, file, 450, 41, 13694);
    			add_location(br60, file, 451, 50, 13750);
    			attr_dev(code26, "class", "svelte-16omhbi");
    			add_location(code26, file, 449, 3, 13645);
    			attr_dev(div67, "class", "description svelte-16omhbi");
    			add_location(div67, file, 446, 2, 13567);
    			attr_dev(div68, "class", "chart svelte-16omhbi");
    			add_location(div68, file, 457, 3, 13849);
    			attr_dev(div69, "class", "chart svelte-16omhbi");
    			add_location(div69, file, 458, 3, 13947);
    			attr_dev(div70, "class", "chart svelte-16omhbi");
    			add_location(div70, file, 459, 3, 14045);
    			attr_dev(div71, "class", "chart svelte-16omhbi");
    			add_location(div71, file, 460, 3, 14143);
    			attr_dev(div72, "class", "chart svelte-16omhbi");
    			add_location(div72, file, 461, 3, 14241);
    			attr_dev(div73, "class", "chart svelte-16omhbi");
    			add_location(div73, file, 462, 3, 14339);
    			attr_dev(div74, "class", "chart svelte-16omhbi");
    			add_location(div74, file, 463, 3, 14437);
    			attr_dev(div75, "class", "chart svelte-16omhbi");
    			add_location(div75, file, 464, 3, 14535);
    			add_location(div76, file, 456, 2, 13839);
    			attr_dev(div77, "class", "block svelte-16omhbi");
    			add_location(div77, file, 445, 1, 13544);
    			attr_dev(code27, "class", "svelte-16omhbi");
    			add_location(code27, file, 472, 3, 14793);
    			attr_dev(div78, "class", "description svelte-16omhbi");
    			add_location(div78, file, 469, 2, 14690);
    			attr_dev(div79, "class", "block svelte-16omhbi");
    			add_location(div79, file, 468, 1, 14667);
    			attr_dev(code28, "class", "svelte-16omhbi");
    			add_location(code28, file, 484, 3, 15080);
    			attr_dev(div80, "class", "description svelte-16omhbi");
    			add_location(div80, file, 481, 2, 14985);
    			attr_dev(div81, "class", "block svelte-16omhbi");
    			add_location(div81, file, 480, 1, 14962);
    			add_location(br61, file, 494, 49, 15352);
    			attr_dev(code29, "class", "svelte-16omhbi");
    			add_location(code29, file, 497, 3, 15399);
    			attr_dev(div82, "class", "description svelte-16omhbi");
    			add_location(div82, file, 493, 2, 15276);
    			attr_dev(div83, "class", "block svelte-16omhbi");
    			add_location(div83, file, 492, 1, 15253);
    			add_location(br62, file, 510, 58, 15846);
    			attr_dev(code30, "class", "svelte-16omhbi");
    			add_location(code30, file, 509, 3, 15780);
    			attr_dev(div84, "class", "description svelte-16omhbi");
    			add_location(div84, file, 506, 2, 15634);
    			attr_dev(div85, "class", "chart svelte-16omhbi");
    			add_location(div85, file, 515, 3, 15888);
    			add_location(div86, file, 514, 2, 15878);
    			attr_dev(div87, "class", "block svelte-16omhbi");
    			add_location(div87, file, 505, 1, 15611);
    			add_location(br63, file, 524, 57, 16352);
    			add_location(br64, file, 525, 20, 16378);
    			add_location(br65, file, 526, 30, 16414);
    			add_location(br66, file, 527, 23, 16443);
    			add_location(br67, file, 528, 31, 16480);
    			attr_dev(code31, "class", "svelte-16omhbi");
    			add_location(code31, file, 523, 3, 16287);
    			attr_dev(div88, "class", "description svelte-16omhbi");
    			add_location(div88, file, 520, 2, 16062);
    			attr_dev(div89, "class", "chart svelte-16omhbi");
    			add_location(div89, file, 534, 3, 16565);
    			attr_dev(div90, "class", "chart svelte-16omhbi");
    			add_location(div90, file, 535, 3, 16660);
    			attr_dev(div91, "class", "chart svelte-16omhbi");
    			add_location(div91, file, 536, 3, 16755);
    			attr_dev(div92, "class", "chart svelte-16omhbi");
    			add_location(div92, file, 537, 3, 16850);
    			add_location(div93, file, 533, 2, 16555);
    			attr_dev(div94, "class", "block svelte-16omhbi");
    			add_location(div94, file, 519, 1, 16039);
    			attr_dev(h25, "class", "svelte-16omhbi");
    			add_location(h25, file, 541, 1, 17051);
    			add_location(br68, file, 548, 20, 17296);
    			add_location(br69, file, 549, 45, 17347);
    			add_location(br70, file, 550, 72, 17425);
    			add_location(br71, file, 551, 71, 17502);
    			attr_dev(code32, "class", "well svelte-16omhbi");
    			add_location(code32, file, 547, 3, 17255);
    			attr_dev(p7, "class", "svelte-16omhbi");
    			add_location(p7, file, 555, 3, 17611);
    			attr_dev(span, "data-role", "currency");
    			add_location(span, file, 564, 4, 18187);
    			add_location(div95, file, 557, 3, 17812);
    			add_location(br72, file, 568, 20, 18286);
    			add_location(br73, file, 569, 26, 18318);
    			add_location(br74, file, 570, 39, 18363);
    			add_location(br75, file, 571, 71, 18440);
    			add_location(br76, file, 572, 93, 18539);
    			add_location(br77, file, 573, 68, 18613);
    			add_location(br78, file, 574, 30, 18649);
    			add_location(br79, file, 575, 18, 18673);
    			add_location(br80, file, 576, 38, 18717);
    			add_location(br81, file, 577, 92, 18815);
    			attr_dev(code33, "class", "well svelte-16omhbi");
    			add_location(code33, file, 567, 3, 18245);
    			add_location(br82, file, 581, 3, 18863);
    			attr_dev(p8, "class", "svelte-16omhbi");
    			add_location(p8, file, 583, 3, 18874);
    			add_location(div96, file, 585, 3, 19126);
    			add_location(br83, file, 596, 20, 19496);
    			add_location(br84, file, 597, 26, 19528);
    			add_location(br85, file, 598, 21, 19555);
    			add_location(br86, file, 599, 36, 19597);
    			add_location(br87, file, 600, 34, 19637);
    			add_location(br88, file, 601, 53, 19696);
    			add_location(br89, file, 602, 54, 19756);
    			add_location(br90, file, 603, 73, 19835);
    			add_location(br91, file, 604, 84, 19925);
    			attr_dev(code34, "class", "well svelte-16omhbi");
    			add_location(code34, file, 595, 3, 19455);
    			add_location(br92, file, 608, 3, 19980);
    			add_location(h3, file, 610, 3, 19991);
    			attr_dev(strong2, "class", "svelte-16omhbi");
    			add_location(strong2, file, 613, 4, 20042);
    			attr_dev(strong3, "class", "svelte-16omhbi");
    			add_location(strong3, file, 613, 30, 20068);
    			attr_dev(strong4, "class", "svelte-16omhbi");
    			add_location(strong4, file, 613, 59, 20097);
    			attr_dev(code35, "class", "svelte-16omhbi");
    			add_location(code35, file, 614, 4, 20126);
    			add_location(div97, file, 614, 26, 20148);
    			attr_dev(code36, "class", "svelte-16omhbi");
    			add_location(code36, file, 614, 54, 20176);
    			attr_dev(code37, "class", "svelte-16omhbi");
    			add_location(code37, file, 615, 4, 20256);
    			add_location(div98, file, 615, 25, 20277);
    			attr_dev(code38, "class", "svelte-16omhbi");
    			add_location(code38, file, 615, 57, 20309);
    			attr_dev(code39, "class", "svelte-16omhbi");
    			add_location(code39, file, 616, 4, 20370);
    			add_location(div99, file, 616, 33, 20399);
    			attr_dev(code40, "class", "svelte-16omhbi");
    			add_location(code40, file, 616, 71, 20437);
    			attr_dev(div100, "class", "table svelte-16omhbi");
    			add_location(div100, file, 612, 3, 20017);
    			attr_dev(div101, "class", "description svelte-16omhbi");
    			add_location(div101, file, 544, 2, 17094);
    			attr_dev(div102, "class", "block svelte-16omhbi");
    			add_location(div102, file, 543, 1, 17071);
    			attr_dev(h26, "class", "svelte-16omhbi");
    			add_location(h26, file, 621, 1, 20520);
    			attr_dev(p9, "class", "svelte-16omhbi");
    			add_location(p9, file, 624, 2, 20581);
    			attr_dev(strong5, "class", "svelte-16omhbi");
    			add_location(strong5, file, 627, 3, 20695);
    			attr_dev(strong6, "class", "svelte-16omhbi");
    			add_location(strong6, file, 627, 29, 20721);
    			attr_dev(strong7, "class", "svelte-16omhbi");
    			add_location(strong7, file, 627, 54, 20746);
    			attr_dev(code41, "class", "svelte-16omhbi");
    			add_location(code41, file, 628, 3, 20779);
    			attr_dev(code42, "class", "svelte-16omhbi");
    			add_location(code42, file, 628, 21, 20797);
    			add_location(div103, file, 628, 47, 20823);
    			attr_dev(code43, "class", "svelte-16omhbi");
    			add_location(code43, file, 629, 3, 20909);
    			attr_dev(code44, "class", "svelte-16omhbi");
    			add_location(code44, file, 629, 23, 20929);
    			add_location(div104, file, 629, 39, 20945);
    			attr_dev(code45, "class", "svelte-16omhbi");
    			add_location(code45, file, 630, 3, 21032);
    			attr_dev(code46, "class", "svelte-16omhbi");
    			add_location(code46, file, 630, 23, 21052);
    			add_location(div105, file, 630, 39, 21068);
    			attr_dev(code47, "class", "svelte-16omhbi");
    			add_location(code47, file, 631, 3, 21155);
    			attr_dev(code48, "class", "svelte-16omhbi");
    			add_location(code48, file, 631, 23, 21175);
    			add_location(div106, file, 631, 37, 21189);
    			attr_dev(code49, "class", "svelte-16omhbi");
    			add_location(code49, file, 632, 3, 21262);
    			attr_dev(code50, "class", "svelte-16omhbi");
    			add_location(code50, file, 632, 20, 21279);
    			add_location(div107, file, 632, 34, 21293);
    			attr_dev(code51, "class", "svelte-16omhbi");
    			add_location(code51, file, 633, 3, 21383);
    			attr_dev(code52, "class", "svelte-16omhbi");
    			add_location(code52, file, 633, 23, 21403);
    			add_location(div108, file, 633, 39, 21419);
    			attr_dev(code53, "class", "svelte-16omhbi");
    			add_location(code53, file, 634, 3, 21465);
    			attr_dev(code54, "class", "svelte-16omhbi");
    			add_location(code54, file, 634, 22, 21484);
    			add_location(div109, file, 634, 39, 21501);
    			attr_dev(code55, "class", "svelte-16omhbi");
    			add_location(code55, file, 635, 3, 21546);
    			attr_dev(code56, "class", "svelte-16omhbi");
    			add_location(code56, file, 635, 28, 21571);
    			add_location(div110, file, 635, 43, 21586);
    			attr_dev(code57, "class", "svelte-16omhbi");
    			add_location(code57, file, 636, 3, 21643);
    			attr_dev(code58, "class", "svelte-16omhbi");
    			add_location(code58, file, 636, 29, 21669);
    			add_location(div111, file, 636, 44, 21684);
    			attr_dev(code59, "class", "svelte-16omhbi");
    			add_location(code59, file, 637, 3, 21750);
    			attr_dev(code60, "class", "svelte-16omhbi");
    			add_location(code60, file, 637, 21, 21768);
    			add_location(div112, file, 637, 40, 21787);
    			attr_dev(code61, "class", "svelte-16omhbi");
    			add_location(code61, file, 638, 3, 21878);
    			attr_dev(code62, "class", "svelte-16omhbi");
    			add_location(code62, file, 638, 22, 21897);
    			add_location(div113, file, 638, 41, 21916);
    			attr_dev(code63, "class", "svelte-16omhbi");
    			add_location(code63, file, 639, 3, 22013);
    			attr_dev(code64, "class", "svelte-16omhbi");
    			add_location(code64, file, 639, 20, 22030);
    			add_location(div114, file, 639, 35, 22045);
    			attr_dev(code65, "class", "svelte-16omhbi");
    			add_location(code65, file, 640, 3, 22092);
    			attr_dev(code66, "class", "svelte-16omhbi");
    			add_location(code66, file, 640, 21, 22110);
    			add_location(div115, file, 640, 42, 22131);
    			attr_dev(code67, "class", "svelte-16omhbi");
    			add_location(code67, file, 641, 3, 22193);
    			attr_dev(code68, "class", "svelte-16omhbi");
    			add_location(code68, file, 641, 28, 22218);
    			add_location(div116, file, 641, 45, 22235);
    			attr_dev(code69, "class", "svelte-16omhbi");
    			add_location(code69, file, 642, 3, 22300);
    			attr_dev(code70, "class", "svelte-16omhbi");
    			add_location(code70, file, 642, 22, 22319);
    			add_location(div117, file, 642, 40, 22337);
    			attr_dev(code71, "class", "svelte-16omhbi");
    			add_location(code71, file, 643, 3, 22409);
    			attr_dev(code72, "class", "svelte-16omhbi");
    			add_location(code72, file, 643, 27, 22433);
    			add_location(div118, file, 643, 42, 22448);
    			attr_dev(code73, "class", "svelte-16omhbi");
    			add_location(code73, file, 644, 3, 22540);
    			attr_dev(code74, "class", "svelte-16omhbi");
    			add_location(code74, file, 644, 26, 22563);
    			add_location(div119, file, 644, 45, 22582);
    			attr_dev(code75, "class", "svelte-16omhbi");
    			add_location(code75, file, 645, 3, 22643);
    			attr_dev(code76, "class", "svelte-16omhbi");
    			add_location(code76, file, 645, 29, 22669);
    			add_location(div120, file, 645, 51, 22691);
    			attr_dev(code77, "class", "svelte-16omhbi");
    			add_location(code77, file, 646, 3, 22739);
    			attr_dev(code78, "class", "svelte-16omhbi");
    			add_location(code78, file, 646, 31, 22767);
    			add_location(div121, file, 646, 46, 22782);
    			attr_dev(code79, "class", "svelte-16omhbi");
    			add_location(code79, file, 647, 3, 22844);
    			attr_dev(code80, "class", "svelte-16omhbi");
    			add_location(code80, file, 647, 29, 22870);
    			add_location(div122, file, 647, 43, 22884);
    			attr_dev(code81, "class", "svelte-16omhbi");
    			add_location(code81, file, 648, 3, 22928);
    			attr_dev(code82, "class", "svelte-16omhbi");
    			add_location(code82, file, 648, 28, 22953);
    			add_location(div123, file, 648, 42, 22967);
    			attr_dev(code83, "class", "svelte-16omhbi");
    			add_location(code83, file, 649, 3, 23013);
    			attr_dev(code84, "class", "svelte-16omhbi");
    			add_location(code84, file, 649, 30, 23040);
    			add_location(div124, file, 649, 50, 23060);
    			attr_dev(code85, "class", "svelte-16omhbi");
    			add_location(code85, file, 650, 3, 23137);
    			attr_dev(code86, "class", "svelte-16omhbi");
    			add_location(code86, file, 650, 25, 23159);
    			add_location(div125, file, 650, 40, 23174);
    			attr_dev(code87, "class", "svelte-16omhbi");
    			add_location(code87, file, 651, 3, 23271);
    			attr_dev(code88, "class", "svelte-16omhbi");
    			add_location(code88, file, 651, 21, 23289);
    			add_location(div126, file, 651, 38, 23306);
    			attr_dev(code89, "class", "svelte-16omhbi");
    			add_location(code89, file, 652, 3, 23375);
    			attr_dev(code90, "class", "svelte-16omhbi");
    			add_location(code90, file, 652, 26, 23398);
    			add_location(div127, file, 652, 44, 23416);
    			attr_dev(code91, "class", "svelte-16omhbi");
    			add_location(code91, file, 653, 3, 23475);
    			attr_dev(code92, "class", "svelte-16omhbi");
    			add_location(code92, file, 653, 25, 23497);
    			add_location(div128, file, 653, 41, 23513);
    			attr_dev(code93, "class", "svelte-16omhbi");
    			add_location(code93, file, 654, 3, 23559);
    			attr_dev(code94, "class", "svelte-16omhbi");
    			add_location(code94, file, 654, 31, 23587);
    			add_location(div129, file, 654, 50, 23606);
    			attr_dev(code95, "class", "svelte-16omhbi");
    			add_location(code95, file, 655, 3, 23701);
    			attr_dev(code96, "class", "svelte-16omhbi");
    			add_location(code96, file, 655, 29, 23727);
    			add_location(div130, file, 655, 47, 23745);
    			attr_dev(div131, "class", "table svelte-16omhbi");
    			add_location(div131, file, 626, 2, 20671);
    			attr_dev(div132, "class", "block block--single svelte-16omhbi");
    			add_location(div132, file, 623, 1, 20544);
    			attr_dev(p10, "class", "svelte-16omhbi");
    			add_location(p10, file, 660, 2, 23900);
    			attr_dev(strong8, "class", "svelte-16omhbi");
    			add_location(strong8, file, 663, 3, 24014);
    			attr_dev(strong9, "class", "svelte-16omhbi");
    			add_location(strong9, file, 663, 29, 24040);
    			attr_dev(strong10, "class", "svelte-16omhbi");
    			add_location(strong10, file, 663, 54, 24065);
    			attr_dev(code97, "class", "svelte-16omhbi");
    			add_location(code97, file, 664, 3, 24098);
    			attr_dev(code98, "class", "svelte-16omhbi");
    			add_location(code98, file, 664, 23, 24118);
    			add_location(div133, file, 664, 37, 24132);
    			attr_dev(code99, "class", "svelte-16omhbi");
    			add_location(code99, file, 665, 3, 24199);
    			attr_dev(code100, "class", "svelte-16omhbi");
    			add_location(code100, file, 665, 22, 24218);
    			add_location(div134, file, 665, 46, 24242);
    			attr_dev(div135, "class", "table svelte-16omhbi");
    			add_location(div135, file, 662, 2, 23990);
    			attr_dev(div136, "class", "block block--single svelte-16omhbi");
    			add_location(div136, file, 659, 1, 23863);
    			attr_dev(p11, "class", "svelte-16omhbi");
    			add_location(p11, file, 670, 2, 24373);
    			attr_dev(strong11, "class", "svelte-16omhbi");
    			add_location(strong11, file, 673, 3, 24487);
    			attr_dev(strong12, "class", "svelte-16omhbi");
    			add_location(strong12, file, 673, 29, 24513);
    			attr_dev(strong13, "class", "svelte-16omhbi");
    			add_location(strong13, file, 673, 54, 24538);
    			attr_dev(code101, "class", "svelte-16omhbi");
    			add_location(code101, file, 674, 3, 24571);
    			attr_dev(code102, "class", "svelte-16omhbi");
    			add_location(code102, file, 674, 20, 24588);
    			add_location(div137, file, 674, 34, 24602);
    			attr_dev(code103, "class", "svelte-16omhbi");
    			add_location(code103, file, 675, 3, 24676);
    			attr_dev(code104, "class", "svelte-16omhbi");
    			add_location(code104, file, 675, 22, 24695);
    			add_location(div138, file, 675, 46, 24719);
    			attr_dev(code105, "class", "svelte-16omhbi");
    			add_location(code105, file, 676, 3, 24794);
    			attr_dev(code106, "class", "svelte-16omhbi");
    			add_location(code106, file, 676, 31, 24822);
    			add_location(div139, file, 676, 46, 24837);
    			attr_dev(div140, "class", "table svelte-16omhbi");
    			add_location(div140, file, 672, 2, 24463);
    			attr_dev(div141, "class", "block block--single svelte-16omhbi");
    			add_location(div141, file, 669, 1, 24336);
    			attr_dev(a1, "href", "https://github.com/Mitcheljager");
    			attr_dev(a1, "class", "svelte-16omhbi");
    			add_location(a1, file, 681, 10, 24963);
    			attr_dev(div142, "class", "block block--single svelte-16omhbi");
    			add_location(div142, file, 680, 1, 24918);
    			attr_dev(div143, "class", "wrapper svelte-16omhbi");
    			add_location(div143, file, 37, 0, 975);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div143, anchor);
    			append_dev(div143, div0);
    			append_dev(div0, h1);
    			append_dev(h1, t0);
    			append_dev(h1, mark0);
    			append_dev(div0, t2);
    			mount_component(linkedchart0, div0, null);
    			append_dev(div143, t3);
    			append_dev(div143, div1);
    			append_dev(div1, p0);
    			append_dev(div1, t5);
    			append_dev(div1, p1);
    			append_dev(p1, em);
    			append_dev(div1, t7);
    			append_dev(div1, p2);
    			append_dev(p2, a0);
    			append_dev(div1, t9);
    			append_dev(div1, h20);
    			append_dev(div1, t11);
    			append_dev(div1, table);
    			append_dev(table, tr0);
    			append_dev(tr0, th0);
    			append_dev(tr0, t13);
    			append_dev(tr0, th1);
    			mount_component(linkedlabel0, th1, null);
    			append_dev(tr0, t14);
    			append_dev(tr0, th2);
    			append_dev(table, t16);
    			append_dev(table, tr1);
    			append_dev(tr1, td0);
    			append_dev(tr1, t18);
    			append_dev(tr1, td1);
    			mount_component(linkedchart1, td1, null);
    			append_dev(tr1, t19);
    			append_dev(tr1, td2);
    			mount_component(linkedvalue0, td2, null);
    			append_dev(table, t20);
    			append_dev(table, tr2);
    			append_dev(tr2, td3);
    			append_dev(tr2, t22);
    			append_dev(tr2, td4);
    			mount_component(linkedchart2, td4, null);
    			append_dev(tr2, t23);
    			append_dev(tr2, td5);
    			mount_component(linkedvalue1, td5, null);
    			append_dev(table, t24);
    			append_dev(table, tr3);
    			append_dev(tr3, td6);
    			append_dev(tr3, t26);
    			append_dev(tr3, td7);
    			mount_component(linkedchart3, td7, null);
    			append_dev(tr3, t27);
    			append_dev(tr3, td8);
    			mount_component(linkedvalue2, td8, null);
    			append_dev(table, t28);
    			append_dev(table, tr4);
    			append_dev(tr4, td9);
    			append_dev(tr4, t30);
    			append_dev(tr4, td10);
    			mount_component(linkedchart4, td10, null);
    			append_dev(tr4, t31);
    			append_dev(tr4, td11);
    			mount_component(linkedvalue3, td11, null);
    			append_dev(table, t32);
    			append_dev(table, tr5);
    			append_dev(tr5, td12);
    			append_dev(tr5, t34);
    			append_dev(tr5, td13);
    			mount_component(linkedchart5, td13, null);
    			append_dev(tr5, t35);
    			append_dev(tr5, td14);
    			mount_component(linkedvalue4, td14, null);
    			append_dev(table, t36);
    			append_dev(table, tr6);
    			append_dev(tr6, td15);
    			append_dev(tr6, t38);
    			append_dev(tr6, td16);
    			mount_component(linkedchart6, td16, null);
    			append_dev(tr6, t39);
    			append_dev(tr6, td17);
    			mount_component(linkedvalue5, td17, null);
    			append_dev(div1, t40);
    			append_dev(div1, h21);
    			append_dev(div1, t42);
    			append_dev(div1, p3);
    			append_dev(div1, t44);
    			append_dev(div1, code0);
    			append_dev(code0, t45);
    			append_dev(code0, mark1);
    			append_dev(div1, t47);
    			append_dev(div1, code1);
    			append_dev(code1, t48);
    			append_dev(code1, mark2);
    			append_dev(div1, t50);
    			append_dev(div1, p4);
    			append_dev(div1, t52);
    			append_dev(div1, code2);
    			append_dev(code2, t53);
    			append_dev(code2, mark3);
    			append_dev(code2, t55);
    			append_dev(div1, t56);
    			append_dev(div1, code3);
    			append_dev(code3, t57);
    			append_dev(code3, mark4);
    			append_dev(code3, t59);
    			append_dev(code3, mark5);
    			append_dev(code3, t61);
    			append_dev(code3, mark6);
    			append_dev(code3, t63);
    			append_dev(code3, mark7);
    			append_dev(code3, t65);
    			append_dev(div143, t66);
    			append_dev(div143, div2);
    			append_dev(div2, p5);
    			append_dev(div2, t68);
    			append_dev(div2, code4);
    			append_dev(code4, t69);
    			append_dev(code4, br0);
    			append_dev(code4, t70);
    			append_dev(code4, br1);
    			append_dev(code4, t71);
    			append_dev(code4, br2);
    			append_dev(code4, t72);
    			append_dev(code4, br3);
    			append_dev(code4, t73);
    			append_dev(code4, br4);
    			append_dev(code4, t74);
    			append_dev(code4, br5);
    			append_dev(code4, t75);
    			append_dev(div2, t76);
    			append_dev(div2, code5);
    			append_dev(div2, t78);
    			append_dev(div2, p6);
    			append_dev(div2, t80);
    			append_dev(div2, code6);
    			append_dev(code6, t81);
    			append_dev(code6, br6);
    			append_dev(code6, t82);
    			append_dev(code6, br7);
    			append_dev(code6, t83);
    			append_dev(code6, br8);
    			append_dev(code6, t84);
    			append_dev(code6, br9);
    			append_dev(code6, t85);
    			append_dev(code6, br10);
    			append_dev(code6, t86);
    			append_dev(code6, br11);
    			append_dev(code6, t87);
    			append_dev(div2, t88);
    			append_dev(div2, code7);
    			append_dev(code7, t89);
    			append_dev(code7, br12);
    			append_dev(code7, t90);
    			append_dev(code7, br13);
    			append_dev(code7, t91);
    			append_dev(code7, br14);
    			append_dev(code7, t92);
    			append_dev(code7, br15);
    			append_dev(code7, t93);
    			append_dev(code7, br16);
    			append_dev(code7, t94);
    			append_dev(code7, br17);
    			append_dev(code7, t95);
    			append_dev(div2, t96);
    			append_dev(div2, code8);
    			append_dev(div143, t98);
    			append_dev(div143, h22);
    			append_dev(div143, t100);
    			append_dev(div143, div4);
    			append_dev(div4, div3);
    			append_dev(div3, t101);
    			append_dev(div3, code9);
    			append_dev(div4, t103);
    			mount_component(linkedchart7, div4, null);
    			append_dev(div143, t104);
    			append_dev(div143, div11);
    			append_dev(div11, div5);
    			append_dev(div5, t105);
    			append_dev(div5, code10);
    			append_dev(code10, t106);
    			append_dev(code10, br18);
    			append_dev(code10, t107);
    			append_dev(code10, br19);
    			append_dev(code10, t108);
    			append_dev(code10, br20);
    			append_dev(code10, t109);
    			append_dev(div11, t110);
    			append_dev(div11, div10);
    			append_dev(div10, div6);
    			mount_component(linkedchart8, div6, null);
    			append_dev(div10, t111);
    			append_dev(div10, div7);
    			mount_component(linkedchart9, div7, null);
    			append_dev(div10, t112);
    			append_dev(div10, div8);
    			mount_component(linkedchart10, div8, null);
    			append_dev(div10, t113);
    			append_dev(div10, div9);
    			mount_component(linkedchart11, div9, null);
    			append_dev(div143, t114);
    			append_dev(div143, div16);
    			append_dev(div16, div12);
    			append_dev(div12, t115);
    			append_dev(div12, code11);
    			append_dev(code11, t116);
    			append_dev(code11, br21);
    			append_dev(code11, t117);
    			append_dev(div16, t118);
    			append_dev(div16, div15);
    			append_dev(div15, div13);
    			mount_component(linkedchart12, div13, null);
    			append_dev(div15, t119);
    			append_dev(div15, div14);
    			mount_component(linkedchart13, div14, null);
    			append_dev(div143, t120);
    			append_dev(div143, h23);
    			append_dev(div143, t122);
    			append_dev(div143, div21);
    			append_dev(div21, div17);
    			append_dev(div17, t123);
    			append_dev(div17, code12);
    			append_dev(code12, t124);
    			append_dev(code12, br22);
    			append_dev(code12, t125);
    			append_dev(code12, br23);
    			append_dev(code12, t126);
    			append_dev(code12, br24);
    			append_dev(code12, t127);
    			append_dev(div17, t128);
    			append_dev(div17, br25);
    			append_dev(div17, t129);
    			append_dev(div21, t130);
    			append_dev(div21, div20);
    			mount_component(linkedlabel1, div20, null);
    			append_dev(div20, t131);
    			append_dev(div20, div18);
    			mount_component(linkedchart14, div18, null);
    			append_dev(div20, t132);
    			append_dev(div20, div19);
    			mount_component(linkedchart15, div19, null);
    			append_dev(div143, t133);
    			append_dev(div143, div26);
    			append_dev(div26, div22);
    			append_dev(div22, t134);
    			append_dev(div22, code13);
    			append_dev(div22, t136);
    			append_dev(div22, br26);
    			append_dev(div22, t137);
    			append_dev(div22, code14);
    			append_dev(code14, t138);
    			append_dev(code14, br27);
    			append_dev(code14, t139);
    			append_dev(code14, br28);
    			append_dev(code14, t140);
    			append_dev(code14, br29);
    			append_dev(code14, t141);
    			append_dev(code14, br30);
    			append_dev(code14, t142);
    			append_dev(code14, br31);
    			append_dev(code14, t143);
    			append_dev(div22, t144);
    			append_dev(div22, br32);
    			append_dev(div22, t145);
    			append_dev(div26, t146);
    			append_dev(div26, div25);
    			append_dev(div25, div23);
    			mount_component(linkedchart16, div23, null);
    			append_dev(div25, t147);
    			append_dev(div25, div24);
    			mount_component(linkedchart17, div24, null);
    			append_dev(div143, t148);
    			append_dev(div143, div31);
    			append_dev(div31, div27);
    			append_dev(div27, t149);
    			append_dev(div27, code15);
    			append_dev(code15, t150);
    			append_dev(code15, br33);
    			append_dev(code15, t151);
    			append_dev(code15, br34);
    			append_dev(code15, t152);
    			append_dev(code15, br35);
    			append_dev(code15, t153);
    			append_dev(div27, t154);
    			append_dev(div27, br36);
    			append_dev(div27, t155);
    			append_dev(div31, t156);
    			append_dev(div31, div30);
    			append_dev(div30, div28);
    			mount_component(linkedchart18, div28, null);
    			append_dev(div30, t157);
    			append_dev(div30, br37);
    			append_dev(div30, t158);
    			append_dev(div30, div29);
    			mount_component(linkedchart19, div29, null);
    			append_dev(div143, t159);
    			append_dev(div143, div34);
    			append_dev(div34, t160);
    			append_dev(div34, code16);
    			append_dev(code16, t161);
    			append_dev(code16, br38);
    			append_dev(code16, t162);
    			append_dev(code16, br39);
    			append_dev(div34, t163);
    			append_dev(div34, br40);
    			append_dev(div34, t164);
    			append_dev(div34, br41);
    			append_dev(div34, br42);
    			append_dev(div34, t165);
    			append_dev(div34, div32);
    			mount_component(linkedchart20, div32, null);
    			append_dev(div32, t166);
    			append_dev(div32, strong0);
    			mount_component(linkedvalue6, strong0, null);
    			append_dev(div34, t167);
    			append_dev(div34, div33);
    			mount_component(linkedchart21, div33, null);
    			append_dev(div33, t168);
    			append_dev(div33, strong1);
    			mount_component(linkedvalue7, strong1, null);
    			append_dev(div143, t169);
    			append_dev(div143, h24);
    			append_dev(div143, t171);
    			append_dev(div143, div36);
    			append_dev(div36, div35);
    			append_dev(div35, t172);
    			append_dev(div35, code17);
    			append_dev(div36, t174);
    			mount_component(linkedchart22, div36, null);
    			append_dev(div143, t175);
    			append_dev(div143, div41);
    			append_dev(div41, div37);
    			append_dev(div37, t176);
    			append_dev(div37, code18);
    			append_dev(code18, t177);
    			append_dev(code18, br43);
    			append_dev(code18, t178);
    			append_dev(div41, t179);
    			append_dev(div41, div40);
    			append_dev(div40, div38);
    			mount_component(linkedchart23, div38, null);
    			append_dev(div40, t180);
    			append_dev(div40, div39);
    			mount_component(linkedchart24, div39, null);
    			append_dev(div143, t181);
    			append_dev(div143, div46);
    			append_dev(div46, div42);
    			append_dev(div42, t182);
    			append_dev(div42, code19);
    			append_dev(code19, t183);
    			append_dev(code19, br44);
    			append_dev(code19, t184);
    			append_dev(div46, t185);
    			append_dev(div46, div45);
    			append_dev(div45, div43);
    			mount_component(linkedchart25, div43, null);
    			append_dev(div45, t186);
    			append_dev(div45, div44);
    			mount_component(linkedchart26, div44, null);
    			append_dev(div143, t187);
    			append_dev(div143, div51);
    			append_dev(div51, div47);
    			append_dev(div47, t188);
    			append_dev(div47, code20);
    			append_dev(code20, t189);
    			append_dev(code20, br45);
    			append_dev(code20, t190);
    			append_dev(code20, br46);
    			append_dev(code20, t191);
    			append_dev(code20, br47);
    			append_dev(code20, t192);
    			append_dev(div51, t193);
    			append_dev(div51, div50);
    			append_dev(div50, div48);
    			mount_component(linkedchart27, div48, null);
    			append_dev(div50, t194);
    			append_dev(div50, div49);
    			mount_component(linkedchart28, div49, null);
    			append_dev(div143, t195);
    			append_dev(div143, div56);
    			append_dev(div56, div52);
    			append_dev(div52, t196);
    			append_dev(div52, code21);
    			append_dev(code21, t197);
    			append_dev(code21, br48);
    			append_dev(code21, t198);
    			append_dev(code21, br49);
    			append_dev(code21, t199);
    			append_dev(code21, br50);
    			append_dev(code21, t200);
    			append_dev(div52, t201);
    			append_dev(div52, code22);
    			append_dev(code22, t202);
    			append_dev(code22, br51);
    			append_dev(code22, t203);
    			append_dev(code22, br52);
    			append_dev(code22, t204);
    			append_dev(code22, br53);
    			append_dev(code22, t205);
    			append_dev(div52, t206);
    			append_dev(div52, br54);
    			append_dev(div52, t207);
    			append_dev(div52, code23);
    			append_dev(code23, t208);
    			append_dev(code23, br55);
    			append_dev(code23, t209);
    			append_dev(code23, br56);
    			append_dev(code23, t210);
    			append_dev(code23, br57);
    			append_dev(code23, t211);
    			append_dev(div56, t212);
    			append_dev(div56, div55);
    			append_dev(div55, div53);
    			mount_component(linkedchart29, div53, null);
    			append_dev(div55, t213);
    			append_dev(div55, div54);
    			mount_component(linkedchart30, div54, null);
    			append_dev(div143, t214);
    			append_dev(div143, div61);
    			append_dev(div61, div57);
    			append_dev(div57, t215);
    			append_dev(div57, code24);
    			append_dev(code24, t216);
    			append_dev(code24, br58);
    			append_dev(code24, t217);
    			append_dev(div61, t218);
    			append_dev(div61, div60);
    			append_dev(div60, div58);
    			mount_component(linkedchart31, div58, null);
    			append_dev(div60, t219);
    			append_dev(div60, div59);
    			mount_component(linkedchart32, div59, null);
    			append_dev(div143, t220);
    			append_dev(div143, div66);
    			append_dev(div66, div62);
    			append_dev(div62, t221);
    			append_dev(div62, code25);
    			append_dev(div66, t223);
    			append_dev(div66, div65);
    			append_dev(div65, div63);
    			mount_component(linkedchart33, div63, null);
    			append_dev(div65, t224);
    			append_dev(div65, div64);
    			mount_component(linkedchart34, div64, null);
    			append_dev(div143, t225);
    			append_dev(div143, div77);
    			append_dev(div77, div67);
    			append_dev(div67, t226);
    			append_dev(div67, code26);
    			append_dev(code26, t227);
    			append_dev(code26, br59);
    			append_dev(code26, t228);
    			append_dev(code26, br60);
    			append_dev(code26, t229);
    			append_dev(div77, t230);
    			append_dev(div77, div76);
    			append_dev(div76, div68);
    			mount_component(linkedchart35, div68, null);
    			append_dev(div76, t231);
    			append_dev(div76, div69);
    			mount_component(linkedchart36, div69, null);
    			append_dev(div76, t232);
    			append_dev(div76, div70);
    			mount_component(linkedchart37, div70, null);
    			append_dev(div76, t233);
    			append_dev(div76, div71);
    			mount_component(linkedchart38, div71, null);
    			append_dev(div76, t234);
    			append_dev(div76, div72);
    			mount_component(linkedchart39, div72, null);
    			append_dev(div76, t235);
    			append_dev(div76, div73);
    			mount_component(linkedchart40, div73, null);
    			append_dev(div76, t236);
    			append_dev(div76, div74);
    			mount_component(linkedchart41, div74, null);
    			append_dev(div76, t237);
    			append_dev(div76, div75);
    			mount_component(linkedchart42, div75, null);
    			append_dev(div143, t238);
    			append_dev(div143, div79);
    			append_dev(div79, div78);
    			append_dev(div78, t239);
    			append_dev(div78, code27);
    			append_dev(div79, t241);
    			mount_component(linkedchart43, div79, null);
    			append_dev(div143, t242);
    			append_dev(div143, div81);
    			append_dev(div81, div80);
    			append_dev(div80, t243);
    			append_dev(div80, code28);
    			append_dev(div81, t245);
    			mount_component(linkedchart44, div81, null);
    			append_dev(div143, t246);
    			append_dev(div143, div83);
    			append_dev(div83, div82);
    			append_dev(div82, t247);
    			append_dev(div82, br61);
    			append_dev(div82, t248);
    			append_dev(div82, code29);
    			append_dev(div83, t250);
    			mount_component(linkedchart45, div83, null);
    			append_dev(div143, t251);
    			append_dev(div143, div87);
    			append_dev(div87, div84);
    			append_dev(div84, t252);
    			append_dev(div84, code30);
    			append_dev(code30, t253);
    			append_dev(code30, br62);
    			append_dev(div87, t254);
    			append_dev(div87, div86);
    			append_dev(div86, div85);
    			mount_component(linkedchart46, div85, null);
    			append_dev(div143, t255);
    			append_dev(div143, div94);
    			append_dev(div94, div88);
    			append_dev(div88, t256);
    			append_dev(div88, code31);
    			append_dev(code31, t257);
    			append_dev(code31, br63);
    			append_dev(code31, t258);
    			append_dev(code31, br64);
    			append_dev(code31, t259);
    			append_dev(code31, br65);
    			append_dev(code31, t260);
    			append_dev(code31, br66);
    			append_dev(code31, t261);
    			append_dev(code31, br67);
    			append_dev(code31, t262);
    			append_dev(div94, t263);
    			append_dev(div94, div93);
    			append_dev(div93, div89);
    			mount_component(linkedchart47, div89, null);
    			append_dev(div93, t264);
    			append_dev(div93, div90);
    			mount_component(linkedchart48, div90, null);
    			append_dev(div93, t265);
    			append_dev(div93, div91);
    			mount_component(linkedchart49, div91, null);
    			append_dev(div93, t266);
    			append_dev(div93, div92);
    			mount_component(linkedchart50, div92, null);
    			append_dev(div143, t267);
    			append_dev(div143, h25);
    			append_dev(div143, t269);
    			append_dev(div143, div102);
    			append_dev(div102, div101);
    			append_dev(div101, t270);
    			append_dev(div101, code32);
    			append_dev(code32, t271);
    			append_dev(code32, br68);
    			append_dev(code32, t272);
    			append_dev(code32, br69);
    			append_dev(code32, t273);
    			append_dev(code32, br70);
    			append_dev(code32, t274);
    			append_dev(code32, br71);
    			append_dev(code32, t275);
    			append_dev(div101, t276);
    			append_dev(div101, p7);
    			append_dev(div101, t278);
    			append_dev(div101, div95);
    			mount_component(linkedchart51, div95, null);
    			append_dev(div95, t279);
    			append_dev(div95, span);
    			append_dev(div101, t281);
    			append_dev(div101, code33);
    			append_dev(code33, t282);
    			append_dev(code33, br72);
    			append_dev(code33, t283);
    			append_dev(code33, br73);
    			append_dev(code33, t284);
    			append_dev(code33, br74);
    			append_dev(code33, t285);
    			append_dev(code33, br75);
    			append_dev(code33, t286);
    			append_dev(code33, br76);
    			append_dev(code33, t287);
    			append_dev(code33, br77);
    			append_dev(code33, t288);
    			append_dev(code33, br78);
    			append_dev(code33, t289);
    			append_dev(code33, br79);
    			append_dev(code33, t290);
    			append_dev(code33, br80);
    			append_dev(code33, t291);
    			append_dev(code33, br81);
    			append_dev(code33, t292);
    			append_dev(div101, t293);
    			append_dev(div101, br82);
    			append_dev(div101, t294);
    			append_dev(div101, p8);
    			append_dev(div101, t296);
    			append_dev(div101, div96);
    			mount_component(linkedchart52, div96, null);
    			append_dev(div101, t297);
    			append_dev(div101, code34);
    			append_dev(code34, t298);
    			append_dev(code34, br83);
    			append_dev(code34, t299);
    			append_dev(code34, br84);
    			append_dev(code34, t300);
    			append_dev(code34, br85);
    			append_dev(code34, t301);
    			append_dev(code34, br86);
    			append_dev(code34, t302);
    			append_dev(code34, br87);
    			append_dev(code34, t303);
    			append_dev(code34, br88);
    			append_dev(code34, t304);
    			append_dev(code34, br89);
    			append_dev(code34, t305);
    			append_dev(code34, br90);
    			append_dev(code34, t306);
    			append_dev(code34, br91);
    			append_dev(code34, t307);
    			append_dev(div101, t308);
    			append_dev(div101, br92);
    			append_dev(div101, t309);
    			append_dev(div101, h3);
    			append_dev(div101, t311);
    			append_dev(div101, div100);
    			append_dev(div100, strong2);
    			append_dev(div100, t313);
    			append_dev(div100, strong3);
    			append_dev(div100, t315);
    			append_dev(div100, strong4);
    			append_dev(div100, t317);
    			append_dev(div100, code35);
    			append_dev(div100, t319);
    			append_dev(div100, div97);
    			append_dev(div100, t321);
    			append_dev(div100, code36);
    			append_dev(div100, t323);
    			append_dev(div100, code37);
    			append_dev(div100, t325);
    			append_dev(div100, div98);
    			append_dev(div100, t327);
    			append_dev(div100, code38);
    			append_dev(div100, t329);
    			append_dev(div100, code39);
    			append_dev(div100, t331);
    			append_dev(div100, div99);
    			append_dev(div100, t333);
    			append_dev(div100, code40);
    			append_dev(div143, t335);
    			append_dev(div143, h26);
    			append_dev(div143, t337);
    			append_dev(div143, div132);
    			append_dev(div132, p9);
    			append_dev(div132, t339);
    			append_dev(div132, div131);
    			append_dev(div131, strong5);
    			append_dev(div131, t341);
    			append_dev(div131, strong6);
    			append_dev(div131, t343);
    			append_dev(div131, strong7);
    			append_dev(div131, t345);
    			append_dev(div131, code41);
    			append_dev(div131, t347);
    			append_dev(div131, code42);
    			append_dev(div131, t349);
    			append_dev(div131, div103);
    			append_dev(div131, t351);
    			append_dev(div131, code43);
    			append_dev(div131, t353);
    			append_dev(div131, code44);
    			append_dev(div131, t355);
    			append_dev(div131, div104);
    			append_dev(div131, t357);
    			append_dev(div131, code45);
    			append_dev(div131, t359);
    			append_dev(div131, code46);
    			append_dev(div131, t361);
    			append_dev(div131, div105);
    			append_dev(div131, t363);
    			append_dev(div131, code47);
    			append_dev(div131, t365);
    			append_dev(div131, code48);
    			append_dev(div131, t366);
    			append_dev(div131, div106);
    			append_dev(div131, t368);
    			append_dev(div131, code49);
    			append_dev(div131, t370);
    			append_dev(div131, code50);
    			append_dev(div131, t371);
    			append_dev(div131, div107);
    			append_dev(div131, t373);
    			append_dev(div131, code51);
    			append_dev(div131, t375);
    			append_dev(div131, code52);
    			append_dev(div131, t377);
    			append_dev(div131, div108);
    			append_dev(div131, t379);
    			append_dev(div131, code53);
    			append_dev(div131, t381);
    			append_dev(div131, code54);
    			append_dev(div131, t383);
    			append_dev(div131, div109);
    			append_dev(div131, t385);
    			append_dev(div131, code55);
    			append_dev(div131, t387);
    			append_dev(div131, code56);
    			append_dev(div131, t389);
    			append_dev(div131, div110);
    			append_dev(div131, t391);
    			append_dev(div131, code57);
    			append_dev(div131, t393);
    			append_dev(div131, code58);
    			append_dev(div131, t395);
    			append_dev(div131, div111);
    			append_dev(div131, t397);
    			append_dev(div131, code59);
    			append_dev(div131, t399);
    			append_dev(div131, code60);
    			append_dev(div131, t401);
    			append_dev(div131, div112);
    			append_dev(div131, t403);
    			append_dev(div131, code61);
    			append_dev(div131, t405);
    			append_dev(div131, code62);
    			append_dev(div131, t407);
    			append_dev(div131, div113);
    			append_dev(div131, t409);
    			append_dev(div131, code63);
    			append_dev(div131, t411);
    			append_dev(div131, code64);
    			append_dev(div131, t413);
    			append_dev(div131, div114);
    			append_dev(div131, t415);
    			append_dev(div131, code65);
    			append_dev(div131, t417);
    			append_dev(div131, code66);
    			append_dev(div131, t419);
    			append_dev(div131, div115);
    			append_dev(div131, t421);
    			append_dev(div131, code67);
    			append_dev(div131, t423);
    			append_dev(div131, code68);
    			append_dev(div131, t425);
    			append_dev(div131, div116);
    			append_dev(div131, t427);
    			append_dev(div131, code69);
    			append_dev(div131, t429);
    			append_dev(div131, code70);
    			append_dev(div131, t431);
    			append_dev(div131, div117);
    			append_dev(div131, t433);
    			append_dev(div131, code71);
    			append_dev(div131, t435);
    			append_dev(div131, code72);
    			append_dev(div131, t437);
    			append_dev(div131, div118);
    			append_dev(div131, t439);
    			append_dev(div131, code73);
    			append_dev(div131, t441);
    			append_dev(div131, code74);
    			append_dev(div131, t443);
    			append_dev(div131, div119);
    			append_dev(div131, t445);
    			append_dev(div131, code75);
    			append_dev(div131, t447);
    			append_dev(div131, code76);
    			append_dev(div131, t449);
    			append_dev(div131, div120);
    			append_dev(div131, t451);
    			append_dev(div131, code77);
    			append_dev(div131, t453);
    			append_dev(div131, code78);
    			append_dev(div131, t455);
    			append_dev(div131, div121);
    			append_dev(div131, t457);
    			append_dev(div131, code79);
    			append_dev(div131, t459);
    			append_dev(div131, code80);
    			append_dev(div131, t460);
    			append_dev(div131, div122);
    			append_dev(div131, t462);
    			append_dev(div131, code81);
    			append_dev(div131, t464);
    			append_dev(div131, code82);
    			append_dev(div131, t465);
    			append_dev(div131, div123);
    			append_dev(div131, t467);
    			append_dev(div131, code83);
    			append_dev(div131, t469);
    			append_dev(div131, code84);
    			append_dev(div131, t471);
    			append_dev(div131, div124);
    			append_dev(div131, t473);
    			append_dev(div131, code85);
    			append_dev(div131, t475);
    			append_dev(div131, code86);
    			append_dev(div131, t477);
    			append_dev(div131, div125);
    			append_dev(div131, t479);
    			append_dev(div131, code87);
    			append_dev(div131, t481);
    			append_dev(div131, code88);
    			append_dev(div131, t483);
    			append_dev(div131, div126);
    			append_dev(div131, t485);
    			append_dev(div131, code89);
    			append_dev(div131, t487);
    			append_dev(div131, code90);
    			append_dev(div131, t489);
    			append_dev(div131, div127);
    			append_dev(div131, t491);
    			append_dev(div131, code91);
    			append_dev(div131, t493);
    			append_dev(div131, code92);
    			append_dev(div131, t495);
    			append_dev(div131, div128);
    			append_dev(div131, t497);
    			append_dev(div131, code93);
    			append_dev(div131, t499);
    			append_dev(div131, code94);
    			append_dev(div131, t501);
    			append_dev(div131, div129);
    			append_dev(div131, t503);
    			append_dev(div131, code95);
    			append_dev(div131, t505);
    			append_dev(div131, code96);
    			append_dev(div131, t507);
    			append_dev(div131, div130);
    			append_dev(div143, t509);
    			append_dev(div143, div136);
    			append_dev(div136, p10);
    			append_dev(div136, t511);
    			append_dev(div136, div135);
    			append_dev(div135, strong8);
    			append_dev(div135, t513);
    			append_dev(div135, strong9);
    			append_dev(div135, t515);
    			append_dev(div135, strong10);
    			append_dev(div135, t517);
    			append_dev(div135, code97);
    			append_dev(div135, t519);
    			append_dev(div135, code98);
    			append_dev(div135, t520);
    			append_dev(div135, div133);
    			append_dev(div135, t522);
    			append_dev(div135, code99);
    			append_dev(div135, t524);
    			append_dev(div135, code100);
    			append_dev(div135, t526);
    			append_dev(div135, div134);
    			append_dev(div143, t528);
    			append_dev(div143, div141);
    			append_dev(div141, p11);
    			append_dev(div141, t530);
    			append_dev(div141, div140);
    			append_dev(div140, strong11);
    			append_dev(div140, t532);
    			append_dev(div140, strong12);
    			append_dev(div140, t534);
    			append_dev(div140, strong13);
    			append_dev(div140, t536);
    			append_dev(div140, code101);
    			append_dev(div140, t538);
    			append_dev(div140, code102);
    			append_dev(div140, t539);
    			append_dev(div140, div137);
    			append_dev(div140, t541);
    			append_dev(div140, code103);
    			append_dev(div140, t543);
    			append_dev(div140, code104);
    			append_dev(div140, t545);
    			append_dev(div140, div138);
    			append_dev(div140, t547);
    			append_dev(div140, code105);
    			append_dev(div140, t549);
    			append_dev(div140, code106);
    			append_dev(div140, t551);
    			append_dev(div140, div139);
    			append_dev(div143, t553);
    			append_dev(div143, div142);
    			append_dev(div142, t554);
    			append_dev(div142, a1);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const linkedchart5_changes = {};
    			if (dirty & /*transitioningData*/ 1) linkedchart5_changes.data = /*transitioningData*/ ctx[0];
    			if (dirty & /*transitionColor*/ 2) linkedchart5_changes.fill = "hsl(" + /*transitionColor*/ ctx[1] + ", 60%, 50%)";
    			linkedchart5.$set(linkedchart5_changes);
    			const linkedvalue4_changes = {};
    			if (dirty & /*transitioningData*/ 1) linkedvalue4_changes.empty = Object.values(/*transitioningData*/ ctx[0]).reduce(func_4);
    			linkedvalue4.$set(linkedvalue4_changes);
    			const linkedchart45_changes = {};
    			if (dirty & /*transitioningData*/ 1) linkedchart45_changes.data = /*transitioningData*/ ctx[0];
    			if (dirty & /*transitionColor*/ 2) linkedchart45_changes.fill = "hsl(" + /*transitionColor*/ ctx[1] + ", 60%, 50%)";
    			linkedchart45.$set(linkedchart45_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(linkedchart0.$$.fragment, local);
    			transition_in(linkedlabel0.$$.fragment, local);
    			transition_in(linkedchart1.$$.fragment, local);
    			transition_in(linkedvalue0.$$.fragment, local);
    			transition_in(linkedchart2.$$.fragment, local);
    			transition_in(linkedvalue1.$$.fragment, local);
    			transition_in(linkedchart3.$$.fragment, local);
    			transition_in(linkedvalue2.$$.fragment, local);
    			transition_in(linkedchart4.$$.fragment, local);
    			transition_in(linkedvalue3.$$.fragment, local);
    			transition_in(linkedchart5.$$.fragment, local);
    			transition_in(linkedvalue4.$$.fragment, local);
    			transition_in(linkedchart6.$$.fragment, local);
    			transition_in(linkedvalue5.$$.fragment, local);
    			transition_in(linkedchart7.$$.fragment, local);
    			transition_in(linkedchart8.$$.fragment, local);
    			transition_in(linkedchart9.$$.fragment, local);
    			transition_in(linkedchart10.$$.fragment, local);
    			transition_in(linkedchart11.$$.fragment, local);
    			transition_in(linkedchart12.$$.fragment, local);
    			transition_in(linkedchart13.$$.fragment, local);
    			transition_in(linkedlabel1.$$.fragment, local);
    			transition_in(linkedchart14.$$.fragment, local);
    			transition_in(linkedchart15.$$.fragment, local);
    			transition_in(linkedchart16.$$.fragment, local);
    			transition_in(linkedchart17.$$.fragment, local);
    			transition_in(linkedchart18.$$.fragment, local);
    			transition_in(linkedchart19.$$.fragment, local);
    			transition_in(linkedchart20.$$.fragment, local);
    			transition_in(linkedvalue6.$$.fragment, local);
    			transition_in(linkedchart21.$$.fragment, local);
    			transition_in(linkedvalue7.$$.fragment, local);
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
    			transition_in(linkedchart38.$$.fragment, local);
    			transition_in(linkedchart39.$$.fragment, local);
    			transition_in(linkedchart40.$$.fragment, local);
    			transition_in(linkedchart41.$$.fragment, local);
    			transition_in(linkedchart42.$$.fragment, local);
    			transition_in(linkedchart43.$$.fragment, local);
    			transition_in(linkedchart44.$$.fragment, local);
    			transition_in(linkedchart45.$$.fragment, local);
    			transition_in(linkedchart46.$$.fragment, local);
    			transition_in(linkedchart47.$$.fragment, local);
    			transition_in(linkedchart48.$$.fragment, local);
    			transition_in(linkedchart49.$$.fragment, local);
    			transition_in(linkedchart50.$$.fragment, local);
    			transition_in(linkedchart51.$$.fragment, local);
    			transition_in(linkedchart52.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(linkedchart0.$$.fragment, local);
    			transition_out(linkedlabel0.$$.fragment, local);
    			transition_out(linkedchart1.$$.fragment, local);
    			transition_out(linkedvalue0.$$.fragment, local);
    			transition_out(linkedchart2.$$.fragment, local);
    			transition_out(linkedvalue1.$$.fragment, local);
    			transition_out(linkedchart3.$$.fragment, local);
    			transition_out(linkedvalue2.$$.fragment, local);
    			transition_out(linkedchart4.$$.fragment, local);
    			transition_out(linkedvalue3.$$.fragment, local);
    			transition_out(linkedchart5.$$.fragment, local);
    			transition_out(linkedvalue4.$$.fragment, local);
    			transition_out(linkedchart6.$$.fragment, local);
    			transition_out(linkedvalue5.$$.fragment, local);
    			transition_out(linkedchart7.$$.fragment, local);
    			transition_out(linkedchart8.$$.fragment, local);
    			transition_out(linkedchart9.$$.fragment, local);
    			transition_out(linkedchart10.$$.fragment, local);
    			transition_out(linkedchart11.$$.fragment, local);
    			transition_out(linkedchart12.$$.fragment, local);
    			transition_out(linkedchart13.$$.fragment, local);
    			transition_out(linkedlabel1.$$.fragment, local);
    			transition_out(linkedchart14.$$.fragment, local);
    			transition_out(linkedchart15.$$.fragment, local);
    			transition_out(linkedchart16.$$.fragment, local);
    			transition_out(linkedchart17.$$.fragment, local);
    			transition_out(linkedchart18.$$.fragment, local);
    			transition_out(linkedchart19.$$.fragment, local);
    			transition_out(linkedchart20.$$.fragment, local);
    			transition_out(linkedvalue6.$$.fragment, local);
    			transition_out(linkedchart21.$$.fragment, local);
    			transition_out(linkedvalue7.$$.fragment, local);
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
    			transition_out(linkedchart38.$$.fragment, local);
    			transition_out(linkedchart39.$$.fragment, local);
    			transition_out(linkedchart40.$$.fragment, local);
    			transition_out(linkedchart41.$$.fragment, local);
    			transition_out(linkedchart42.$$.fragment, local);
    			transition_out(linkedchart43.$$.fragment, local);
    			transition_out(linkedchart44.$$.fragment, local);
    			transition_out(linkedchart45.$$.fragment, local);
    			transition_out(linkedchart46.$$.fragment, local);
    			transition_out(linkedchart47.$$.fragment, local);
    			transition_out(linkedchart48.$$.fragment, local);
    			transition_out(linkedchart49.$$.fragment, local);
    			transition_out(linkedchart50.$$.fragment, local);
    			transition_out(linkedchart51.$$.fragment, local);
    			transition_out(linkedchart52.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div143);
    			destroy_component(linkedchart0);
    			destroy_component(linkedlabel0);
    			destroy_component(linkedchart1);
    			destroy_component(linkedvalue0);
    			destroy_component(linkedchart2);
    			destroy_component(linkedvalue1);
    			destroy_component(linkedchart3);
    			destroy_component(linkedvalue2);
    			destroy_component(linkedchart4);
    			destroy_component(linkedvalue3);
    			destroy_component(linkedchart5);
    			destroy_component(linkedvalue4);
    			destroy_component(linkedchart6);
    			destroy_component(linkedvalue5);
    			destroy_component(linkedchart7);
    			destroy_component(linkedchart8);
    			destroy_component(linkedchart9);
    			destroy_component(linkedchart10);
    			destroy_component(linkedchart11);
    			destroy_component(linkedchart12);
    			destroy_component(linkedchart13);
    			destroy_component(linkedlabel1);
    			destroy_component(linkedchart14);
    			destroy_component(linkedchart15);
    			destroy_component(linkedchart16);
    			destroy_component(linkedchart17);
    			destroy_component(linkedchart18);
    			destroy_component(linkedchart19);
    			destroy_component(linkedchart20);
    			destroy_component(linkedvalue6);
    			destroy_component(linkedchart21);
    			destroy_component(linkedvalue7);
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
    			destroy_component(linkedchart38);
    			destroy_component(linkedchart39);
    			destroy_component(linkedchart40);
    			destroy_component(linkedchart41);
    			destroy_component(linkedchart42);
    			destroy_component(linkedchart43);
    			destroy_component(linkedchart44);
    			destroy_component(linkedchart45);
    			destroy_component(linkedchart46);
    			destroy_component(linkedchart47);
    			destroy_component(linkedchart48);
    			destroy_component(linkedchart49);
    			destroy_component(linkedchart50);
    			destroy_component(linkedchart51);
    			destroy_component(linkedchart52);
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

    function fakeData(times, maxValue = 100, minValue = 50, startDate = "2005-05-01T00:00:00Z") {
    	const data = {};
    	const date = new Date(startDate);

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

    const func = (a, b) => a + b;
    const func_1 = (a, b) => a + b;
    const func_2 = (a, b) => a + b;
    const func_3 = (a, b) => a + b;
    const func_4 = (a, b) => a + b;
    const func_5 = (a, b) => a + b;

    const value_update_handler = event => {
    	if (event.detail.valueElement) event.detail.valueElement.innerText = event.detail.value?.toLocaleString();
    };

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

    	const hover_handler = event => document.querySelector("[data-role='currency']").innerHTML = (event.detail.value / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
    	const blur_handler = event => document.querySelector("[data-role='currency']").innerHTML = "&nbsp;";

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

    	return [transitioningData, transitionColor, hover_handler, blur_handler];
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
