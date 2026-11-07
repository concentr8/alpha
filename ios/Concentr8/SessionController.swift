// Purpose: connects the focus session to Screen Time: asks permission, remembers the chosen apps,
//          starts and stops the DeviceActivity schedule that makes the Monitor extension shield them.
// Called by: HomeView.
// Calls: FocusSessionClock (timing), SelectionStore (chosen apps), FamilyControls and DeviceActivity.
//
// Why a schedule: only the Monitor extension may switch the shield on, and iOS wakes it through
// a DeviceActivity schedule. A session is a schedule from now until the end time.
// This part cannot be tried in the simulator; a human tries it on a real iPhone.
// TODO: Apple needs a schedule of at least 15 minutes, so shorter sessions will fail to start.

import DeviceActivity
import FamilyControls
import Foundation
import ManagedSettings

@MainActor
final class SessionController: ObservableObject {
    @Published var selection: FamilyActivitySelection {
        didSet { selectionStore.save(selection) }
    }
    @Published private(set) var clock = FocusSessionClock()
    @Published private(set) var message: String?

    private let selectionStore: SelectionStore
    private let center = DeviceActivityCenter()
    private let activityName = DeviceActivityName(AppGroup.sessionActivityName)

    init(selectionStore: SelectionStore = SelectionStore()) {
        self.selectionStore = selectionStore
        self.selection = selectionStore.load()
    }

    func isRunning(at now: Date) -> Bool {
        clock.isRunning(at: now)
    }

    func remaining(at now: Date) -> TimeInterval {
        clock.remaining(at: now)
    }

    // Individual authorization: the student allows Screen Time for themselves.
    func askPermission() async {
        do {
            try await AuthorizationCenter.shared.requestAuthorization(for: .individual)
            message = nil
        } catch {
            message = "Screen Time permission was not given."
        }
    }

    func start(at now: Date = Date()) {
        var newClock = FocusSessionClock()
        newClock.start(at: now)
        guard let endsAt = newClock.endsAt else { return }
        do {
            try center.startMonitoring(activityName, during: schedule(from: now, to: endsAt))
            clock = newClock
            message = nil
        } catch {
            message = "The session could not start. Check the Screen Time permission."
        }
    }

    func stop() {
        center.stopMonitoring([activityName])
        ManagedSettingsStore().clearAllSettings()
        clock.stop()
    }

    private func schedule(from start: Date, to end: Date) -> DeviceActivitySchedule {
        let parts: Set<Calendar.Component> = [.hour, .minute, .second]
        let calendar = Calendar.current
        return DeviceActivitySchedule(
            intervalStart: calendar.dateComponents(parts, from: start),
            intervalEnd: calendar.dateComponents(parts, from: end),
            repeats: false
        )
    }
}
