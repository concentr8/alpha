// Purpose: Monitor extension. Shields the chosen apps when a focus session starts and lifts the shield when it ends.
// Called by: iOS, when the DeviceActivity schedule started by SessionController begins or ends.
// Calls: SelectionStore (chosen apps) and ManagedSettings (the shield).
//
// Why here: only an extension may switch the shield on while the app is closed.
// This part cannot be tried in the simulator; a human tries it on a real iPhone.

import DeviceActivity
import ManagedSettings

final class DeviceActivityMonitorExtension: DeviceActivityMonitor {
    private let store = ManagedSettingsStore()

    override func intervalDidStart(for activity: DeviceActivityName) {
        super.intervalDidStart(for: activity)
        let selection = SelectionStore().load()
        store.shield.applications = selection.applicationTokens
        store.shield.applicationCategories = .specific(selection.categoryTokens)
        store.shield.webDomains = selection.webDomainTokens
    }

    override func intervalDidEnd(for activity: DeviceActivityName) {
        super.intervalDidEnd(for: activity)
        store.clearAllSettings()
    }
}
