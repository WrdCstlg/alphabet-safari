import java.util.Properties

plugins {
    alias(libs.plugins.android.application)
}

// Release signing with the Play upload key. CI passes it through environment variables;
// locally, android/keystore.properties (git-ignored, see README-ANDROID.md) works too.
// Without either, bundleRelease still builds, unsigned, which proves the release config.
val keystoreProperties = Properties().apply {
    val file = rootProject.file("keystore.properties")
    if (file.exists()) file.inputStream().use { load(it) }
}

fun signingValue(envName: String, propertyName: String): String? =
    providers.environmentVariable(envName).orNull?.takeIf { it.isNotBlank() }
        ?: keystoreProperties.getProperty(propertyName)

val uploadStoreFile = signingValue("ANDROID_KEYSTORE_FILE", "storeFile")

android {
    namespace = "com.alphabetsafari.app"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.alphabetsafari.app"
        minSdk = 24
        // Google Play requires API 36 for new apps and updates from 2026-08-31.
        targetSdk = 36
        // Play needs a higher versionCode for every upload; CI passes -PversionCode=<commit count>.
        // The release workflow can set the user-visible versionName (-PversionName=1.0.1).
        versionCode = providers.gradleProperty("versionCode").orNull?.toInt() ?: 1
        versionName = providers.gradleProperty("versionName").orNull ?: "1.0.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    signingConfigs {
        if (uploadStoreFile != null) {
            create("upload") {
                storeFile = rootProject.file(uploadStoreFile)
                storePassword = signingValue("ANDROID_KEYSTORE_PASSWORD", "storePassword")
                keyAlias = signingValue("ANDROID_KEY_ALIAS", "keyAlias")
                keyPassword = signingValue("ANDROID_KEY_PASSWORD", "keyPassword")
            }
        }
    }

    buildTypes {
        release {
            // R8 drops the unused AndroidX/Material code; the WebView bridge is kept by
            // proguard-rules.pro. The bundle carries the mapping file for Play's crash reports.
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            signingConfig = signingConfigs.findByName("upload")
        }
    }
    // AGP 9 compiles Kotlin itself; its jvmTarget follows targetCompatibility.
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

// The UI is all WebView, so AppCompat's theme is enough (Material was only a theme parent).
dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.appcompat)
}
