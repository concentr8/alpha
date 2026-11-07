// Purpose: ShieldAction extension. Stores the answer from the shield screen with a time in the App Group.
// Called by: iOS, when the student taps a button on the shield screen.
// Calls: AnswerStore (saves the answer).
//
// Answers stay on the phone in phase 1. Nothing is sent to a server.
// TODO: the button texts must stay in step with ShieldConfigurationExtension; "Not focused" has no button yet.

import Foundation
import ManagedSettings

final class ShieldActionExtension: ShieldActionDelegate {
    override func handle(action: ShieldAction, for application: ApplicationToken,
                         completionHandler: @escaping (ShieldActionResponse) -> Void) {
        completionHandler(answer(for: action))
    }

    override func handle(action: ShieldAction, for webDomain: WebDomainToken,
                         completionHandler: @escaping (ShieldActionResponse) -> Void) {
        completionHandler(answer(for: action))
    }

    override func handle(action: ShieldAction, for category: ActivityCategoryToken,
                         completionHandler: @escaping (ShieldActionResponse) -> Void) {
        completionHandler(answer(for: action))
    }

    // The primary button means "working on my task", the secondary one "on a break".
    // Both close the blocked app and keep the shield up.
    private func answer(for action: ShieldAction) -> ShieldActionResponse {
        switch action {
        case .primaryButtonPressed:
            AnswerStore().save(.workingOnTask, at: Date())
        case .secondaryButtonPressed:
            AnswerStore().save(.onBreak, at: Date())
        @unknown default:
            break
        }
        return .close
    }
}
