package com.skarpay.skarpay_observer

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log

/**
 * Catches bank app push notifications (often faster than SMS) and forwards
 * them to the backend so a payment can be matched automatically.
 */
class NotificationListener : NotificationListenerService() {
    override fun onNotificationPosted(sbn: StatusBarNotification) {
        val notification = sbn.notification ?: return
        val extras = notification.extras ?: return

        val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString().orEmpty()
        val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString().orEmpty()
        val bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString().orEmpty()
        val body = listOf(title, text, bigText)
            .filter { it.isNotBlank() }
            .distinct()
            .joinToString(separator = " ")
            .trim()

        if (body.isEmpty()) return
        val bankLike = looksLikeBankNotification(sbn.packageName, body)
        recordDebugNotification(sbn.packageName, body, bankLike)
        if (!bankLike) return

        Log.i(TAG, "Bank notification from ${sbn.packageName}: $body")
        ObservationSender.send(this, body, "PUSH", sbn.packageName)
    }

    private fun recordDebugNotification(packageName: String, body: String, bankLike: Boolean) {
        try {
            getSharedPreferences("skarpay_debug", MODE_PRIVATE).edit()
                .putString("last_notification_text", body)
                .putString("last_notification_package", packageName)
                .putLong("last_notification_at", System.currentTimeMillis())
                .putBoolean("last_notification_banklike", bankLike)
                .apply()
        } catch (e: Exception) {
            Log.w(TAG, "Unable to record notification debug info: ${e.message}")
        }
    }

    private fun looksLikeBankNotification(packageName: String, text: String): Boolean {
        val knownBankPackage = BANK_PACKAGES.any { packageName.contains(it, ignoreCase = true) }
        val t = text.lowercase()
        val hasAmount = Regex("(rs\\.?|inr|₹)\\s*[\\d,]+(\\.\\d{1,2})?").containsMatchIn(t)
        val hasKeyword = listOf("credited", "received", "credit", "deposit", "utr", "upi", "ref").any { t.contains(it) }
        // UPI apps also surface credit notifications; keep the filter keyword based.
        return hasAmount && (knownBankPackage || hasKeyword)
    }

    companion object {
        private const val TAG = "SkarPayObserver"
        private val BANK_PACKAGES = listOf(
            "hdfc", "sbi", "icici", "axis", "kotak", "pnb", "yesbank", "idbi",
            "bankofbaroda", "canara", "paytm", "phonepe", "gpay", "google.android.apps.nbu",
        )
    }
}
