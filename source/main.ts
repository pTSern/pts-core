declare const Editor: any;

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

export function load() {
    _the_check_plugin_method();

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
