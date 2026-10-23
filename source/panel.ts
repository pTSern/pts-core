declare const Editor: any;

const EXTENSION_NAME = 'pts-core';

export const template = `
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

export const style = `
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

export const $ = {
    implementCheck: '.implement-check',
    statusText: '.status-text',
};

let activePanel: any = null;

async function updateUIValues(panel: any) {
    try {
        const profile = await Editor.Profile.getProject(EXTENSION_NAME) as any || {};
        const implementCheck = typeof profile.implement_check === 'boolean' ? profile.implement_check : true;
        if (panel.$.implementCheck) {
            panel.$.implementCheck.value = implementCheck;
        }
        if (panel.$.statusText) {
            panel.$.statusText.textContent = `Implement Check: ${implementCheck ? 'Enabled' : 'Disabled'}`;
        }
    } catch (e) {
        console.error('[pts-core] Error updating UI values:', e);
    }
}

const onWindowFocus = () => {
    if (activePanel) {
        updateUIValues(activePanel);
    }
};

export const ready = async function(this: any) {
    activePanel = this;
    await updateUIValues(this);

    window.addEventListener('focus', onWindowFocus);

    this.$.implementCheck?.addEventListener('change', async () => {
        const val = !!this.$.implementCheck.value;
        await Editor.Profile.setProject(EXTENSION_NAME, 'implement_check', val);
        (globalThis as any).__pTS_implement_check__ = val;
        await Editor.Message.send(EXTENSION_NAME, 'profile::project::changed_implement_check', 'implement_check', val);
        if (this.$.statusText) {
            this.$.statusText.textContent = `Implement Check: ${val ? 'Enabled' : 'Disabled'}`;
        }
    });
};

export const close = function(this: any) {
    window.removeEventListener('focus', onWindowFocus);
    activePanel = null;
};
