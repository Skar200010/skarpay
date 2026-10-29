package com.skarpay.skarpay_observer

import android.content.Context
import android.util.Log
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

/**
 * Reads the pairing credentials stored by the Flutter layer
 * (shared_preferences -> FlutterSharedPreferences) and forwards
 * a signed bank SMS / notification observation to the SkarPay API.
 */
object ObservationSender {
    private const val TAG = "SkarPayObserver"
    private const val MAX_ATTEMPTS = 3
    private val executor = Executors.newSingleThreadExecutor()

    private fun prefs(context: Context) =
        context.getSharedPreferences("FlutterSharedPreferences", Context.MODE_PRIVATE)

    fun send(
        context: Context,
        rawText: String,
        source: String,
        sender: String? = null,
        onComplete: (() -> Unit)? = null,
    ) {
        if (rawText.isBlank()) {
            onComplete?.invoke()
            return
        }
        val appContext = context.applicationContext
        executor.execute {
            try {
                deliver(appContext, rawText, source, sender)
            } finally {
                onComplete?.invoke()
            }
        }
    }

    private fun deliver(context: Context, rawText: String, source: String, sender: String?) {
        try {
            val p = prefs(context)
            val baseUrl = (p.getString("flutter.base_url", null)
                ?: p.getString("flutter.baseUrl", null)
                ?: "").trimEnd('/')
            val secret = p.getString("flutter.device_secret", null)
            val deviceId = p.getString("flutter.device_id", null)
            val merchantId = p.getString("flutter.merchant_id", null)

            if (baseUrl.isEmpty()) {
                Log.w(TAG, "No base URL configured, dropping observation")
                return
            }

            val timestamp = System.currentTimeMillis()
            val signature = secret?.let { hmacSha256(it, "$rawText:$timestamp") }

            val payload = JSONObject().apply {
                put("source", source)
                put("rawText", rawText)
                if (deviceId != null) put("deviceId", deviceId)
                if (merchantId != null) put("merchantId", merchantId)
                if (sender != null) put("sender", sender)
                put("timestamp", timestamp)
                if (signature != null) put("signature", signature)
            }
            val payloadText = payload.toString()

            var lastError: String? = null
            for (attempt in 1..MAX_ATTEMPTS) {
                var conn: HttpURLConnection? = null
                try {
                    conn = (URL("$baseUrl/api/v1/observers/sms").openConnection() as HttpURLConnection).apply {
                        requestMethod = "POST"
                        connectTimeout = 6_000
                        readTimeout = 6_000
                        doOutput = true
                        setRequestProperty("Content-Type", "application/json")
                        setRequestProperty("Accept", "application/json")
                        if (signature != null) {
                            setRequestProperty("X-Device-Signature", signature)
                            setRequestProperty("X-Device-Timestamp", timestamp.toString())
                        }
                    }

                    conn.outputStream.use { it.write(payloadText.toByteArray(Charsets.UTF_8)) }
                    val code = conn.responseCode
                    val responseBody = if (code in 200..299) {
                        conn.inputStream.bufferedReader().use { it.readText() }
                    } else {
                        conn.errorStream?.bufferedReader()?.use { it.readText() } ?: ""
                    }

                    if (code in 200..299) {
                        val matched = responseBody.contains("\"matched\":true")
                        Log.i(TAG, "Observation $source -> HTTP $code $responseBody")
                        recordSend(context, true, source, "HTTP $code matched=$matched")
                        return
                    }
                    lastError = "HTTP $code: $responseBody"
                } catch (e: Exception) {
                    lastError = e.message
                    Log.w(TAG, "Observation attempt $attempt failed: ${e.message}")
                } finally {
                    conn?.disconnect()
                }

                if (attempt < MAX_ATTEMPTS) Thread.sleep(1_500L)
            }

            // SMS receivers get a short background window; notifications can be
            // delayed by Doze. Log loudly so logcat shows the lost observation.
            Log.e(TAG, "Dropping observation after $MAX_ATTEMPTS attempts: $lastError")
            recordSend(context, false, source, lastError ?: "unknown error")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to send observation: ${e.message}", e)
            recordSend(context, false, source, e.message ?: "exception")
        }
    }

    private fun recordSend(context: Context, ok: Boolean, source: String, detail: String) {
        try {
            context.getSharedPreferences("skarpay_debug", Context.MODE_PRIVATE).edit()
                .putLong("last_send_at", System.currentTimeMillis())
                .putBoolean("last_send_ok", ok)
                .putString("last_send_detail", detail)
                .putString("last_send_source", source)
                .apply()
        } catch (e: Exception) {
            Log.w(TAG, "Unable to record send debug info: ${e.message}")
        }
    }

    private fun hmacSha256(secret: String, message: String): String {
        val mac = Mac.getInstance("HmacSHA256")
        mac.init(SecretKeySpec(secret.toByteArray(Charsets.UTF_8), "HmacSHA256"))
        return mac.doFinal(message.toByteArray(Charsets.UTF_8)).joinToString("") {
            String.format("%02x", it.toInt() and 0xff)
        }
    }
}
