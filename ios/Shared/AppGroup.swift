// Purpose: the App Group name and the storage keys the app and the extensions share.
// Called by: AnswerStore, SelectionStore, the app, and the Monitor and ShieldAction extensions.
// Calls: Foundation only.
//
// Why one place: the app and each extension are separate programs. They only see each
// other's data through this group, so the names must be identical everywhere.

import Foundation

enum AppGroup {
    static let identifier = "group.app.concentr8.ios"

    // Name of the DeviceActivity schedule that the app starts and the Monitor extension hears.
    static let sessionActivityName = "focus-session"

    // Returns the shared storage. Falls back to the normal storage when the group is not
    // signed in yet (for example in unit tests or before a human has set up signing).
    static var defaults: UserDefaults {
        UserDefaults(suiteName: identifier) ?? .standard
    }

    enum Key {
        static let answers = "focusAnswers"
        static let blockedSelection = "blockedSelection"
    }
}
