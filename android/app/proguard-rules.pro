# Release builds are minified by R8 (isMinifyEnabled = true).
# The WebView looks up the page's bridge methods by name and checks their
# @JavascriptInterface annotation at runtime, so both must survive R8:
-keepattributes RuntimeVisibleAnnotations
-keepclassmembers class com.alphabetsafari.app.AndroidBridge {
    @android.webkit.JavascriptInterface <methods>;
}
