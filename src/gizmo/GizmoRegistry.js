'use strict';

/**
 * GizmoRegistry.js
 * Central registry bridging user components to Cocos Creator 3.8.8 `cce.Gizmo._gizmoPool`.
 */

const EditorGizmoBase = require('./EditorGizmoBase');
const GizmoDraw = require('./GizmoDraw');
const GizmoHandle = require('./GizmoHandle');
const GizmoLineHandle = require('./GizmoLineHandle');

const GIZMO_DECORATOR_KEY = Symbol.for('__pts_gizmo__');

class GizmoRegistry {
    constructor() {
        this._registry = new Map(); // compName -> { gizmoCtor, tier }
        this._initialized = false;
    }

    init() {
        if (this._initialized) return;
        this._initialized = true;

        try {
            this._applyAllToEnginePool();
            this._hookEngineEvents();
            this.scanDecorators();
            console.log('[pTS-Gizmo] GizmoRegistry initialized successfully');
        } catch (err) {
            console.error('[pTS-Gizmo] Error initializing GizmoRegistry:', err);
        }
    }

    _applyAllToEnginePool() {
        if (typeof cce === 'undefined' || !cce.Gizmo || !cce.Gizmo._gizmoPool) {
            return;
        }

        for (const [compName, entry] of this._registry.entries()) {
            this._injectIntoPool(compName, entry.gizmoCtor, entry.tier);
        }
    }

    _injectIntoPool(compName, gizmoCtor, tier = 'component') {
        try {
            if (typeof cce === 'undefined' || !cce.Gizmo || !cce.Gizmo._gizmoPool) {
                return false;
            }

            const poolData = cce.Gizmo._gizmoPool._getPool(tier);
            if (poolData && poolData.typeDefs) {
                poolData.typeDefs[compName] = gizmoCtor;
                return true;
            }
        } catch (err) {
            console.error(`[pTS-Gizmo] Failed to inject gizmo for "${compName}" into pool:`, err);
        }
        return false;
    }

    _removeFromPool(compName, tier = 'component') {
        try {
            if (typeof cce === 'undefined' || !cce.Gizmo || !cce.Gizmo._gizmoPool) {
                return;
            }

            const poolData = cce.Gizmo._gizmoPool._getPool(tier);
            if (poolData && poolData.typeDefs) {
                delete poolData.typeDefs[compName];
            }
        } catch (err) {
            console.error(`[pTS-Gizmo] Failed to remove gizmo for "${compName}" from pool:`, err);
        }
    }

    _hookEngineEvents() {
        try {
            if (typeof cce !== 'undefined' && cce.Gizmo) {
                cce.Gizmo.on('init', () => {
                    this._applyAllToEnginePool();
                });
            }
        } catch (err) {
            console.error('[pTS-Gizmo] Failed to hook engine gizmo events:', err);
        }
    }

    register(componentTypeOrName, gizmoCtor, tier = 'component') {
        try {
            let compName = '';
            if (typeof componentTypeOrName === 'string') {
                compName = componentTypeOrName;
            } else if (typeof componentTypeOrName === 'function') {
                compName = (typeof cc !== 'undefined' && cc.js && cc.js.getClassName(componentTypeOrName))
                    || componentTypeOrName.name;
            }

            if (!compName) {
                console.error('[pTS-Gizmo] Cannot register gizmo: invalid component type', componentTypeOrName);
                return false;
            }

            if (!gizmoCtor) {
                console.error(`[pTS-Gizmo] Cannot register gizmo for "${compName}": gizmo constructor is null`);
                return false;
            }

            this._registry.set(compName, { gizmoCtor, tier });
            this._injectIntoPool(compName, gizmoCtor, tier);
            console.log(`[pTS-Gizmo] Registered ${tier} gizmo for: "${compName}"`);
            return true;
        } catch (err) {
            console.error('[pTS-Gizmo.register] Error:', err);
            return false;
        }
    }

    unregister(componentTypeOrName, tier = 'component') {
        try {
            let compName = '';
            if (typeof componentTypeOrName === 'string') {
                compName = componentTypeOrName;
            } else if (typeof componentTypeOrName === 'function') {
                compName = (typeof cc !== 'undefined' && cc.js && cc.js.getClassName(componentTypeOrName))
                    || componentTypeOrName.name;
            }

            if (!compName) return false;

            this._registry.delete(compName);
            this._removeFromPool(compName, tier);
            console.log(`[pTS-Gizmo] Unregistered gizmo for: "${compName}"`);
            return true;
        } catch (err) {
            console.error('[pTS-Gizmo.unregister] Error:', err);
            return false;
        }
    }

    get(componentTypeOrName) {
        let compName = typeof componentTypeOrName === 'string'
            ? componentTypeOrName
            : (cc.js && cc.js.getClassName(componentTypeOrName)) || componentTypeOrName.name;
        return this._registry.get(compName) || null;
    }

    list() {
        return Array.from(this._registry.keys());
    }

    scanDecorators() {
        try {
            if (typeof cc === 'undefined' || !cc.js) return;

            // cc.js._nameToClass holds registered @ccclass constructors
            const nameToClass = cc.js._nameToClass || {};
            for (const [name, cls] of Object.entries(nameToClass)) {
                if (!cls) continue;
                const meta = cls[GIZMO_DECORATOR_KEY] || cls.__pts_gizmo__;
                if (meta && meta.gizmoCtor) {
                    this.register(name, meta.gizmoCtor, meta.tier || 'component');
                }
            }
        } catch (err) {
            console.error('[pTS-Gizmo.scanDecorators] Error scanning decorators:', err);
        }
    }
}

const registryInstance = new GizmoRegistry();

module.exports = {
    GizmoRegistry: registryInstance,
    EditorGizmoBase,
    GizmoDraw,
    GizmoHandle,
    GizmoLineHandle,
    GIZMO_DECORATOR_KEY,
};
