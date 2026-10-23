declare const Editor: any;

const EXTENSION_NAME = 'pts-core';

async function _the_check_plugin_method() {
    try {
        const assets = await Editor.Message.request('asset-db', 'query-assets', {
            pattern: 'db://pts-core/plugins/**/*.js'
        });
        if (!assets || !Array.isArray(assets)) return;

        const pluginUuids = assets.map((asset: any) => asset.uuid).filter(Boolean);
        if (pluginUuids.length === 0) return;

        const sortingList = await Editor.Profile.getProject('project', 'script.sortingPlugin') as string[] | undefined;
        const currentList = Array.isArray(sortingList) ? sortingList : [];

        const filteredList = currentList.filter(uuid => !pluginUuids.includes(uuid));
        const newList = [...pluginUuids, ...filteredList];

        await Editor.Profile.setProject('project', 'script.sortingPlugin', newList);
        console.log('[pTS-Core] Successfully sorted plugins at the top:', newList);
    } catch (err) {
        console.error('[pTS-Core] Failed to sort plugins:', err);
    }
}

async function _initImplementCheckSetting() {
    try {
        const val = await Editor.Profile.getProject(EXTENSION_NAME, 'implement_check');
        const isEnabled = typeof val === 'boolean' ? val : true;
        (globalThis as any).__pTS_implement_check__ = isEnabled;
    } catch {
        (globalThis as any).__pTS_implement_check__ = true;
    }
}

export function load() {
    _the_check_plugin_method();
    _initImplementCheckSetting();

    try {
        // @ts-ignore
        Editor.Message.addBroadcastListener('asset-db:ready', _the_check_plugin_method);
    } catch (err) {
        console.error('[pTS-Core] Failed to add asset-db:ready listener:', err);
    }
}

export function unload() {
    try {
        // @ts-ignore
        Editor.Message.removeBroadcastListener('asset-db:ready', _the_check_plugin_method);
    } catch (err) {}
}

export const methods: { [key: string]: (...any: any[]) => any } = {
    openPanel() {
        Editor.Panel.open(EXTENSION_NAME);
    },
    onImplementCheckChanged(key: any, value: any) {
        const val = typeof value === 'boolean' ? value : (typeof key === 'boolean' ? key : true);
        (globalThis as any).__pTS_implement_check__ = val;
        console.log(`[pTS-Core] implement_check updated to: ${val}`);
    }
};
