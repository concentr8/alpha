// Purpose: tests for the session timing in FocusSessionClock.
// Called by: `xcodebuild test` (scheme Concentr8).
// Calls: FocusSessionClock with fixed dates, no real clock.

import XCTest
@testable import Concentr8

final class FocusSessionClockTests: XCTestCase {
    private let start = Date(timeIntervalSince1970: 1_000_000)

    func testNothingRunsBeforeStart() {
        let clock = FocusSessionClock(length: 600)
        XCTAssertFalse(clock.isRunning(at: start))
        XCTAssertEqual(clock.remaining(at: start), 0)
        XCTAssertNil(clock.endsAt)
    }

    func testRemainingTimeCountsDown() {
        var clock = FocusSessionClock(length: 600)
        clock.start(at: start)
        XCTAssertTrue(clock.isRunning(at: start))
        XCTAssertEqual(clock.remaining(at: start), 600)
        XCTAssertEqual(clock.remaining(at: start.addingTimeInterval(240)), 360)
        XCTAssertEqual(clock.endsAt, start.addingTimeInterval(600))
    }

    func testSessionEndsByItself() {
        var clock = FocusSessionClock(length: 600)
        clock.start(at: start)
        let late = start.addingTimeInterval(601)
        XCTAssertEqual(clock.remaining(at: late), 0)
        XCTAssertFalse(clock.isRunning(at: late))
    }

    func testStopClearsTheSession() {
        var clock = FocusSessionClock(length: 600)
        clock.start(at: start)
        clock.stop()
        XCTAssertFalse(clock.isRunning(at: start))
        XCTAssertEqual(clock.remaining(at: start), 0)
    }

    func testStartAgainRestartsTheTime() {
        var clock = FocusSessionClock(length: 600)
        clock.start(at: start)
        clock.start(at: start.addingTimeInterval(500))
        XCTAssertEqual(clock.remaining(at: start.addingTimeInterval(500)), 600)
    }
}
