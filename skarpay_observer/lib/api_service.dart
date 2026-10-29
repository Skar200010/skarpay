import 'dart:convert';
import 'package:crypto/crypto.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class ApiService {
  static const MethodChannel _channel = MethodChannel('skarpay/observer');
  static const String _keyBaseUrl = 'base_url';
  static const String _keyDeviceSecret = 'device_secret';
  static const String _keyDeviceId = 'device_id';
  static const String _keyMerchantId = 'merchant_id';

  static Future<String> getBaseUrl() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_keyBaseUrl) ?? 'http://10.0.2.2:4100';
  }

  static Future<void> setBaseUrl(String url) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyBaseUrl, url.replaceAll(RegExp(r'/+$'), ''));
  }

  static Future<String?> getDeviceSecret() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_keyDeviceSecret);
  }

  static Future<void> setDeviceSecret(String secret) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyDeviceSecret, secret);
  }

  static Future<String?> getDeviceId() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_keyDeviceId);
  }

  static Future<void> setDeviceId(String id) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyDeviceId, id);
  }

  static Future<String?> getMerchantId() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_keyMerchantId);
  }

  static Future<void> setMerchantId(String id) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyMerchantId, id);
  }

  static Future<bool> isPaired() async {
    final secret = await getDeviceSecret();
    return secret != null && secret.isNotEmpty;
  }

  // Native permission / listener status
  static Future<Map<String, dynamic>> getNativeStatus() async {
    try {
      final res = await _channel.invokeMethod<Map>('getStatus');
      return Map<String, dynamic>.from(res ?? const {});
    } catch (_) {
      return {};
    }
  }

  static Future<void> requestSmsPermission() async {
    try {
      await _channel.invokeMethod('requestSmsPermission');
    } catch (_) {}
  }

  static Future<void> openNotificationSettings() async {
    try {
      await _channel.invokeMethod('openNotificationSettings');
    } catch (_) {}
  }

  static Future<void> requestBatteryExemption() async {
    try {
      await _channel.invokeMethod('requestIgnoreBatteryOptimizations');
    } catch (_) {}
  }

  // Pair device with SkarPay
  static Future<Map<String, dynamic>> pair({
    required String baseUrl,
    required String enrollmentToken,
    required String deviceName,
    String? merchantId,
  }) async {
    final url = '$baseUrl/api/v1/pollers/android/pair';
    final effectiveMerchantId = merchantId ?? await getMerchantId();
    final response = await http.post(
      Uri.parse(url),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'enrollmentToken': enrollmentToken,
        'deviceName': deviceName,
        'deviceModel': 'Flutter Device',
        if (effectiveMerchantId != null && effectiveMerchantId.isNotEmpty) 'merchantId': effectiveMerchantId,
      }),
    );
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      await setBaseUrl(baseUrl);
      await setDeviceSecret(data['deviceSecret'] ?? data['device_secret'] ?? '');
      await setDeviceId(data['deviceId'] ?? data['device_id'] ?? '');
      await setMerchantId(data['merchantId'] ?? data['merchant_id'] ?? '');
      return data;
    }
    throw Exception('Pairing failed: ${response.statusCode} ${response.body}');
  }

  // Send SMS observation
  static Future<Map<String, dynamic>> sendObservation({
    required String rawText,
    String source = 'SMS',
  }) async {
    final baseUrl = await getBaseUrl();
    final secret = await getDeviceSecret();
    final deviceId = await getDeviceId();
    final merchantId = await getMerchantId();
    if (secret == null) throw Exception('Not paired');

    final timestamp = DateTime.now().millisecondsSinceEpoch;
    final signature = _hmacSha256(secret, '$rawText:$timestamp');

    final url = '$baseUrl/api/v1/observers/sms';
    final response = await http.post(
      Uri.parse(url),
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Signature': signature,
        'X-Device-Timestamp': timestamp.toString(),
      },
      body: jsonEncode({
        'source': source,
        'rawText': rawText,
        'deviceId': deviceId,
        'merchantId': merchantId,
        'timestamp': timestamp,
      }),
    );
    return jsonDecode(response.body);
  }

  // Send heartbeat
  static Future<bool> sendHeartbeat() async {
    try {
      final baseUrl = await getBaseUrl();
      final deviceId = await getDeviceId();
      final url = '$baseUrl/api/v1/pollers/android/heartbeat';
      final response = await http.post(
        Uri.parse(url),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'deviceId': deviceId}),
      );
      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }

  // Fetch payments for merchant
  static Future<List<dynamic>> fetchPayments() async {
    final baseUrl = await getBaseUrl();
    final url = '$baseUrl/api/v1/payments?limit=20';
    final response = await http.get(Uri.parse(url));
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return data['payments'] ?? [];
    }
    return [];
  }

  // Fetch merchant info
  static Future<Map<String, dynamic>?> fetchMerchant() async {
    final baseUrl = await getBaseUrl();
    final merchantId = await getMerchantId();
    if (merchantId == null) return null;
    final response = await http.get(Uri.parse('$baseUrl/api/v1/merchants/$merchantId'));
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return data['merchant'];
    }
    return null;
  }

  // Fetch VPAs
  static Future<List<dynamic>> fetchVpas() async {
    return [];
  }

  static String _hmacSha256(String key, String data) {
    final hmac = Hmac(sha256, utf8.encode(key));
    return hmac.convert(utf8.encode(data)).toString();
  }
}
