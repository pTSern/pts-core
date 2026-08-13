const _pT$ = globalThis["pTS"] || {},
    _$ = _pT$["$"];
if (_$) {
    function _replican(opt = undefined) {
        const _ = opt && opt.is_dict_mode ? _$.cache() : Object.create(null),
            _container = new Map();

        const isAsync = !!(opt && opt.asynctify);
        const isEventify = !!(opt && opt.is_eventify);
        const keyGetter = (opt && typeof opt.key_getter === "function") ? opt.key_getter : null;
        const _emit = isEventify ? _$.eventify(_, false, false) : null;

        function _sone(rawKey, value) {
            const _key = keyGetter ? keyGetter(rawKey) : rawKey;
            const _old = isEventify ? _container.get(_key) : undefined;
            let _out;
            if (isAsync) {
                _out = opt.asynctify.set(_key, value, _container);
            } else {
                _container.set(_key, value);
            }
            if (isEventify) {
                _emit("set", _key, value, _old);
            }
            return _out;
        }

        _.set = function (...args) {
            if (args.length === 0) return;
            if (args.length === 2 && typeof args[0] === "string") {
                return _sone(args[0], args[1]);
            }
            if (args.length % 2 !== 0) {
                console.error("[pTS.bridge] set expected key-value pairs (even argument count), got:", args.length);
            }
            const _promises = isAsync ? [] : null;
            for (let i = 0; i < args.length - 1; i += 2) {
                const res = _sone(args[i], args[i + 1]);
                if (isAsync && res && typeof res.then === "function") {
                    _promises.push(res);
                }
            }
            return isAsync ? Promise.all(_promises) : undefined;
        };

        function _aone(rawKey, value) {
            const _key = keyGetter ? keyGetter(rawKey) : rawKey;
            const _old = isEventify ? _container.get(_key) : undefined;
            let _out;
            if (isAsync) {
                const _fn = (opt.asynctify && typeof opt.asynctify.add === "function") ? opt.asynctify.add : opt.asynctify.set;
                _out = _fn(_key, value, _container);
            } else {
                const _cur = _container.get(_key);
                if (typeof value === "number") {
                    _container.set(_key, (typeof _cur === "number" ? _cur : 0) + value);
                } else if (typeof value === "function") {
                    _container.set(_key, value(_container));
                } else {
                    _container.set(_key, value);
                }
            }
            if (isEventify) {
                _emit("add", _key, value, _old);
                if (isAsync && _out && typeof _out.then === "function") {
                    _out.then((_res) => {
                        const _new = _res !== undefined ? _res : _container.get(_key);
                        _emit("set", _key, _new, _old);
                    });
                } else {
                    const _new = _container.get(_key);
                    _emit("set", _key, _new, _old);
                }
            }
            return _out;
        }

        _.add = function (...args) {
            if (args.length === 0) return;
            if (args.length === 2 && typeof args[0] === "string") {
                return _aone(args[0], args[1]);
            }
            if (args.length % 2 !== 0) {
                console.error("[pTS.bridge] add expected key-value pairs (even argument count), got:", args.length);
            }
            const _promises = isAsync ? [] : null;
            for (let i = 0; i < args.length - 1; i += 2) {
                const res = _aone(args[i], args[i + 1]);
                if (isAsync && res && typeof res.then === "function") {
                    _promises.push(res);
                }
            }
            return isAsync ? Promise.all(_promises) : undefined;
        };


        function _getOneSync(rawKey, creator) {
            const _key = keyGetter ? keyGetter(rawKey) : rawKey;
            let _out = _container.get(_key);
            if (_out == null && typeof creator === "function") {
                _out = creator(_container, _key);
                if (_out != null) {
                    const _old = isEventify ? _container.get(_key) : undefined;
                    _container.set(_key, _out);
                    if (isEventify) {
                        _emit("set", _key, _out, _old);
                    }
                }
            } else if (isEventify && _out != null) {
                _emit("get", _key, _out);
            }
            return _out;
        }

        async function _getOneAsync(rawKey, creator) {
            const _key = keyGetter ? keyGetter(rawKey) : rawKey;
            let _data = await opt.asynctify.get(_key, _container);
            if (_data == null && typeof creator === "function") {
                const _old = isEventify ? _container.get(_key) : undefined;
                _data = creator(_container, _key);
                if (_data != null) {
                    const res = opt.asynctify.set(_key, _data, _container);
                    if (res && typeof res.then === "function") await res;
                    if (isEventify) {
                        _emit("set", _key, _data, _old);
                    }
                }
            }
            if (isEventify && _data != null) {
                _emit("get", _key, _data);
            }
            return _data;
        }

        function _getBulk(keysList) {
            if (isAsync) {
                return (async () => {
                    const res = Object.create(null);
                    const promises = keysList.map(async (k) => {
                        res[k] = await _getOneAsync(k, undefined);
                    });
                    await Promise.all(promises);
                    return res;
                })();
            } else {
                const res = Object.create(null);
                for (let i = 0; i < keysList.length; i++) {
                    const k = keysList[i];
                    res[k] = _getOneSync(k, undefined);
                }
                return res;
            }
        }

        _.get = function (what, creator) {
            if (Array.isArray(what) || arguments.length > 2 || (arguments.length === 2 && typeof creator === "string")) {
                const keysList = Array.isArray(what) ? what : Array.from(arguments);
                return _getBulk(keysList);
            }
            return isAsync ? _getOneAsync(what, creator) : _getOneSync(what, creator);
        };

        return _;
    }
    const _ = _replican({ is_dict_mode: true, is_eventify: true });
    _.replican = _replican;
    _pT$["bridge"] = _;
}
