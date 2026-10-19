package com.alphabetsafari.app

import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.ApplicationInfo
import android.os.Build
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import android.speech.tts.Voice
import android.view.View
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebResourceRequest
import android.webkit.WebViewClient
import android.widget.FrameLayout
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import org.json.JSONObject
import java.util.Locale

/**
 * Android WebView has no Web Speech API, so dynamic phrases (praise, game prompts,
 * the child's name) are spoken with the platform TextToSpeech engine instead.
 * Completion is reported back to the page via window.AlphabetSafariSpeechDone(id, ok).
 */
class NativeSpeech(context: Context, private val webView: WebView) : TextToSpeech.OnInitListener {
    // Declared before `tts`: with no speech engine installed or enabled, the TextToSpeech
    // constructor calls onInit(ERROR) before it returns, while `tts` is still unassigned.
    @Volatile
    private var ready = false

    /** Set while the app is in the background: a phrase queued by a page timer then is refused. */
    @Volatile
    var paused = false

    private val tts = TextToSpeech(context.applicationContext, this)

    init {
        tts.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
            override fun onStart(utteranceId: String?) {}
            override fun onDone(utteranceId: String?) = notifyDone(utteranceId, true)
            override fun onStop(utteranceId: String?, interrupted: Boolean) = notifyDone(utteranceId, true)

            @Deprecated("Deprecated in Java")
            override fun onError(utteranceId: String?) = notifyDone(utteranceId, false)
        })
    }

    override fun onInit(status: Int) {
        ready = status == TextToSpeech.SUCCESS
    }

    /**
     * [localOnly] is set for phrases containing the child's name: they may only be spoken by a
     * voice that runs on the device. If there is none, report failure and let the page fall
     * back to the same phrase without the name, rather than sending the name to a cloud voice.
     */
    fun speak(text: String, langTag: String, rate: Float, utteranceId: String, localOnly: Boolean) {
        if (!ready || paused) {
            notifyDone(utteranceId, false)
            return
        }
        val locale = Locale.forLanguageTag(langTag)
        val availability = tts.setLanguage(locale)
        if (availability == TextToSpeech.LANG_MISSING_DATA || availability == TextToSpeech.LANG_NOT_SUPPORTED) {
            notifyDone(utteranceId, false)
            return
        }
        val onDevice = bestOnDeviceVoice(locale)
        val onDeviceVoiceSet = onDevice != null && tts.setVoice(onDevice) == TextToSpeech.SUCCESS
        if (localOnly && !onDeviceVoiceSet) {
            notifyDone(utteranceId, false)
            return
        }
        tts.setSpeechRate(rate.coerceIn(0.5f, 1.5f))
        // Without a callback the page would wait for this phrase forever.
        if (tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, utteranceId) != TextToSpeech.SUCCESS) {
            notifyDone(utteranceId, false)
        }
    }

    fun stop() {
        if (ready) tts.stop()
    }

    /**
     * An installed voice for [locale] that runs on the device: the requested country first (an
     * en-US phrase shouldn't come out British), and among those the engine's own choice when it
     * qualifies, otherwise the best quality.
     */
    private fun bestOnDeviceVoice(locale: Locale): Voice? = try {
        val onDevice = tts.voices.orEmpty().filter { v ->
            v.locale.language == locale.language &&
                !v.isNetworkConnectionRequired &&
                TextToSpeech.Engine.KEY_FEATURE_NOT_INSTALLED !in v.features
        }
        val candidates = onDevice.filter { it.locale.country.equals(locale.country, ignoreCase = true) }.ifEmpty { onDevice }
        val enginePick = tts.voice
        if (enginePick != null && enginePick in candidates) enginePick else candidates.maxByOrNull { it.quality }
    } catch (_: Exception) {
        null
    }

    fun shutdown() {
        ready = false
        tts.shutdown()
    }

    private fun notifyDone(utteranceId: String?, ok: Boolean) {
        val id = JSONObject.quote(utteranceId ?: return)
        webView.post {
            webView.evaluateJavascript(
                "window.AlphabetSafariSpeechDone && window.AlphabetSafariSpeechDone($id, $ok)", null
            )
        }
    }
}

class AndroidBridge(private val context: Context, private val speech: NativeSpeech) {
    @JavascriptInterface
    fun vibrate(durationMs: Long) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val vibratorManager = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
                vibratorManager?.defaultVibrator?.vibrate(
                    VibrationEffect.createOneShot(durationMs.coerceIn(10, 500), VibrationEffect.DEFAULT_AMPLITUDE)
                )
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                @Suppress("DEPRECATION")
                val vibrator = context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
                vibrator?.vibrate(
                    VibrationEffect.createOneShot(durationMs.coerceIn(10, 500), VibrationEffect.DEFAULT_AMPLITUDE)
                )
            } else {
                // Android 7.x (API 24-25), within minSdk: the older call.
                @Suppress("DEPRECATION")
                (context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator)?.vibrate(durationMs.coerceIn(10, 500))
            }
        } catch (_: Exception) {
            // Haptics optional
        }
    }

    @JavascriptInterface
    fun speak(text: String, langTag: String, rate: Float, utteranceId: String, localOnly: Boolean) =
        speech.speak(text, langTag, rate, utteranceId, localOnly)

    @JavascriptInterface
    fun stopSpeaking() = speech.stop()

    @JavascriptInterface
    fun getPlatform(): String = "android"
}

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var speech: NativeSpeech

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Make activity full-screen immersive for children
        enableImmersiveMode()

        // Debug builds only: lets tests/android-device.mjs drive the page over DevTools.
        if ((applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE) != 0) {
            WebView.setWebContentsDebuggingEnabled(true)
        }

        webView = WebView(this)
        speech = NativeSpeech(this, webView)

        webView.apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            // file:///android_asset stays readable without these; nothing else on the device should be.
            settings.allowFileAccess = false
            settings.allowContentAccess = false
            settings.mediaPlaybackRequiresUserGesture = false
            settings.cacheMode = WebSettings.LOAD_DEFAULT

            // Enable smooth hardware acceleration
            setLayerType(View.LAYER_TYPE_HARDWARE, null)

            // Register Unified Android Bridge
            addJavascriptInterface(AndroidBridge(this@MainActivity, speech), "AndroidBridge")

            // The page has AndroidBridge attached, so it must never navigate away from the
            // bundled app. Any other URL is simply refused.
            webViewClient = object : WebViewClient() {
                override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                    val url = request?.url?.toString() ?: return true
                    return !url.startsWith(APP_ASSET_ROOT)
                }
            }

            webChromeClient = object : WebChromeClient() {}

            // Load the bundled offline web assets
            loadUrl(APP_ASSET_ROOT + "index.html")
        }

        // Immersive mode lets the window reach under a camera cutout (always, from targetSdk 35),
        // which hid the header buttons in landscape. Keep the page clear of it; the strip
        // behind the cutout gets the page's top background colour. Also clear of the system
        // bars when they can't be hidden (split screen, desktop windowing; hidden bars take no
        // room) and of the on-screen keyboard, which would otherwise cover the name field:
        // in this edge-to-edge window the system doesn't resize the page for it.
        val root = FrameLayout(this).apply {
            setBackgroundColor(ContextCompat.getColor(this@MainActivity, R.color.page_background))
            addView(webView, FrameLayout.LayoutParams(MATCH_PARENT, MATCH_PARENT))
        }
        ViewCompat.setOnApplyWindowInsetsListener(root) { view, insets ->
            val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout())
            val keyboard = insets.getInsets(WindowInsetsCompat.Type.ime())
            view.setPadding(bars.left, bars.top, bars.right, maxOf(bars.bottom, keyboard.bottom))
            WindowInsetsCompat.CONSUMED
        }
        setContentView(root)

        // Back first closes an open dialog (e.g. the parent gate a toddler wandered into);
        // only when nothing is open does it leave the app. With targetSdk 36 the deprecated
        // onBackPressed() is no longer called, so this goes through the dispatcher.
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                webView.evaluateJavascript(
                    "window.AlphabetSafariBack ? window.AlphabetSafariBack() : false"
                ) { handled ->
                    if (handled != "true") {
                        isEnabled = false
                        onBackPressedDispatcher.onBackPressed()
                        isEnabled = true
                    }
                }
            }
        })
    }

    override fun onResume() {
        super.onResume()
        webView.onResume()
        webView.resumeTimers()
        speech.paused = false
        enableImmersiveMode()
    }

    override fun onPause() {
        // Don't keep talking or playing clips once the app is in the background, including a
        // prompt a page timer would start a moment later (WebView.onPause doesn't stop timers).
        speech.paused = true
        speech.stop()
        webView.evaluateJavascript("window.AlphabetSafariPause && window.AlphabetSafariPause()", null)
        webView.onPause()
        webView.pauseTimers()
        super.onPause()
    }

    override fun onDestroy() {
        speech.shutdown()
        webView.destroy()
        super.onDestroy()
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) {
            enableImmersiveMode()
        }
    }

    private fun enableImmersiveMode() {
        WindowCompat.setDecorFitsSystemWindows(window, false)
        val controller = WindowInsetsControllerCompat(window, window.decorView)
        controller.hide(WindowInsetsCompat.Type.systemBars())
        controller.systemBarsBehavior =
            WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
    }

    companion object {
        private const val APP_ASSET_ROOT = "file:///android_asset/www/"
    }
}
