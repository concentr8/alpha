// Purpose: remembers which apps the student chose to block, so the Monitor extension can shield them.
// Called by: SessionController (app saves) and DeviceActivityMonitorExtension (reads).
// Calls: FamilyControls (the selection type) and AppGroup (storage name and key).
//
// Why a store: the picker lives in the app, the shielding happens in another program.
// The App Group is the only place both can see.

import FamilyControls
import Foundation

struct SelectionStore {
    private let defaults: UserDefaults

    init(defaults: UserDefaults = AppGroup.defaults) {
        self.defaults = defaults
    }

    func save(_ selection: FamilyActivitySelection) {
        guard let data = try? JSONEncoder().encode(selection) else { return }
        defaults.set(data, forKey: AppGroup.Key.blockedSelection)
    }

    // An empty selection when nothing was chosen yet: then nothing gets shielded.
    func load() -> FamilyActivitySelection {
        guard let data = defaults.data(forKey: AppGroup.Key.blockedSelection),
              let selection = try? JSONDecoder().decode(FamilyActivitySelection.self, from: data)
        else { return FamilyActivitySelection() }
        return selection
    }
}
