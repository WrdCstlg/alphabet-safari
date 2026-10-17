plugins {
    alias(libs.plugins.android.application)
}

android {
    namespace = "com.alphabetsafari.app"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.alphabetsafari.app"
        minSdk = 24
        // Google Play requires API 36 for new apps and updates from 2026-08-31.
        targetSdk = 36
        versionCode = 1
        versionName = "1.0.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    // AGP 9 compiles Kotlin itself; its jvmTarget follows targetCompatibility.
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.appcompat)
    implementation(libs.material)
    implementation(libs.androidx.webkit)
}
