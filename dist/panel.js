"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.close = exports.ready = exports.$ = exports.style = exports.template = void 0;
const EXTENSION_NAME = 'pts-core';
exports.template = `
<div class="panel-container">
    <div class="panel-header">
        <div class="header-title">pTS Core Settings</div>
        <div class="header-desc">Configuration and compile-time verification options</div>
    </div>

    <div class="form-container">
        <ui-section expand>
            <ui-label slot="header">Validation & Type Checking</ui-label>
            <ui-prop>
                <ui-label slot="label" tooltip="When enabled, @implement checks that the target class actually implements all contract properties and methods. If missing, it displays a warning dialog in editor. Default: true.">Implement Check</ui-label>
                <ui-checkbox slot="content" class="implement-check"></ui-checkbox>
            </ui-prop>
        </ui-section>
    </div>

    <div class="status-bar">
        <span class="status-text">Ready</span>
    </div>
</div>
`;
exports.style = `
:host {
    display: block;
    padding: 14px;
    height: 100%;
    box-sizing: border-box;
    overflow-y: auto;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    color: var(--color-normal-text, #ddd);
}

.panel-container {
    display: flex;
    flex-direction: column;
    gap: 14px;
    min-height: 100%;
}

.panel-header {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--color-normal-border, #444);
}

.header-title {
    font-size: 16px;
    font-weight: bold;
    color: #409eff;
}

.header-desc {
    font-size: 12px;
    opacity: 0.75;
}

.form-container {
    display: flex;
    flex-direction: column;
    gap: 14px;
}

ui-section {
    margin-bottom: 8px;
}

.status-bar {
    margin-top: auto;
    padding-top: 10px;
    border-top: 1px solid var(--color-normal-border, #333);
    font-size: 11px;
    opacity: 0.7;
}
`;
exports.$ = {
    implementCheck: '.implement-check',
    statusText: '.status-text',
};
let activePanel = null;
async function updateUIValues(panel) {
    try {
        const profile = await Editor.Profile.getProject(EXTENSION_NAME) || {};
        const implementCheck = typeof profile.implement_check === 'boolean' ? profile.implement_check : true;
        if (panel.$.implementCheck) {
            panel.$.implementCheck.value = implementCheck;
        }
        if (panel.$.statusText) {
            panel.$.statusText.textContent = `Implement Check: ${implementCheck ? 'Enabled' : 'Disabled'}`;
        }
    }
    catch (e) {
        console.error('[pts-core] Error updating UI values:', e);
    }
}
const onWindowFocus = () => {
    if (activePanel) {
        updateUIValues(activePanel);
    }
};
const ready = async function () {
    var _a;
    activePanel = this;
    await updateUIValues(this);
    window.addEventListener('focus', onWindowFocus);
    (_a = this.$.implementCheck) === null || _a === void 0 ? void 0 : _a.addEventListener('change', async () => {
        const val = !!this.$.implementCheck.value;
        await Editor.Profile.setProject(EXTENSION_NAME, 'implement_check', val);
        globalThis.__pTS_implement_check__ = val;
        await Editor.Message.send(EXTENSION_NAME, 'profile::project::changed_implement_check', 'implement_check', val);
        if (this.$.statusText) {
            this.$.statusText.textContent = `Implement Check: ${val ? 'Enabled' : 'Disabled'}`;
        }
    });
};
exports.ready = ready;
const close = function () {
    window.removeEventListener('focus', onWindowFocus);
    activePanel = null;
};
exports.close = close;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFuZWwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zb3VyY2UvcGFuZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBRUEsTUFBTSxjQUFjLEdBQUcsVUFBVSxDQUFDO0FBRXJCLFFBQUEsUUFBUSxHQUFHOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Q0FxQnZCLENBQUM7QUFFVyxRQUFBLEtBQUssR0FBRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0NBc0RwQixDQUFDO0FBRVcsUUFBQSxDQUFDLEdBQUc7SUFDYixjQUFjLEVBQUUsa0JBQWtCO0lBQ2xDLFVBQVUsRUFBRSxjQUFjO0NBQzdCLENBQUM7QUFFRixJQUFJLFdBQVcsR0FBUSxJQUFJLENBQUM7QUFFNUIsS0FBSyxVQUFVLGNBQWMsQ0FBQyxLQUFVO0lBQ3BDLElBQUksQ0FBQztRQUNELE1BQU0sT0FBTyxHQUFHLE1BQU0sTUFBTSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsY0FBYyxDQUFRLElBQUksRUFBRSxDQUFDO1FBQzdFLE1BQU0sY0FBYyxHQUFHLE9BQU8sT0FBTyxDQUFDLGVBQWUsS0FBSyxTQUFTLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztRQUNyRyxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDekIsS0FBSyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsS0FBSyxHQUFHLGNBQWMsQ0FBQztRQUNsRCxDQUFDO1FBQ0QsSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ3JCLEtBQUssQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLFdBQVcsR0FBRyxvQkFBb0IsY0FBYyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxDQUFDO1FBQ25HLENBQUM7SUFDTCxDQUFDO0lBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztRQUNULE9BQU8sQ0FBQyxLQUFLLENBQUMsc0NBQXNDLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDN0QsQ0FBQztBQUNMLENBQUM7QUFFRCxNQUFNLGFBQWEsR0FBRyxHQUFHLEVBQUU7SUFDdkIsSUFBSSxXQUFXLEVBQUUsQ0FBQztRQUNkLGNBQWMsQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUNoQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDO0FBRUssTUFBTSxLQUFLLEdBQUcsS0FBSzs7SUFDdEIsV0FBVyxHQUFHLElBQUksQ0FBQztJQUNuQixNQUFNLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUUzQixNQUFNLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLGFBQWEsQ0FBQyxDQUFDO0lBRWhELE1BQUEsSUFBSSxDQUFDLENBQUMsQ0FBQyxjQUFjLDBDQUFFLGdCQUFnQixDQUFDLFFBQVEsRUFBRSxLQUFLLElBQUksRUFBRTtRQUN6RCxNQUFNLEdBQUcsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDO1FBQzFDLE1BQU0sTUFBTSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsY0FBYyxFQUFFLGlCQUFpQixFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ3ZFLFVBQWtCLENBQUMsdUJBQXVCLEdBQUcsR0FBRyxDQUFDO1FBQ2xELE1BQU0sTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLDJDQUEyQyxFQUFFLGlCQUFpQixFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQy9HLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUNwQixJQUFJLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxXQUFXLEdBQUcsb0JBQW9CLEdBQUcsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxVQUFVLEVBQUUsQ0FBQztRQUN2RixDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7QUFDUCxDQUFDLENBQUM7QUFmVyxRQUFBLEtBQUssU0FlaEI7QUFFSyxNQUFNLEtBQUssR0FBRztJQUNqQixNQUFNLENBQUMsbUJBQW1CLENBQUMsT0FBTyxFQUFFLGFBQWEsQ0FBQyxDQUFDO0lBQ25ELFdBQVcsR0FBRyxJQUFJLENBQUM7QUFDdkIsQ0FBQyxDQUFDO0FBSFcsUUFBQSxLQUFLLFNBR2hCIiwic291cmNlc0NvbnRlbnQiOlsiZGVjbGFyZSBjb25zdCBFZGl0b3I6IGFueTtcblxuY29uc3QgRVhURU5TSU9OX05BTUUgPSAncHRzLWNvcmUnO1xuXG5leHBvcnQgY29uc3QgdGVtcGxhdGUgPSBgXG48ZGl2IGNsYXNzPVwicGFuZWwtY29udGFpbmVyXCI+XG4gICAgPGRpdiBjbGFzcz1cInBhbmVsLWhlYWRlclwiPlxuICAgICAgICA8ZGl2IGNsYXNzPVwiaGVhZGVyLXRpdGxlXCI+cFRTIENvcmUgU2V0dGluZ3M8L2Rpdj5cbiAgICAgICAgPGRpdiBjbGFzcz1cImhlYWRlci1kZXNjXCI+Q29uZmlndXJhdGlvbiBhbmQgY29tcGlsZS10aW1lIHZlcmlmaWNhdGlvbiBvcHRpb25zPC9kaXY+XG4gICAgPC9kaXY+XG5cbiAgICA8ZGl2IGNsYXNzPVwiZm9ybS1jb250YWluZXJcIj5cbiAgICAgICAgPHVpLXNlY3Rpb24gZXhwYW5kPlxuICAgICAgICAgICAgPHVpLWxhYmVsIHNsb3Q9XCJoZWFkZXJcIj5WYWxpZGF0aW9uICYgVHlwZSBDaGVja2luZzwvdWktbGFiZWw+XG4gICAgICAgICAgICA8dWktcHJvcD5cbiAgICAgICAgICAgICAgICA8dWktbGFiZWwgc2xvdD1cImxhYmVsXCIgdG9vbHRpcD1cIldoZW4gZW5hYmxlZCwgQGltcGxlbWVudCBjaGVja3MgdGhhdCB0aGUgdGFyZ2V0IGNsYXNzIGFjdHVhbGx5IGltcGxlbWVudHMgYWxsIGNvbnRyYWN0IHByb3BlcnRpZXMgYW5kIG1ldGhvZHMuIElmIG1pc3NpbmcsIGl0IGRpc3BsYXlzIGEgd2FybmluZyBkaWFsb2cgaW4gZWRpdG9yLiBEZWZhdWx0OiB0cnVlLlwiPkltcGxlbWVudCBDaGVjazwvdWktbGFiZWw+XG4gICAgICAgICAgICAgICAgPHVpLWNoZWNrYm94IHNsb3Q9XCJjb250ZW50XCIgY2xhc3M9XCJpbXBsZW1lbnQtY2hlY2tcIj48L3VpLWNoZWNrYm94PlxuICAgICAgICAgICAgPC91aS1wcm9wPlxuICAgICAgICA8L3VpLXNlY3Rpb24+XG4gICAgPC9kaXY+XG5cbiAgICA8ZGl2IGNsYXNzPVwic3RhdHVzLWJhclwiPlxuICAgICAgICA8c3BhbiBjbGFzcz1cInN0YXR1cy10ZXh0XCI+UmVhZHk8L3NwYW4+XG4gICAgPC9kaXY+XG48L2Rpdj5cbmA7XG5cbmV4cG9ydCBjb25zdCBzdHlsZSA9IGBcbjpob3N0IHtcbiAgICBkaXNwbGF5OiBibG9jaztcbiAgICBwYWRkaW5nOiAxNHB4O1xuICAgIGhlaWdodDogMTAwJTtcbiAgICBib3gtc2l6aW5nOiBib3JkZXItYm94O1xuICAgIG92ZXJmbG93LXk6IGF1dG87XG4gICAgZm9udC1mYW1pbHk6IC1hcHBsZS1zeXN0ZW0sIEJsaW5rTWFjU3lzdGVtRm9udCwgXCJTZWdvZSBVSVwiLCBSb2JvdG8sIFwiSGVsdmV0aWNhIE5ldWVcIiwgQXJpYWwsIHNhbnMtc2VyaWY7XG4gICAgY29sb3I6IHZhcigtLWNvbG9yLW5vcm1hbC10ZXh0LCAjZGRkKTtcbn1cblxuLnBhbmVsLWNvbnRhaW5lciB7XG4gICAgZGlzcGxheTogZmxleDtcbiAgICBmbGV4LWRpcmVjdGlvbjogY29sdW1uO1xuICAgIGdhcDogMTRweDtcbiAgICBtaW4taGVpZ2h0OiAxMDAlO1xufVxuXG4ucGFuZWwtaGVhZGVyIHtcbiAgICBkaXNwbGF5OiBmbGV4O1xuICAgIGZsZXgtZGlyZWN0aW9uOiBjb2x1bW47XG4gICAgZ2FwOiA0cHg7XG4gICAgcGFkZGluZy1ib3R0b206IDEwcHg7XG4gICAgYm9yZGVyLWJvdHRvbTogMXB4IHNvbGlkIHZhcigtLWNvbG9yLW5vcm1hbC1ib3JkZXIsICM0NDQpO1xufVxuXG4uaGVhZGVyLXRpdGxlIHtcbiAgICBmb250LXNpemU6IDE2cHg7XG4gICAgZm9udC13ZWlnaHQ6IGJvbGQ7XG4gICAgY29sb3I6ICM0MDllZmY7XG59XG5cbi5oZWFkZXItZGVzYyB7XG4gICAgZm9udC1zaXplOiAxMnB4O1xuICAgIG9wYWNpdHk6IDAuNzU7XG59XG5cbi5mb3JtLWNvbnRhaW5lciB7XG4gICAgZGlzcGxheTogZmxleDtcbiAgICBmbGV4LWRpcmVjdGlvbjogY29sdW1uO1xuICAgIGdhcDogMTRweDtcbn1cblxudWktc2VjdGlvbiB7XG4gICAgbWFyZ2luLWJvdHRvbTogOHB4O1xufVxuXG4uc3RhdHVzLWJhciB7XG4gICAgbWFyZ2luLXRvcDogYXV0bztcbiAgICBwYWRkaW5nLXRvcDogMTBweDtcbiAgICBib3JkZXItdG9wOiAxcHggc29saWQgdmFyKC0tY29sb3Itbm9ybWFsLWJvcmRlciwgIzMzMyk7XG4gICAgZm9udC1zaXplOiAxMXB4O1xuICAgIG9wYWNpdHk6IDAuNztcbn1cbmA7XG5cbmV4cG9ydCBjb25zdCAkID0ge1xuICAgIGltcGxlbWVudENoZWNrOiAnLmltcGxlbWVudC1jaGVjaycsXG4gICAgc3RhdHVzVGV4dDogJy5zdGF0dXMtdGV4dCcsXG59O1xuXG5sZXQgYWN0aXZlUGFuZWw6IGFueSA9IG51bGw7XG5cbmFzeW5jIGZ1bmN0aW9uIHVwZGF0ZVVJVmFsdWVzKHBhbmVsOiBhbnkpIHtcbiAgICB0cnkge1xuICAgICAgICBjb25zdCBwcm9maWxlID0gYXdhaXQgRWRpdG9yLlByb2ZpbGUuZ2V0UHJvamVjdChFWFRFTlNJT05fTkFNRSkgYXMgYW55IHx8IHt9O1xuICAgICAgICBjb25zdCBpbXBsZW1lbnRDaGVjayA9IHR5cGVvZiBwcm9maWxlLmltcGxlbWVudF9jaGVjayA9PT0gJ2Jvb2xlYW4nID8gcHJvZmlsZS5pbXBsZW1lbnRfY2hlY2sgOiB0cnVlO1xuICAgICAgICBpZiAocGFuZWwuJC5pbXBsZW1lbnRDaGVjaykge1xuICAgICAgICAgICAgcGFuZWwuJC5pbXBsZW1lbnRDaGVjay52YWx1ZSA9IGltcGxlbWVudENoZWNrO1xuICAgICAgICB9XG4gICAgICAgIGlmIChwYW5lbC4kLnN0YXR1c1RleHQpIHtcbiAgICAgICAgICAgIHBhbmVsLiQuc3RhdHVzVGV4dC50ZXh0Q29udGVudCA9IGBJbXBsZW1lbnQgQ2hlY2s6ICR7aW1wbGVtZW50Q2hlY2sgPyAnRW5hYmxlZCcgOiAnRGlzYWJsZWQnfWA7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ1twdHMtY29yZV0gRXJyb3IgdXBkYXRpbmcgVUkgdmFsdWVzOicsIGUpO1xuICAgIH1cbn1cblxuY29uc3Qgb25XaW5kb3dGb2N1cyA9ICgpID0+IHtcbiAgICBpZiAoYWN0aXZlUGFuZWwpIHtcbiAgICAgICAgdXBkYXRlVUlWYWx1ZXMoYWN0aXZlUGFuZWwpO1xuICAgIH1cbn07XG5cbmV4cG9ydCBjb25zdCByZWFkeSA9IGFzeW5jIGZ1bmN0aW9uKHRoaXM6IGFueSkge1xuICAgIGFjdGl2ZVBhbmVsID0gdGhpcztcbiAgICBhd2FpdCB1cGRhdGVVSVZhbHVlcyh0aGlzKTtcblxuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdmb2N1cycsIG9uV2luZG93Rm9jdXMpO1xuXG4gICAgdGhpcy4kLmltcGxlbWVudENoZWNrPy5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCBhc3luYyAoKSA9PiB7XG4gICAgICAgIGNvbnN0IHZhbCA9ICEhdGhpcy4kLmltcGxlbWVudENoZWNrLnZhbHVlO1xuICAgICAgICBhd2FpdCBFZGl0b3IuUHJvZmlsZS5zZXRQcm9qZWN0KEVYVEVOU0lPTl9OQU1FLCAnaW1wbGVtZW50X2NoZWNrJywgdmFsKTtcbiAgICAgICAgKGdsb2JhbFRoaXMgYXMgYW55KS5fX3BUU19pbXBsZW1lbnRfY2hlY2tfXyA9IHZhbDtcbiAgICAgICAgYXdhaXQgRWRpdG9yLk1lc3NhZ2Uuc2VuZChFWFRFTlNJT05fTkFNRSwgJ3Byb2ZpbGU6OnByb2plY3Q6OmNoYW5nZWRfaW1wbGVtZW50X2NoZWNrJywgJ2ltcGxlbWVudF9jaGVjaycsIHZhbCk7XG4gICAgICAgIGlmICh0aGlzLiQuc3RhdHVzVGV4dCkge1xuICAgICAgICAgICAgdGhpcy4kLnN0YXR1c1RleHQudGV4dENvbnRlbnQgPSBgSW1wbGVtZW50IENoZWNrOiAke3ZhbCA/ICdFbmFibGVkJyA6ICdEaXNhYmxlZCd9YDtcbiAgICAgICAgfVxuICAgIH0pO1xufTtcblxuZXhwb3J0IGNvbnN0IGNsb3NlID0gZnVuY3Rpb24odGhpczogYW55KSB7XG4gICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2ZvY3VzJywgb25XaW5kb3dGb2N1cyk7XG4gICAgYWN0aXZlUGFuZWwgPSBudWxsO1xufTtcbiJdfQ==