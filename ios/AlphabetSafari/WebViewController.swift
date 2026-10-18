import UIKit
import WebKit

/// Hosts the bundled web app full screen: the same files as the website and the Android app,
/// copied into the app by the "Bundle Web App" build phase (see project.yml). The web view is
/// kept inside the safe area, so nothing sits under the notch, the Dynamic Island or the home
/// indicator; the strip around it gets the page's top background colour.
final class WebViewController: UIViewController, WKNavigationDelegate {
    private let wwwURL = Bundle.main.bundleURL.appendingPathComponent("www", isDirectory: true)
    private let bridge = WebBridge()
    private var webView: WKWebView!

    // The app makes no network requests (privacy.html promises it), and the page, which has the
    // native bridge attached, must never load anything from outside the app.
    private static let blockNetwork = """
    [{"trigger": {"url-filter": "^(https?|wss?)://"}, "action": {"type": "block"}}]
    """

    override func loadView() {
        let configuration = WKWebViewConfiguration()
        configuration.allowsInlineMediaPlayback = true
        configuration.mediaTypesRequiringUserActionForPlayback = []
        bridge.install(into: configuration.userContentController)
        #if DEBUG
        Self.recordScriptErrors(in: configuration.userContentController)
        if ProcessInfo.processInfo.environment["SELFTEST_JS"] != nil {
            Self.stopAnimations(in: configuration.userContentController)
        }
        #endif

        webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = self
        webView.isOpaque = false
        webView.backgroundColor = .clear
        webView.scrollView.backgroundColor = .clear
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.allowsLinkPreview = false
        #if DEBUG
        if #available(iOS 16.4, *) {
            webView.isInspectable = true // Safari > Develop, for debugging on a Mac
        }
        #endif
        bridge.webView = webView

        let root = UIView()
        root.backgroundColor = UIColor(named: "PageBackground")
        webView.translatesAutoresizingMaskIntoConstraints = false
        root.addSubview(webView)
        let safe = root.safeAreaLayoutGuide
        NSLayoutConstraint.activate([
            webView.topAnchor.constraint(equalTo: safe.topAnchor),
            webView.bottomAnchor.constraint(equalTo: safe.bottomAnchor),
            webView.leadingAnchor.constraint(equalTo: safe.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: safe.trailingAnchor)
        ])
        view = root
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        WKContentRuleListStore.default().compileContentRuleList(
            forIdentifier: "BlockNetwork", encodedContentRuleList: Self.blockNetwork) { [weak self] ruleList, error in
            guard let self else { return }
            if let ruleList {
                self.webView.configuration.userContentController.add(ruleList)
            } else {
                NSLog("AlphabetSafari: network block rule failed to compile: %@", String(describing: error))
            }
            self.loadApp()
        }
    }

    private func loadApp() {
        webView.loadFileURL(wwwURL.appendingPathComponent("index.html"), allowingReadAccessTo: wwwURL)
    }

    /// The app is going to the background: stop talking and playing.
    func pause() {
        bridge.stopSpeaking()
        webView.evaluateJavaScript("window.AlphabetSafariPause && window.AlphabetSafariPause()", completionHandler: nil)
    }

    // Full screen for small hands: no status bar, the home indicator fades, and a swipe at a
    // screen edge first shows the indicator instead of leaving the app.
    override var prefersStatusBarHidden: Bool { true }
    override var prefersHomeIndicatorAutoHidden: Bool { true }
    override var preferredScreenEdgesDeferringSystemGestures: UIRectEdge { .all }

    // MARK: - WKNavigationDelegate

    /// Only the bundled pages may load (the privacy policy is one of them, in a frame).
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = navigationAction.request.url else { return decisionHandler(.cancel) }
        let appRoot = wwwURL.resolvingSymlinksInPath().path
        let inApp = url.isFileURL && url.resolvingSymlinksInPath().path.hasPrefix(appRoot)
        decisionHandler(inApp || url.absoluteString == "about:blank" ? .allow : .cancel)
    }

    /// iOS may stop a background web view's process to free memory; start the page again.
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        loadApp()
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        #if DEBUG
        runSelfTestIfRequested()
        #endif
    }

    // MARK: - Self-test (debug builds only)

    #if DEBUG
    private var selfTestStarted = false

    /// Script errors from the moment the page starts, for the self-test to check.
    private static func recordScriptErrors(in controller: WKUserContentController) {
        let source = """
        window.__appErrors = [];
        window.addEventListener('error', function (e) { window.__appErrors.push(String(e.message)); });
        window.addEventListener('unhandledrejection', function (e) { window.__appErrors.push(String(e.reason)); });
        """
        controller.addUserScript(WKUserScript(source: source, injectionTime: .atDocumentStart, forMainFrameOnly: true))
    }

    /// Under UI test only: XCUITest waits for the app to go idle before every query, and the
    /// page's endless animations (bouncing mascot, floating balloons) would keep it busy.
    private static func stopAnimations(in controller: WKUserContentController) {
        let source = """
        var style = document.createElement('style');
        style.textContent = '*, *::before, *::after { animation: none !important; transition: none !important; }';
        document.documentElement.appendChild(style);
        """
        controller.addUserScript(WKUserScript(source: source, injectionTime: .atDocumentStart, forMainFrameOnly: true))
    }

    /// The UI tests (AlphabetSafariUITests) pass a JavaScript self-test in SELFTEST_JS; the app
    /// runs it in the page and shows its one-line report in a label the test reads.
    private func runSelfTestIfRequested() {
        guard !selfTestStarted, let script = ProcessInfo.processInfo.environment["SELFTEST_JS"] else { return }
        selfTestStarted = true
        webView.callAsyncJavaScript(script, arguments: [:], in: nil, in: .page) { [weak self] result in
            let report: String
            switch result {
            case .success(let value):
                report = (value as? String) ?? "FAIL the self-test returned \(String(describing: value))"
            case .failure(let error):
                report = "FAIL the self-test threw: \(error)"
            }
            self?.showSelfTestReport(report)
        }
    }

    private func showSelfTestReport(_ report: String) {
        let label = UILabel()
        label.accessibilityIdentifier = "selfTestResult"
        label.text = report
        label.numberOfLines = 0
        label.font = .systemFont(ofSize: 9)
        label.backgroundColor = .white
        label.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(label)
        NSLayoutConstraint.activate([
            label.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor),
            label.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor),
            label.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor)
        ])
    }
    #endif
}
