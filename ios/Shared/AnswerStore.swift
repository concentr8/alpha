// Purpose: the three answers to "Are you focused?" and their storage with a time in the App Group.
// Called by: the ShieldAction extension (saves) and the unit tests. TODO: the app will read them later.
// Calls: AppGroup (storage name and key).
//
// Answers stay on the phone in phase 1. Nothing is sent to a server.

import Foundation

enum FocusAnswer: String, Codable, CaseIterable {
    case workingOnTask
    case onBreak
    case notFocused

    var label: String {
        switch self {
        case .workingOnTask: return "Working on my task"
        case .onBreak: return "On a break"
        case .notFocused: return "Not focused"
        }
    }
}

struct StoredAnswer: Codable, Equatable {
    let answer: FocusAnswer
    let answeredAt: Date
}

struct AnswerStore {
    private let defaults: UserDefaults

    init(defaults: UserDefaults = AppGroup.defaults) {
        self.defaults = defaults
    }

    func save(_ answer: FocusAnswer, at time: Date) {
        let all = self.all() + [StoredAnswer(answer: answer, answeredAt: time)]
        guard let data = try? JSONEncoder().encode(all) else { return }
        defaults.set(data, forKey: AppGroup.Key.answers)
    }

    // Oldest first. Empty when nothing was stored or the stored data cannot be read.
    func all() -> [StoredAnswer] {
        guard let data = defaults.data(forKey: AppGroup.Key.answers) else { return [] }
        return (try? JSONDecoder().decode([StoredAnswer].self, from: data)) ?? []
    }
}
