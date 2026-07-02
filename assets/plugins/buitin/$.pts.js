
/**
 * @typedef {Object} __TAsynctify
 * @property {Function} [set]
 * @property {Function} [get]
 */

/**
 * @template __TInterfaces_
 * @typedef {Object} _$IOption
 * @property {boolean} [is_dict_mode]
 * @property {Function} [key_getter]
 * @property {boolean} [is_eventify]
 * @property {__TAsynctify} [asynctify]
 * @property {boolean} [is_ambiguous]
 */


/**
{
    func: TFunc<_TArgs, _TReturn>;
    priority?: number;
    binder: _TBinder;
    args?: _TArgs;

}
*/

const _$max = Symbol.for('_$max');
const _$count = Symbol.for('_$count');
const _$storage = Symbol.for('_$table');

const _II_1 = '.';
const _II_2 = '/';

function cache() {
    const _ = Object.create(null);

    _[_II_1] = 1;
    _[_II_2] = 1;

    delete _[_II_1];
    delete _[_II_2];

    return _
}

function eventify(_$target, is_asign_emitter = true, is_prototype_mode = false) {
    if (_$target === undefined || typeof _$target === 'boolean') {
        const assign_emitter = _$target !== false;
        const proto_mode = is_asign_emitter === true;
        return (target) => eventify(target, assign_emitter, proto_mode);
    }

    // Decorator support
    if (typeof _$target === 'function' && _$target.prototype) {
        eventify(_$target.prototype, is_asign_emitter, true);
        return _$target;
    }

    let _$table;
    if (!is_prototype_mode) {
        _$table = cache();
        _$target[_$storage] = _$table;
    }

    const getTable = function(ctx) {
        if (is_prototype_mode) {
            let table = ctx[_$storage];
            if (!table) {
                table = cache();
                ctx[_$storage] = table;
            }
            return table;
        }
        return _$table;
    }

    const _$binder = function(_func, max = 0) {
        return typeof _func == 'function' 
            ? { func: _func, priority: 0, binder: null, args: [], [_$max]: max, [_$count]: 0 }
            : typeof _func == 'object'
                ? { func: _func.func, priority: _func.priority || 0, binder: _func.binder || null, args: _func.args || [],  [_$max]: max, [_$count]: 0 }
                : null
    }

    _$target.on = function(key, ...opt) {
        const table = getTable(this);
        let list = table[key];
        if (!list) {
            list = { head: null, tail: null, index: new Map() };
            table[key] = list;
        }

        for(const _func of opt) {
            const _out = _$binder(_func);
            if(!_out) continue;

            let _map = list.index.get(_out.func);
            if (!_map) {
                _map = new Map();
                list.index.set(_out.func, _map);
            }

            if (_map.has(_out.binder)) continue;

            const _node = { handler: _out, prev: null, next: null };
            if (!list.head) {
                list.head = _node;
                list.tail = _node;
            } else {
                list.tail.next = _node;
                _node.prev = list.tail;
                list.tail = _node;
            }
            _map.set(_out.binder, _node);
        }
    }

    _$target.once = function(key, ...opt) {
        const table = getTable(this);
        let list = table[key];
        if (!list) {
            list = { head: null, tail: null, index: new Map() };
            table[key] = list;
        }

        for(const _func of opt) {
            const _out = _$binder(_func, 1);
            if(!_out) continue;

            let map = list.index.get(_out.func);
            if (!map) {
                map = new Map();
                list.index.set(_out.func, map);
            }

            if (map.has(_out.binder)) continue;

            const node = { handler: _out, prev: null, next: null };
            if (!list.head) {
                list.head = node;
                list.tail = node;
            } else {
                list.tail.next = node;
                node.prev = list.tail;
                list.tail = node;
            }
            map.set(_out.binder, node);
        }
    }

    _$target.off = function(key, ...opt) {
        const table = getTable(this);
        const list = table[key];
        if (!list) return;

        for(const _func of opt) {
            const _out = typeof _func == 'function' 
                ? { f: _func, b: null } 
                : typeof _func == 'object' 
                    ? { f: _func.func, b: _func.binder || null } 
                    : null;
            if(!_out) continue;

            const map = list.index.get(_out.f);
            if (!map) continue;

            const node = map.get(_out.b);
            if (!node) continue;

            // Remove from DLL
            if (node.prev) {
                node.prev.next = node.next;
            } else {
                list.head = node.next;
            }
            if (node.next) {
                node.next.prev = node.prev;
            } else {
                list.tail = node.prev;
            }

            // Remove from index
            map.delete(_out.b);
            if (map.size === 0) {
                list.index.delete(_out.f);
            }
        }
    }

    _$target.clear = function(key) {
        const table = getTable(this);
        delete table[key];
    }

    const _$emit = function(key, ...params) {
        const table = getTable(this);
        const _list = table[key];
        if (!_list) return [];

        const results = [];
        let _curr = _list.head;
        while (_curr) {
            const handler = _curr.handler;
            const next = _curr.next;
            const _args = handler.args;

            const res = handler.binder
                ? handler.func.call(handler.binder, ..._args, ...params)
                : handler.func(..._args, ...params);

            results.push(res);

            if(handler[_$max] > 0) {
                handler[_$count]++;
                if (handler[_$count] >= handler[_$max]) {
                    // Remove from DLL
                    if (_curr.prev) {
                        _curr.prev.next = _curr.next;
                    } else {
                        _list.head = _curr.next;
                    }
                    if (_curr.next) {
                        _curr.next.prev = _curr.prev;
                    } else {
                        _list.tail = _curr.prev;
                    }

                    // Remove from index
                    const _map = _list.index.get(handler.func);
                    if (_map) {
                        _map.delete(handler.binder);
                        if (_map.size === 0) {
                            _list.index.delete(handler.func);
                        }
                    }
                }
            }
            _curr = next;
        }
        return results;
    }

    is_asign_emitter && (_$target.emit = _$emit);

    return is_prototype_mode ? _$target : _$emit;
}

/**
 * @template _IInterfaces
 * @param {_$IOption<_IInterfaces>} [opt]
 * @returns {any}
 */


globalThis['pTS'] = globalThis['pTS'] || {}
globalThis['pTS']['$'] = globalThis['pTS']['$'] || {}

globalThis['pTS']['$'] = {
    eventify, cache
}
