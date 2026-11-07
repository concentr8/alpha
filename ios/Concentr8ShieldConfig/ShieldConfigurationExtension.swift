// Purpose: ShieldConfiguration extension. Draws the shield screen "Are you focused?" over a blocked app.
// Called by: iOS, whenever a shielded app, category or website is opened.
// Calls: Tokens (colours), FocusAnswer (button texts) and the ShieldIcon image in this extension's Assets.xcassets.
//
// AI-GENERATED: no wireframe from Jack yet; built from the tokens in docs/design.md so Jack can redraw it.
// The "AI generated" marker is not shown on this screen, because every student sees it when a blocked
// app opens (ADR 0044). The marker lives in this comment and in the pull request instead.
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
    // Why a light main button with dark text: on iOS 27.2 the shield drew our light text on the
    // terracotta button darker than the button itself, so it could not be read (tried on an
    // iPhone 12 Pro, 2026-11-07). Dark text on a light button stays readable either way.
    private func focusCheck() -> ShieldConfiguration {
        ShieldConfiguration(
            backgroundBlurStyle: nil,
            backgroundColor: Tokens.paper.uiColor,
            icon: UIImage(named: "ShieldIcon"),
            title: ShieldConfiguration.Label(text: "Are you focused?", color: Tokens.ink.uiColor),
            subtitle: ShieldConfiguration.Label(
                text: "Your focus session is running. Is this app part of your task?",
                color: Tokens.muted.uiColor),
            primaryButtonLabel: ShieldConfiguration.Label(
                text: FocusAnswer.workingOnTask.label, color: Tokens.ink.uiColor),
            primaryButtonBackgroundColor: Tokens.selected.uiColor,
            secondaryButtonLabel: ShieldConfiguration.Label(
                text: FocusAnswer.onBreak.label, color: Tokens.action.uiColor)
        )
    }
}
