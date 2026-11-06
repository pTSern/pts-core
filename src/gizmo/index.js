'use strict';

/**
 * index.js (pTS-Gizmo Subsystem)
 * Scene-side exports for Cocos Creator 3.8.8 Editor Gizmo framework.
 */

const { GizmoRegistry, EditorGizmoBase, GizmoDraw, GizmoHandle, GizmoLineHandle, GIZMO_DECORATOR_KEY } = require('./GizmoRegistry');
const GizmoDefines = require('./GizmoDefines');
const SvgGizmo = require('./SvgGizmo');

module.exports = {
    GizmoRegistry,
    EditorGizmoBase,
    GizmoDraw,
    GizmoHandle,
    GizmoLineHandle,
    SvgGizmo,
    GizmoDefines,
    GIZMO_DECORATOR_KEY,
};
