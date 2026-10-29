package com.skarpay.skarpay_observer

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import android.util.Log

/**
 * Captures incoming bank SMS even when the Flutter UI is not running
 * and forwards it to the backend for automatic payment matching.
 */
class SmsReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return

        val messages = try {
            Telephony.Sms.Intents.getMessagesFromIntent(intent)
        } catch (e: Exception) {
            Log.e(TAG, "Unable to read SMS: ${e.message}")
            null
        } ?: return

        if (messages.isEmpty()) return

        val body = messages.joinToString(separator = "") { it.messageBody ?: "" }.trim()
        val sender = messages.firstOrNull()?.originatingAddress ?: ""

        val bankLike = body.isNotEmpty() && looksLikeBankMessage(body)
        recordDebugSms(context, body, sender, bankLike)

        if (body.isEmpty() || !bankLike) return

        Log.i(TAG, "Bank SMS from $sender: $body")

        // goAsync keeps this broadcast alive while the network call (and its
        // retries) runs, even when the screen is off / app is in background.
        val pendingResult = goAsync()
        ObservationSender.send(context, body, "SMS", sender) {
            try {
                pendingResult.finish()
            } catch (e: Exception) {
                Log.w(TAG, "Unable to finish broadcast: ${e.message}")
            }
        }
    }

    private fun recordDebugSms(context: Context, body: String, sender: String, bankLike: Boolean) {
        try {
            context.getSharedPreferences("skarpay_debug", Context.MODE_PRIVATE).edit()
                .putString("last_sms_text", body)
                .putString("last_sms_sender", sender)
                .putLong("last_sms_at", System.currentTimeMillis())
                .putBoolean("last_sms_banklike", bankLike)
                .apply()
        } catch (e: Exception) {
            Log.w(TAG, "Unable to record SMS debug info: ${e.message}")
        }
    }

    private fun looksLikeBankMessage(text: String): Boolean {
        val t = text.lowercase()
        val hasAmount = Regex("(rs\\.?|inr|₹)\\s*[\\d,]+(\\.\\d{1,2})?").containsMatchIn(t)
        val hasKeyword = listOf("credited", "received", "credit", "deposit", "utr", "upi", "ref").any { t.contains(it) }
        return hasAmount && hasKeyword
    }

    companion object {
        private const val TAG = "SkarPayObserver"
    }
}
