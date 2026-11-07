// Purpose: the home screen: choose apps to block, start and stop a focus session, next tasks.
// Called by: Concentr8App.
// Calls: SessionController, SampleTasks, Tokens (colours and corners), FamilyActivityPicker.
//
// AI-GENERATED: there is no wireframe from Jack for the phone yet. This screen is built only from
// the tokens in docs/design.md so Jack can redraw it. It shows the "AI generated" label.

import FamilyControls
import SwiftUI

struct HomeView: View {
    @StateObject private var session = SessionController()
    @State private var showPicker = false

    var body: some View {
        TimelineView(.periodic(from: .now, by: 1)) { context in
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    Text("AI generated")
                        .font(.caption2)
                        .foregroundStyle(Tokens.muted.color)
                    Text("Concentr8")
                        .font(.largeTitle.bold())
                        .foregroundStyle(Tokens.ink.color)
                    sessionPanel(now: context.date)
                    tasksPanel
                }
                .padding(20)
            }
        }
        .background(Tokens.paper.color.ignoresSafeArea())
        .task { await session.askPermission() }
        .familyActivityPicker(isPresented: $showPicker, selection: $session.selection)
    }

    private func sessionPanel(now: Date) -> some View {
        let running = session.isRunning(at: now)
        return VStack(alignment: .leading, spacing: 12) {
            Text(running ? timeText(session.remaining(at: now)) : "No focus session running")
                .font(.title2.weight(.semibold))
                .foregroundStyle(Tokens.ink.color)
            Button("Choose apps to block") { showPicker = true }
                .buttonStyle(QuietButtonStyle())
            Button(running ? "Stop focus session" : "Start focus session") {
                if running { session.stop() } else { session.start() }
            }
            .buttonStyle(MainButtonStyle())
            if let message = session.message {
                Text(message)
                    .font(.footnote)
                    .foregroundStyle(Tokens.danger.color)
            }
        }
        .panel()
    }

    private var tasksPanel: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Next tasks")
                .font(.headline)
                .foregroundStyle(Tokens.ink.color)
            ForEach(SampleTasks.next) { task in
                HStack {
                    Text(task.title).foregroundStyle(Tokens.ink.color)
                    Spacer()
                    Text("\(task.minutes) min").foregroundStyle(Tokens.muted.color)
                }
                .font(.subheadline)
                Divider().overlay(Tokens.line.color)
            }
        }
        .panel()
    }

    private func timeText(_ seconds: TimeInterval) -> String {
        let total = Int(seconds)
        return String(format: "%02d:%02d left", total / 60, total % 60)
    }
}

private struct MainButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .frame(maxWidth: .infinity, minHeight: 48)
            .foregroundStyle(Tokens.actionInk.color)
            .background(
                (configuration.isPressed ? Tokens.actionPressed : Tokens.action).color,
                in: RoundedRectangle(cornerRadius: Tokens.radiusControl)
            )
    }
}

private struct QuietButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .frame(maxWidth: .infinity, minHeight: 48)
            .foregroundStyle(Tokens.ink.color)
            .background(
                configuration.isPressed ? Tokens.selected.color : Color.clear,
                in: RoundedRectangle(cornerRadius: Tokens.radiusControl)
            )
            .overlay(
                RoundedRectangle(cornerRadius: Tokens.radiusControl)
                    .stroke(Tokens.line.color, lineWidth: 1.5)
            )
    }
}

private extension View {
    func panel() -> some View {
        padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Tokens.surface.color, in: RoundedRectangle(cornerRadius: Tokens.radiusPanel))
            .overlay(
                RoundedRectangle(cornerRadius: Tokens.radiusPanel)
                    .stroke(Tokens.line.color, lineWidth: 1)
            )
    }
}
