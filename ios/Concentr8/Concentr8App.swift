// Purpose: entry point of the Concentr8 iPhone app; opens the home screen.
// Called by: iOS when the app starts.
// Calls: HomeView.

import SwiftUI

@main
struct Concentr8App: App {
    var body: some Scene {
        WindowGroup {
            HomeView()
        }
    }
}
