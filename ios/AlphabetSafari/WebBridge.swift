import AVFoundation
import UIKit
import WebKit

/// window.NativeBridge for the page: the same calls as Android's AndroidBridge (speak,
/// stopSpeaking, vibrate, getPlatform); script.js uses whichever is present.
///
/// Speech uses AVSpeechSynthesizer. Every voice it offers runs on the device, so a phrase
/// with the child's name never leaves it (the page's localOnly flag is always met). Each
/// utterance is reported back through window.AlphabetSafariSpeechDone(id, ok), as on Android.
final class WebBridge: NSObject, WKScriptMessageHandler, AVSpeechSynthesizerDelegate {
    weak var webView: WKWebView?
    /// Set while the app is in the background: a phrase a page timer starts then is refused.
    var paused = false
    private let synthesizer = AVSpeechSynthesizer()
    private var pageIds: [ObjectIdentifier: String] = [:]
    private var generation = 0 // bumped by every stop, so a phrase queued before it isn't started

    private static let pageScript = """
    window.NativeBridge = {
      getPlatform: function () { return 'ios'; },
      speak: function (text, lang, rate, id, localOnly) {
        window.webkit.messageHandlers.nativeBridge.postMessage(
          { op: 'speak', text: String(text), lang: String(lang), rate: Number(rate) || 1, id: String(id) });
      },
      stopSpeaking: function () {
        window.webkit.messageHandlers.nativeBridge.postMessage({ op: 'stop' });
      },
      vibrate: function (ms) {
        window.webkit.messageHandlers.nativeBridge.postMessage({ op: 'vibrate', ms: Number(ms) || 25 });
      }
    };
    """

    override init() {
        super.init()
        synthesizer.delegate = self
    }

    /// Adds the bridge to a web view configuration, before the web view is created. The content
    /// controller keeps the bridge alive for as long as the web view lives.
    func install(into controller: WKUserContentController) {
        controller.add(self, name: "nativeBridge")
        controller.addUserScript(WKUserScript(source: Self.pageScript, injectionTime: .atDocumentStart,
                                              forMainFrameOnly: true))
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any], let op = body["op"] as? String else { return }
        switch op {
        case "speak":
            speak(text: body["text"] as? String ?? "",
                  languageTag: body["lang"] as? String ?? "en-US",
                  rate: (body["rate"] as? NSNumber)?.doubleValue ?? 1,
                  id: body["id"] as? String ?? "")
        case "stop":
            stopSpeaking()
        case "vibrate":
            vibrate(milliseconds: (body["ms"] as? NSNumber)?.doubleValue ?? 25)
        default:
            break
        }
    }

    func stopSpeaking() {
        generation += 1
        if synthesizer.isSpeaking {
            synthesizer.stopSpeaking(at: .immediate)
        }
    }

    // MARK: - Speech

    private func speak(text: String, languageTag: String, rate: Double, id: String) {
        guard !paused, let voice = Self.bestVoice(for: languageTag) else {
            report(id, ok: false) // in the background, or no voice for this language
            return
        }
        stopSpeaking() // like Android's QUEUE_FLUSH: a new phrase replaces the one being said
        let utterance = AVSpeechUtterance(string: text)
        utterance.voice = voice
        // The page's speeds (0.75 slow ... 1.15 quick) are relative to a natural pace.
        utterance.rate = AVSpeechUtteranceDefaultSpeechRate * Float(min(max(rate, 0.5), 1.5))
        pageIds[ObjectIdentifier(utterance)] = id
        // Speaking in the same turn as stopSpeaking() can lose the new phrase on some iOS versions,
        // so start it on the next one, unless another stop came in between.
        let queuedAt = generation
        DispatchQueue.main.async { [weak self] in
            guard let self else { return }
            if self.generation == queuedAt && !self.paused {
                self.synthesizer.speak(utterance)
            } else {
                self.finish(utterance)
            }
        }
    }

    /// The voice for a language tag such as "en-US" or "ar-SA". Only Apple's own voices (they
    /// all run on the device; a voice from another app might not), never the novelty voices
    /// ("Bubbles", "Zarvox", ...) or the owner's Personal Voice. Among those, the requested
    /// region first, and at the best quality installed, the system's own default for it.
    private static func bestVoice(for languageTag: String) -> AVSpeechSynthesisVoice? {
        let language = String(languageTag.split(separator: "-").first ?? Substring(languageTag)).lowercased()
        let usable = AVSpeechSynthesisVoice.speechVoices().filter { voice in
            let voiceLanguage = voice.language.lowercased()
            guard voice.identifier.hasPrefix("com.apple."),
                  voiceLanguage == language || voiceLanguage.hasPrefix(language + "-") else { return false }
            if #available(iOS 17.0, *), !voice.voiceTraits.isDisjoint(with: [.isNoveltyVoice, .isPersonalVoice]) {
                return false
            }
            return true
        }
        let sameRegion = usable.filter { $0.language.caseInsensitiveCompare(languageTag) == .orderedSame }
        let pool = sameRegion.isEmpty ? usable : sameRegion
        guard let bestQuality = pool.map({ $0.quality.rawValue }).max() else { return nil }
        let best = pool.filter { $0.quality.rawValue == bestQuality }
        if let systemDefault = AVSpeechSynthesisVoice(language: languageTag),
           let match = best.first(where: { $0.identifier == systemDefault.identifier }) {
            return match
        }
        return best.min { $0.identifier < $1.identifier } // a fixed choice, not the list's order
    }

    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
        DispatchQueue.main.async { self.finish(utterance) }
    }

    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didCancel utterance: AVSpeechUtterance) {
        DispatchQueue.main.async { self.finish(utterance) }
    }

    private func finish(_ utterance: AVSpeechUtterance) {
        if let id = pageIds.removeValue(forKey: ObjectIdentifier(utterance)) {
            report(id, ok: true)
        }
    }

    private func report(_ id: String, ok: Bool) {
        // JSON-encode the id so any characters in it arrive as a plain string.
        guard let data = try? JSONSerialization.data(withJSONObject: [id]),
              let idArray = String(data: data, encoding: .utf8) else { return }
        let script = "window.AlphabetSafariSpeechDone && window.AlphabetSafariSpeechDone(\(idArray)[0], \(ok))"
        DispatchQueue.main.async { [weak self] in
            self?.webView?.evaluateJavaScript(script, completionHandler: nil)
        }
    }

    // MARK: - Haptics

    private func vibrate(milliseconds: Double) {
        // iPhones tap rather than buzz for a set time: a light tap for touches, a firmer one for
        // longer cues. iPads have no haptics, so this does nothing there.
        UIImpactFeedbackGenerator(style: milliseconds >= 60 ? .medium : .light).impactOccurred()
    }
}
