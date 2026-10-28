# SkarPay Android Observer App — Full Build Prompt

## Objective
Build an Android app (Kotlin/Java) that automatically captures bank SMS and push notifications on the merchant's phone, signs them with HMAC-SHA256, and sends them to the SkarPay backend for automatic payment verification.

## Tech Stack
- Language: Kotlin (or Java)
- Min SDK: 26 (Android 8.0)
- Target SDK: 34
- Build: Gradle (KTS)
- Dependencies: OkHttp3, ZXing (QR scanner), Gson

## Architecture

### 1. SMS Receiver (SmsReceiver.java)
- Register for `android.provider.Telephony.SMS_RECEIVED` broadcast
- Extract SMS body and sender
- Filter: only process if SMS contains banking keywords (credited, received, Rs, INR, UPI, UTR)
- Extract: amount, UTR/reference, sender VPA
- Build payload: `{ source: "SMS", rawText: smsBody, sender: senderAddress, timestamp: now }`
- Sign with HMAC-SHA256(deviceSecret, rawText + timestamp)
- Send to `POST /api/v1/observers/sms`

### 2. Notification Listener (PaymentNotificationListenerService.java)
- Extend `NotificationListenerService`
- Listen for bank app notifications (HDFC, ICICI, SBI, Axis, Kotak, PNB, etc.)
- Extract notification text (title + body)
- Filter: contains banking keywords
- Build payload: `{ source: "PUSH", rawText: notificationText, appPackage: packageName, timestamp: now }`
- Sign and send to `/api/v1/observers/sms`

### 3. API Client (ApiClient.java)
- Base URL: configurable (default `http://10.0.2.2:4100` for emulator, user sets for production)
- Endpoints:
  - `POST /api/v1/observers/sms` — send signed observation
  - `POST /api/v1/pollers/android/heartbeat` — heartbeat every 60s
  - `POST /api/v1/pollers/android/events` — fetch active window info
- Pairing: `POST /api/v1/pollers/android/pair` with enrollment token
- Auth: HMAC-SHA256 signature in header `X-Device-Signature` + `X-Device-Timestamp`
- Store: base_url, device_secret, device_id, merchant_id in SharedPreferences

### 4. Pairing Flow (MainActivity.java)
- Input: Base URL, Enrollment Token, Device Name
- Call pair endpoint → receive device_secret
- Store credentials in SharedPreferences
- Show "Paired ✅" status
- Start foreground service

### 5. Foreground Service (ForegroundService.java)
- Runs in background (persistent notification)
- Registers SMS receiver
- Starts notification listener
- Sends heartbeat every 60s
- Auto-restart on boot (BootReceiver)

### 6. QR Scanner (QrScannerActivity.java)
- Use ZXing to scan QR code from SkarPay admin panel
- QR contains: base_url, enrollment_token, merchant_id
- Auto-fill pairing form

### Payload Format (POST /api/v1/observers/sms)
```json
{
  "source": "SMS" | "PUSH",
  "rawText": "Rs.499.00 credited to A/c XX1234. UTR 987654321098",
  "sender": "HDFCBK",
  "appPackage": "com.hdfc.mobilebanking",
  "receivingAccountId": "optional-uuid",
  "timestamp": 1730000000000,
  "signature": "hmac-sha256-hex"
}
```

### Signature Calculation
```
signature = HMAC-SHA256(deviceSecret, rawText + ":" + timestamp)
```
Sent as header: `X-Device-Signature: <signature>`, `X-Device-Timestamp: <timestamp>`

### Permissions Required (AndroidManifest.xml)
```xml
<uses-permission android:name="android.permission.RECEIVE_SMS" />
<uses-permission android:name="android.permission.READ_SMS" />
<uses-permission android:name="android.permission.BIND_NOTIFICATION_LISTENER_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_DATA_SYNC" />
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.CAMERA" />
```

### Bank App Package Names to Monitor
- com.hdfc.mobilebanking (HDFC)
- com.sbi.lotusintouch (SBI)
- com.csam.icici.bank.imobile (ICICI)
- com.axis.mobile (Axis)
- com.kotak.mobile (Kotak)
- com.pnb (PNB)
- com.yesbank (YES Bank)
- com.idbi (IDBI)
- com.bankofbaroda (BOB)
- com.canarabank (Canara)

### SMS Sender IDs to Monitor
- HDFCBK, HDFCBN, HDFC
- SBIN, SBIINB, SBI
- ICICIB, ICICIT
- AXISBK, AXIS
- KOTAKB, KOTAK
- PNBSMS, PNB
- IDBIBK, IDBI
- BARODA, BOB
- CANBNK, CANARA

### Key Features
1. **Auto-start on boot** — BootReceiver starts ForegroundService
2. **Persistent notification** — "SkarPay Observer Active" with heartbeat status
3. **Battery optimization** — request exemption from doze mode
4. **Offline queue** — store unsent observations locally, retry when online
5. **HMAC signing** — every payload signed with device secret
6. **Anti-replay** — timestamp within 60s of server time
7. **Deduplication** — don't send same SMS twice (hash-based)

### Build & Deploy
1. Open in Android Studio
2. Update base URL in ApiClient.java (line 36): `"http://your-server:4100"`
3. Build APK: `./gradlew assembleRelease`
4. Install on merchant's phone
5. Pair with SkarPay admin panel (scan QR or enter URL + token)
6. App runs in background, captures SMS, auto-verifies payments

### Testing
- Use `simulate-notification.js` to simulate bank SMS
- Check `/api/v1/observers/sms` endpoint receives payload
- Verify HMAC signature matches
- Confirm payment auto-transitions to SUCCESS

### Security
- Device secret stored in SharedPreferences (encrypted)
- HMAC-SHA256 signature on every request
- Timestamp anti-replay (60s window)
- HTTPS in production (network_security_config.xml)
- No sensitive data in logs
