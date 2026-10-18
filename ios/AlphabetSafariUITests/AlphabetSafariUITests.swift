import XCTest

/// Drives the real app on an iPhone or iPad simulator. Most checks run inside the web page:
/// selftest.js (the iOS counterpart of tests/android-device.mjs) is handed to the debug app,
/// which runs it once the page has loaded and shows the one-line report this test reads.
/// Each report is also printed with a "SELFTEST" prefix, which CI turns into annotations.
final class AlphabetSafariUITests: XCTestCase {

    override func setUp() {
        continueAfterFailure = false
    }

    private func launch(phase: String) throws -> (app: XCUIApplication, report: String) {
        let url = try XCTUnwrap(Bundle(for: Self.self).url(forResource: "selftest", withExtension: "js"),
                                "selftest.js is not in the test bundle")
        let app = XCUIApplication()
        app.launchEnvironment["SELFTEST_JS"] = "const PHASE = '\(phase)';\n" + (try String(contentsOf: url, encoding: .utf8))
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

    /// Children turn tablets and phones sideways: the layout must still fit, clear of the notch.
    func testLandscape() throws {
        XCUIDevice.shared.orientation = .landscapeLeft
        defer { XCUIDevice.shared.orientation = .portrait }
        let run = try launch(phase: "landscape")
        XCTAssertTrue(run.report.hasPrefix("PASS"), run.report)
        run.app.terminate()
    }
}
