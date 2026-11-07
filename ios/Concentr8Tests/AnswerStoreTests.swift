// Purpose: tests for storing the "Are you focused?" answers.
// Called by: `xcodebuild test` (scheme Concentr8).
// Calls: AnswerStore with a throw-away storage name, never the real App Group.

import XCTest
@testable import Concentr8

final class AnswerStoreTests: XCTestCase {
    private let suiteName = "app.concentr8.ios.tests.answers"
    private var defaults: UserDefaults!

    override func setUp() {
        super.setUp()
        defaults = UserDefaults(suiteName: suiteName)
        defaults.removePersistentDomain(forName: suiteName)
    }

    override func tearDown() {
        defaults.removePersistentDomain(forName: suiteName)
        super.tearDown()
    }

    func testStartsEmpty() {
        XCTAssertTrue(AnswerStore(defaults: defaults).all().isEmpty)
    }

    func testSavesAnswerWithItsTime() {
        let store = AnswerStore(defaults: defaults)
        let time = Date(timeIntervalSince1970: 2_000_000)
        store.save(.onBreak, at: time)
        XCTAssertEqual(store.all(), [StoredAnswer(answer: .onBreak, answeredAt: time)])
    }

    func testKeepsAnswersOldestFirst() {
        let store = AnswerStore(defaults: defaults)
        store.save(.workingOnTask, at: Date(timeIntervalSince1970: 1))
        store.save(.notFocused, at: Date(timeIntervalSince1970: 2))
        XCTAssertEqual(store.all().map(\.answer), [.workingOnTask, .notFocused])
    }

    func testUnreadableDataGivesEmptyList() {
        defaults.set(Data("not json".utf8), forKey: AppGroup.Key.answers)
        XCTAssertTrue(AnswerStore(defaults: defaults).all().isEmpty)
    }

    func testEveryAnswerHasAPlainLabel() {
        XCTAssertEqual(FocusAnswer.allCases.map(\.label),
                       ["On my task", "On a break", "Not focused"])
    }
}
