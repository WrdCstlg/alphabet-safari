package com.alphabetsafari.app

import android.annotation.SuppressLint
import android.content.Context
import android.os.Build
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import android.view.View
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity
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
    private val tts = TextToSpeech(context.applicationContext, this)

    @Volatile
    private var ready = false

    override fun onInit(status: Int) {
        ready = status == TextToSpeech.SUCCESS
        tts.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
            override fun onStart(utteranceId: String?) {}
            override fun onDone(utteranceId: String?) = notifyDone(utteranceId, true)
            override fun onStop(utteranceId: String?, interrupted: Boolean) = notifyDone(utteranceId, true)

            @Deprecated("Deprecated in Java")
            override fun onError(utteranceId: String?) = notifyDone(utteranceId, false)
        })
    }

    fun speak(text: String, langTag: String, rate: Float, utteranceId: String) {
        if (!ready) {
            notifyDone(utteranceId, false)
            return
        }
        val availability = tts.setLanguage(Locale.forLanguageTag(langTag))
        if (availability == TextToSpeech.LANG_MISSING_DATA || availability == TextToSpeech.LANG_NOT_SUPPORTED) {
            notifyDone(utteranceId, false)
            return
        }
        tts.setSpeechRate(rate.coerceIn(0.5f, 1.5f))
        tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, utteranceId)
    }

    fun stop() {
        if (ready) tts.stop()
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
            }
        } catch (_: Exception) {
            // Haptics optional
        }
    }

    @JavascriptInterface
    fun speak(text: String, langTag: String, rate: Float, utteranceId: String) =
        speech.speak(text, langTag, rate, utteranceId)

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

        webView = WebView(this)
        speech = NativeSpeech(this, webView)

        webView.apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.databaseEnabled = true
            settings.allowFileAccess = true
            settings.allowContentAccess = true
            settings.mediaPlaybackRequiresUserGesture = false
            settings.cacheMode = WebSettings.LOAD_DEFAULT

            // Enable smooth hardware acceleration
            setLayerType(View.LAYER_TYPE_HARDWARE, null)

            // Register Unified Android Bridge
            addJavascriptInterface(AndroidBridge(this@MainActivity, speech), "AndroidBridge")

            webViewClient = object : WebViewClient() {
                override fun shouldOverrideUrlLoading(view: WebView?, url: String?): Boolean {
                    return false
                }
            }

            webChromeClient = object : WebChromeClient() {}

            // Load the bundled offline web assets
            loadUrl("file:///android_asset/www/index.html")
        }

        setContentView(webView)
    }

    override fun onResume() {
        super.onResume()
        webView.onResume()
        enableImmersiveMode()
    }

    override fun onPause() {
        // Don't keep talking or playing clips once the app is in the background.
        speech.stop()
        webView.evaluateJavascript("document.querySelectorAll('audio').forEach(a => a.pause())", null)
        webView.onPause()
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

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }
}
