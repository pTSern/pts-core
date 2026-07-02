
const _pT$ = globalThis['pTS'] || {}
const _$ = _pT$['$']

if(_$) {
    /**
     * @template _IInterfaces
     * @param {_$IOption<_IInterfaces>} [opt]
     * @returns {any}
     */
    function _replican(opt = undefined) {
        const _ = ( opt && opt.is_dict_mode ) ? _$.cache() : Object.create(null);
    
        const _container = new Map();
    
        if(opt && opt.is_eventify) {
            const _$emiter = _$.eventify(_, false, false);

            if (opt && opt.asynctify) {
    
                if(typeof opt.key_getter === 'function') {
                    _.set = function(what, value) {
                        const _key = opt.key_getter(what);
                        const _out = opt.asynctify.set(_key, value, _container);
                        _$emiter('set', _key, value);
                        return _out;
                    };
    
                    _.get = async function(what, creator) {
                        const _key = opt.key_getter(what);
                        let _data = await opt.asynctify.get(_key, _container);
    
                        if(typeof _data == 'undefined' && typeof creator == 'function') {
                            _data = creator(_container, _key);
    
                            _.set(_key, _data);
                        }
                        _$emiter('get', _key, _data)
                        return _data;
                    }
    
                } else {
                    _.set = function(what, value) {
                        const _out = opt.asynctify.set(what, value, _container);
                        _$emiter('set', what, _data)
                        return _out;
                    };
    
                    _.get = async function(what, creator) {
                        let _data = await opt.asynctify.get(what, _container);
    
                        if(typeof _data == 'undefined' && typeof creator == 'function') {
                            _data = creator(_container, what);
    
                            _.set(what, _data);
                        }
                        _$emiter('get', what, _data);
                        return _data;
                    }
                }
    
                return _;
            }

            _.set = function(what, value) {
                _container.set(what, value);
                _$emiter('set', what, value);
            }
    
            _.get = function(what, creator = undefined) {
                let _out = _container.get(what);
                if(typeof _out == 'undefined' && typeof creator == 'function') {
                    _out = creator(_container, what);
                    _container.set(what, _out);
                }
                _$emiter('set', what, _out);
                return _out;
            }

            return _
        }
    
        if (opt && opt.asynctify) {
    
            if(typeof opt.key_getter === 'function') {
                _.set = function(what, value) {
                    const key = opt.key_getter(what);
                    return opt.asynctify.set(key, value, _container);
                };
    
                _.get = async function(what, creator) {
                    const _key = opt.key_getter(what);
                    let _data = await opt.asynctify.get(_key, _container);
    
                    if(typeof _data == 'undefined' && typeof creator == 'function') {
                        _data = creator(_container, _key);
    
                        _.set(_key, _data);
                    }
                    return _data;
                }
    
            } else {
                _.set = function(what, value) {
                    return opt.asynctify.set(what, value, _container);
                };
    
                _.get = async function(what, creator) {
                    let _data = await opt.asynctify.get(what, _container);
    
                    if(typeof _data == 'undefined' && typeof creator == 'function') {
                        _data = creator(_container, what);
    
                        _.set(what, _data);
                    }
                    return _data;
                }
            }
    
            return _;
        }
    
        if(opt && opt.key_getter && typeof opt.key_getter === 'function') {
            _.set = function(what, value) {
                const _key = opt.key_getter(what);
                _container.set(_key, value);
            }
    
            _.get = function(what, creator = undefined) {
                const _key = opt.key_getter(what);
                let _out = _container.get(_key);
                if(!_out && creator) {
                    _out = creator(_container, _key);
                    _container.set(_key, _out);
                }
                return _out;
            }
    
            return _;
        }
    
        _.set = function(what, value) {
            _container.set(what, value);
        }
    
        _.get = function(what, creator = undefined) {
            let _out = _container.get(what);
            if(typeof _out == 'undefined' && typeof creator == 'function') {
                _out = creator(_container, what);
                _container.set(what, _out);
            }
            return _out;
        }
    
        return _
    }
    
    const _ = _replican({ is_dict_mode: true, is_eventify: true });
    _.replican = _replican;
    
    _pT$['bridge'] = _;

}
