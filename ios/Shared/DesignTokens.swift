// Purpose: the Concentr8 look as Swift constants, taken from the tokens in docs/design.md.
// Called by: the app screens (Concentr8/) and the shield screen (Concentr8ShieldConfig/).
// Calls: SwiftUI and UIKit only.
//
// Only tokens from docs/design.md live here. No new colours, fonts or corners.
// TODO: embed Bricolage Grotesque (titles) and Lexend (text) and keep their SIL Open Font
// License texts (see the licence block in frontend/index.html). Until then we use the system font.

import SwiftUI
import UIKit

enum Tokens {
    // One colour written once as a hex number, so SwiftUI and UIKit always get the same value.
    struct Hex {
        let value: UInt32

        var color: Color { Color(uiColor: uiColor) }

        var uiColor: UIColor {
            UIColor(
                red: CGFloat((value >> 16) & 0xFF) / 255,
                green: CGFloat((value >> 8) & 0xFF) / 255,
                blue: CGFloat(value & 0xFF) / 255,
                alpha: 1
            )
        }
    }

    static let paper = Hex(value: 0xFFFBF2)        // --paper: page background
    static let surface = Hex(value: 0xFFFDF8)      // --surface: cards
    static let ink = Hex(value: 0x2A1D14)          // --ink: text
    static let muted = Hex(value: 0x655445)        // --muted: secondary text (ADR 0046)
    static let line = Hex(value: 0xE2D6C9)         // --line: dividers
    static let action = Hex(value: 0xB4532F)       // --action: main button
    static let actionPressed = Hex(value: 0x9F4728) // --action-hover: pressed main button
    static let actionInk = Hex(value: 0xFFFBF2)    // --action-ink: text on the main button
    static let selected = Hex(value: 0xF2CAB6)     // --selected
    static let danger = Hex(value: 0x9B2948)       // --danger

    static let radiusControl: CGFloat = 8  // --radius-control: buttons and fields
    static let radiusPanel: CGFloat = 12   // --radius-panel: cards and panels
}
