// Purpose: plain logic of a focus session: start, stop, remaining time. No UI code.
// Called by: SessionController (app) and the unit tests.
// Calls: Foundation only.
//
// Why the time is passed in: tests give a fixed "now", so they never wait for a real clock.

import Foundation

struct FocusSessionClock: Equatable {
    // 25 minutes is a common study block. TODO: let the student choose the length.
    static let defaultLength: TimeInterval = 25 * 60

    private(set) var startedAt: Date?
    let length: TimeInterval

    init(length: TimeInterval = FocusSessionClock.defaultLength) {
        self.length = length
    }

    var endsAt: Date? {
        startedAt?.addingTimeInterval(length)
    }

    mutating func start(at now: Date) {
        startedAt = now
    }

    mutating func stop() {
        startedAt = nil
    }

    // Seconds left, never below zero. Zero when no session was started.
    func remaining(at now: Date) -> TimeInterval {
        guard let endsAt else { return 0 }
        return max(0, endsAt.timeIntervalSince(now))
    }

    // A session that ran out of time is no longer running, even if stop() was not called.
    func isRunning(at now: Date) -> Bool {
        startedAt != nil && remaining(at: now) > 0
    }
}
