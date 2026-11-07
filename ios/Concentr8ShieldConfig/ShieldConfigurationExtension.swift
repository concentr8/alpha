// Purpose: ShieldConfiguration extension. Draws the shield screen "Are you focused?" over a blocked app.
// Called by: iOS, whenever a shielded app, category or website is opened.
// Calls: Tokens (colours) and FocusAnswer (button texts).
//
// AI-GENERATED: no wireframe from Jack yet; built from the tokens in docs/design.md. The subtitle
// carries the "AI generated" label so Jack can redraw it.
// TODO: Apple's shield has only two buttons, so "Not focused" has no button yet. The text of the
// third answer is kept in FocusAnswer. Decide with Jack how the student can give it.

import ManagedSettings
import ManagedSettingsUI
import UIKit

final class ShieldConfigurationExtension: ShieldConfigurationDataSource {
    override func configuration(shielding application: Application) -> ShieldConfiguration {
        focusCheck()
    }

    override func configuration(shielding application: Application, in category: ActivityCategory) -> ShieldConfiguration {
        focusCheck()
    }

    override func configuration(shielding webDomain: WebDomain) -> ShieldConfiguration {
        focusCheck()
    }

    override func configuration(shielding webDomain: WebDomain, in category: ActivityCategory) -> ShieldConfiguration {
        focusCheck()
    }

    // The same screen for every kind of blocked item, so the question is always the same.
    private func focusCheck() -> ShieldConfiguration {
        ShieldConfiguration(
            backgroundBlurStyle: nil,
            backgroundColor: Tokens.paper.uiColor,
            icon: nil,
            title: ShieldConfiguration.Label(text: "Are you focused?", color: Tokens.ink.uiColor),
            subtitle: ShieldConfiguration.Label(text: "AI generated", color: Tokens.muted.uiColor),
            primaryButtonLabel: ShieldConfiguration.Label(
                text: FocusAnswer.workingOnTask.label, color: Tokens.actionInk.uiColor),
            primaryButtonBackgroundColor: Tokens.action.uiColor,
            secondaryButtonLabel: ShieldConfiguration.Label(
                text: FocusAnswer.onBreak.label, color: Tokens.action.uiColor)
        )
    }
}
