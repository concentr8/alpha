// Purpose: sample data for the "Next tasks" list on the home screen.
// Called by: HomeView.
// Calls: nothing.
//
// TODO: replace with tasks from the Concentr8 server (phase 2, docs/plans/ios-app.md).

import Foundation

struct SampleTask: Identifiable, Equatable {
    let id: Int
    let title: String
    let minutes: Int
}

enum SampleTasks {
    static let next: [SampleTask] = [
        SampleTask(id: 1, title: "Read chapter 4 of biology", minutes: 30),
        SampleTask(id: 2, title: "Maths exercises, sheet 7", minutes: 45),
        SampleTask(id: 3, title: "Plan the essay outline", minutes: 20),
    ]
}
