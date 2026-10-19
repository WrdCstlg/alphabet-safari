import XCTest

/// Drives the real app on an iPhone or iPad simulator. Most checks run inside the web page:
/// selftest.js (the iOS counterpart of tests/android-device.mjs) is handed to the debug app,
/// which runs it once the page has loaded and shows the one-line report this test reads.
/// Each report is also printed with a "SELFTEST" prefix, which CI turns into annotations.
final class AlphabetSafariUITests: XCTestCase {

    override func setUp() {
        continueAfterFailure = false
    }

    /// Whether this machine can reach the internet. Only then does "the app's requests were
    /// blocked" prove the block works, rather than that there was no network to reach.
    private static let online: Bool = {
        guard let url = URL(string: "https://www.apple.com/favicon.ico") else { return false }
        return (try? Data(contentsOf: url)) != nil
    }()

    private func launch(phase: String) throws -> (app: XCUIApplication, report: String) {
        let url = try XCTUnwrap(Bundle(for: Self.self).url(forResource: "selftest", withExtension: "js"),
                                "selftest.js is not in the test bundle")
        let app = XCUIApplication()
        app.launchEnvironment["SELFTEST_JS"] = "const PHASE = '\(phase)'; const NETWORK_ONLINE = \(Self.online);\n"
            + (try String(contentsOf: url, encoding: .utf8))
        app.launch()
        let label = app.staticTexts["selfTestResult"]
        XCTAssertTrue(label.waitForExistence(timeout: 120), "the in-app self-test never reported back")
        let report = label.label
        print("SELFTEST [\(phase), \(UIDevice.current.model)]: \(report)")
        let screenshot = XCTAttachment(screenshot: app.screenshot())
        screenshot.name = "\(phase) on \(UIDevice.current.model)"
        screenshot.lifetime = .keepAlways
        add(screenshot)
        return (app, report)
    }

    /// Bridge, clips, fonts, speech, no network, privacy policy and layout; then the chosen
    /// language must survive the app being closed and opened again.
    func testTheAppAndARelaunch() throws {
        let first = try launch(phase: "first-launch")
        XCTAssertTrue(first.report.hasPrefix("PASS"), first.report)
        first.app.terminate()

        let second = try launch(phase: "relaunch")
        XCTAssertTrue(second.report.hasPrefix("PASS"), second.report)
        second.app.terminate()
    }

    /// Parents Corner's "Erase Everything" asks first (the page's confirm(), shown as a native
    /// dialog), then removes the child's name and progress, as the privacy policy promises.
    func testEraseEverything() throws {
        let erase = try launch(phase: "erase")
        XCTAssertTrue(erase.report.hasPrefix("PASS"), erase.report)
        let dialog = erase.app.alerts.firstMatch
        XCTAssertTrue(dialog.waitForExistence(timeout: 20), "no confirmation dialog before erasing")
        dialog.buttons["OK"].tap()
        sleep(2) // the page erases and reloads
        erase.app.terminate()

        let after = try launch(phase: "after-erase")
        XCTAssertTrue(after.report.hasPrefix("PASS"), after.report)
        after.app.terminate()
    }

    /// Children turn tablets and phones sideways: the layout must still fit, clear of the notch.
    func testLandscape() throws {
        XCUIDevice.shared.orientation = .landscapeLeft
        defer { XCUIDevice.shared.orientation = .portrait }
        let run = try launch(phase: "landscape")
        XCTAssertTrue(run.report.hasPrefix("PASS"), run.report)
        run.app.terminate()
    }
}
