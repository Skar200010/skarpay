package com.skarpay.skarpay_observer

import android.Manifest
import android.content.ComponentName
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    private val channelName = "skarpay/observer"
    private val smsRequestCode = 1001

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, channelName)
            .setMethodCallHandler { call, result ->
                when (call.method) {
                    "getStatus" -> {
                        val debug = getSharedPreferences("skarpay_debug", MODE_PRIVATE)
                        result.success(
                            mapOf(
                                "smsPermission" to hasSmsPermission(),
                                "notificationAccess" to hasNotificationAccess(),
                                "batteryUnrestricted" to isIgnoringBatteryOptimizations(),
                                "paired" to isPaired(),
                                "lastSmsText" to debug.getString("last_sms_text", null),
                                "lastSmsSender" to debug.getString("last_sms_sender", null),
                                "lastSmsAt" to debug.getLong("last_sms_at", 0L),
                                "lastSmsBankLike" to debug.getBoolean("last_sms_banklike", false),
                                "lastNotificationText" to debug.getString("last_notification_text", null),
                                "lastNotificationPackage" to debug.getString("last_notification_package", null),
                                "lastNotificationAt" to debug.getLong("last_notification_at", 0L),
                                "lastNotificationBankLike" to debug.getBoolean("last_notification_banklike", false),
                                "lastSendAt" to debug.getLong("last_send_at", 0L),
                                "lastSendOk" to debug.getBoolean("last_send_ok", false),
                                "lastSendDetail" to debug.getString("last_send_detail", null),
                                "lastSendSource" to debug.getString("last_send_source", null),
                                "baseUrl" to getSharedPreferences("FlutterSharedPreferences", MODE_PRIVATE)
                                    .getString("flutter.base_url", null),
                            )
                        )
                    }
                    "requestSmsPermission" -> {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !hasSmsPermission()) {
                            requestPermissions(
                                arrayOf(
                                    Manifest.permission.RECEIVE_SMS,
                                    Manifest.permission.READ_SMS,
                                ),
                                smsRequestCode,
                            )
                        }
                        result.success(true)
                    }
                    "openNotificationSettings" -> {
                        try {
                            startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
                            result.success(true)
                        } catch (e: Exception) {
                            result.error("settings_error", e.message, null)
                        }
                    }
                    "requestIgnoreBatteryOptimizations" -> {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !isIgnoringBatteryOptimizations()) {
                            try {
                                startActivity(
                                    Intent(
                                        Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
                                        Uri.parse("package:$packageName"),
                                    )
                                )
                            } catch (e: Exception) {
                                // Fall back to the battery-optimization list on OEMs that
                                // do not support the direct request dialog.
                                startActivity(Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS))
                            }
                        }
                        result.success(true)
                    }
                    else -> result.notImplemented()
                }
            }
    }

    private fun hasSmsPermission(): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return true
        return checkSelfPermission(Manifest.permission.RECEIVE_SMS) == PackageManager.PERMISSION_GRANTED
    }

    private fun hasNotificationAccess(): Boolean {
        val enabled = Settings.Secure.getString(
            contentResolver,
            "enabled_notification_listeners",
        ) ?: return false
        val component = ComponentName(this, NotificationListener::class.java)
        return enabled.split(":").any { entry ->
            ComponentName.unflattenFromString(entry) == component
        }
    }

    private fun isPaired(): Boolean {
        val prefs = getSharedPreferences("FlutterSharedPreferences", MODE_PRIVATE)
        val secret = prefs.getString("flutter.device_secret", null)
        return !secret.isNullOrBlank()
    }

    private fun isIgnoringBatteryOptimizations(): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return true
        val powerManager = getSystemService(POWER_SERVICE) as PowerManager
        return powerManager.isIgnoringBatteryOptimizations(packageName)
    }
}
