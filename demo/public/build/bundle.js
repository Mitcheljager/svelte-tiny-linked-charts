
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
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
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
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.46.1' }, detail), true));
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

    /* ..\src\LinkedChart.svelte generated by Svelte v3.46.1 */

    const { Object: Object_1$1 } = globals;
    const file$1 = "..\\src\\LinkedChart.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[47] = list[i][0];
    	child_ctx[48] = list[i][1];
    	child_ctx[50] = i;
    	return child_ctx;
    }

    // (113:4) { #if type == "line" }
    function create_if_block_3(ctx) {
    	let polyline_1;
    	let polyline_1_points_value;

    	const block = {
    		c: function create() {
    			polyline_1 = svg_element("polyline");
    			attr_dev(polyline_1, "points", polyline_1_points_value = /*polyline*/ ctx[24].join(" "));
    			attr_dev(polyline_1, "stroke", /*lineColor*/ ctx[15]);
    			attr_dev(polyline_1, "fill", "transparent");
    			add_location(polyline_1, file$1, 113, 6, 3588);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, polyline_1, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*polyline*/ 16777216 && polyline_1_points_value !== (polyline_1_points_value = /*polyline*/ ctx[24].join(" "))) {
    				attr_dev(polyline_1, "points", polyline_1_points_value);
    			}

    			if (dirty[0] & /*lineColor*/ 32768) {
    				attr_dev(polyline_1, "stroke", /*lineColor*/ ctx[15]);
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
    		source: "(113:4) { #if type == \\\"line\\\" }",
    		ctx
    	});

    	return block;
    }

    // (131:6) { #if type == "line" }
    function create_if_block_2(ctx) {
    	let circle;
    	let circle_fill_value;
    	let circle_r_value;
    	let circle_cy_value;
    	let circle_cx_value;

    	const block = {
    		c: function create() {
    			circle = svg_element("circle");

    			attr_dev(circle, "fill", circle_fill_value = /*hover*/ ctx[7] && /*$hoveringKey*/ ctx[21][/*linkedKey*/ ctx[18]] !== null && /*$hoveringKey*/ ctx[21][/*linkedKey*/ ctx[18]] == /*key*/ ctx[47]
    			? /*fill*/ ctx[5]
    			: "transparent");

    			attr_dev(circle, "r", circle_r_value = /*barWidth*/ ctx[19] / 2);
    			attr_dev(circle, "cy", circle_cy_value = /*height*/ ctx[2] - /*getHeight*/ ctx[25](/*value*/ ctx[48]));
    			attr_dev(circle, "cx", circle_cx_value = (parseInt(/*gap*/ ctx[4]) + /*barWidth*/ ctx[19]) * /*i*/ ctx[50]);
    			add_location(circle, file$1, 131, 8, 4408);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, circle, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*hover, $hoveringKey, linkedKey, data, fill*/ 2359457 && circle_fill_value !== (circle_fill_value = /*hover*/ ctx[7] && /*$hoveringKey*/ ctx[21][/*linkedKey*/ ctx[18]] !== null && /*$hoveringKey*/ ctx[21][/*linkedKey*/ ctx[18]] == /*key*/ ctx[47]
    			? /*fill*/ ctx[5]
    			: "transparent")) {
    				attr_dev(circle, "fill", circle_fill_value);
    			}

    			if (dirty[0] & /*barWidth*/ 524288 && circle_r_value !== (circle_r_value = /*barWidth*/ ctx[19] / 2)) {
    				attr_dev(circle, "r", circle_r_value);
    			}

    			if (dirty[0] & /*height, data*/ 5 && circle_cy_value !== (circle_cy_value = /*height*/ ctx[2] - /*getHeight*/ ctx[25](/*value*/ ctx[48]))) {
    				attr_dev(circle, "cy", circle_cy_value);
    			}

    			if (dirty[0] & /*gap, barWidth*/ 524304 && circle_cx_value !== (circle_cx_value = (parseInt(/*gap*/ ctx[4]) + /*barWidth*/ ctx[19]) * /*i*/ ctx[50])) {
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
    		source: "(131:6) { #if type == \\\"line\\\" }",
    		ctx
    	});

    	return block;
    }

    // (117:4) { #each Object.entries(data) as [key, value], i }
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
    		return /*mouseover_handler*/ ctx[37](/*key*/ ctx[47], /*i*/ ctx[50]);
    	}

    	function focus_handler() {
    		return /*focus_handler*/ ctx[38](/*key*/ ctx[47], /*i*/ ctx[50]);
    	}

    	function touchstart_handler() {
    		return /*touchstart_handler*/ ctx[39](/*key*/ ctx[47], /*i*/ ctx[50]);
    	}

    	let if_block = /*type*/ ctx[14] == "line" && create_if_block_2(ctx);

    	const block = {
    		c: function create() {
    			rect = svg_element("rect");
    			if (if_block) if_block.c();
    			if_block_anchor = empty();

    			attr_dev(rect, "style", rect_style_value = /*transition*/ ctx[8]
    			? `transition: all ${/*transition*/ ctx[8]}ms`
    			: null);

    			attr_dev(rect, "opacity", rect_opacity_value = /*hover*/ ctx[7] && /*$hoveringKey*/ ctx[21][/*linkedKey*/ ctx[18]] && /*$hoveringKey*/ ctx[21][/*linkedKey*/ ctx[18]] != /*key*/ ctx[47]
    			? /*fadeOpacity*/ ctx[6]
    			: 1);

    			attr_dev(rect, "fill", rect_fill_value = /*type*/ ctx[14] == "line"
    			? "transparent"
    			: /*fill*/ ctx[5]);

    			attr_dev(rect, "width", /*barWidth*/ ctx[19]);

    			attr_dev(rect, "height", rect_height_value = /*type*/ ctx[14] == "line"
    			? /*height*/ ctx[2]
    			: /*getHeight*/ ctx[25](/*value*/ ctx[48]));

    			attr_dev(rect, "y", rect_y_value = /*type*/ ctx[14] == "line"
    			? 0
    			: /*height*/ ctx[2] - /*getHeight*/ ctx[25](/*value*/ ctx[48]));

    			attr_dev(rect, "x", rect_x_value = (parseInt(/*gap*/ ctx[4]) + /*barWidth*/ ctx[19]) * /*i*/ ctx[50]);
    			attr_dev(rect, "tabindex", /*tabindex*/ ctx[16]);
    			add_location(rect, file$1, 117, 6, 3748);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, rect, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);

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

    			if (dirty[0] & /*hover, $hoveringKey, linkedKey, data, fadeOpacity*/ 2359489 && rect_opacity_value !== (rect_opacity_value = /*hover*/ ctx[7] && /*$hoveringKey*/ ctx[21][/*linkedKey*/ ctx[18]] && /*$hoveringKey*/ ctx[21][/*linkedKey*/ ctx[18]] != /*key*/ ctx[47]
    			? /*fadeOpacity*/ ctx[6]
    			: 1)) {
    				attr_dev(rect, "opacity", rect_opacity_value);
    			}

    			if (dirty[0] & /*type, fill*/ 16416 && rect_fill_value !== (rect_fill_value = /*type*/ ctx[14] == "line"
    			? "transparent"
    			: /*fill*/ ctx[5])) {
    				attr_dev(rect, "fill", rect_fill_value);
    			}

    			if (dirty[0] & /*barWidth*/ 524288) {
    				attr_dev(rect, "width", /*barWidth*/ ctx[19]);
    			}

    			if (dirty[0] & /*type, height, data*/ 16389 && rect_height_value !== (rect_height_value = /*type*/ ctx[14] == "line"
    			? /*height*/ ctx[2]
    			: /*getHeight*/ ctx[25](/*value*/ ctx[48]))) {
    				attr_dev(rect, "height", rect_height_value);
    			}

    			if (dirty[0] & /*type, height, data*/ 16389 && rect_y_value !== (rect_y_value = /*type*/ ctx[14] == "line"
    			? 0
    			: /*height*/ ctx[2] - /*getHeight*/ ctx[25](/*value*/ ctx[48]))) {
    				attr_dev(rect, "y", rect_y_value);
    			}

    			if (dirty[0] & /*gap, barWidth*/ 524304 && rect_x_value !== (rect_x_value = (parseInt(/*gap*/ ctx[4]) + /*barWidth*/ ctx[19]) * /*i*/ ctx[50])) {
    				attr_dev(rect, "x", rect_x_value);
    			}

    			if (dirty[0] & /*tabindex*/ 65536) {
    				attr_dev(rect, "tabindex", /*tabindex*/ ctx[16]);
    			}

    			if (/*type*/ ctx[14] == "line") {
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
    		source: "(117:4) { #each Object.entries(data) as [key, value], i }",
    		ctx
    	});

    	return block;
    }

    // (142:0) { #if showValue && ($hoveringValue[uid] || valueDefault) }
    function create_if_block$2(ctx) {
    	let div;
    	let div_style_value;

    	function select_block_type(ctx, dirty) {
    		if (/*$hoveringValue*/ ctx[22][/*uid*/ ctx[1]] !== null) return create_if_block_1;
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
    			? `position: absolute; transform: translateX(${/*valuePositionOffset*/ ctx[23]}px)`
    			: null);

    			add_location(div, file$1, 142, 2, 4774);
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

    			if (dirty[0] & /*valuePosition, valuePositionOffset*/ 8396800 && div_style_value !== (div_style_value = /*valuePosition*/ ctx[13] == "floating"
    			? `position: absolute; transform: translateX(${/*valuePositionOffset*/ ctx[23]}px)`
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
    		source: "(142:0) { #if showValue && ($hoveringValue[uid] || valueDefault) }",
    		ctx
    	});

    	return block;
    }

    // (148:4) { :else }
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
    		source: "(148:4) { :else }",
    		ctx
    	});

    	return block;
    }

    // (144:4) { #if $hoveringValue[uid] !== null }
    function create_if_block_1(ctx) {
    	let t0;
    	let t1;
    	let span;
    	let t2_value = /*$hoveringValue*/ ctx[22][/*uid*/ ctx[1]] + "";
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
    			add_location(span, file$1, 145, 6, 5005);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, span, anchor);
    			append_dev(span, t2);
    			/*span_binding*/ ctx[40](span);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, t4, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*valuePrepend*/ 2048) set_data_dev(t0, /*valuePrepend*/ ctx[11]);
    			if (dirty[0] & /*$hoveringValue, uid*/ 4194306 && t2_value !== (t2_value = /*$hoveringValue*/ ctx[22][/*uid*/ ctx[1]] + "")) set_data_dev(t2, t2_value);
    			if (dirty[0] & /*valueAppend*/ 4096) set_data_dev(t4, /*valueAppend*/ ctx[12]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(span);
    			/*span_binding*/ ctx[40](null);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(t4);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(144:4) { #if $hoveringValue[uid] !== null }",
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
    	let if_block0 = /*type*/ ctx[14] == "line" && create_if_block_3(ctx);
    	let each_value = Object.entries(/*data*/ ctx[0]);
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	let if_block1 = /*showValue*/ ctx[9] && (/*$hoveringValue*/ ctx[22][/*uid*/ ctx[1]] || /*valueDefault*/ ctx[10]) && create_if_block$2(ctx);

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
    			attr_dev(g, "transform", g_transform_value = "translate(" + /*alignmentOffset*/ ctx[20] + ", 0)");
    			add_location(g, file$1, 111, 2, 3503);
    			attr_dev(svg, "width", /*width*/ ctx[3]);

    			attr_dev(svg, "height", svg_height_value = /*type*/ ctx[14] == "line"
    			? /*height*/ ctx[2] + /*barWidth*/ ctx[19] / 2
    			: /*height*/ ctx[2]);

    			attr_dev(svg, "viewBox", svg_viewBox_value = "0 0 " + /*width*/ ctx[3] + " " + /*height*/ ctx[2]);
    			attr_dev(svg, "preserveAspectRatio", "none");
    			add_location(svg, file$1, 103, 0, 3295);
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
    					listen_dev(svg, "mouseleave", /*endHover*/ ctx[27], false, false, false),
    					listen_dev(svg, "blur", /*endHover*/ ctx[27], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (/*type*/ ctx[14] == "line") {
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

    			if (dirty[0] & /*hover, $hoveringKey, linkedKey, data, fill, barWidth, height, getHeight, gap, type, transition, fadeOpacity, tabindex, startHover*/ 103629301) {
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

    			if (dirty[0] & /*alignmentOffset*/ 1048576 && g_transform_value !== (g_transform_value = "translate(" + /*alignmentOffset*/ ctx[20] + ", 0)")) {
    				attr_dev(g, "transform", g_transform_value);
    			}

    			if (dirty[0] & /*width*/ 8) {
    				attr_dev(svg, "width", /*width*/ ctx[3]);
    			}

    			if (dirty[0] & /*type, height, barWidth*/ 540676 && svg_height_value !== (svg_height_value = /*type*/ ctx[14] == "line"
    			? /*height*/ ctx[2] + /*barWidth*/ ctx[19] / 2
    			: /*height*/ ctx[2])) {
    				attr_dev(svg, "height", svg_height_value);
    			}

    			if (dirty[0] & /*width, height*/ 12 && svg_viewBox_value !== (svg_viewBox_value = "0 0 " + /*width*/ ctx[3] + " " + /*height*/ ctx[2])) {
    				attr_dev(svg, "viewBox", svg_viewBox_value);
    			}

    			if (/*showValue*/ ctx[9] && (/*$hoveringValue*/ ctx[22][/*uid*/ ctx[1]] || /*valueDefault*/ ctx[10])) {
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
    	component_subscribe($$self, hoveringKey, $$value => $$invalidate(21, $hoveringKey = $$value));
    	validate_store(hoveringValue, 'hoveringValue');
    	component_subscribe($$self, hoveringValue, $$value => $$invalidate(22, $hoveringValue = $$value));
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
    	let { type = "bar" } = $$props;
    	let { lineColor = fill } = $$props;
    	let { tabindex = -1 } = $$props;
    	let { dispatchEvents = false } = $$props;
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
    		return Math.round(parseInt(height) / highestValue * value - (type == "line" ? barWidth / 2 : 0)) || 0;
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
    		'scaleMax',
    		'type',
    		'lineColor',
    		'tabindex',
    		'dispatchEvents'
    	];

    	Object_1$1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<LinkedChart> was created with unknown prop '${key}'`);
    	});

    	const mouseover_handler = (key, i) => startHover(key, i);
    	const focus_handler = (key, i) => startHover(key, i);
    	const touchstart_handler = (key, i) => startHover(key, i);

    	function span_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			valueElement = $$value;
    			$$invalidate(17, valueElement);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ('uid' in $$props) $$invalidate(1, uid = $$props.uid);
    		if ('data' in $$props) $$invalidate(0, data = $$props.data);
    		if ('labels' in $$props) $$invalidate(28, labels = $$props.labels);
    		if ('values' in $$props) $$invalidate(29, values = $$props.values);
    		if ('linked' in $$props) $$invalidate(30, linked = $$props.linked);
    		if ('height' in $$props) $$invalidate(2, height = $$props.height);
    		if ('width' in $$props) $$invalidate(3, width = $$props.width);
    		if ('barMinWidth' in $$props) $$invalidate(31, barMinWidth = $$props.barMinWidth);
    		if ('grow' in $$props) $$invalidate(32, grow = $$props.grow);
    		if ('align' in $$props) $$invalidate(33, align = $$props.align);
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
    		if ('scaleMax' in $$props) $$invalidate(34, scaleMax = $$props.scaleMax);
    		if ('type' in $$props) $$invalidate(14, type = $$props.type);
    		if ('lineColor' in $$props) $$invalidate(15, lineColor = $$props.lineColor);
    		if ('tabindex' in $$props) $$invalidate(16, tabindex = $$props.tabindex);
    		if ('dispatchEvents' in $$props) $$invalidate(35, dispatchEvents = $$props.dispatchEvents);
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
    		type,
    		lineColor,
    		tabindex,
    		dispatchEvents,
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
    		if ('labels' in $$props) $$invalidate(28, labels = $$props.labels);
    		if ('values' in $$props) $$invalidate(29, values = $$props.values);
    		if ('linked' in $$props) $$invalidate(30, linked = $$props.linked);
    		if ('height' in $$props) $$invalidate(2, height = $$props.height);
    		if ('width' in $$props) $$invalidate(3, width = $$props.width);
    		if ('barMinWidth' in $$props) $$invalidate(31, barMinWidth = $$props.barMinWidth);
    		if ('grow' in $$props) $$invalidate(32, grow = $$props.grow);
    		if ('align' in $$props) $$invalidate(33, align = $$props.align);
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
    		if ('scaleMax' in $$props) $$invalidate(34, scaleMax = $$props.scaleMax);
    		if ('type' in $$props) $$invalidate(14, type = $$props.type);
    		if ('lineColor' in $$props) $$invalidate(15, lineColor = $$props.lineColor);
    		if ('tabindex' in $$props) $$invalidate(16, tabindex = $$props.tabindex);
    		if ('dispatchEvents' in $$props) $$invalidate(35, dispatchEvents = $$props.dispatchEvents);
    		if ('valuePositionOffset' in $$props) $$invalidate(23, valuePositionOffset = $$props.valuePositionOffset);
    		if ('polyline' in $$props) $$invalidate(24, polyline = $$props.polyline);
    		if ('valueElement' in $$props) $$invalidate(17, valueElement = $$props.valueElement);
    		if ('linkedKey' in $$props) $$invalidate(18, linkedKey = $$props.linkedKey);
    		if ('barWidth' in $$props) $$invalidate(19, barWidth = $$props.barWidth);
    		if ('dataLength' in $$props) $$invalidate(36, dataLength = $$props.dataLength);
    		if ('highestValue' in $$props) highestValue = $$props.highestValue;
    		if ('alignmentOffset' in $$props) $$invalidate(20, alignmentOffset = $$props.alignmentOffset);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*labels, values*/ 805306368) {
    			if (labels.length && values.length) $$invalidate(0, data = Object.fromEntries(labels.map((_, i) => [labels[i], values[i]])));
    		}

    		if ($$self.$$.dirty[0] & /*data*/ 1) {
    			$$invalidate(36, dataLength = Object.keys(data).length);
    		}

    		if ($$self.$$.dirty[1] & /*grow, dataLength, barMinWidth*/ 35) {
    			$$invalidate(19, barWidth = grow ? getBarWidth() : parseInt(barMinWidth));
    		}

    		if ($$self.$$.dirty[1] & /*dataLength*/ 32) {
    			highestValue = getHighestValue();
    		}

    		if ($$self.$$.dirty[1] & /*dataLength*/ 32) {
    			$$invalidate(20, alignmentOffset = dataLength ? getAlignment() : 0);
    		}

    		if ($$self.$$.dirty[0] & /*linked*/ 1073741824) {
    			$$invalidate(18, linkedKey = linked || (Math.random() + 1).toString(36).substring(7));
    		}

    		if ($$self.$$.dirty[0] & /*valuePosition, gap, barWidth, data, $hoveringKey, linkedKey, alignmentOffset*/ 3940369) {
    			if (valuePosition == "floating") $$invalidate(23, valuePositionOffset = (parseInt(gap) + barWidth) * Object.keys(data).indexOf($hoveringKey[linkedKey]) + alignmentOffset);
    		}

    		if ($$self.$$.dirty[0] & /*type, data*/ 16385) {
    			if (type == "line") $$invalidate(24, polyline = getPolyLinePoints());
    		}

    		if ($$self.$$.dirty[0] & /*$hoveringKey, linkedKey, uid, data*/ 2359299) {
    			{
    				if ($hoveringKey[linkedKey]) {
    					set_store_value(hoveringValue, $hoveringValue[uid] = data[$hoveringKey[linkedKey]], $hoveringValue);
    				} else {
    					set_store_value(hoveringValue, $hoveringValue[uid] = null, $hoveringValue);
    				}
    			}
    		}

    		if ($$self.$$.dirty[0] & /*$hoveringValue, uid, linkedKey, valueElement*/ 4587522 | $$self.$$.dirty[1] & /*dispatchEvents*/ 16) {
    			if (dispatchEvents) dispatch('value-update', {
    				value: $hoveringValue[uid],
    				uid,
    				linkedKey,
    				valueElement
    			});
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
    		type,
    		lineColor,
    		tabindex,
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
    		grow,
    		align,
    		scaleMax,
    		dispatchEvents,
    		dataLength,
    		mouseover_handler,
    		focus_handler,
    		touchstart_handler,
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
    				labels: 28,
    				values: 29,
    				linked: 30,
    				height: 2,
    				width: 3,
    				barMinWidth: 31,
    				grow: 32,
    				align: 33,
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
    				scaleMax: 34,
    				type: 14,
    				lineColor: 15,
    				tabindex: 16,
    				dispatchEvents: 35
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
    }

    /* ..\src\LinkedLabel.svelte generated by Svelte v3.46.1 */

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

    /* ..\src\LinkedValue.svelte generated by Svelte v3.46.1 */

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

    /* src\App.svelte generated by Svelte v3.46.1 */

    const { Object: Object_1 } = globals;
    const file = "src\\App.svelte";

    function create_fragment(ctx) {
    	let div134;
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
    	let h21;
    	let t30;
    	let p3;
    	let t32;
    	let code0;
    	let t33;
    	let mark1;
    	let t35;
    	let code1;
    	let t36;
    	let mark2;
    	let t38;
    	let p4;
    	let t40;
    	let code2;
    	let t41;
    	let mark3;
    	let t43;
    	let t44;
    	let code3;
    	let t45;
    	let mark4;
    	let t47;
    	let mark5;
    	let t49;
    	let mark6;
    	let t51;
    	let mark7;
    	let t53;
    	let t54;
    	let div2;
    	let p5;
    	let t56;
    	let code4;
    	let t57;
    	let br0;
    	let t58;
    	let br1;
    	let t59;
    	let br2;
    	let t60;
    	let br3;
    	let t61;
    	let br4;
    	let t62;
    	let br5;
    	let t63;
    	let t64;
    	let code5;
    	let t66;
    	let p6;
    	let t68;
    	let code6;
    	let t69;
    	let br6;
    	let t70;
    	let br7;
    	let t71;
    	let br8;
    	let t72;
    	let br9;
    	let t73;
    	let br10;
    	let t74;
    	let br11;
    	let t75;
    	let t76;
    	let code7;
    	let t77;
    	let br12;
    	let t78;
    	let br13;
    	let t79;
    	let br14;
    	let t80;
    	let br15;
    	let t81;
    	let br16;
    	let t82;
    	let br17;
    	let t83;
    	let t84;
    	let code8;
    	let t86;
    	let h22;
    	let t88;
    	let div4;
    	let div3;
    	let t89;
    	let code9;
    	let t91;
    	let linkedchart4;
    	let t92;
    	let div11;
    	let div5;
    	let t93;
    	let code10;
    	let t94;
    	let br18;
    	let t95;
    	let br19;
    	let t96;
    	let br20;
    	let t97;
    	let t98;
    	let div10;
    	let div6;
    	let linkedchart5;
    	let t99;
    	let div7;
    	let linkedchart6;
    	let t100;
    	let div8;
    	let linkedchart7;
    	let t101;
    	let div9;
    	let linkedchart8;
    	let t102;
    	let div16;
    	let div12;
    	let t103;
    	let code11;
    	let t104;
    	let br21;
    	let t105;
    	let t106;
    	let div15;
    	let div13;
    	let linkedchart9;
    	let t107;
    	let div14;
    	let linkedchart10;
    	let t108;
    	let h23;
    	let t110;
    	let div21;
    	let div17;
    	let t111;
    	let code12;
    	let t112;
    	let br22;
    	let t113;
    	let br23;
    	let t114;
    	let br24;
    	let t115;
    	let t116;
    	let br25;
    	let t117;
    	let t118;
    	let div20;
    	let linkedlabel1;
    	let t119;
    	let div18;
    	let linkedchart11;
    	let t120;
    	let div19;
    	let linkedchart12;
    	let t121;
    	let div26;
    	let div22;
    	let t122;
    	let code13;
    	let t124;
    	let br26;
    	let t125;
    	let code14;
    	let t126;
    	let br27;
    	let t127;
    	let br28;
    	let t128;
    	let br29;
    	let t129;
    	let br30;
    	let t130;
    	let br31;
    	let t131;
    	let t132;
    	let br32;
    	let t133;
    	let t134;
    	let div25;
    	let div23;
    	let linkedchart13;
    	let t135;
    	let div24;
    	let linkedchart14;
    	let t136;
    	let div31;
    	let div27;
    	let t137;
    	let code15;
    	let t139;
    	let br33;
    	let t140;
    	let code16;
    	let t141;
    	let br34;
    	let t142;
    	let br35;
    	let t143;
    	let br36;
    	let t144;
    	let t145;
    	let br37;
    	let t146;
    	let t147;
    	let div30;
    	let div28;
    	let linkedchart15;
    	let t148;
    	let br38;
    	let t149;
    	let div29;
    	let linkedchart16;
    	let t150;
    	let div34;
    	let t151;
    	let code17;
    	let t152;
    	let br39;
    	let t153;
    	let br40;
    	let t154;
    	let br41;
    	let t155;
    	let br42;
    	let br43;
    	let t156;
    	let div32;
    	let linkedchart17;
    	let t157;
    	let strong0;
    	let linkedvalue3;
    	let t158;
    	let div33;
    	let linkedchart18;
    	let t159;
    	let strong1;
    	let linkedvalue4;
    	let t160;
    	let h24;
    	let t162;
    	let div36;
    	let div35;
    	let t163;
    	let code18;
    	let t165;
    	let linkedchart19;
    	let t166;
    	let div41;
    	let div37;
    	let t167;
    	let code19;
    	let t168;
    	let br44;
    	let t169;
    	let t170;
    	let div40;
    	let div38;
    	let linkedchart20;
    	let t171;
    	let div39;
    	let linkedchart21;
    	let t172;
    	let div46;
    	let div42;
    	let t173;
    	let code20;
    	let t174;
    	let br45;
    	let t175;
    	let br46;
    	let t176;
    	let br47;
    	let t177;
    	let t178;
    	let div45;
    	let div43;
    	let linkedchart22;
    	let t179;
    	let div44;
    	let linkedchart23;
    	let t180;
    	let div51;
    	let div47;
    	let t181;
    	let code21;
    	let t182;
    	let br48;
    	let t183;
    	let br49;
    	let t184;
    	let br50;
    	let t185;
    	let t186;
    	let code22;
    	let t187;
    	let br51;
    	let t188;
    	let br52;
    	let t189;
    	let br53;
    	let t190;
    	let t191;
    	let br54;
    	let t192;
    	let code23;
    	let t193;
    	let br55;
    	let t194;
    	let br56;
    	let t195;
    	let br57;
    	let t196;
    	let t197;
    	let div50;
    	let div48;
    	let linkedchart24;
    	let t198;
    	let div49;
    	let linkedchart25;
    	let t199;
    	let div56;
    	let div52;
    	let t200;
    	let code24;
    	let t201;
    	let br58;
    	let t202;
    	let t203;
    	let div55;
    	let div53;
    	let linkedchart26;
    	let t204;
    	let div54;
    	let linkedchart27;
    	let t205;
    	let div61;
    	let div57;
    	let t206;
    	let code25;
    	let t208;
    	let div60;
    	let div58;
    	let linkedchart28;
    	let t209;
    	let div59;
    	let linkedchart29;
    	let t210;
    	let div72;
    	let div62;
    	let t211;
    	let code26;
    	let t212;
    	let br59;
    	let t213;
    	let br60;
    	let t214;
    	let t215;
    	let div71;
    	let div63;
    	let linkedchart30;
    	let t216;
    	let div64;
    	let linkedchart31;
    	let t217;
    	let div65;
    	let linkedchart32;
    	let t218;
    	let div66;
    	let linkedchart33;
    	let t219;
    	let div67;
    	let linkedchart34;
    	let t220;
    	let div68;
    	let linkedchart35;
    	let t221;
    	let div69;
    	let linkedchart36;
    	let t222;
    	let div70;
    	let linkedchart37;
    	let t223;
    	let div74;
    	let div73;
    	let t224;
    	let code27;
    	let t226;
    	let linkedchart38;
    	let t227;
    	let div76;
    	let div75;
    	let t228;
    	let code28;
    	let t230;
    	let linkedchart39;
    	let t231;
    	let div78;
    	let div77;
    	let t232;
    	let br61;
    	let t233;
    	let code29;
    	let t235;
    	let linkedchart40;
    	let t236;
    	let div82;
    	let div79;
    	let t237;
    	let code30;
    	let t238;
    	let br62;
    	let t239;
    	let div81;
    	let div80;
    	let linkedchart41;
    	let t240;
    	let div89;
    	let div83;
    	let t241;
    	let code31;
    	let t242;
    	let br63;
    	let t243;
    	let br64;
    	let t244;
    	let br65;
    	let t245;
    	let br66;
    	let t246;
    	let br67;
    	let t247;
    	let t248;
    	let div88;
    	let div84;
    	let linkedchart42;
    	let t249;
    	let div85;
    	let linkedchart43;
    	let t250;
    	let div86;
    	let linkedchart44;
    	let t251;
    	let div87;
    	let linkedchart45;
    	let t252;
    	let h25;
    	let t254;
    	let div97;
    	let div96;
    	let t255;
    	let code32;
    	let t256;
    	let br68;
    	let t257;
    	let br69;
    	let t258;
    	let br70;
    	let t259;
    	let br71;
    	let t260;
    	let t261;
    	let p7;
    	let t263;
    	let div90;
    	let linkedchart46;
    	let t264;
    	let span;
    	let t266;
    	let code33;
    	let t267;
    	let br72;
    	let t268;
    	let br73;
    	let t269;
    	let br74;
    	let t270;
    	let br75;
    	let t271;
    	let br76;
    	let t272;
    	let br77;
    	let t273;
    	let br78;
    	let t274;
    	let br79;
    	let t275;
    	let br80;
    	let t276;
    	let br81;
    	let t277;
    	let t278;
    	let br82;
    	let t279;
    	let p8;
    	let t281;
    	let div91;
    	let linkedchart47;
    	let t282;
    	let code34;
    	let t283;
    	let br83;
    	let t284;
    	let br84;
    	let t285;
    	let br85;
    	let t286;
    	let br86;
    	let t287;
    	let br87;
    	let t288;
    	let br88;
    	let t289;
    	let br89;
    	let t290;
    	let br90;
    	let t291;
    	let br91;
    	let t292;
    	let t293;
    	let br92;
    	let t294;
    	let h3;
    	let t296;
    	let div95;
    	let strong2;
    	let t298;
    	let strong3;
    	let t300;
    	let strong4;
    	let t302;
    	let code35;
    	let t304;
    	let div92;
    	let t306;
    	let code36;
    	let t308;
    	let code37;
    	let t310;
    	let div93;
    	let t312;
    	let code38;
    	let t314;
    	let code39;
    	let t316;
    	let div94;
    	let t318;
    	let code40;
    	let t320;
    	let h26;
    	let t322;
    	let div124;
    	let p9;
    	let t324;
    	let div123;
    	let strong5;
    	let t326;
    	let strong6;
    	let t328;
    	let strong7;
    	let t330;
    	let code41;
    	let t332;
    	let code42;
    	let t334;
    	let div98;
    	let t336;
    	let code43;
    	let t338;
    	let code44;
    	let t340;
    	let div99;
    	let t342;
    	let code45;
    	let t344;
    	let code46;
    	let t346;
    	let div100;
    	let t348;
    	let code47;
    	let t350;
    	let code48;
    	let t351;
    	let div101;
    	let t353;
    	let code49;
    	let t355;
    	let code50;
    	let t356;
    	let div102;
    	let t358;
    	let code51;
    	let t360;
    	let code52;
    	let t362;
    	let div103;
    	let t364;
    	let code53;
    	let t366;
    	let code54;
    	let t368;
    	let div104;
    	let t370;
    	let code55;
    	let t372;
    	let code56;
    	let t374;
    	let div105;
    	let t376;
    	let code57;
    	let t378;
    	let code58;
    	let t380;
    	let div106;
    	let t382;
    	let code59;
    	let t384;
    	let code60;
    	let t386;
    	let div107;
    	let t388;
    	let code61;
    	let t390;
    	let code62;
    	let t392;
    	let div108;
    	let t394;
    	let code63;
    	let t396;
    	let code64;
    	let t398;
    	let div109;
    	let t400;
    	let code65;
    	let t402;
    	let code66;
    	let t404;
    	let div110;
    	let t406;
    	let code67;
    	let t408;
    	let code68;
    	let t410;
    	let div111;
    	let t412;
    	let code69;
    	let t414;
    	let code70;
    	let t416;
    	let div112;
    	let t418;
    	let code71;
    	let t420;
    	let code72;
    	let t422;
    	let div113;
    	let t424;
    	let code73;
    	let t426;
    	let code74;
    	let t428;
    	let div114;
    	let t430;
    	let code75;
    	let t432;
    	let code76;
    	let t433;
    	let div115;
    	let t435;
    	let code77;
    	let t437;
    	let code78;
    	let t438;
    	let div116;
    	let t440;
    	let code79;
    	let t442;
    	let code80;
    	let t444;
    	let div117;
    	let t446;
    	let code81;
    	let t448;
    	let code82;
    	let t450;
    	let div118;
    	let t452;
    	let code83;
    	let t454;
    	let code84;
    	let t456;
    	let div119;
    	let t458;
    	let code85;
    	let t460;
    	let code86;
    	let t462;
    	let div120;
    	let t464;
    	let code87;
    	let t466;
    	let code88;
    	let t468;
    	let div121;
    	let t470;
    	let code89;
    	let t472;
    	let code90;
    	let t474;
    	let div122;
    	let t476;
    	let div128;
    	let p10;
    	let t478;
    	let div127;
    	let strong8;
    	let t480;
    	let strong9;
    	let t482;
    	let strong10;
    	let t484;
    	let code91;
    	let t486;
    	let code92;
    	let t487;
    	let div125;
    	let t489;
    	let code93;
    	let t491;
    	let code94;
    	let t493;
    	let div126;
    	let t495;
    	let div132;
    	let p11;
    	let t497;
    	let div131;
    	let strong11;
    	let t499;
    	let strong12;
    	let t501;
    	let strong13;
    	let t503;
    	let code95;
    	let t505;
    	let code96;
    	let t506;
    	let div129;
    	let t508;
    	let code97;
    	let t510;
    	let code98;
    	let t512;
    	let div130;
    	let t514;
    	let div133;
    	let t515;
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
    			props: { data: fakeData(30) },
    			$$inline: true
    		});

    	linkedchart5 = new LinkedChart({
    			props: { data: fakeData(30), linked: "link-1" },
    			$$inline: true
    		});

    	linkedchart6 = new LinkedChart({
    			props: { data: fakeData(10), linked: "link-1" },
    			$$inline: true
    		});

    	linkedchart7 = new LinkedChart({
    			props: { data: fakeData(30), linked: "link-1" },
    			$$inline: true
    		});

    	linkedchart8 = new LinkedChart({
    			props: { data: fakeData(30), linked: "link-1" },
    			$$inline: true
    		});

    	linkedchart9 = new LinkedChart({
    			props: {
    				data: fakeData(30),
    				linked: "link-8",
    				scaleMax: "100"
    			},
    			$$inline: true
    		});

    	linkedchart10 = new LinkedChart({
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

    	linkedchart11 = new LinkedChart({
    			props: { data: fakeData(30), linked: "link-2" },
    			$$inline: true
    		});

    	linkedchart12 = new LinkedChart({
    			props: { data: fakeData(30), linked: "link-2" },
    			$$inline: true
    		});

    	linkedchart13 = new LinkedChart({
    			props: {
    				data: fakeData(30),
    				linked: "link-5",
    				showValue: true
    			},
    			$$inline: true
    		});

    	linkedchart14 = new LinkedChart({
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

    	linkedchart15 = new LinkedChart({
    			props: {
    				data: fakeData(30),
    				linked: "link-7",
    				showValue: true,
    				valuePosition: "floating"
    			},
    			$$inline: true
    		});

    	linkedchart16 = new LinkedChart({
    			props: {
    				data: fakeData(30),
    				linked: "link-7",
    				showValue: true,
    				valuePosition: "floating"
    			},
    			$$inline: true
    		});

    	linkedchart17 = new LinkedChart({
    			props: {
    				data: fakeData(30),
    				linked: "link-6",
    				uid: "test"
    			},
    			$$inline: true
    		});

    	linkedvalue3 = new LinkedValue({
    			props: { empty: "Separate value", uid: "test" },
    			$$inline: true
    		});

    	linkedchart18 = new LinkedChart({
    			props: {
    				data: fakeData(30),
    				linked: "link-6",
    				uid: "test-2"
    			},
    			$$inline: true
    		});

    	linkedvalue4 = new LinkedValue({
    			props: { empty: "Separate value", uid: "test-2" },
    			$$inline: true
    		});

    	linkedchart19 = new LinkedChart({
    			props: { data: fakeData(5), grow: true },
    			$$inline: true
    		});

    	linkedchart20 = new LinkedChart({
    			props: { data: fakeData(50), barMinWidth: "2" },
    			$$inline: true
    		});

    	linkedchart21 = new LinkedChart({
    			props: { data: fakeData(10), barMinWidth: "14" },
    			$$inline: true
    		});

    	linkedchart22 = new LinkedChart({
    			props: {
    				data: fakeData(75),
    				grow: true,
    				barMinWidth: "0"
    			},
    			$$inline: true
    		});

    	linkedchart23 = new LinkedChart({
    			props: {
    				data: fakeData(7),
    				grow: true,
    				barMinWidth: "0"
    			},
    			$$inline: true
    		});

    	linkedchart24 = new LinkedChart({
    			props: {
    				data: fakeData(50),
    				height: "100",
    				width: "250",
    				linked: "linked-3"
    			},
    			$$inline: true
    		});

    	linkedchart25 = new LinkedChart({
    			props: {
    				data: fakeData(50),
    				height: "10",
    				width: "250",
    				linked: "linked-3"
    			},
    			$$inline: true
    		});

    	linkedchart26 = new LinkedChart({
    			props: { data: fakeData(11), gap: "10" },
    			$$inline: true
    		});

    	linkedchart27 = new LinkedChart({
    			props: { data: fakeData(36), gap: "0" },
    			$$inline: true
    		});

    	linkedchart28 = new LinkedChart({
    			props: { data: fakeData(20) },
    			$$inline: true
    		});

    	linkedchart29 = new LinkedChart({
    			props: { data: fakeData(20), align: "left" },
    			$$inline: true
    		});

    	linkedchart30 = new LinkedChart({
    			props: {
    				data: fakeData(30),
    				fill: "#e6261f",
    				linked: "link-4"
    			},
    			$$inline: true
    		});

    	linkedchart31 = new LinkedChart({
    			props: {
    				data: fakeData(30),
    				fill: "#eb7532",
    				linked: "link-4"
    			},
    			$$inline: true
    		});

    	linkedchart32 = new LinkedChart({
    			props: {
    				data: fakeData(30),
    				fill: "#f7d038",
    				linked: "link-4"
    			},
    			$$inline: true
    		});

    	linkedchart33 = new LinkedChart({
    			props: {
    				data: fakeData(30),
    				fill: "#a3e048",
    				linked: "link-4"
    			},
    			$$inline: true
    		});

    	linkedchart34 = new LinkedChart({
    			props: {
    				data: fakeData(30),
    				fill: "#49da9a",
    				linked: "link-4"
    			},
    			$$inline: true
    		});

    	linkedchart35 = new LinkedChart({
    			props: {
    				data: fakeData(30),
    				fill: "#34bbe6",
    				linked: "link-4"
    			},
    			$$inline: true
    		});

    	linkedchart36 = new LinkedChart({
    			props: {
    				data: fakeData(30),
    				fill: "#4355db",
    				linked: "link-4"
    			},
    			$$inline: true
    		});

    	linkedchart37 = new LinkedChart({
    			props: {
    				data: fakeData(30),
    				fill: "hsla(290, 55%, 50%, 1)",
    				linked: "link-4"
    			},
    			$$inline: true
    		});

    	linkedchart38 = new LinkedChart({
    			props: { data: fakeData(30), fadeOpacity: "0.15" },
    			$$inline: true
    		});

    	linkedchart39 = new LinkedChart({
    			props: { data: fakeData(30), hover: false },
    			$$inline: true
    		});

    	linkedchart40 = new LinkedChart({
    			props: {
    				data: /*transitioningData*/ ctx[0],
    				fill: "hsl(" + /*transitionColor*/ ctx[1] + ", 60%, 50%)",
    				transition: "500"
    			},
    			$$inline: true
    		});

    	linkedchart41 = new LinkedChart({
    			props: {
    				data: fakeData(30),
    				linked: "link-10",
    				showValue: true,
    				valuePosition: "floating",
    				tabindex: "0"
    			},
    			$$inline: true
    		});

    	linkedchart42 = new LinkedChart({
    			props: {
    				data: fakeData(30),
    				linked: "link-9",
    				type: "line"
    			},
    			$$inline: true
    		});

    	linkedchart43 = new LinkedChart({
    			props: {
    				data: fakeData(30),
    				linked: "link-9",
    				type: "line"
    			},
    			$$inline: true
    		});

    	linkedchart44 = new LinkedChart({
    			props: {
    				data: fakeData(30),
    				linked: "link-9",
    				type: "line"
    			},
    			$$inline: true
    		});

    	linkedchart45 = new LinkedChart({
    			props: {
    				data: fakeData(30),
    				linked: "link-9",
    				type: "line",
    				lineColor: "#4355db",
    				fill: "white",
    				showValue: "true",
    				valuePosition: "floating"
    			},
    			$$inline: true
    		});

    	linkedchart46 = new LinkedChart({
    			props: {
    				data: fakeData(30, 100000, 10000),
    				dispatchEvents: true
    			},
    			$$inline: true
    		});

    	linkedchart46.$on("hover", /*hover_handler*/ ctx[2]);
    	linkedchart46.$on("blur", /*blur_handler*/ ctx[3]);

    	linkedchart47 = new LinkedChart({
    			props: {
    				data: fakeData(30, 100000, 10000),
    				dispatchEvents: true,
    				showValue: true,
    				valuePosition: "floating",
    				valuePrepend: "Value: "
    			},
    			$$inline: true
    		});

    	linkedchart47.$on("value-update", value_update_handler);

    	const block = {
    		c: function create() {
    			div134 = element("div");
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
    			td0.textContent = "I am a thing";
    			t18 = space();
    			td1 = element("td");
    			create_component(linkedchart1.$$.fragment);
    			t19 = space();
    			td2 = element("td");
    			create_component(linkedvalue0.$$.fragment);
    			t20 = space();
    			tr2 = element("tr");
    			td3 = element("td");
    			td3.textContent = "I am another thing";
    			t22 = space();
    			td4 = element("td");
    			create_component(linkedchart2.$$.fragment);
    			t23 = space();
    			td5 = element("td");
    			create_component(linkedvalue1.$$.fragment);
    			t24 = space();
    			tr3 = element("tr");
    			td6 = element("td");
    			td6.textContent = "I am third thing";
    			t26 = space();
    			td7 = element("td");
    			create_component(linkedchart3.$$.fragment);
    			t27 = space();
    			td8 = element("td");
    			create_component(linkedvalue2.$$.fragment);
    			t28 = space();
    			h21 = element("h2");
    			h21.textContent = "Installation";
    			t30 = space();
    			p3 = element("p");
    			p3.textContent = "Install using Yarn or NPM.";
    			t32 = space();
    			code0 = element("code");
    			t33 = text("yarn add ");
    			mark1 = element("mark");
    			mark1.textContent = "svelte-tiny-linked-charts";
    			t35 = space();
    			code1 = element("code");
    			t36 = text("npm install --save ");
    			mark2 = element("mark");
    			mark2.textContent = "svelte-tiny-linked-charts";
    			t38 = space();
    			p4 = element("p");
    			p4.textContent = "Include the chart in your app.";
    			t40 = space();
    			code2 = element("code");
    			t41 = text("<");
    			mark3 = element("mark");
    			mark3.textContent = "LinkedChart";
    			t43 = text(" { data } />");
    			t44 = space();
    			code3 = element("code");
    			t45 = text("import { ");
    			mark4 = element("mark");
    			mark4.textContent = "LinkedChart";
    			t47 = text(", ");
    			mark5 = element("mark");
    			mark5.textContent = "LinkedLabel";
    			t49 = text(", ");
    			mark6 = element("mark");
    			mark6.textContent = "LinkedValue";
    			t51 = text(" } from \"");
    			mark7 = element("mark");
    			mark7.textContent = "svelte-tiny-linked-charts";
    			t53 = text("\"");
    			t54 = space();
    			div2 = element("div");
    			p5 = element("p");
    			p5.textContent = "Supply your data in a simple key:value object:";
    			t56 = space();
    			code4 = element("code");
    			t57 = text("let data = { ");
    			br0 = element("br");
    			t58 = text("\r\n\t\t\t  \"2005-01-01\": 25, ");
    			br1 = element("br");
    			t59 = text("\r\n\t\t\t  \"2005-01-02\": 20, ");
    			br2 = element("br");
    			t60 = text("\r\n\t\t\t  \"2005-01-03\": 18, ");
    			br3 = element("br");
    			t61 = text("\r\n\t\t\t  \"2005-01-04\": 17, ");
    			br4 = element("br");
    			t62 = text("\r\n\t\t\t  \"2005-01-05\": 21 ");
    			br5 = element("br");
    			t63 = text("\r\n\t\t\t}");
    			t64 = space();
    			code5 = element("code");
    			code5.textContent = "<LinkedChart { data } />";
    			t66 = space();
    			p6 = element("p");
    			p6.textContent = "Or if you prefer supply the labels and values separately:";
    			t68 = space();
    			code6 = element("code");
    			t69 = text("let labels = [ ");
    			br6 = element("br");
    			t70 = text("\r\n\t\t\t  \"2005-01-01\", ");
    			br7 = element("br");
    			t71 = text("\r\n\t\t\t  \"2005-01-02\", ");
    			br8 = element("br");
    			t72 = text("\r\n\t\t\t  \"2005-01-03\", ");
    			br9 = element("br");
    			t73 = text("\r\n\t\t\t  \"2005-01-04\", ");
    			br10 = element("br");
    			t74 = text("\r\n\t\t\t  \"2005-01-05\" ");
    			br11 = element("br");
    			t75 = text("\r\n\t\t\t]");
    			t76 = space();
    			code7 = element("code");
    			t77 = text("let values = [ ");
    			br12 = element("br");
    			t78 = text("\r\n\t\t\t  25, ");
    			br13 = element("br");
    			t79 = text("\r\n\t\t\t  20, ");
    			br14 = element("br");
    			t80 = text("\r\n\t\t\t  18, ");
    			br15 = element("br");
    			t81 = text("\r\n\t\t\t  17, ");
    			br16 = element("br");
    			t82 = text("\r\n\t\t\t  21 ");
    			br17 = element("br");
    			t83 = text("\r\n\t\t\t]");
    			t84 = space();
    			code8 = element("code");
    			code8.textContent = "<LinkedChart { labels } { values } />";
    			t86 = space();
    			h22 = element("h2");
    			h22.textContent = "Usage";
    			t88 = space();
    			div4 = element("div");
    			div3 = element("div");
    			t89 = text("The chart in it's most basic form.\r\n\r\n\t\t\t");
    			code9 = element("code");
    			code9.textContent = "<LinkedChart { data } />";
    			t91 = space();
    			create_component(linkedchart4.$$.fragment);
    			t92 = space();
    			div11 = element("div");
    			div5 = element("div");
    			t93 = text("You can link multiple charts together, hovering one will also highlight others.\r\n\r\n\t\t\t");
    			code10 = element("code");
    			t94 = text("<LinkedChart { data } linked=\"link-1\" /> ");
    			br18 = element("br");
    			t95 = text("\r\n\t\t\t\t<LinkedChart { data } linked=\"link-1\" /> ");
    			br19 = element("br");
    			t96 = text("\r\n\t\t\t\t<LinkedChart { data } linked=\"link-1\" /> ");
    			br20 = element("br");
    			t97 = text("\r\n\t\t\t\t<LinkedChart { data } linked=\"link-1\" />");
    			t98 = space();
    			div10 = element("div");
    			div6 = element("div");
    			create_component(linkedchart5.$$.fragment);
    			t99 = space();
    			div7 = element("div");
    			create_component(linkedchart6.$$.fragment);
    			t100 = space();
    			div8 = element("div");
    			create_component(linkedchart7.$$.fragment);
    			t101 = space();
    			div9 = element("div");
    			create_component(linkedchart8.$$.fragment);
    			t102 = space();
    			div16 = element("div");
    			div12 = element("div");
    			t103 = text("The highest value in the chart is automatically determined by the highest value in your data. To overwrite this use \"scaleMax\".\r\n\r\n\t\t\t");
    			code11 = element("code");
    			t104 = text("<LinkedChart { data } scaleMax=\"100\" /> ");
    			br21 = element("br");
    			t105 = text("\r\n\t\t\t\t<LinkedChart { data } scaleMax=\"100\" />");
    			t106 = space();
    			div15 = element("div");
    			div13 = element("div");
    			create_component(linkedchart9.$$.fragment);
    			t107 = space();
    			div14 = element("div");
    			create_component(linkedchart10.$$.fragment);
    			t108 = space();
    			h23 = element("h2");
    			h23.textContent = "Label";
    			t110 = space();
    			div21 = element("div");
    			div17 = element("div");
    			t111 = text("You can optionally display a label, which will display the label of what you're currently hovering.\r\n\r\n\t\t\t");
    			code12 = element("code");
    			t112 = text("<LinkedLabel linked=\"link-2\" /> ");
    			br22 = element("br");
    			t113 = space();
    			br23 = element("br");
    			t114 = text("\r\n\t\t\t\t<LinkedChart { data } linked=\"link-2\" /> ");
    			br24 = element("br");
    			t115 = text("\r\n\t\t\t\t<LinkedChart { data } linked=\"link-2\" />");
    			t116 = space();
    			br25 = element("br");
    			t117 = text("\r\n\t\t\tThe label has no styling by default.");
    			t118 = space();
    			div20 = element("div");
    			create_component(linkedlabel1.$$.fragment);
    			t119 = space();
    			div18 = element("div");
    			create_component(linkedchart11.$$.fragment);
    			t120 = space();
    			div19 = element("div");
    			create_component(linkedchart12.$$.fragment);
    			t121 = space();
    			div26 = element("div");
    			div22 = element("div");
    			t122 = text("You can enable a the value you're hovering using \"showValue\".\r\n\r\n\t\t\t");
    			code13 = element("code");
    			code13.textContent = "<LinkedChart { data } showValue={ true } />";
    			t124 = space();
    			br26 = element("br");
    			t125 = text("\r\n\t\t\tThis can be further enhanced with \"valueDefault\", \"valuePrepend\", and \"valueAppend\".\r\n\r\n\t\t\t");
    			code14 = element("code");
    			t126 = text("<LinkedChart ");
    			br27 = element("br");
    			t127 = text("\r\n\t\t\t\t  { data }  ");
    			br28 = element("br");
    			t128 = text("\r\n\t\t\t\t  showValue={ true } ");
    			br29 = element("br");
    			t129 = text("\r\n\t\t\t\t  valueDefault=\"Empty label\" ");
    			br30 = element("br");
    			t130 = text("\r\n\t\t\t\t  valuePrepend=\"Thing:\" ");
    			br31 = element("br");
    			t131 = text("\r\n\t\t\t\t  valueAppend=\"views\" />");
    			t132 = space();
    			br32 = element("br");
    			t133 = text("\r\n\t\t\tThis value has no styling by default.");
    			t134 = space();
    			div25 = element("div");
    			div23 = element("div");
    			create_component(linkedchart13.$$.fragment);
    			t135 = space();
    			div24 = element("div");
    			create_component(linkedchart14.$$.fragment);
    			t136 = space();
    			div31 = element("div");
    			div27 = element("div");
    			t137 = text("The value can be position at the location of the hover using \"valuePosition\".\r\n\r\n\t\t\t");
    			code15 = element("code");
    			code15.textContent = "<LinkedChart { data } showLabel={ true } />";
    			t139 = space();
    			br33 = element("br");
    			t140 = text("\r\n\t\t\tThis can be further enhanced with \"labelDefault\", \"labelPrepend\", and \"labelAppend\".\r\n\r\n\t\t\t");
    			code16 = element("code");
    			t141 = text("<LinkedChart ");
    			br34 = element("br");
    			t142 = text("\r\n\t\t\t\t  { data }  ");
    			br35 = element("br");
    			t143 = text("\r\n\t\t\t\t  showValue={ true } ");
    			br36 = element("br");
    			t144 = text("\r\n\t\t\t\t  valuePosition=\"floating\" />");
    			t145 = space();
    			br37 = element("br");
    			t146 = text("\r\n\t\t\tYou're expected to style this value further yourself.");
    			t147 = space();
    			div30 = element("div");
    			div28 = element("div");
    			create_component(linkedchart15.$$.fragment);
    			t148 = space();
    			br38 = element("br");
    			t149 = space();
    			div29 = element("div");
    			create_component(linkedchart16.$$.fragment);
    			t150 = space();
    			div34 = element("div");
    			t151 = text("Alternatively you can show the value as a separate element wherever you like using the \"LinkedValue\" component. Use \"uid\" to link the chart and value together.\r\n\r\n\t\t");
    			code17 = element("code");
    			t152 = text("<LinkedChart { data } uid=\"some-id\" />\r\n\t\t\t");
    			br39 = element("br");
    			t153 = text("\r\n\t\t\t<LinkedValue uid=\"some-id\" /> ");
    			br40 = element("br");
    			t154 = space();
    			br41 = element("br");
    			t155 = text("\r\n\t\tThis value has no styling by default.\r\n\r\n\t\t");
    			br42 = element("br");
    			br43 = element("br");
    			t156 = space();
    			div32 = element("div");
    			create_component(linkedchart17.$$.fragment);
    			t157 = space();
    			strong0 = element("strong");
    			create_component(linkedvalue3.$$.fragment);
    			t158 = space();
    			div33 = element("div");
    			create_component(linkedchart18.$$.fragment);
    			t159 = space();
    			strong1 = element("strong");
    			create_component(linkedvalue4.$$.fragment);
    			t160 = space();
    			h24 = element("h2");
    			h24.textContent = "Styling";
    			t162 = space();
    			div36 = element("div");
    			div35 = element("div");
    			t163 = text("The width of the bars is fixed by default, but can be set to grow to fill the chart.\r\n\r\n\t\t\t");
    			code18 = element("code");
    			code18.textContent = "<LinkedChart data={ ... } grow={ true } />";
    			t165 = space();
    			create_component(linkedchart19.$$.fragment);
    			t166 = space();
    			div41 = element("div");
    			div37 = element("div");
    			t167 = text("To change the size of the bars set the \"barMinWidth\" property.\r\n\r\n\t\t\t");
    			code19 = element("code");
    			t168 = text("<LinkedChart data={ ... } barMinWidth=\"2\" /> ");
    			br44 = element("br");
    			t169 = text("\r\n\t\t\t\t<LinkedChart data={ ... } barMinWidth=\"14\" />");
    			t170 = space();
    			div40 = element("div");
    			div38 = element("div");
    			create_component(linkedchart20.$$.fragment);
    			t171 = space();
    			div39 = element("div");
    			create_component(linkedchart21.$$.fragment);
    			t172 = space();
    			div46 = element("div");
    			div42 = element("div");
    			t173 = text("To always fill out the content, giving the bars a dynamic width, you can set both the \"grow\" and \"barMinWidth\" properties.\r\n\r\n\t\t\t");
    			code20 = element("code");
    			t174 = text("<LinkedChart");
    			br45 = element("br");
    			t175 = text("\r\n\t\t\t\t  data={ ... } ");
    			br46 = element("br");
    			t176 = text("\r\n\t\t\t\t  grow={ true } ");
    			br47 = element("br");
    			t177 = text("\r\n\t\t\t\t  barMinWidth=\"0\" />");
    			t178 = space();
    			div45 = element("div");
    			div43 = element("div");
    			create_component(linkedchart22.$$.fragment);
    			t179 = space();
    			div44 = element("div");
    			create_component(linkedchart23.$$.fragment);
    			t180 = space();
    			div51 = element("div");
    			div47 = element("div");
    			t181 = text("The charts can be resized to any size you like. It renders as an SVG, so they can easily be made responsive with some CSS.\r\n\r\n\t\t\t");
    			code21 = element("code");
    			t182 = text("<LinkedChart");
    			br48 = element("br");
    			t183 = text("\r\n\t\t\t\t  data={ ... } ");
    			br49 = element("br");
    			t184 = text("\r\n\t\t\t\t  width=\"250\" ");
    			br50 = element("br");
    			t185 = text("\r\n\t\t\t\t  height=\"100\" />");
    			t186 = space();
    			code22 = element("code");
    			t187 = text("svg { ");
    			br51 = element("br");
    			t188 = text("\r\n\t\t\t\t  width: 100%; ");
    			br52 = element("br");
    			t189 = text("\r\n\t\t\t\t  height: auto; ");
    			br53 = element("br");
    			t190 = text("\r\n\t\t\t\t}");
    			t191 = space();
    			br54 = element("br");
    			t192 = text("\r\n\t\t\tor for a fixed height;\r\n\r\n\t\t\t");
    			code23 = element("code");
    			t193 = text("svg { ");
    			br55 = element("br");
    			t194 = text("\r\n\t\t\t\t  width: 100%; ");
    			br56 = element("br");
    			t195 = text("\r\n\t\t\t\t  height: 50px; ");
    			br57 = element("br");
    			t196 = text("\r\n\t\t\t\t}");
    			t197 = space();
    			div50 = element("div");
    			div48 = element("div");
    			create_component(linkedchart24.$$.fragment);
    			t198 = space();
    			div49 = element("div");
    			create_component(linkedchart25.$$.fragment);
    			t199 = space();
    			div56 = element("div");
    			div52 = element("div");
    			t200 = text("The gap in between bars can also be adjusted.\r\n\r\n\t\t\t");
    			code24 = element("code");
    			t201 = text("<LinkedChart { data } gap=\"10\" /> ");
    			br58 = element("br");
    			t202 = text("\r\n\t\t\t\t<LinkedChart { data } gap=\"0\" />");
    			t203 = space();
    			div55 = element("div");
    			div53 = element("div");
    			create_component(linkedchart26.$$.fragment);
    			t204 = space();
    			div54 = element("div");
    			create_component(linkedchart27.$$.fragment);
    			t205 = space();
    			div61 = element("div");
    			div57 = element("div");
    			t206 = text("When the bars do not fill the width of the graph they are aligned to the right by default. This can be set to be left aligned instead.\r\n\r\n\t\t\t");
    			code25 = element("code");
    			code25.textContent = "<LinkedChart { data } align=\"left\" />";
    			t208 = space();
    			div60 = element("div");
    			div58 = element("div");
    			create_component(linkedchart28.$$.fragment);
    			t209 = space();
    			div59 = element("div");
    			create_component(linkedchart29.$$.fragment);
    			t210 = space();
    			div72 = element("div");
    			div62 = element("div");
    			t211 = text("The bars can be colored any way you wish.\r\n\r\n\t\t\t");
    			code26 = element("code");
    			t212 = text("<LinkedChart fill=\"#ff00ff\" /> ");
    			br59 = element("br");
    			t213 = text("\r\n\t\t\t\t<LinkedChart fill=\"rgb(255, 255, 0)\" /> ");
    			br60 = element("br");
    			t214 = text("\r\n\t\t\t\t<LinkedChart fill=\"hsla(290, 55%, 50%, 1)\" />");
    			t215 = space();
    			div71 = element("div");
    			div63 = element("div");
    			create_component(linkedchart30.$$.fragment);
    			t216 = space();
    			div64 = element("div");
    			create_component(linkedchart31.$$.fragment);
    			t217 = space();
    			div65 = element("div");
    			create_component(linkedchart32.$$.fragment);
    			t218 = space();
    			div66 = element("div");
    			create_component(linkedchart33.$$.fragment);
    			t219 = space();
    			div67 = element("div");
    			create_component(linkedchart34.$$.fragment);
    			t220 = space();
    			div68 = element("div");
    			create_component(linkedchart35.$$.fragment);
    			t221 = space();
    			div69 = element("div");
    			create_component(linkedchart36.$$.fragment);
    			t222 = space();
    			div70 = element("div");
    			create_component(linkedchart37.$$.fragment);
    			t223 = space();
    			div74 = element("div");
    			div73 = element("div");
    			t224 = text("The opacity of faded out bars can be adjusted using \"fadeOpacity\".\r\n\r\n\t\t\t");
    			code27 = element("code");
    			code27.textContent = "<LinkedChart { data } fadeOpacity=\"0.15\" />";
    			t226 = space();
    			create_component(linkedchart38.$$.fragment);
    			t227 = space();
    			div76 = element("div");
    			div75 = element("div");
    			t228 = text("The hover effect can be disabled altogether using \"hover\".\r\n\r\n\t\t\t");
    			code28 = element("code");
    			code28.textContent = "<LinkedChart { data } hover={ false } />";
    			t230 = space();
    			create_component(linkedchart39.$$.fragment);
    			t231 = space();
    			div78 = element("div");
    			div77 = element("div");
    			t232 = text("Bars can be set to transition between states. ");
    			br61 = element("br");
    			t233 = text("\r\n\t\t\tValue is speed in milliseconds.\r\n\r\n\t\t\t");
    			code29 = element("code");
    			code29.textContent = "<LinkedChart { data } transition=\"500\" />";
    			t235 = space();
    			create_component(linkedchart40.$$.fragment);
    			t236 = space();
    			div82 = element("div");
    			div79 = element("div");
    			t237 = text("To improve accessibility you can set \"tabindex=0\", allowing navigating to each data point using the keyboard.\r\n\r\n\t\t\t");
    			code30 = element("code");
    			t238 = text("<LinkedChart { data } tabindex=\"0\" /> ");
    			br62 = element("br");
    			t239 = space();
    			div81 = element("div");
    			div80 = element("div");
    			create_component(linkedchart41.$$.fragment);
    			t240 = space();
    			div89 = element("div");
    			div83 = element("div");
    			t241 = text("Instead of bars you can also opt for a line-chart using \"type=line\". \"lineColor\" can be used to color the line, \"fill\" to color the points. This can have all of the bar properties as well.\r\n\r\n\t\t\t");
    			code31 = element("code");
    			t242 = text("<LinkedChart { data } type=\"line\" /> ");
    			br63 = element("br");
    			t243 = text("\r\n\t\t\t\t<LinkedChart ");
    			br64 = element("br");
    			t244 = text("\r\n\t\t\t\t  { data } ");
    			br65 = element("br");
    			t245 = text("\r\n\t\t\t\t  type=\"line\" ");
    			br66 = element("br");
    			t246 = text("\r\n\t\t\t\t  lineColor=\"#4355db\" ");
    			br67 = element("br");
    			t247 = text("\r\n\t\t\t\t  fill=\"white\" />");
    			t248 = space();
    			div88 = element("div");
    			div84 = element("div");
    			create_component(linkedchart42.$$.fragment);
    			t249 = space();
    			div85 = element("div");
    			create_component(linkedchart43.$$.fragment);
    			t250 = space();
    			div86 = element("div");
    			create_component(linkedchart44.$$.fragment);
    			t251 = space();
    			div87 = element("div");
    			create_component(linkedchart45.$$.fragment);
    			t252 = space();
    			h25 = element("h2");
    			h25.textContent = "Events";
    			t254 = space();
    			div97 = element("div");
    			div96 = element("div");
    			t255 = text("By enable \"dispatchEvents\" on the LinkedChart component you can dispatch several events when the state of the chart changes.\r\n\r\n\t\t\t");
    			code32 = element("code");
    			t256 = text("<LinkedChart ");
    			br68 = element("br");
    			t257 = text("\r\n\t\t\t\t  dispatchEvents={ true } ");
    			br69 = element("br");
    			t258 = text("\r\n\t\t\t\t  on:hover={ event => console.log(event.detail) } ");
    			br70 = element("br");
    			t259 = text("\r\n\t\t\t\t  on:blur={ event => console.log(event.detail) } ");
    			br71 = element("br");
    			t260 = text("\r\n\t\t\t\t  on:value-update={ event => console.log(event.detail) } />");
    			t261 = space();
    			p7 = element("p");
    			p7.textContent = "This could be used to construct your own value element that can be formatted as you wish. For example in this example the values are given as cents, but the value is formatted as dollars.";
    			t263 = space();
    			div90 = element("div");
    			create_component(linkedchart46.$$.fragment);
    			t264 = space();
    			span = element("span");
    			span.textContent = " ";
    			t266 = space();
    			code33 = element("code");
    			t267 = text("<LinkedChart ");
    			br72 = element("br");
    			t268 = text("\r\n\t\t\t\t  dispatchEvents ");
    			br73 = element("br");
    			t269 = text("\r\n\t\t\t\t  on:hover={ event => ");
    			br74 = element("br");
    			t270 = text("\r\n\t\t\t\t   \tdocument.querySelector(\"[data-role='currency']\") ");
    			br75 = element("br");
    			t271 = text("\r\n\t\t\t\t    .innerHTML = (event.detail.value / 100).toLocaleString(\"en-US\", { ");
    			br76 = element("br");
    			t272 = text("\r\n\t\t\t\t      style: \"currency\", currency: \"USD\"");
    			br77 = element("br");
    			t273 = text("\r\n\t\t\t\t    }) ");
    			br78 = element("br");
    			t274 = text("\r\n\t\t\t\t  } ");
    			br79 = element("br");
    			t275 = text("\r\n\t\t\t\t  on:blur={ event => ");
    			br80 = element("br");
    			t276 = text("\r\n\t\t\t\t    document.querySelector(\"[data-role='currency']\").innerHTML = \" \" ");
    			br81 = element("br");
    			t277 = text("\r\n\t\t\t\t  } />");
    			t278 = space();
    			br82 = element("br");
    			t279 = space();
    			p8 = element("p");
    			p8.textContent = "In this example we format the value element inside the chart directly to make use of \"toLocaleString()\" to format the number. Ideally you would supply the value already formatted to avoid having to do this, but that's not always possible.";
    			t281 = space();
    			div91 = element("div");
    			create_component(linkedchart47.$$.fragment);
    			t282 = space();
    			code34 = element("code");
    			t283 = text("<LinkedChart ");
    			br83 = element("br");
    			t284 = text("\r\n\t\t\t\t  dispatchEvents ");
    			br84 = element("br");
    			t285 = text("\r\n\t\t\t\t  showValue ");
    			br85 = element("br");
    			t286 = text("\r\n\t\t\t\t  valuePosition=\"floating\" ");
    			br86 = element("br");
    			t287 = text("\r\n\t\t\t\t  valuePrepend=\"Value: \" ");
    			br87 = element("br");
    			t288 = text("\r\n\t\t\t\t  on:value-update={ event => { ");
    			br88 = element("br");
    			t289 = text("\r\n\t\t\t\t    if (event.detail.valueElement) ");
    			br89 = element("br");
    			t290 = text("\r\n\t\t\t\t      event.detail.valueElement.innerText = ");
    			br90 = element("br");
    			t291 = text("\r\n\t\t\t\t        event.detail.value?.toLocaleString() ");
    			br91 = element("br");
    			t292 = text("\r\n\t\t\t\t  } } />");
    			t293 = space();
    			br92 = element("br");
    			t294 = space();
    			h3 = element("h3");
    			h3.textContent = "All events";
    			t296 = space();
    			div95 = element("div");
    			strong2 = element("strong");
    			strong2.textContent = "Property";
    			t298 = space();
    			strong3 = element("strong");
    			strong3.textContent = "Description";
    			t300 = space();
    			strong4 = element("strong");
    			strong4.textContent = "Return";
    			t302 = space();
    			code35 = element("code");
    			code35.textContent = "on:hover";
    			t304 = space();
    			div92 = element("div");
    			div92.textContent = "On hover of bars";
    			t306 = space();
    			code36 = element("code");
    			code36.textContent = "uid, key, index, linkedKey, value, valueElement, eventElement";
    			t308 = space();
    			code37 = element("code");
    			code37.textContent = "on:blur";
    			t310 = space();
    			div93 = element("div");
    			div93.textContent = "On blur of the chart";
    			t312 = space();
    			code38 = element("code");
    			code38.textContent = "uid, linkedKey, valueElement, eventElement";
    			t314 = space();
    			code39 = element("code");
    			code39.textContent = "on:value-update";
    			t316 = space();
    			div94 = element("div");
    			div94.textContent = "Any time the value updates";
    			t318 = space();
    			code40 = element("code");
    			code40.textContent = "value, uid, linkedKey, valueElement";
    			t320 = space();
    			h26 = element("h2");
    			h26.textContent = "Properties";
    			t322 = space();
    			div124 = element("div");
    			p9 = element("p");
    			p9.textContent = "This is a list of all configurable properties on the \"LinkedChart\" component.";
    			t324 = space();
    			div123 = element("div");
    			strong5 = element("strong");
    			strong5.textContent = "Property";
    			t326 = space();
    			strong6 = element("strong");
    			strong6.textContent = "Default";
    			t328 = space();
    			strong7 = element("strong");
    			strong7.textContent = "Description";
    			t330 = space();
    			code41 = element("code");
    			code41.textContent = "data";
    			t332 = space();
    			code42 = element("code");
    			code42.textContent = "{}";
    			t334 = space();
    			div98 = element("div");
    			div98.textContent = "Data that will be displayed in the chart supplied in key:value object.";
    			t336 = space();
    			code43 = element("code");
    			code43.textContent = "labels";
    			t338 = space();
    			code44 = element("code");
    			code44.textContent = "[]";
    			t340 = space();
    			div99 = element("div");
    			div99.textContent = "Labels supplied separately, to be used together with \"values\" property.";
    			t342 = space();
    			code45 = element("code");
    			code45.textContent = "values";
    			t344 = space();
    			code46 = element("code");
    			code46.textContent = "[]";
    			t346 = space();
    			div100 = element("div");
    			div100.textContent = "Values supplied separately, to be used together with \"labels\" property.";
    			t348 = space();
    			code47 = element("code");
    			code47.textContent = "linked";
    			t350 = space();
    			code48 = element("code");
    			t351 = space();
    			div101 = element("div");
    			div101.textContent = "Key to link this chart to other charts with the same key.";
    			t353 = space();
    			code49 = element("code");
    			code49.textContent = "uid";
    			t355 = space();
    			code50 = element("code");
    			t356 = space();
    			div102 = element("div");
    			div102.textContent = "Unique ID to link this chart to a LinkedValue component with the same uid.";
    			t358 = space();
    			code51 = element("code");
    			code51.textContent = "height";
    			t360 = space();
    			code52 = element("code");
    			code52.textContent = "40";
    			t362 = space();
    			div103 = element("div");
    			div103.textContent = "Height of the chart in pixels.";
    			t364 = space();
    			code53 = element("code");
    			code53.textContent = "width";
    			t366 = space();
    			code54 = element("code");
    			code54.textContent = "150";
    			t368 = space();
    			div104 = element("div");
    			div104.textContent = "Width of the chart in pixels.";
    			t370 = space();
    			code55 = element("code");
    			code55.textContent = "barMinWidth";
    			t372 = space();
    			code56 = element("code");
    			code56.textContent = "4";
    			t374 = space();
    			div105 = element("div");
    			div105.textContent = "Width of the bars in the chart in pixels.";
    			t376 = space();
    			code57 = element("code");
    			code57.textContent = "grow";
    			t378 = space();
    			code58 = element("code");
    			code58.textContent = "false";
    			t380 = space();
    			div106 = element("div");
    			div106.textContent = "Whether or not the bar should grow to fill out the full width of the chart.";
    			t382 = space();
    			code59 = element("code");
    			code59.textContent = "align";
    			t384 = space();
    			code60 = element("code");
    			code60.textContent = "right";
    			t386 = space();
    			div107 = element("div");
    			div107.textContent = "The side the bars should align to when they do not completely fill out the chart.";
    			t388 = space();
    			code61 = element("code");
    			code61.textContent = "gap";
    			t390 = space();
    			code62 = element("code");
    			code62.textContent = "1";
    			t392 = space();
    			div108 = element("div");
    			div108.textContent = "Gap between the bars in pixels.";
    			t394 = space();
    			code63 = element("code");
    			code63.textContent = "fill";
    			t396 = space();
    			code64 = element("code");
    			code64.textContent = "#ff3e00";
    			t398 = space();
    			div109 = element("div");
    			div109.textContent = "Color of the bars, can be any valid CSS color.";
    			t400 = space();
    			code65 = element("code");
    			code65.textContent = "fadeOpacity";
    			t402 = space();
    			code66 = element("code");
    			code66.textContent = "0.5";
    			t404 = space();
    			div110 = element("div");
    			div110.textContent = "The opacity the faded out bars should display in.";
    			t406 = space();
    			code67 = element("code");
    			code67.textContent = "hover";
    			t408 = space();
    			code68 = element("code");
    			code68.textContent = "true";
    			t410 = space();
    			div111 = element("div");
    			div111.textContent = "Boolean whether or not this chart can be hovered at all.";
    			t412 = space();
    			code69 = element("code");
    			code69.textContent = "transition";
    			t414 = space();
    			code70 = element("code");
    			code70.textContent = "0";
    			t416 = space();
    			div112 = element("div");
    			div112.textContent = "Transition the chart between different stats. Value is time in milliseconds.";
    			t418 = space();
    			code71 = element("code");
    			code71.textContent = "showValue";
    			t420 = space();
    			code72 = element("code");
    			code72.textContent = "false";
    			t422 = space();
    			div113 = element("div");
    			div113.textContent = "Boolean whether or not a value will be shown.";
    			t424 = space();
    			code73 = element("code");
    			code73.textContent = "valueDefault";
    			t426 = space();
    			code74 = element("code");
    			code74.textContent = "\" \"";
    			t428 = space();
    			div114 = element("div");
    			div114.textContent = "Default value when not hovering.";
    			t430 = space();
    			code75 = element("code");
    			code75.textContent = "valuePrepend";
    			t432 = space();
    			code76 = element("code");
    			t433 = space();
    			div115 = element("div");
    			div115.textContent = "String to prepend the value.";
    			t435 = space();
    			code77 = element("code");
    			code77.textContent = "valueAppend";
    			t437 = space();
    			code78 = element("code");
    			t438 = space();
    			div116 = element("div");
    			div116.textContent = "String to append to the value.";
    			t440 = space();
    			code79 = element("code");
    			code79.textContent = "valuePosition";
    			t442 = space();
    			code80 = element("code");
    			code80.textContent = "static";
    			t444 = space();
    			div117 = element("div");
    			div117.textContent = "Can be set to \"floating\" to follow the position of the hover.";
    			t446 = space();
    			code81 = element("code");
    			code81.textContent = "scaleMax";
    			t448 = space();
    			code82 = element("code");
    			code82.textContent = "0";
    			t450 = space();
    			div118 = element("div");
    			div118.textContent = "Use this to overwrite the automatic scale set to the highest value in your array.";
    			t452 = space();
    			code83 = element("code");
    			code83.textContent = "type";
    			t454 = space();
    			code84 = element("code");
    			code84.textContent = "bar";
    			t456 = space();
    			div119 = element("div");
    			div119.textContent = "Can be set to \"line\" to display a line chart instead.";
    			t458 = space();
    			code85 = element("code");
    			code85.textContent = "lineColor";
    			t460 = space();
    			code86 = element("code");
    			code86.textContent = "fill";
    			t462 = space();
    			div120 = element("div");
    			div120.textContent = "Color of the line if used with type=\"line\".";
    			t464 = space();
    			code87 = element("code");
    			code87.textContent = "tabindex";
    			t466 = space();
    			code88 = element("code");
    			code88.textContent = "-1";
    			t468 = space();
    			div121 = element("div");
    			div121.textContent = "Sets the tabindex of each bar.";
    			t470 = space();
    			code89 = element("code");
    			code89.textContent = "dispatchEvents";
    			t472 = space();
    			code90 = element("code");
    			code90.textContent = "false";
    			t474 = space();
    			div122 = element("div");
    			div122.textContent = "Boolean whether or not to dispatch events on certain actions (explained above).";
    			t476 = space();
    			div128 = element("div");
    			p10 = element("p");
    			p10.textContent = "This is a list of all configurable properties on the \"LinkedLabel\" component.";
    			t478 = space();
    			div127 = element("div");
    			strong8 = element("strong");
    			strong8.textContent = "Property";
    			t480 = space();
    			strong9 = element("strong");
    			strong9.textContent = "Default";
    			t482 = space();
    			strong10 = element("strong");
    			strong10.textContent = "Description";
    			t484 = space();
    			code91 = element("code");
    			code91.textContent = "linked";
    			t486 = space();
    			code92 = element("code");
    			t487 = space();
    			div125 = element("div");
    			div125.textContent = "Key to link this label to charts with the same key.";
    			t489 = space();
    			code93 = element("code");
    			code93.textContent = "empty";
    			t491 = space();
    			code94 = element("code");
    			code94.textContent = "&nbsp;";
    			t493 = space();
    			div126 = element("div");
    			div126.textContent = "String that will be displayed when no bar is being hovered.";
    			t495 = space();
    			div132 = element("div");
    			p11 = element("p");
    			p11.textContent = "This is a list of all configurable properties on the \"LinkedValue\" component.";
    			t497 = space();
    			div131 = element("div");
    			strong11 = element("strong");
    			strong11.textContent = "Property";
    			t499 = space();
    			strong12 = element("strong");
    			strong12.textContent = "Default";
    			t501 = space();
    			strong13 = element("strong");
    			strong13.textContent = "Description";
    			t503 = space();
    			code95 = element("code");
    			code95.textContent = "uid";
    			t505 = space();
    			code96 = element("code");
    			t506 = space();
    			div129 = element("div");
    			div129.textContent = "Unique ID to link this value to a chart with the same uid.";
    			t508 = space();
    			code97 = element("code");
    			code97.textContent = "empty";
    			t510 = space();
    			code98 = element("code");
    			code98.textContent = "&nbsp;";
    			t512 = space();
    			div130 = element("div");
    			div130.textContent = "String that will be displayed when no bar is being hovered.";
    			t514 = space();
    			div133 = element("div");
    			t515 = text("Made by ");
    			a1 = element("a");
    			a1.textContent = "Mitchel Jager";
    			attr_dev(mark0, "class", "svelte-ljrh63");
    			add_location(mark0, file, 39, 29, 1027);
    			attr_dev(h1, "class", "svelte-ljrh63");
    			add_location(h1, file, 39, 2, 1000);
    			attr_dev(div0, "class", "header svelte-ljrh63");
    			add_location(div0, file, 38, 1, 976);
    			attr_dev(p0, "class", "svelte-ljrh63");
    			add_location(p0, file, 44, 2, 1183);
    			add_location(em, file, 46, 5, 1401);
    			attr_dev(p1, "class", "svelte-ljrh63");
    			add_location(p1, file, 46, 2, 1398);
    			attr_dev(a0, "href", "https://github.com/Mitcheljager/svelte-tiny-linked-charts");
    			attr_dev(a0, "class", "svelte-ljrh63");
    			add_location(a0, file, 48, 5, 1450);
    			attr_dev(p2, "class", "svelte-ljrh63");
    			add_location(p2, file, 48, 2, 1447);
    			attr_dev(h20, "class", "svelte-ljrh63");
    			add_location(h20, file, 50, 2, 1538);
    			attr_dev(th0, "class", "svelte-ljrh63");
    			add_location(th0, file, 54, 4, 1601);
    			attr_dev(th1, "width", "150");
    			attr_dev(th1, "class", "svelte-ljrh63");
    			add_location(th1, file, 55, 4, 1620);
    			attr_dev(th2, "class", "svelte-ljrh63");
    			add_location(th2, file, 56, 4, 1699);
    			add_location(tr0, file, 53, 3, 1591);
    			attr_dev(td0, "class", "label svelte-ljrh63");
    			add_location(td0, file, 60, 4, 1740);
    			attr_dev(td1, "class", "svelte-ljrh63");
    			add_location(td1, file, 61, 4, 1781);
    			attr_dev(td2, "class", "svelte-ljrh63");
    			add_location(td2, file, 62, 4, 1862);
    			add_location(tr1, file, 59, 3, 1730);
    			attr_dev(td3, "class", "label svelte-ljrh63");
    			add_location(td3, file, 66, 4, 1989);
    			attr_dev(td4, "class", "svelte-ljrh63");
    			add_location(td4, file, 67, 4, 2036);
    			attr_dev(td5, "class", "svelte-ljrh63");
    			add_location(td5, file, 68, 4, 2117);
    			add_location(tr2, file, 65, 3, 1979);
    			attr_dev(td6, "class", "label svelte-ljrh63");
    			add_location(td6, file, 72, 4, 2244);
    			attr_dev(td7, "class", "svelte-ljrh63");
    			add_location(td7, file, 73, 4, 2289);
    			attr_dev(td8, "class", "svelte-ljrh63");
    			add_location(td8, file, 74, 4, 2370);
    			add_location(tr3, file, 71, 3, 2234);
    			attr_dev(table, "class", "preview-table svelte-ljrh63");
    			add_location(table, file, 52, 2, 1557);
    			attr_dev(h21, "class", "svelte-ljrh63");
    			add_location(h21, file, 78, 2, 2499);
    			attr_dev(p3, "class", "svelte-ljrh63");
    			add_location(p3, file, 80, 2, 2526);
    			attr_dev(mark1, "class", "svelte-ljrh63");
    			add_location(mark1, file, 83, 12, 2598);
    			attr_dev(code0, "class", "well svelte-ljrh63");
    			add_location(code0, file, 82, 2, 2565);
    			attr_dev(mark2, "class", "svelte-ljrh63");
    			add_location(mark2, file, 87, 22, 2696);
    			attr_dev(code1, "class", "well svelte-ljrh63");
    			add_location(code1, file, 86, 2, 2653);
    			attr_dev(p4, "class", "svelte-ljrh63");
    			add_location(p4, file, 90, 2, 2751);
    			attr_dev(mark3, "class", "svelte-ljrh63");
    			add_location(mark3, file, 93, 7, 2822);
    			attr_dev(code2, "class", "well svelte-ljrh63");
    			add_location(code2, file, 92, 2, 2794);
    			attr_dev(mark4, "class", "svelte-ljrh63");
    			add_location(mark4, file, 97, 17, 2926);
    			attr_dev(mark5, "class", "svelte-ljrh63");
    			add_location(mark5, file, 97, 43, 2952);
    			attr_dev(mark6, "class", "svelte-ljrh63");
    			add_location(mark6, file, 97, 69, 2978);
    			attr_dev(mark7, "class", "svelte-ljrh63");
    			add_location(mark7, file, 97, 107, 3016);
    			attr_dev(code3, "class", "well svelte-ljrh63");
    			add_location(code3, file, 96, 2, 2888);
    			attr_dev(div1, "class", "block block--single svelte-ljrh63");
    			add_location(div1, file, 43, 1, 1146);
    			attr_dev(p5, "class", "svelte-ljrh63");
    			add_location(p5, file, 102, 2, 3117);
    			add_location(br0, file, 107, 21, 3227);
    			add_location(br1, file, 108, 28, 3261);
    			add_location(br2, file, 109, 28, 3295);
    			add_location(br3, file, 110, 28, 3329);
    			add_location(br4, file, 111, 28, 3363);
    			add_location(br5, file, 112, 27, 3396);
    			attr_dev(code4, "class", "well svelte-ljrh63");
    			add_location(code4, file, 106, 2, 3185);
    			attr_dev(code5, "class", "well svelte-ljrh63");
    			add_location(code5, file, 116, 2, 3428);
    			attr_dev(p6, "class", "svelte-ljrh63");
    			add_location(p6, file, 120, 2, 3509);
    			add_location(br6, file, 123, 18, 3618);
    			add_location(br7, file, 124, 24, 3648);
    			add_location(br8, file, 125, 24, 3678);
    			add_location(br9, file, 126, 24, 3708);
    			add_location(br10, file, 127, 24, 3738);
    			add_location(br11, file, 128, 23, 3767);
    			attr_dev(code6, "class", "well svelte-ljrh63");
    			add_location(code6, file, 122, 2, 3579);
    			add_location(br12, file, 133, 18, 3833);
    			add_location(br13, file, 134, 14, 3853);
    			add_location(br14, file, 135, 14, 3873);
    			add_location(br15, file, 136, 14, 3893);
    			add_location(br16, file, 137, 14, 3913);
    			add_location(br17, file, 138, 13, 3932);
    			attr_dev(code7, "class", "well svelte-ljrh63");
    			add_location(code7, file, 132, 2, 3794);
    			attr_dev(code8, "class", "well svelte-ljrh63");
    			add_location(code8, file, 142, 2, 3959);
    			attr_dev(div2, "class", "block block--single svelte-ljrh63");
    			add_location(div2, file, 101, 1, 3080);
    			attr_dev(h22, "class", "svelte-ljrh63");
    			add_location(h22, file, 147, 1, 4071);
    			attr_dev(code9, "class", "svelte-ljrh63");
    			add_location(code9, file, 153, 3, 4184);
    			attr_dev(div3, "class", "description svelte-ljrh63");
    			add_location(div3, file, 150, 2, 4113);
    			attr_dev(div4, "class", "block svelte-ljrh63");
    			add_location(div4, file, 149, 1, 4090);
    			add_location(br18, file, 166, 61, 4523);
    			add_location(br19, file, 167, 61, 4590);
    			add_location(br20, file, 168, 61, 4657);
    			attr_dev(code10, "class", "svelte-ljrh63");
    			add_location(code10, file, 165, 3, 4454);
    			attr_dev(div5, "class", "description svelte-ljrh63");
    			add_location(div5, file, 162, 2, 4338);
    			attr_dev(div6, "class", "chart svelte-ljrh63");
    			add_location(div6, file, 174, 3, 4761);
    			attr_dev(div7, "class", "chart svelte-ljrh63");
    			add_location(div7, file, 175, 3, 4844);
    			attr_dev(div8, "class", "chart svelte-ljrh63");
    			add_location(div8, file, 176, 3, 4927);
    			attr_dev(div9, "class", "chart svelte-ljrh63");
    			add_location(div9, file, 177, 3, 5010);
    			add_location(div10, file, 173, 2, 4751);
    			attr_dev(div11, "class", "block svelte-ljrh63");
    			add_location(div11, file, 161, 1, 4315);
    			add_location(br21, file, 186, 60, 5367);
    			attr_dev(code11, "class", "svelte-ljrh63");
    			add_location(code11, file, 185, 3, 5299);
    			attr_dev(div12, "class", "description svelte-ljrh63");
    			add_location(div12, file, 182, 2, 5135);
    			attr_dev(div13, "class", "chart svelte-ljrh63");
    			add_location(div13, file, 192, 3, 5470);
    			attr_dev(div14, "class", "chart svelte-ljrh63");
    			add_location(div14, file, 193, 3, 5568);
    			add_location(div15, file, 191, 2, 5460);
    			attr_dev(div16, "class", "block svelte-ljrh63");
    			add_location(div16, file, 181, 1, 5112);
    			attr_dev(h23, "class", "svelte-ljrh63");
    			add_location(h23, file, 197, 1, 5693);
    			add_location(br22, file, 204, 42, 5921);
    			add_location(br23, file, 205, 4, 5931);
    			add_location(br24, file, 206, 61, 5998);
    			attr_dev(code12, "class", "svelte-ljrh63");
    			add_location(code12, file, 203, 3, 5871);
    			add_location(br25, file, 209, 3, 6081);
    			attr_dev(div17, "class", "description svelte-ljrh63");
    			add_location(div17, file, 200, 2, 5735);
    			attr_dev(div18, "class", "chart svelte-ljrh63");
    			add_location(div18, file, 216, 3, 6213);
    			attr_dev(div19, "class", "chart svelte-ljrh63");
    			add_location(div19, file, 217, 3, 6296);
    			add_location(div20, file, 213, 2, 6142);
    			attr_dev(div21, "class", "block svelte-ljrh63");
    			add_location(div21, file, 199, 1, 5712);
    			attr_dev(code13, "class", "svelte-ljrh63");
    			add_location(code13, file, 225, 3, 6519);
    			add_location(br26, file, 229, 3, 6619);
    			add_location(br27, file, 233, 20, 6747);
    			add_location(br28, file, 234, 31, 6784);
    			add_location(br29, file, 235, 40, 6830);
    			add_location(br30, file, 236, 38, 6874);
    			add_location(br31, file, 237, 33, 6913);
    			attr_dev(code14, "class", "svelte-ljrh63");
    			add_location(code14, file, 232, 3, 6719);
    			add_location(br32, file, 240, 3, 6972);
    			attr_dev(div22, "class", "description svelte-ljrh63");
    			add_location(div22, file, 222, 2, 6421);
    			attr_dev(div23, "class", "chart svelte-ljrh63");
    			add_location(div23, file, 245, 3, 7044);
    			attr_dev(div24, "class", "chart svelte-ljrh63");
    			add_location(div24, file, 246, 3, 7146);
    			add_location(div25, file, 244, 2, 7034);
    			attr_dev(div26, "class", "block svelte-ljrh63");
    			add_location(div26, file, 221, 1, 6398);
    			attr_dev(code15, "class", "svelte-ljrh63");
    			add_location(code15, file, 254, 3, 7473);
    			add_location(br33, file, 258, 3, 7573);
    			add_location(br34, file, 262, 20, 7701);
    			add_location(br35, file, 263, 31, 7738);
    			add_location(br36, file, 264, 40, 7784);
    			attr_dev(code16, "class", "svelte-ljrh63");
    			add_location(code16, file, 261, 3, 7673);
    			add_location(br37, file, 267, 3, 7848);
    			attr_dev(div27, "class", "description svelte-ljrh63");
    			add_location(div27, file, 251, 2, 7359);
    			attr_dev(div28, "class", "chart svelte-ljrh63");
    			add_location(div28, file, 272, 3, 7936);
    			add_location(br38, file, 273, 3, 8063);
    			attr_dev(div29, "class", "chart svelte-ljrh63");
    			add_location(div29, file, 274, 3, 8072);
    			add_location(div30, file, 271, 2, 7926);
    			attr_dev(div31, "class", "block svelte-ljrh63");
    			add_location(div31, file, 250, 1, 7336);
    			add_location(br39, file, 283, 3, 8490);
    			add_location(br40, file, 284, 39, 8535);
    			attr_dev(code17, "class", "svelte-ljrh63");
    			add_location(code17, file, 281, 2, 8420);
    			add_location(br41, file, 286, 2, 8554);
    			add_location(br42, file, 289, 2, 8605);
    			add_location(br43, file, 289, 6, 8609);
    			add_location(strong0, file, 294, 3, 8700);
    			add_location(div32, file, 291, 2, 8619);
    			add_location(strong1, file, 300, 3, 8865);
    			add_location(div33, file, 297, 2, 8782);
    			attr_dev(div34, "class", "block block--single svelte-ljrh63");
    			add_location(div34, file, 278, 1, 8218);
    			attr_dev(h24, "class", "svelte-ljrh63");
    			add_location(h24, file, 304, 1, 8957);
    			attr_dev(code18, "class", "svelte-ljrh63");
    			add_location(code18, file, 310, 3, 9122);
    			attr_dev(div35, "class", "description svelte-ljrh63");
    			add_location(div35, file, 307, 2, 9001);
    			attr_dev(div36, "class", "block svelte-ljrh63");
    			add_location(div36, file, 306, 1, 8978);
    			add_location(br44, file, 323, 64, 9486);
    			attr_dev(code19, "class", "svelte-ljrh63");
    			add_location(code19, file, 322, 3, 9414);
    			attr_dev(div37, "class", "description svelte-ljrh63");
    			add_location(div37, file, 319, 2, 9315);
    			attr_dev(div38, "class", "chart svelte-ljrh63");
    			add_location(div38, file, 329, 3, 9594);
    			attr_dev(div39, "class", "chart svelte-ljrh63");
    			add_location(div39, file, 330, 3, 9677);
    			add_location(div40, file, 328, 2, 9584);
    			attr_dev(div41, "class", "block svelte-ljrh63");
    			add_location(div41, file, 318, 1, 9292);
    			add_location(br45, file, 339, 19, 9989);
    			add_location(br46, file, 340, 33, 10028);
    			add_location(br47, file, 341, 34, 10068);
    			attr_dev(code20, "class", "svelte-ljrh63");
    			add_location(code20, file, 338, 3, 9962);
    			attr_dev(div42, "class", "description svelte-ljrh63");
    			add_location(div42, file, 335, 2, 9803);
    			attr_dev(div43, "class", "chart svelte-ljrh63");
    			add_location(div43, file, 347, 3, 10144);
    			attr_dev(div44, "class", "chart svelte-ljrh63");
    			add_location(div44, file, 348, 3, 10241);
    			add_location(div45, file, 346, 2, 10134);
    			attr_dev(div46, "class", "block svelte-ljrh63");
    			add_location(div46, file, 334, 1, 9780);
    			add_location(br48, file, 357, 19, 10565);
    			add_location(br49, file, 358, 33, 10604);
    			add_location(br50, file, 359, 23, 10633);
    			attr_dev(code21, "class", "svelte-ljrh63");
    			add_location(code21, file, 356, 3, 10538);
    			add_location(br51, file, 364, 15, 10710);
    			add_location(br52, file, 365, 24, 10740);
    			add_location(br53, file, 366, 25, 10771);
    			attr_dev(code22, "class", "svelte-ljrh63");
    			add_location(code22, file, 363, 3, 10687);
    			add_location(br54, file, 370, 3, 10806);
    			add_location(br55, file, 374, 15, 10867);
    			add_location(br56, file, 375, 24, 10897);
    			add_location(br57, file, 376, 25, 10928);
    			attr_dev(code23, "class", "svelte-ljrh63");
    			add_location(code23, file, 373, 3, 10844);
    			attr_dev(div47, "class", "description svelte-ljrh63");
    			add_location(div47, file, 353, 2, 10379);
    			attr_dev(div48, "class", "chart chart--responsive svelte-ljrh63");
    			add_location(div48, file, 382, 3, 10982);
    			attr_dev(div49, "class", "chart chart--responsive svelte-ljrh63");
    			add_location(div49, file, 383, 3, 11110);
    			add_location(div50, file, 381, 2, 10972);
    			attr_dev(div51, "class", "block svelte-ljrh63");
    			add_location(div51, file, 352, 1, 10356);
    			add_location(br58, file, 392, 54, 11423);
    			attr_dev(code24, "class", "svelte-ljrh63");
    			add_location(code24, file, 391, 3, 11361);
    			attr_dev(div52, "class", "description svelte-ljrh63");
    			add_location(div52, file, 388, 2, 11279);
    			attr_dev(div53, "class", "chart svelte-ljrh63");
    			add_location(div53, file, 398, 3, 11519);
    			attr_dev(div54, "class", "chart svelte-ljrh63");
    			add_location(div54, file, 399, 3, 11595);
    			add_location(div55, file, 397, 2, 11509);
    			attr_dev(div56, "class", "block svelte-ljrh63");
    			add_location(div56, file, 387, 1, 11256);
    			attr_dev(code25, "class", "svelte-ljrh63");
    			add_location(code25, file, 407, 3, 11883);
    			attr_dev(div57, "class", "description svelte-ljrh63");
    			add_location(div57, file, 404, 2, 11712);
    			attr_dev(div58, "class", "chart svelte-ljrh63");
    			add_location(div58, file, 413, 3, 11986);
    			attr_dev(div59, "class", "chart svelte-ljrh63");
    			add_location(div59, file, 414, 3, 12053);
    			add_location(div60, file, 412, 2, 11976);
    			attr_dev(div61, "class", "block svelte-ljrh63");
    			add_location(div61, file, 403, 1, 11689);
    			add_location(br59, file, 423, 41, 12302);
    			add_location(br60, file, 424, 50, 12358);
    			attr_dev(code26, "class", "svelte-ljrh63");
    			add_location(code26, file, 422, 3, 12253);
    			attr_dev(div62, "class", "description svelte-ljrh63");
    			add_location(div62, file, 419, 2, 12175);
    			attr_dev(div63, "class", "chart svelte-ljrh63");
    			add_location(div63, file, 430, 3, 12457);
    			attr_dev(div64, "class", "chart svelte-ljrh63");
    			add_location(div64, file, 431, 3, 12555);
    			attr_dev(div65, "class", "chart svelte-ljrh63");
    			add_location(div65, file, 432, 3, 12653);
    			attr_dev(div66, "class", "chart svelte-ljrh63");
    			add_location(div66, file, 433, 3, 12751);
    			attr_dev(div67, "class", "chart svelte-ljrh63");
    			add_location(div67, file, 434, 3, 12849);
    			attr_dev(div68, "class", "chart svelte-ljrh63");
    			add_location(div68, file, 435, 3, 12947);
    			attr_dev(div69, "class", "chart svelte-ljrh63");
    			add_location(div69, file, 436, 3, 13045);
    			attr_dev(div70, "class", "chart svelte-ljrh63");
    			add_location(div70, file, 437, 3, 13143);
    			add_location(div71, file, 429, 2, 12447);
    			attr_dev(div72, "class", "block svelte-ljrh63");
    			add_location(div72, file, 418, 1, 12152);
    			attr_dev(code27, "class", "svelte-ljrh63");
    			add_location(code27, file, 445, 3, 13401);
    			attr_dev(div73, "class", "description svelte-ljrh63");
    			add_location(div73, file, 442, 2, 13298);
    			attr_dev(div74, "class", "block svelte-ljrh63");
    			add_location(div74, file, 441, 1, 13275);
    			attr_dev(code28, "class", "svelte-ljrh63");
    			add_location(code28, file, 457, 3, 13688);
    			attr_dev(div75, "class", "description svelte-ljrh63");
    			add_location(div75, file, 454, 2, 13593);
    			attr_dev(div76, "class", "block svelte-ljrh63");
    			add_location(div76, file, 453, 1, 13570);
    			add_location(br61, file, 467, 49, 13960);
    			attr_dev(code29, "class", "svelte-ljrh63");
    			add_location(code29, file, 470, 3, 14007);
    			attr_dev(div77, "class", "description svelte-ljrh63");
    			add_location(div77, file, 466, 2, 13884);
    			attr_dev(div78, "class", "block svelte-ljrh63");
    			add_location(div78, file, 465, 1, 13861);
    			add_location(br62, file, 483, 58, 14454);
    			attr_dev(code30, "class", "svelte-ljrh63");
    			add_location(code30, file, 482, 3, 14388);
    			attr_dev(div79, "class", "description svelte-ljrh63");
    			add_location(div79, file, 479, 2, 14242);
    			attr_dev(div80, "class", "chart svelte-ljrh63");
    			add_location(div80, file, 488, 3, 14496);
    			add_location(div81, file, 487, 2, 14486);
    			attr_dev(div82, "class", "block svelte-ljrh63");
    			add_location(div82, file, 478, 1, 14219);
    			add_location(br63, file, 497, 57, 14960);
    			add_location(br64, file, 498, 20, 14986);
    			add_location(br65, file, 499, 30, 15022);
    			add_location(br66, file, 500, 23, 15051);
    			add_location(br67, file, 501, 31, 15088);
    			attr_dev(code31, "class", "svelte-ljrh63");
    			add_location(code31, file, 496, 3, 14895);
    			attr_dev(div83, "class", "description svelte-ljrh63");
    			add_location(div83, file, 493, 2, 14670);
    			attr_dev(div84, "class", "chart svelte-ljrh63");
    			add_location(div84, file, 507, 3, 15161);
    			attr_dev(div85, "class", "chart svelte-ljrh63");
    			add_location(div85, file, 508, 3, 15256);
    			attr_dev(div86, "class", "chart svelte-ljrh63");
    			add_location(div86, file, 509, 3, 15351);
    			attr_dev(div87, "class", "chart svelte-ljrh63");
    			add_location(div87, file, 510, 3, 15446);
    			add_location(div88, file, 506, 2, 15151);
    			attr_dev(div89, "class", "block svelte-ljrh63");
    			add_location(div89, file, 492, 1, 14647);
    			attr_dev(h25, "class", "svelte-ljrh63");
    			add_location(h25, file, 514, 1, 15635);
    			add_location(br68, file, 521, 20, 15880);
    			add_location(br69, file, 522, 45, 15931);
    			add_location(br70, file, 523, 72, 16009);
    			add_location(br71, file, 524, 71, 16086);
    			attr_dev(code32, "class", "well svelte-ljrh63");
    			add_location(code32, file, 520, 3, 15839);
    			attr_dev(p7, "class", "svelte-ljrh63");
    			add_location(p7, file, 528, 3, 16195);
    			attr_dev(span, "data-role", "currency");
    			add_location(span, file, 537, 4, 16771);
    			add_location(div90, file, 530, 3, 16396);
    			add_location(br72, file, 541, 20, 16870);
    			add_location(br73, file, 542, 26, 16902);
    			add_location(br74, file, 543, 39, 16947);
    			add_location(br75, file, 544, 71, 17024);
    			add_location(br76, file, 545, 93, 17123);
    			add_location(br77, file, 546, 68, 17197);
    			add_location(br78, file, 547, 30, 17233);
    			add_location(br79, file, 548, 18, 17257);
    			add_location(br80, file, 549, 38, 17301);
    			add_location(br81, file, 550, 92, 17399);
    			attr_dev(code33, "class", "well svelte-ljrh63");
    			add_location(code33, file, 540, 3, 16829);
    			add_location(br82, file, 554, 3, 17447);
    			attr_dev(p8, "class", "svelte-ljrh63");
    			add_location(p8, file, 556, 3, 17458);
    			add_location(div91, file, 558, 3, 17710);
    			add_location(br83, file, 569, 20, 18080);
    			add_location(br84, file, 570, 26, 18112);
    			add_location(br85, file, 571, 21, 18139);
    			add_location(br86, file, 572, 36, 18181);
    			add_location(br87, file, 573, 34, 18221);
    			add_location(br88, file, 574, 50, 18277);
    			add_location(br89, file, 575, 54, 18337);
    			add_location(br90, file, 576, 73, 18416);
    			add_location(br91, file, 577, 84, 18506);
    			attr_dev(code34, "class", "well svelte-ljrh63");
    			add_location(code34, file, 568, 3, 18039);
    			add_location(br92, file, 581, 3, 18561);
    			add_location(h3, file, 583, 3, 18572);
    			attr_dev(strong2, "class", "svelte-ljrh63");
    			add_location(strong2, file, 586, 4, 18623);
    			attr_dev(strong3, "class", "svelte-ljrh63");
    			add_location(strong3, file, 586, 30, 18649);
    			attr_dev(strong4, "class", "svelte-ljrh63");
    			add_location(strong4, file, 586, 59, 18678);
    			attr_dev(code35, "class", "svelte-ljrh63");
    			add_location(code35, file, 587, 4, 18707);
    			add_location(div92, file, 587, 26, 18729);
    			attr_dev(code36, "class", "svelte-ljrh63");
    			add_location(code36, file, 587, 54, 18757);
    			attr_dev(code37, "class", "svelte-ljrh63");
    			add_location(code37, file, 588, 4, 18837);
    			add_location(div93, file, 588, 25, 18858);
    			attr_dev(code38, "class", "svelte-ljrh63");
    			add_location(code38, file, 588, 57, 18890);
    			attr_dev(code39, "class", "svelte-ljrh63");
    			add_location(code39, file, 589, 4, 18951);
    			add_location(div94, file, 589, 33, 18980);
    			attr_dev(code40, "class", "svelte-ljrh63");
    			add_location(code40, file, 589, 71, 19018);
    			attr_dev(div95, "class", "table svelte-ljrh63");
    			add_location(div95, file, 585, 3, 18598);
    			attr_dev(div96, "class", "description svelte-ljrh63");
    			add_location(div96, file, 517, 2, 15678);
    			attr_dev(div97, "class", "block svelte-ljrh63");
    			add_location(div97, file, 516, 1, 15655);
    			attr_dev(h26, "class", "svelte-ljrh63");
    			add_location(h26, file, 594, 1, 19101);
    			attr_dev(p9, "class", "svelte-ljrh63");
    			add_location(p9, file, 597, 2, 19162);
    			attr_dev(strong5, "class", "svelte-ljrh63");
    			add_location(strong5, file, 600, 3, 19276);
    			attr_dev(strong6, "class", "svelte-ljrh63");
    			add_location(strong6, file, 600, 29, 19302);
    			attr_dev(strong7, "class", "svelte-ljrh63");
    			add_location(strong7, file, 600, 54, 19327);
    			attr_dev(code41, "class", "svelte-ljrh63");
    			add_location(code41, file, 601, 3, 19360);
    			attr_dev(code42, "class", "svelte-ljrh63");
    			add_location(code42, file, 601, 21, 19378);
    			add_location(div98, file, 601, 47, 19404);
    			attr_dev(code43, "class", "svelte-ljrh63");
    			add_location(code43, file, 602, 3, 19490);
    			attr_dev(code44, "class", "svelte-ljrh63");
    			add_location(code44, file, 602, 23, 19510);
    			add_location(div99, file, 602, 39, 19526);
    			attr_dev(code45, "class", "svelte-ljrh63");
    			add_location(code45, file, 603, 3, 19613);
    			attr_dev(code46, "class", "svelte-ljrh63");
    			add_location(code46, file, 603, 23, 19633);
    			add_location(div100, file, 603, 39, 19649);
    			attr_dev(code47, "class", "svelte-ljrh63");
    			add_location(code47, file, 604, 3, 19736);
    			attr_dev(code48, "class", "svelte-ljrh63");
    			add_location(code48, file, 604, 23, 19756);
    			add_location(div101, file, 604, 37, 19770);
    			attr_dev(code49, "class", "svelte-ljrh63");
    			add_location(code49, file, 605, 3, 19843);
    			attr_dev(code50, "class", "svelte-ljrh63");
    			add_location(code50, file, 605, 20, 19860);
    			add_location(div102, file, 605, 34, 19874);
    			attr_dev(code51, "class", "svelte-ljrh63");
    			add_location(code51, file, 606, 3, 19964);
    			attr_dev(code52, "class", "svelte-ljrh63");
    			add_location(code52, file, 606, 23, 19984);
    			add_location(div103, file, 606, 39, 20000);
    			attr_dev(code53, "class", "svelte-ljrh63");
    			add_location(code53, file, 607, 3, 20046);
    			attr_dev(code54, "class", "svelte-ljrh63");
    			add_location(code54, file, 607, 22, 20065);
    			add_location(div104, file, 607, 39, 20082);
    			attr_dev(code55, "class", "svelte-ljrh63");
    			add_location(code55, file, 608, 3, 20127);
    			attr_dev(code56, "class", "svelte-ljrh63");
    			add_location(code56, file, 608, 28, 20152);
    			add_location(div105, file, 608, 43, 20167);
    			attr_dev(code57, "class", "svelte-ljrh63");
    			add_location(code57, file, 609, 3, 20224);
    			attr_dev(code58, "class", "svelte-ljrh63");
    			add_location(code58, file, 609, 21, 20242);
    			add_location(div106, file, 609, 40, 20261);
    			attr_dev(code59, "class", "svelte-ljrh63");
    			add_location(code59, file, 610, 3, 20352);
    			attr_dev(code60, "class", "svelte-ljrh63");
    			add_location(code60, file, 610, 22, 20371);
    			add_location(div107, file, 610, 41, 20390);
    			attr_dev(code61, "class", "svelte-ljrh63");
    			add_location(code61, file, 611, 3, 20487);
    			attr_dev(code62, "class", "svelte-ljrh63");
    			add_location(code62, file, 611, 20, 20504);
    			add_location(div108, file, 611, 35, 20519);
    			attr_dev(code63, "class", "svelte-ljrh63");
    			add_location(code63, file, 612, 3, 20566);
    			attr_dev(code64, "class", "svelte-ljrh63");
    			add_location(code64, file, 612, 21, 20584);
    			add_location(div109, file, 612, 42, 20605);
    			attr_dev(code65, "class", "svelte-ljrh63");
    			add_location(code65, file, 613, 3, 20667);
    			attr_dev(code66, "class", "svelte-ljrh63");
    			add_location(code66, file, 613, 28, 20692);
    			add_location(div110, file, 613, 45, 20709);
    			attr_dev(code67, "class", "svelte-ljrh63");
    			add_location(code67, file, 614, 3, 20774);
    			attr_dev(code68, "class", "svelte-ljrh63");
    			add_location(code68, file, 614, 22, 20793);
    			add_location(div111, file, 614, 40, 20811);
    			attr_dev(code69, "class", "svelte-ljrh63");
    			add_location(code69, file, 615, 3, 20883);
    			attr_dev(code70, "class", "svelte-ljrh63");
    			add_location(code70, file, 615, 27, 20907);
    			add_location(div112, file, 615, 42, 20922);
    			attr_dev(code71, "class", "svelte-ljrh63");
    			add_location(code71, file, 616, 3, 21014);
    			attr_dev(code72, "class", "svelte-ljrh63");
    			add_location(code72, file, 616, 26, 21037);
    			add_location(div113, file, 616, 45, 21056);
    			attr_dev(code73, "class", "svelte-ljrh63");
    			add_location(code73, file, 617, 3, 21117);
    			attr_dev(code74, "class", "svelte-ljrh63");
    			add_location(code74, file, 617, 29, 21143);
    			add_location(div114, file, 617, 51, 21165);
    			attr_dev(code75, "class", "svelte-ljrh63");
    			add_location(code75, file, 618, 3, 21213);
    			attr_dev(code76, "class", "svelte-ljrh63");
    			add_location(code76, file, 618, 29, 21239);
    			add_location(div115, file, 618, 43, 21253);
    			attr_dev(code77, "class", "svelte-ljrh63");
    			add_location(code77, file, 619, 3, 21297);
    			attr_dev(code78, "class", "svelte-ljrh63");
    			add_location(code78, file, 619, 28, 21322);
    			add_location(div116, file, 619, 42, 21336);
    			attr_dev(code79, "class", "svelte-ljrh63");
    			add_location(code79, file, 620, 3, 21382);
    			attr_dev(code80, "class", "svelte-ljrh63");
    			add_location(code80, file, 620, 30, 21409);
    			add_location(div117, file, 620, 50, 21429);
    			attr_dev(code81, "class", "svelte-ljrh63");
    			add_location(code81, file, 621, 3, 21506);
    			attr_dev(code82, "class", "svelte-ljrh63");
    			add_location(code82, file, 621, 25, 21528);
    			add_location(div118, file, 621, 40, 21543);
    			attr_dev(code83, "class", "svelte-ljrh63");
    			add_location(code83, file, 622, 3, 21640);
    			attr_dev(code84, "class", "svelte-ljrh63");
    			add_location(code84, file, 622, 21, 21658);
    			add_location(div119, file, 622, 38, 21675);
    			attr_dev(code85, "class", "svelte-ljrh63");
    			add_location(code85, file, 623, 3, 21744);
    			attr_dev(code86, "class", "svelte-ljrh63");
    			add_location(code86, file, 623, 26, 21767);
    			add_location(div120, file, 623, 44, 21785);
    			attr_dev(code87, "class", "svelte-ljrh63");
    			add_location(code87, file, 624, 3, 21844);
    			attr_dev(code88, "class", "svelte-ljrh63");
    			add_location(code88, file, 624, 25, 21866);
    			add_location(div121, file, 624, 41, 21882);
    			attr_dev(code89, "class", "svelte-ljrh63");
    			add_location(code89, file, 625, 3, 21928);
    			attr_dev(code90, "class", "svelte-ljrh63");
    			add_location(code90, file, 625, 31, 21956);
    			add_location(div122, file, 625, 50, 21975);
    			attr_dev(div123, "class", "table svelte-ljrh63");
    			add_location(div123, file, 599, 2, 19252);
    			attr_dev(div124, "class", "block block--single svelte-ljrh63");
    			add_location(div124, file, 596, 1, 19125);
    			attr_dev(p10, "class", "svelte-ljrh63");
    			add_location(p10, file, 630, 2, 22126);
    			attr_dev(strong8, "class", "svelte-ljrh63");
    			add_location(strong8, file, 633, 3, 22240);
    			attr_dev(strong9, "class", "svelte-ljrh63");
    			add_location(strong9, file, 633, 29, 22266);
    			attr_dev(strong10, "class", "svelte-ljrh63");
    			add_location(strong10, file, 633, 54, 22291);
    			attr_dev(code91, "class", "svelte-ljrh63");
    			add_location(code91, file, 634, 3, 22324);
    			attr_dev(code92, "class", "svelte-ljrh63");
    			add_location(code92, file, 634, 23, 22344);
    			add_location(div125, file, 634, 37, 22358);
    			attr_dev(code93, "class", "svelte-ljrh63");
    			add_location(code93, file, 635, 3, 22425);
    			attr_dev(code94, "class", "svelte-ljrh63");
    			add_location(code94, file, 635, 22, 22444);
    			add_location(div126, file, 635, 46, 22468);
    			attr_dev(div127, "class", "table svelte-ljrh63");
    			add_location(div127, file, 632, 2, 22216);
    			attr_dev(div128, "class", "block block--single svelte-ljrh63");
    			add_location(div128, file, 629, 1, 22089);
    			attr_dev(p11, "class", "svelte-ljrh63");
    			add_location(p11, file, 640, 2, 22599);
    			attr_dev(strong11, "class", "svelte-ljrh63");
    			add_location(strong11, file, 643, 3, 22713);
    			attr_dev(strong12, "class", "svelte-ljrh63");
    			add_location(strong12, file, 643, 29, 22739);
    			attr_dev(strong13, "class", "svelte-ljrh63");
    			add_location(strong13, file, 643, 54, 22764);
    			attr_dev(code95, "class", "svelte-ljrh63");
    			add_location(code95, file, 644, 3, 22797);
    			attr_dev(code96, "class", "svelte-ljrh63");
    			add_location(code96, file, 644, 20, 22814);
    			add_location(div129, file, 644, 34, 22828);
    			attr_dev(code97, "class", "svelte-ljrh63");
    			add_location(code97, file, 645, 3, 22902);
    			attr_dev(code98, "class", "svelte-ljrh63");
    			add_location(code98, file, 645, 22, 22921);
    			add_location(div130, file, 645, 46, 22945);
    			attr_dev(div131, "class", "table svelte-ljrh63");
    			add_location(div131, file, 642, 2, 22689);
    			attr_dev(div132, "class", "block block--single svelte-ljrh63");
    			add_location(div132, file, 639, 1, 22562);
    			attr_dev(a1, "href", "https://github.com/Mitcheljager");
    			attr_dev(a1, "class", "svelte-ljrh63");
    			add_location(a1, file, 650, 10, 23084);
    			attr_dev(div133, "class", "block block--single svelte-ljrh63");
    			add_location(div133, file, 649, 1, 23039);
    			attr_dev(div134, "class", "wrapper svelte-ljrh63");
    			add_location(div134, file, 37, 0, 952);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div134, anchor);
    			append_dev(div134, div0);
    			append_dev(div0, h1);
    			append_dev(h1, t0);
    			append_dev(h1, mark0);
    			append_dev(div0, t2);
    			mount_component(linkedchart0, div0, null);
    			append_dev(div134, t3);
    			append_dev(div134, div1);
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
    			append_dev(div1, t28);
    			append_dev(div1, h21);
    			append_dev(div1, t30);
    			append_dev(div1, p3);
    			append_dev(div1, t32);
    			append_dev(div1, code0);
    			append_dev(code0, t33);
    			append_dev(code0, mark1);
    			append_dev(div1, t35);
    			append_dev(div1, code1);
    			append_dev(code1, t36);
    			append_dev(code1, mark2);
    			append_dev(div1, t38);
    			append_dev(div1, p4);
    			append_dev(div1, t40);
    			append_dev(div1, code2);
    			append_dev(code2, t41);
    			append_dev(code2, mark3);
    			append_dev(code2, t43);
    			append_dev(div1, t44);
    			append_dev(div1, code3);
    			append_dev(code3, t45);
    			append_dev(code3, mark4);
    			append_dev(code3, t47);
    			append_dev(code3, mark5);
    			append_dev(code3, t49);
    			append_dev(code3, mark6);
    			append_dev(code3, t51);
    			append_dev(code3, mark7);
    			append_dev(code3, t53);
    			append_dev(div134, t54);
    			append_dev(div134, div2);
    			append_dev(div2, p5);
    			append_dev(div2, t56);
    			append_dev(div2, code4);
    			append_dev(code4, t57);
    			append_dev(code4, br0);
    			append_dev(code4, t58);
    			append_dev(code4, br1);
    			append_dev(code4, t59);
    			append_dev(code4, br2);
    			append_dev(code4, t60);
    			append_dev(code4, br3);
    			append_dev(code4, t61);
    			append_dev(code4, br4);
    			append_dev(code4, t62);
    			append_dev(code4, br5);
    			append_dev(code4, t63);
    			append_dev(div2, t64);
    			append_dev(div2, code5);
    			append_dev(div2, t66);
    			append_dev(div2, p6);
    			append_dev(div2, t68);
    			append_dev(div2, code6);
    			append_dev(code6, t69);
    			append_dev(code6, br6);
    			append_dev(code6, t70);
    			append_dev(code6, br7);
    			append_dev(code6, t71);
    			append_dev(code6, br8);
    			append_dev(code6, t72);
    			append_dev(code6, br9);
    			append_dev(code6, t73);
    			append_dev(code6, br10);
    			append_dev(code6, t74);
    			append_dev(code6, br11);
    			append_dev(code6, t75);
    			append_dev(div2, t76);
    			append_dev(div2, code7);
    			append_dev(code7, t77);
    			append_dev(code7, br12);
    			append_dev(code7, t78);
    			append_dev(code7, br13);
    			append_dev(code7, t79);
    			append_dev(code7, br14);
    			append_dev(code7, t80);
    			append_dev(code7, br15);
    			append_dev(code7, t81);
    			append_dev(code7, br16);
    			append_dev(code7, t82);
    			append_dev(code7, br17);
    			append_dev(code7, t83);
    			append_dev(div2, t84);
    			append_dev(div2, code8);
    			append_dev(div134, t86);
    			append_dev(div134, h22);
    			append_dev(div134, t88);
    			append_dev(div134, div4);
    			append_dev(div4, div3);
    			append_dev(div3, t89);
    			append_dev(div3, code9);
    			append_dev(div4, t91);
    			mount_component(linkedchart4, div4, null);
    			append_dev(div134, t92);
    			append_dev(div134, div11);
    			append_dev(div11, div5);
    			append_dev(div5, t93);
    			append_dev(div5, code10);
    			append_dev(code10, t94);
    			append_dev(code10, br18);
    			append_dev(code10, t95);
    			append_dev(code10, br19);
    			append_dev(code10, t96);
    			append_dev(code10, br20);
    			append_dev(code10, t97);
    			append_dev(div11, t98);
    			append_dev(div11, div10);
    			append_dev(div10, div6);
    			mount_component(linkedchart5, div6, null);
    			append_dev(div10, t99);
    			append_dev(div10, div7);
    			mount_component(linkedchart6, div7, null);
    			append_dev(div10, t100);
    			append_dev(div10, div8);
    			mount_component(linkedchart7, div8, null);
    			append_dev(div10, t101);
    			append_dev(div10, div9);
    			mount_component(linkedchart8, div9, null);
    			append_dev(div134, t102);
    			append_dev(div134, div16);
    			append_dev(div16, div12);
    			append_dev(div12, t103);
    			append_dev(div12, code11);
    			append_dev(code11, t104);
    			append_dev(code11, br21);
    			append_dev(code11, t105);
    			append_dev(div16, t106);
    			append_dev(div16, div15);
    			append_dev(div15, div13);
    			mount_component(linkedchart9, div13, null);
    			append_dev(div15, t107);
    			append_dev(div15, div14);
    			mount_component(linkedchart10, div14, null);
    			append_dev(div134, t108);
    			append_dev(div134, h23);
    			append_dev(div134, t110);
    			append_dev(div134, div21);
    			append_dev(div21, div17);
    			append_dev(div17, t111);
    			append_dev(div17, code12);
    			append_dev(code12, t112);
    			append_dev(code12, br22);
    			append_dev(code12, t113);
    			append_dev(code12, br23);
    			append_dev(code12, t114);
    			append_dev(code12, br24);
    			append_dev(code12, t115);
    			append_dev(div17, t116);
    			append_dev(div17, br25);
    			append_dev(div17, t117);
    			append_dev(div21, t118);
    			append_dev(div21, div20);
    			mount_component(linkedlabel1, div20, null);
    			append_dev(div20, t119);
    			append_dev(div20, div18);
    			mount_component(linkedchart11, div18, null);
    			append_dev(div20, t120);
    			append_dev(div20, div19);
    			mount_component(linkedchart12, div19, null);
    			append_dev(div134, t121);
    			append_dev(div134, div26);
    			append_dev(div26, div22);
    			append_dev(div22, t122);
    			append_dev(div22, code13);
    			append_dev(div22, t124);
    			append_dev(div22, br26);
    			append_dev(div22, t125);
    			append_dev(div22, code14);
    			append_dev(code14, t126);
    			append_dev(code14, br27);
    			append_dev(code14, t127);
    			append_dev(code14, br28);
    			append_dev(code14, t128);
    			append_dev(code14, br29);
    			append_dev(code14, t129);
    			append_dev(code14, br30);
    			append_dev(code14, t130);
    			append_dev(code14, br31);
    			append_dev(code14, t131);
    			append_dev(div22, t132);
    			append_dev(div22, br32);
    			append_dev(div22, t133);
    			append_dev(div26, t134);
    			append_dev(div26, div25);
    			append_dev(div25, div23);
    			mount_component(linkedchart13, div23, null);
    			append_dev(div25, t135);
    			append_dev(div25, div24);
    			mount_component(linkedchart14, div24, null);
    			append_dev(div134, t136);
    			append_dev(div134, div31);
    			append_dev(div31, div27);
    			append_dev(div27, t137);
    			append_dev(div27, code15);
    			append_dev(div27, t139);
    			append_dev(div27, br33);
    			append_dev(div27, t140);
    			append_dev(div27, code16);
    			append_dev(code16, t141);
    			append_dev(code16, br34);
    			append_dev(code16, t142);
    			append_dev(code16, br35);
    			append_dev(code16, t143);
    			append_dev(code16, br36);
    			append_dev(code16, t144);
    			append_dev(div27, t145);
    			append_dev(div27, br37);
    			append_dev(div27, t146);
    			append_dev(div31, t147);
    			append_dev(div31, div30);
    			append_dev(div30, div28);
    			mount_component(linkedchart15, div28, null);
    			append_dev(div30, t148);
    			append_dev(div30, br38);
    			append_dev(div30, t149);
    			append_dev(div30, div29);
    			mount_component(linkedchart16, div29, null);
    			append_dev(div134, t150);
    			append_dev(div134, div34);
    			append_dev(div34, t151);
    			append_dev(div34, code17);
    			append_dev(code17, t152);
    			append_dev(code17, br39);
    			append_dev(code17, t153);
    			append_dev(code17, br40);
    			append_dev(div34, t154);
    			append_dev(div34, br41);
    			append_dev(div34, t155);
    			append_dev(div34, br42);
    			append_dev(div34, br43);
    			append_dev(div34, t156);
    			append_dev(div34, div32);
    			mount_component(linkedchart17, div32, null);
    			append_dev(div32, t157);
    			append_dev(div32, strong0);
    			mount_component(linkedvalue3, strong0, null);
    			append_dev(div34, t158);
    			append_dev(div34, div33);
    			mount_component(linkedchart18, div33, null);
    			append_dev(div33, t159);
    			append_dev(div33, strong1);
    			mount_component(linkedvalue4, strong1, null);
    			append_dev(div134, t160);
    			append_dev(div134, h24);
    			append_dev(div134, t162);
    			append_dev(div134, div36);
    			append_dev(div36, div35);
    			append_dev(div35, t163);
    			append_dev(div35, code18);
    			append_dev(div36, t165);
    			mount_component(linkedchart19, div36, null);
    			append_dev(div134, t166);
    			append_dev(div134, div41);
    			append_dev(div41, div37);
    			append_dev(div37, t167);
    			append_dev(div37, code19);
    			append_dev(code19, t168);
    			append_dev(code19, br44);
    			append_dev(code19, t169);
    			append_dev(div41, t170);
    			append_dev(div41, div40);
    			append_dev(div40, div38);
    			mount_component(linkedchart20, div38, null);
    			append_dev(div40, t171);
    			append_dev(div40, div39);
    			mount_component(linkedchart21, div39, null);
    			append_dev(div134, t172);
    			append_dev(div134, div46);
    			append_dev(div46, div42);
    			append_dev(div42, t173);
    			append_dev(div42, code20);
    			append_dev(code20, t174);
    			append_dev(code20, br45);
    			append_dev(code20, t175);
    			append_dev(code20, br46);
    			append_dev(code20, t176);
    			append_dev(code20, br47);
    			append_dev(code20, t177);
    			append_dev(div46, t178);
    			append_dev(div46, div45);
    			append_dev(div45, div43);
    			mount_component(linkedchart22, div43, null);
    			append_dev(div45, t179);
    			append_dev(div45, div44);
    			mount_component(linkedchart23, div44, null);
    			append_dev(div134, t180);
    			append_dev(div134, div51);
    			append_dev(div51, div47);
    			append_dev(div47, t181);
    			append_dev(div47, code21);
    			append_dev(code21, t182);
    			append_dev(code21, br48);
    			append_dev(code21, t183);
    			append_dev(code21, br49);
    			append_dev(code21, t184);
    			append_dev(code21, br50);
    			append_dev(code21, t185);
    			append_dev(div47, t186);
    			append_dev(div47, code22);
    			append_dev(code22, t187);
    			append_dev(code22, br51);
    			append_dev(code22, t188);
    			append_dev(code22, br52);
    			append_dev(code22, t189);
    			append_dev(code22, br53);
    			append_dev(code22, t190);
    			append_dev(div47, t191);
    			append_dev(div47, br54);
    			append_dev(div47, t192);
    			append_dev(div47, code23);
    			append_dev(code23, t193);
    			append_dev(code23, br55);
    			append_dev(code23, t194);
    			append_dev(code23, br56);
    			append_dev(code23, t195);
    			append_dev(code23, br57);
    			append_dev(code23, t196);
    			append_dev(div51, t197);
    			append_dev(div51, div50);
    			append_dev(div50, div48);
    			mount_component(linkedchart24, div48, null);
    			append_dev(div50, t198);
    			append_dev(div50, div49);
    			mount_component(linkedchart25, div49, null);
    			append_dev(div134, t199);
    			append_dev(div134, div56);
    			append_dev(div56, div52);
    			append_dev(div52, t200);
    			append_dev(div52, code24);
    			append_dev(code24, t201);
    			append_dev(code24, br58);
    			append_dev(code24, t202);
    			append_dev(div56, t203);
    			append_dev(div56, div55);
    			append_dev(div55, div53);
    			mount_component(linkedchart26, div53, null);
    			append_dev(div55, t204);
    			append_dev(div55, div54);
    			mount_component(linkedchart27, div54, null);
    			append_dev(div134, t205);
    			append_dev(div134, div61);
    			append_dev(div61, div57);
    			append_dev(div57, t206);
    			append_dev(div57, code25);
    			append_dev(div61, t208);
    			append_dev(div61, div60);
    			append_dev(div60, div58);
    			mount_component(linkedchart28, div58, null);
    			append_dev(div60, t209);
    			append_dev(div60, div59);
    			mount_component(linkedchart29, div59, null);
    			append_dev(div134, t210);
    			append_dev(div134, div72);
    			append_dev(div72, div62);
    			append_dev(div62, t211);
    			append_dev(div62, code26);
    			append_dev(code26, t212);
    			append_dev(code26, br59);
    			append_dev(code26, t213);
    			append_dev(code26, br60);
    			append_dev(code26, t214);
    			append_dev(div72, t215);
    			append_dev(div72, div71);
    			append_dev(div71, div63);
    			mount_component(linkedchart30, div63, null);
    			append_dev(div71, t216);
    			append_dev(div71, div64);
    			mount_component(linkedchart31, div64, null);
    			append_dev(div71, t217);
    			append_dev(div71, div65);
    			mount_component(linkedchart32, div65, null);
    			append_dev(div71, t218);
    			append_dev(div71, div66);
    			mount_component(linkedchart33, div66, null);
    			append_dev(div71, t219);
    			append_dev(div71, div67);
    			mount_component(linkedchart34, div67, null);
    			append_dev(div71, t220);
    			append_dev(div71, div68);
    			mount_component(linkedchart35, div68, null);
    			append_dev(div71, t221);
    			append_dev(div71, div69);
    			mount_component(linkedchart36, div69, null);
    			append_dev(div71, t222);
    			append_dev(div71, div70);
    			mount_component(linkedchart37, div70, null);
    			append_dev(div134, t223);
    			append_dev(div134, div74);
    			append_dev(div74, div73);
    			append_dev(div73, t224);
    			append_dev(div73, code27);
    			append_dev(div74, t226);
    			mount_component(linkedchart38, div74, null);
    			append_dev(div134, t227);
    			append_dev(div134, div76);
    			append_dev(div76, div75);
    			append_dev(div75, t228);
    			append_dev(div75, code28);
    			append_dev(div76, t230);
    			mount_component(linkedchart39, div76, null);
    			append_dev(div134, t231);
    			append_dev(div134, div78);
    			append_dev(div78, div77);
    			append_dev(div77, t232);
    			append_dev(div77, br61);
    			append_dev(div77, t233);
    			append_dev(div77, code29);
    			append_dev(div78, t235);
    			mount_component(linkedchart40, div78, null);
    			append_dev(div134, t236);
    			append_dev(div134, div82);
    			append_dev(div82, div79);
    			append_dev(div79, t237);
    			append_dev(div79, code30);
    			append_dev(code30, t238);
    			append_dev(code30, br62);
    			append_dev(div82, t239);
    			append_dev(div82, div81);
    			append_dev(div81, div80);
    			mount_component(linkedchart41, div80, null);
    			append_dev(div134, t240);
    			append_dev(div134, div89);
    			append_dev(div89, div83);
    			append_dev(div83, t241);
    			append_dev(div83, code31);
    			append_dev(code31, t242);
    			append_dev(code31, br63);
    			append_dev(code31, t243);
    			append_dev(code31, br64);
    			append_dev(code31, t244);
    			append_dev(code31, br65);
    			append_dev(code31, t245);
    			append_dev(code31, br66);
    			append_dev(code31, t246);
    			append_dev(code31, br67);
    			append_dev(code31, t247);
    			append_dev(div89, t248);
    			append_dev(div89, div88);
    			append_dev(div88, div84);
    			mount_component(linkedchart42, div84, null);
    			append_dev(div88, t249);
    			append_dev(div88, div85);
    			mount_component(linkedchart43, div85, null);
    			append_dev(div88, t250);
    			append_dev(div88, div86);
    			mount_component(linkedchart44, div86, null);
    			append_dev(div88, t251);
    			append_dev(div88, div87);
    			mount_component(linkedchart45, div87, null);
    			append_dev(div134, t252);
    			append_dev(div134, h25);
    			append_dev(div134, t254);
    			append_dev(div134, div97);
    			append_dev(div97, div96);
    			append_dev(div96, t255);
    			append_dev(div96, code32);
    			append_dev(code32, t256);
    			append_dev(code32, br68);
    			append_dev(code32, t257);
    			append_dev(code32, br69);
    			append_dev(code32, t258);
    			append_dev(code32, br70);
    			append_dev(code32, t259);
    			append_dev(code32, br71);
    			append_dev(code32, t260);
    			append_dev(div96, t261);
    			append_dev(div96, p7);
    			append_dev(div96, t263);
    			append_dev(div96, div90);
    			mount_component(linkedchart46, div90, null);
    			append_dev(div90, t264);
    			append_dev(div90, span);
    			append_dev(div96, t266);
    			append_dev(div96, code33);
    			append_dev(code33, t267);
    			append_dev(code33, br72);
    			append_dev(code33, t268);
    			append_dev(code33, br73);
    			append_dev(code33, t269);
    			append_dev(code33, br74);
    			append_dev(code33, t270);
    			append_dev(code33, br75);
    			append_dev(code33, t271);
    			append_dev(code33, br76);
    			append_dev(code33, t272);
    			append_dev(code33, br77);
    			append_dev(code33, t273);
    			append_dev(code33, br78);
    			append_dev(code33, t274);
    			append_dev(code33, br79);
    			append_dev(code33, t275);
    			append_dev(code33, br80);
    			append_dev(code33, t276);
    			append_dev(code33, br81);
    			append_dev(code33, t277);
    			append_dev(div96, t278);
    			append_dev(div96, br82);
    			append_dev(div96, t279);
    			append_dev(div96, p8);
    			append_dev(div96, t281);
    			append_dev(div96, div91);
    			mount_component(linkedchart47, div91, null);
    			append_dev(div96, t282);
    			append_dev(div96, code34);
    			append_dev(code34, t283);
    			append_dev(code34, br83);
    			append_dev(code34, t284);
    			append_dev(code34, br84);
    			append_dev(code34, t285);
    			append_dev(code34, br85);
    			append_dev(code34, t286);
    			append_dev(code34, br86);
    			append_dev(code34, t287);
    			append_dev(code34, br87);
    			append_dev(code34, t288);
    			append_dev(code34, br88);
    			append_dev(code34, t289);
    			append_dev(code34, br89);
    			append_dev(code34, t290);
    			append_dev(code34, br90);
    			append_dev(code34, t291);
    			append_dev(code34, br91);
    			append_dev(code34, t292);
    			append_dev(div96, t293);
    			append_dev(div96, br92);
    			append_dev(div96, t294);
    			append_dev(div96, h3);
    			append_dev(div96, t296);
    			append_dev(div96, div95);
    			append_dev(div95, strong2);
    			append_dev(div95, t298);
    			append_dev(div95, strong3);
    			append_dev(div95, t300);
    			append_dev(div95, strong4);
    			append_dev(div95, t302);
    			append_dev(div95, code35);
    			append_dev(div95, t304);
    			append_dev(div95, div92);
    			append_dev(div95, t306);
    			append_dev(div95, code36);
    			append_dev(div95, t308);
    			append_dev(div95, code37);
    			append_dev(div95, t310);
    			append_dev(div95, div93);
    			append_dev(div95, t312);
    			append_dev(div95, code38);
    			append_dev(div95, t314);
    			append_dev(div95, code39);
    			append_dev(div95, t316);
    			append_dev(div95, div94);
    			append_dev(div95, t318);
    			append_dev(div95, code40);
    			append_dev(div134, t320);
    			append_dev(div134, h26);
    			append_dev(div134, t322);
    			append_dev(div134, div124);
    			append_dev(div124, p9);
    			append_dev(div124, t324);
    			append_dev(div124, div123);
    			append_dev(div123, strong5);
    			append_dev(div123, t326);
    			append_dev(div123, strong6);
    			append_dev(div123, t328);
    			append_dev(div123, strong7);
    			append_dev(div123, t330);
    			append_dev(div123, code41);
    			append_dev(div123, t332);
    			append_dev(div123, code42);
    			append_dev(div123, t334);
    			append_dev(div123, div98);
    			append_dev(div123, t336);
    			append_dev(div123, code43);
    			append_dev(div123, t338);
    			append_dev(div123, code44);
    			append_dev(div123, t340);
    			append_dev(div123, div99);
    			append_dev(div123, t342);
    			append_dev(div123, code45);
    			append_dev(div123, t344);
    			append_dev(div123, code46);
    			append_dev(div123, t346);
    			append_dev(div123, div100);
    			append_dev(div123, t348);
    			append_dev(div123, code47);
    			append_dev(div123, t350);
    			append_dev(div123, code48);
    			append_dev(div123, t351);
    			append_dev(div123, div101);
    			append_dev(div123, t353);
    			append_dev(div123, code49);
    			append_dev(div123, t355);
    			append_dev(div123, code50);
    			append_dev(div123, t356);
    			append_dev(div123, div102);
    			append_dev(div123, t358);
    			append_dev(div123, code51);
    			append_dev(div123, t360);
    			append_dev(div123, code52);
    			append_dev(div123, t362);
    			append_dev(div123, div103);
    			append_dev(div123, t364);
    			append_dev(div123, code53);
    			append_dev(div123, t366);
    			append_dev(div123, code54);
    			append_dev(div123, t368);
    			append_dev(div123, div104);
    			append_dev(div123, t370);
    			append_dev(div123, code55);
    			append_dev(div123, t372);
    			append_dev(div123, code56);
    			append_dev(div123, t374);
    			append_dev(div123, div105);
    			append_dev(div123, t376);
    			append_dev(div123, code57);
    			append_dev(div123, t378);
    			append_dev(div123, code58);
    			append_dev(div123, t380);
    			append_dev(div123, div106);
    			append_dev(div123, t382);
    			append_dev(div123, code59);
    			append_dev(div123, t384);
    			append_dev(div123, code60);
    			append_dev(div123, t386);
    			append_dev(div123, div107);
    			append_dev(div123, t388);
    			append_dev(div123, code61);
    			append_dev(div123, t390);
    			append_dev(div123, code62);
    			append_dev(div123, t392);
    			append_dev(div123, div108);
    			append_dev(div123, t394);
    			append_dev(div123, code63);
    			append_dev(div123, t396);
    			append_dev(div123, code64);
    			append_dev(div123, t398);
    			append_dev(div123, div109);
    			append_dev(div123, t400);
    			append_dev(div123, code65);
    			append_dev(div123, t402);
    			append_dev(div123, code66);
    			append_dev(div123, t404);
    			append_dev(div123, div110);
    			append_dev(div123, t406);
    			append_dev(div123, code67);
    			append_dev(div123, t408);
    			append_dev(div123, code68);
    			append_dev(div123, t410);
    			append_dev(div123, div111);
    			append_dev(div123, t412);
    			append_dev(div123, code69);
    			append_dev(div123, t414);
    			append_dev(div123, code70);
    			append_dev(div123, t416);
    			append_dev(div123, div112);
    			append_dev(div123, t418);
    			append_dev(div123, code71);
    			append_dev(div123, t420);
    			append_dev(div123, code72);
    			append_dev(div123, t422);
    			append_dev(div123, div113);
    			append_dev(div123, t424);
    			append_dev(div123, code73);
    			append_dev(div123, t426);
    			append_dev(div123, code74);
    			append_dev(div123, t428);
    			append_dev(div123, div114);
    			append_dev(div123, t430);
    			append_dev(div123, code75);
    			append_dev(div123, t432);
    			append_dev(div123, code76);
    			append_dev(div123, t433);
    			append_dev(div123, div115);
    			append_dev(div123, t435);
    			append_dev(div123, code77);
    			append_dev(div123, t437);
    			append_dev(div123, code78);
    			append_dev(div123, t438);
    			append_dev(div123, div116);
    			append_dev(div123, t440);
    			append_dev(div123, code79);
    			append_dev(div123, t442);
    			append_dev(div123, code80);
    			append_dev(div123, t444);
    			append_dev(div123, div117);
    			append_dev(div123, t446);
    			append_dev(div123, code81);
    			append_dev(div123, t448);
    			append_dev(div123, code82);
    			append_dev(div123, t450);
    			append_dev(div123, div118);
    			append_dev(div123, t452);
    			append_dev(div123, code83);
    			append_dev(div123, t454);
    			append_dev(div123, code84);
    			append_dev(div123, t456);
    			append_dev(div123, div119);
    			append_dev(div123, t458);
    			append_dev(div123, code85);
    			append_dev(div123, t460);
    			append_dev(div123, code86);
    			append_dev(div123, t462);
    			append_dev(div123, div120);
    			append_dev(div123, t464);
    			append_dev(div123, code87);
    			append_dev(div123, t466);
    			append_dev(div123, code88);
    			append_dev(div123, t468);
    			append_dev(div123, div121);
    			append_dev(div123, t470);
    			append_dev(div123, code89);
    			append_dev(div123, t472);
    			append_dev(div123, code90);
    			append_dev(div123, t474);
    			append_dev(div123, div122);
    			append_dev(div134, t476);
    			append_dev(div134, div128);
    			append_dev(div128, p10);
    			append_dev(div128, t478);
    			append_dev(div128, div127);
    			append_dev(div127, strong8);
    			append_dev(div127, t480);
    			append_dev(div127, strong9);
    			append_dev(div127, t482);
    			append_dev(div127, strong10);
    			append_dev(div127, t484);
    			append_dev(div127, code91);
    			append_dev(div127, t486);
    			append_dev(div127, code92);
    			append_dev(div127, t487);
    			append_dev(div127, div125);
    			append_dev(div127, t489);
    			append_dev(div127, code93);
    			append_dev(div127, t491);
    			append_dev(div127, code94);
    			append_dev(div127, t493);
    			append_dev(div127, div126);
    			append_dev(div134, t495);
    			append_dev(div134, div132);
    			append_dev(div132, p11);
    			append_dev(div132, t497);
    			append_dev(div132, div131);
    			append_dev(div131, strong11);
    			append_dev(div131, t499);
    			append_dev(div131, strong12);
    			append_dev(div131, t501);
    			append_dev(div131, strong13);
    			append_dev(div131, t503);
    			append_dev(div131, code95);
    			append_dev(div131, t505);
    			append_dev(div131, code96);
    			append_dev(div131, t506);
    			append_dev(div131, div129);
    			append_dev(div131, t508);
    			append_dev(div131, code97);
    			append_dev(div131, t510);
    			append_dev(div131, code98);
    			append_dev(div131, t512);
    			append_dev(div131, div130);
    			append_dev(div134, t514);
    			append_dev(div134, div133);
    			append_dev(div133, t515);
    			append_dev(div133, a1);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const linkedchart40_changes = {};
    			if (dirty & /*transitioningData*/ 1) linkedchart40_changes.data = /*transitioningData*/ ctx[0];
    			if (dirty & /*transitionColor*/ 2) linkedchart40_changes.fill = "hsl(" + /*transitionColor*/ ctx[1] + ", 60%, 50%)";
    			linkedchart40.$set(linkedchart40_changes);
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
    			transition_in(linkedchart5.$$.fragment, local);
    			transition_in(linkedchart6.$$.fragment, local);
    			transition_in(linkedchart7.$$.fragment, local);
    			transition_in(linkedchart8.$$.fragment, local);
    			transition_in(linkedchart9.$$.fragment, local);
    			transition_in(linkedchart10.$$.fragment, local);
    			transition_in(linkedlabel1.$$.fragment, local);
    			transition_in(linkedchart11.$$.fragment, local);
    			transition_in(linkedchart12.$$.fragment, local);
    			transition_in(linkedchart13.$$.fragment, local);
    			transition_in(linkedchart14.$$.fragment, local);
    			transition_in(linkedchart15.$$.fragment, local);
    			transition_in(linkedchart16.$$.fragment, local);
    			transition_in(linkedchart17.$$.fragment, local);
    			transition_in(linkedvalue3.$$.fragment, local);
    			transition_in(linkedchart18.$$.fragment, local);
    			transition_in(linkedvalue4.$$.fragment, local);
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
    			transition_out(linkedchart5.$$.fragment, local);
    			transition_out(linkedchart6.$$.fragment, local);
    			transition_out(linkedchart7.$$.fragment, local);
    			transition_out(linkedchart8.$$.fragment, local);
    			transition_out(linkedchart9.$$.fragment, local);
    			transition_out(linkedchart10.$$.fragment, local);
    			transition_out(linkedlabel1.$$.fragment, local);
    			transition_out(linkedchart11.$$.fragment, local);
    			transition_out(linkedchart12.$$.fragment, local);
    			transition_out(linkedchart13.$$.fragment, local);
    			transition_out(linkedchart14.$$.fragment, local);
    			transition_out(linkedchart15.$$.fragment, local);
    			transition_out(linkedchart16.$$.fragment, local);
    			transition_out(linkedchart17.$$.fragment, local);
    			transition_out(linkedvalue3.$$.fragment, local);
    			transition_out(linkedchart18.$$.fragment, local);
    			transition_out(linkedvalue4.$$.fragment, local);
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
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div134);
    			destroy_component(linkedchart0);
    			destroy_component(linkedlabel0);
    			destroy_component(linkedchart1);
    			destroy_component(linkedvalue0);
    			destroy_component(linkedchart2);
    			destroy_component(linkedvalue1);
    			destroy_component(linkedchart3);
    			destroy_component(linkedvalue2);
    			destroy_component(linkedchart4);
    			destroy_component(linkedchart5);
    			destroy_component(linkedchart6);
    			destroy_component(linkedchart7);
    			destroy_component(linkedchart8);
    			destroy_component(linkedchart9);
    			destroy_component(linkedchart10);
    			destroy_component(linkedlabel1);
    			destroy_component(linkedchart11);
    			destroy_component(linkedchart12);
    			destroy_component(linkedchart13);
    			destroy_component(linkedchart14);
    			destroy_component(linkedchart15);
    			destroy_component(linkedchart16);
    			destroy_component(linkedchart17);
    			destroy_component(linkedvalue3);
    			destroy_component(linkedchart18);
    			destroy_component(linkedvalue4);
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
    	const date = new Date("2005-05-01T00:00:00Z");

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

})();
//# sourceMappingURL=bundle.js.map
