# Release builds currently ship unminified (isMinifyEnabled = false).
# The WebView JavaScript interface must survive if minification is ever enabled:
-keepclassmembers class com.alphabetsafari.app.AndroidBridge {
    @android.webkit.JavascriptInterface <methods>;
}
