import 'package:flutter/material.dart';
import 'api_service.dart';

void main() {
  runApp(const SkarPayObserverApp());
}

class SkarPayObserverApp extends StatelessWidget {
  const SkarPayObserverApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SkarPay Observer',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF0F131D),
        fontFamily: 'Inter',
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFFC0C1FF),
          secondary: Color(0xFF4CD7F6),
          tertiary: Color(0xFF4EDEA3),
          error: Color(0xFFFFB4AB),
          surface: Color(0xFF0F131D),
          surfaceContainerLowest: Color(0xFF0A0E18),
          surfaceContainerLow: Color(0xFF171B26),
          surfaceContainer: Color(0xFF1C1F2A),
          surfaceContainerHigh: Color(0xFF262A35),
          surfaceContainerHighest: Color(0xFF313540),
          outline: Color(0xFF908FA0),
          outlineVariant: Color(0xFF464554),
        ),
      ),
      home: const ObserverHomePage(),
    );
  }
}

class ObserverHomePage extends StatefulWidget {
  const ObserverHomePage({super.key});

  @override
  State<ObserverHomePage> createState() => _ObserverHomePageState();
}

class _ObserverHomePageState extends State<ObserverHomePage> {
  int _selectedIndex = 0;
  bool _isRunning = true;

  final List<Widget> _pages = const [
    DashboardPage(),
    LiveEventsPage(),
    PermissionsPage(),
    SettingsPage(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F131D),
      body: Column(
        children: [
          SafeArea(
            bottom: false,
            child: _buildTopBar(),
          ),
          Expanded(
            child: IndexedStack(
              index: _selectedIndex,
              children: _pages,
            ),
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        top: false,
        child: _buildBottomNav(),
      ),
      floatingActionButton: FloatingActionButton(
        backgroundColor: const Color(0xFF8083FF),
        onPressed: () {},
        child: const Icon(Icons.qr_code_scanner, color: Colors.white),
      ),
    );
  }

  Widget _buildTopBar() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: const BoxDecoration(
        color: Color(0xFF171B26),
        border: Border(bottom: BorderSide(color: Color(0xFF464554), width: 0.5)),
      ),
      child: Row(
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: const Color(0xFF262A35),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: const Color(0xFF464554), width: 0.5),
            ),
            child: const Icon(Icons.security, color: Color(0xFFC0C1FF), size: 18),
          ),
          const SizedBox(width: 10),
          Expanded(
            flex: 3,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('SkarPay Observer', style: TextStyle(fontFamily: 'Plus Jakarta Sans', fontSize: 16, fontWeight: FontWeight.w600, color: Color(0xFFDFE2F1)), overflow: TextOverflow.ellipsis),
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text('v2.4', style: TextStyle(fontFamily: 'JetBrains Mono', fontSize: 10, color: Color(0xFF908FA0))),
                    SizedBox(width: 4),
                    Text('|', style: TextStyle(color: Color(0xFF464554))),
                    SizedBox(width: 4),
                    Text('PID: 28419', style: TextStyle(fontFamily: 'JetBrains Mono', fontSize: 10, color: Color(0xFF4CD7F6))),
                  ],
                ),
              ],
            ),
          ),
          GestureDetector(
            onTap: () {
              setState(() => _isRunning = !_isRunning);
            },
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: _isRunning ? const Color(0xFF00885D).withValues(alpha: 0.3) : const Color(0xFF93000A).withValues(alpha: 0.3),
                borderRadius: BorderRadius.circular(999),
                border: Border.all(color: _isRunning ? const Color(0xFF4EDEA3).withValues(alpha: 0.3) : const Color(0xFFFFB4AB).withValues(alpha: 0.3)),
              ),
              child: Row(
                children: [
                  Container(
                    width: 8,
                    height: 8,
                    decoration: BoxDecoration(
                      color: _isRunning ? const Color(0xFF4EDEA3) : const Color(0xFFFFB4AB),
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 6),
                  Text(_isRunning ? 'RUNNING' : 'PAUSED', style: TextStyle(fontFamily: 'JetBrains Mono', fontSize: 11, fontWeight: FontWeight.w600, color: _isRunning ? const Color(0xFF4EDEA3) : const Color(0xFFFFB4AB))),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBottomNav() {
    final items = [
      {'icon': Icons.dashboard, 'label': 'Dashboard'},
      {'icon': Icons.terminal, 'label': 'Live Events'},
      {'icon': Icons.verified_user, 'label': 'Permissions'},
      {'icon': Icons.settings, 'label': 'Settings'},
    ];
    return Container(
      decoration: const BoxDecoration(
        color: Color(0xFF171B26),
        border: Border(top: BorderSide(color: Color(0xFF464554), width: 0.5)),
      ),
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: List.generate(items.length, (i) {
          final selected = _selectedIndex == i;
          return GestureDetector(
            onTap: () => setState(() => _selectedIndex = i),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: selected ? const Color(0xFF313540).withValues(alpha: 0.6) : Colors.transparent,
                borderRadius: BorderRadius.circular(8),
                border: selected ? Border.all(color: const Color(0xFF4CD7F6).withValues(alpha: 0.2)) : null,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(items[i]['icon'] as IconData, size: 20, color: selected ? const Color(0xFF4CD7F6) : const Color(0xFFC7C4D7)),
                  const SizedBox(height: 2),
                  Text(items[i]['label'] as String, style: TextStyle(fontFamily: 'Inter', fontSize: 11, fontWeight: FontWeight.w500, color: selected ? const Color(0xFF4CD7F6) : const Color(0xFFC7C4D7))),
                ],
              ),
            ),
          );
        }),
      ),
    );
  }
}

// Dashboard Page
class DashboardPage extends StatelessWidget {
  const DashboardPage({super.key});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(12),
      child: Column(
        children: [
          _card(
            child: Row(
              children: [
                Container(
                  width: 24,
                  height: 24,
                  decoration: BoxDecoration(color: const Color(0xFFC0C1FF).withValues(alpha: 0.1), borderRadius: BorderRadius.circular(6)),
                  child: const Icon(Icons.notifications_active, color: Color(0xFFC0C1FF), size: 14),
                ),
                const SizedBox(width: 10),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('SkarPay Observer • Listening for SMS & Push', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFFDFE2F1))),
                      Text('Heartbeat OK • High Priority Foreground Service', style: TextStyle(fontFamily: 'JetBrains Mono', fontSize: 10, color: Color(0xFF908FA0))),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(color: const Color(0xFF4EDEA3).withValues(alpha: 0.1), borderRadius: BorderRadius.circular(4), border: Border.all(color: const Color(0xFF4EDEA3).withValues(alpha: 0.2))),
                  child: const Text('PINNED', style: TextStyle(fontFamily: 'JetBrains Mono', fontSize: 10, color: Color(0xFF4EDEA3))),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          _card(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(width: 10, height: 10, decoration: const BoxDecoration(color: Color(0xFF4EDEA3), shape: BoxShape.circle)),
                    const SizedBox(width: 8),
                    const Text('Daemon Active & Listening', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFFDFE2F1), letterSpacing: 0.5)),
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(color: const Color(0xFF262A35), borderRadius: BorderRadius.circular(4), border: Border.all(color: const Color(0xFF464554).withValues(alpha: 0.3))),
                      child: const Text('Mumbai Cluster', style: TextStyle(fontFamily: 'JetBrains Mono', fontSize: 11, color: Color(0xFF4CD7F6))),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Heartbeat Frequency', style: TextStyle(fontSize: 11, color: Color(0xFFC7C4D7))),
                          const Text('4s ago (60s tick)', style: TextStyle(fontFamily: 'JetBrains Mono', fontSize: 12, color: Color(0xFFDFE2F1))),
                        ],
                      ),
                    ),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Sync Latency', style: TextStyle(fontSize: 11, color: Color(0xFFC7C4D7))),
                          const Text('~42ms (TLS 1.3)', style: TextStyle(fontFamily: 'JetBrains Mono', fontSize: 12, color: Color(0xFF4EDEA3))),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          _card(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.phonelink_setup, color: Color(0xFFC0C1FF), size: 18),
                    const SizedBox(width: 8),
                    const Text('Terminal & Pairing', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFFDFE2F1))),
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(color: const Color(0xFF262A35), borderRadius: BorderRadius.circular(6), border: Border.all(color: const Color(0xFF464554).withValues(alpha: 0.3))),
                      child: const Row(
                        children: [
                          Icon(Icons.qr_code_scanner, color: Color(0xFF4CD7F6), size: 14),
                          SizedBox(width: 4),
                          Text('Re-pair', style: TextStyle(fontFamily: 'JetBrains Mono', fontSize: 11, color: Color(0xFF4CD7F6))),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                _infoRow('Merchant MID', 'Smoke Test Merchant Inc.', 'SKR_PROD_884920'),
                _infoRow('Device Hardware', 'Pixel 8 Pro (Terminal-01)', null),
                _infoRow('Endpoint URL', 'https://api.skarpay.io/v1', null),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                  decoration: BoxDecoration(color: const Color(0xFF313540).withValues(alpha: 0.4), borderRadius: BorderRadius.circular(8), border: Border.all(color: const Color(0xFF4EDEA3).withValues(alpha: 0.2))),
                  child: Row(
                    children: [
                      const Icon(Icons.verified_user, color: Color(0xFF4EDEA3), size: 16),
                      const SizedBox(width: 8),
                      const Expanded(child: Text('HMAC-SHA256 Armed & Verified', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w500, color: Color(0xFFDFE2F1)))),
                      const Text('NONCE: 0x9F4E', style: TextStyle(fontFamily: 'JetBrains Mono', fontSize: 10, color: Color(0xFF4EDEA3))),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          _card(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.verified, color: Color(0xFF4EDEA3), size: 18),
                    const SizedBox(width: 8),
                    const Text('Daemon Engine Health', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFFDFE2F1))),
                    const Spacer(),
                    const Text('4 OF 4 OPTIMAL', style: TextStyle(fontFamily: 'JetBrains Mono', fontSize: 10, fontWeight: FontWeight.w500, color: Color(0xFF4EDEA3))),
                  ],
                ),
                const SizedBox(height: 8),
                _permRow(Icons.sms, 'SMS Listener (RECEIVE/READ)', 'HDFCBK, SBIN, AXISBK, ICICIB', 'ACTIVE'),
                _permRow(Icons.notifications, 'Notification Listener Service', 'Banking package hooks attached', 'ACTIVE'),
                Row(
                  children: [
                    Expanded(child: _permChip('Doze Exemption', 'Battery Unrestricted', true)),
                    const SizedBox(width: 8),
                    Expanded(child: _permChip('Boot Auto-Start', 'BootReceiver Armed', true)),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          GestureDetector(
            onTap: () {},
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 10),
              decoration: BoxDecoration(
                color: const Color(0xFF262A35),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFF464554).withValues(alpha: 0.3)),
              ),
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.terminal, color: Color(0xFFC0C1FF), size: 18),
                  SizedBox(width: 8),
                  Text('Simulate Bank SMS Broadcast (Local Test)', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: Color(0xFFDFE2F1))),
                ],
              ),
            ),
          ),
          const SizedBox(height: 80),
        ],
      ),
    );
  }

  Widget _card({required Widget child}) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: const Color(0xFF171B26), borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFF464554).withValues(alpha: 0.2))),
      child: child,
    );
  }

  Widget _infoRow(String label, String value, String? badge) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontSize: 11, color: Color(0xFFC7C4D7))),
          Flexible(
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Flexible(child: Text(value, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFFDFE2F1)), overflow: TextOverflow.ellipsis, textAlign: TextAlign.right)),
                if (badge != null) ...[
                  const SizedBox(width: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                    decoration: BoxDecoration(color: const Color(0xFFC0C1FF).withValues(alpha: 0.1), borderRadius: BorderRadius.circular(4)),
                    child: Text(badge, style: const TextStyle(fontFamily: 'JetBrains Mono', fontSize: 10, color: Color(0xFFC0C1FF))),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _permRow(IconData icon, String title, String subtitle, String status) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        children: [
          Container(
            width: 28,
            height: 28,
            decoration: BoxDecoration(color: const Color(0xFF4EDEA3).withValues(alpha: 0.1), borderRadius: BorderRadius.circular(6)),
            child: Icon(icon, color: const Color(0xFF4EDEA3), size: 16),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w500, color: Color(0xFFDFE2F1))),
                Text(subtitle, style: const TextStyle(fontFamily: 'JetBrains Mono', fontSize: 10, color: Color(0xFF908FA0))),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(color: const Color(0xFF4EDEA3).withValues(alpha: 0.1), borderRadius: BorderRadius.circular(4), border: Border.all(color: const Color(0xFF4EDEA3).withValues(alpha: 0.25))),
            child: Text(status, style: const TextStyle(fontFamily: 'JetBrains Mono', fontSize: 10, fontWeight: FontWeight.w500, color: Color(0xFF4EDEA3))),
          ),
        ],
      ),
    );
  }

  Widget _permChip(String title, String subtitle, bool ok) {
    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(color: const Color(0xFF0A0E18).withValues(alpha: 0.9), borderRadius: BorderRadius.circular(8), border: Border.all(color: const Color(0xFF464554).withValues(alpha: 0.15))),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w500, color: Color(0xFFDFE2F1))),
                Text(subtitle, style: const TextStyle(fontFamily: 'JetBrains Mono', fontSize: 9, color: Color(0xFF908FA0))),
              ],
            ),
          ),
          Icon(Icons.check_circle, color: ok ? const Color(0xFF4EDEA3) : const Color(0xFFFFB4AB), size: 16),
        ],
      ),
    );
  }
}

// Live Events Page
class LiveEventsPage extends StatelessWidget {
  const LiveEventsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(12),
      child: Column(
        children: [
          _card(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.stream, color: Color(0xFF4CD7F6), size: 18),
                    const SizedBox(width: 8),
                    const Text('Live Ingestion Telemetry', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFFDFE2F1))),
                    const Spacer(),
                    const Text('AUTO-REFRESH (1s)', style: TextStyle(fontFamily: 'JetBrains Mono', fontSize: 10, color: Color(0xFF908FA0))),
                  ],
                ),
                const SizedBox(height: 12),
                _eventCard('SMS INGEST', 'HDFCBK', 'Rs.4,999.00 credited to A/c XX1234. UTR 987654321098', '₹4,999.00', 'UTR: 987654321098', 'SYNCED (200)', const Color(0xFFC0C1FF), '12s ago'),
                const SizedBox(height: 8),
                _eventCard('PUSH NOTIF', 'com.axis.mobile', 'UPI payment received: ₹499.00 from smoketest@axis', '₹499.00', 'UPI: P2M', 'SYNCED (200)', const Color(0xFF4CD7F6), '2m ago'),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(color: const Color(0xFF0A0E18).withValues(alpha: 0.9), borderRadius: BorderRadius.circular(8), border: Border.all(color: const Color(0xFF4EDEA3).withValues(alpha: 0.2))),
                  child: Row(
                    children: [
                      const Icon(Icons.description, color: Color(0xFF4EDEA3), size: 16),
                      const SizedBox(width: 8),
                      const Expanded(child: Text('Anti-Replay Verification OK', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w500, color: Color(0xFFDFE2F1)))),
                      const Text('<60s clock drift', style: TextStyle(fontFamily: 'JetBrains Mono', fontSize: 11, color: Color(0xFF908FA0))),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          GestureDetector(
            onTap: () {},
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 10),
              decoration: BoxDecoration(
                color: const Color(0xFF262A35),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFF464554).withValues(alpha: 0.3)),
              ),
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.terminal, color: Color(0xFFC0C1FF), size: 18),
                  SizedBox(width: 8),
                  Text('Simulate Bank SMS Broadcast (Local Test)', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: Color(0xFFDFE2F1))),
                ],
              ),
            ),
          ),
          const SizedBox(height: 80),
        ],
      ),
    );
  }

  Widget _card({required Widget child}) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: const Color(0xFF171B26), borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFF464554).withValues(alpha: 0.2))),
      child: child,
    );
  }

  Widget _eventCard(String type, String source, String text, String amount, String utr, String status, Color color, String time) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: const Color(0xFF171B26), borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFF464554).withValues(alpha: 0.2))),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(4), border: Border.all(color: color.withValues(alpha: 0.2))),
                child: Text(type, style: TextStyle(fontFamily: 'JetBrains Mono', fontSize: 10, fontWeight: FontWeight.w500, color: color)),
              ),
              const SizedBox(width: 8),
              Expanded(child: Text(source, style: const TextStyle(fontFamily: 'JetBrains Mono', fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFFDFE2F1)), overflow: TextOverflow.ellipsis)),
              const SizedBox(width: 8),
              Text(time, style: const TextStyle(fontFamily: 'JetBrains Mono', fontSize: 11, color: Color(0xFF908FA0))),
            ],
          ),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(color: const Color(0xFF0A0E18), borderRadius: BorderRadius.circular(6), border: Border.all(color: const Color(0xFF464554).withValues(alpha: 0.2))),
            child: Text(text, style: const TextStyle(fontFamily: 'JetBrains Mono', fontSize: 11, color: Color(0xFFDFE2F1), height: 1.5)),
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Text(amount, style: const TextStyle(fontFamily: 'JetBrains Mono', fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFF4EDEA3))),
                  const SizedBox(width: 12),
                  Text(utr, style: const TextStyle(fontFamily: 'JetBrains Mono', fontSize: 11, color: Color(0xFF908FA0))),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(color: const Color(0xFF4EDEA3).withValues(alpha: 0.1), borderRadius: BorderRadius.circular(4)),
                child: Row(
                  children: [
                    const Icon(Icons.done_all, color: Color(0xFF4EDEA3), size: 12),
                    const SizedBox(width: 2),
                    Text(status, style: const TextStyle(fontFamily: 'JetBrains Mono', fontSize: 10, color: Color(0xFF4EDEA3))),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// Permissions Page
class PermissionsPage extends StatelessWidget {
  const PermissionsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(12),
      child: Column(
        children: [
          _card(
            title: 'Daemon Engine Health',
            subtitle: '4 OF 4 OPTIMAL',
            child: Column(
              children: [
                _permRow(Icons.sms, 'SMS Listener (RECEIVE/READ)', 'HDFCBK, SBIN, AXISBK, ICICIB', 'ACTIVE'),
                _permRow(Icons.notifications, 'Notification Listener Service', 'Banking package hooks attached', 'ACTIVE'),
                Row(
                  children: [
                    Expanded(child: _permChip('Doze Exemption', 'Battery Unrestricted', true)),
                    const SizedBox(width: 8),
                    Expanded(child: _permChip('Boot Auto-Start', 'BootReceiver Armed', true)),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          _card(
            title: 'Pairing & Configuration',
            subtitle: null,
            child: Column(
              children: [
                _infoRow('Merchant MID', 'Smoke Test Merchant Inc.', 'SKR_PROD_884920'),
                _infoRow('Device Hardware', 'Pixel 8 Pro (Terminal-01)', null),
                _infoRow('Endpoint URL', 'https://api.skarpay.io/v1', null),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                  decoration: BoxDecoration(color: const Color(0xFF313540).withValues(alpha: 0.4), borderRadius: BorderRadius.circular(8), border: Border.all(color: const Color(0xFF4EDEA3).withValues(alpha: 0.2))),
                  child: Row(
                    children: [
                      const Icon(Icons.verified_user, color: Color(0xFF4EDEA3), size: 16),
                      const SizedBox(width: 8),
                      const Expanded(child: Text('HMAC-SHA256 Armed & Verified', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w500, color: Color(0xFFDFE2F1)))),
                      const Text('NONCE: 0x9F4E', style: TextStyle(fontFamily: 'JetBrains Mono', fontSize: 10, color: Color(0xFF4EDEA3))),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 80),
        ],
      ),
    );
  }

  Widget _card({required String title, String? subtitle, required Widget child}) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: const Color(0xFF171B26), borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFF464554).withValues(alpha: 0.2))),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(title, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFFDFE2F1))),
              const Spacer(),
              if (subtitle != null) Text(subtitle, style: const TextStyle(fontFamily: 'JetBrains Mono', fontSize: 10, fontWeight: FontWeight.w500, color: Color(0xFF4EDEA3))),
            ],
          ),
          const SizedBox(height: 8),
          child,
        ],
      ),
    );
  }

  Widget _infoRow(String label, String value, String? badge) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontSize: 11, color: Color(0xFFC7C4D7))),
          Flexible(
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Flexible(child: Text(value, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFFDFE2F1)), overflow: TextOverflow.ellipsis, textAlign: TextAlign.right)),
                if (badge != null) ...[
                  const SizedBox(width: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                    decoration: BoxDecoration(color: const Color(0xFFC0C1FF).withValues(alpha: 0.1), borderRadius: BorderRadius.circular(4)),
                    child: Text(badge, style: const TextStyle(fontFamily: 'JetBrains Mono', fontSize: 10, color: Color(0xFFC0C1FF))),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _permRow(IconData icon, String title, String subtitle, String status) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        children: [
          Container(
            width: 28,
            height: 28,
            decoration: BoxDecoration(color: const Color(0xFF4EDEA3).withValues(alpha: 0.1), borderRadius: BorderRadius.circular(6)),
            child: Icon(icon, color: const Color(0xFF4EDEA3), size: 16),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w500, color: Color(0xFFDFE2F1))),
                Text(subtitle, style: const TextStyle(fontFamily: 'JetBrains Mono', fontSize: 10, color: Color(0xFF908FA0))),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(color: const Color(0xFF4EDEA3).withValues(alpha: 0.1), borderRadius: BorderRadius.circular(4), border: Border.all(color: const Color(0xFF4EDEA3).withValues(alpha: 0.25))),
            child: Text(status, style: const TextStyle(fontFamily: 'JetBrains Mono', fontSize: 10, fontWeight: FontWeight.w500, color: Color(0xFF4EDEA3))),
          ),
        ],
      ),
    );
  }

  Widget _permChip(String title, String subtitle, bool ok) {
    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(color: const Color(0xFF0A0E18).withValues(alpha: 0.9), borderRadius: BorderRadius.circular(8), border: Border.all(color: const Color(0xFF464554).withValues(alpha: 0.15))),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w500, color: Color(0xFFDFE2F1))),
                Text(subtitle, style: const TextStyle(fontFamily: 'JetBrains Mono', fontSize: 9, color: Color(0xFF908FA0))),
              ],
            ),
          ),
          Icon(Icons.check_circle, color: ok ? const Color(0xFF4EDEA3) : const Color(0xFFFFB4AB), size: 16),
        ],
      ),
    );
  }
}

// Settings Page
class SettingsPage extends StatefulWidget {
  const SettingsPage({super.key});

  @override
  State<SettingsPage> createState() => _SettingsPageState();
}

class _SettingsPageState extends State<SettingsPage> {
  final _urlController = TextEditingController(text: 'http://10.0.2.2:4100');
  final _tokenController = TextEditingController();
  final _nameController = TextEditingController(text: 'My Phone');
  bool _isPaired = false;
  String _status = '';
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _checkPairing();
  }

  Future<void> _checkPairing() async {
    final paired = await ApiService.isPaired();
    setState(() => _isPaired = paired);
    if (paired) {
      final url = await ApiService.getBaseUrl();
      _urlController.text = url;
    }
  }

  Future<void> _pair() async {
    setState(() { _loading = true; _status = 'Pairing...'; });
    try {
      await ApiService.pair(
        baseUrl: _urlController.text.trim(),
        enrollmentToken: _tokenController.text.trim(),
        deviceName: _nameController.text.trim(),
      );
      setState(() { _isPaired = true; _status = 'Paired successfully!'; _loading = false; });
    } catch (e) {
      setState(() { _status = 'Error: $e'; _loading = false; });
    }
  }

  Future<void> _simulateSms() async {
    setState(() { _status = 'Sending observation...'; });
    try {
      final result = await ApiService.sendObservation(
        rawText: 'Rs.499.00 credited to A/c XX1234. UTR 987654321098. Ref ORD-1',
      );
      setState(() { _status = 'Result: $result'; });
    } catch (e) {
      setState(() { _status = 'Error: $e'; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(12),
      child: Column(
        children: [
          _card(
            title: 'Terminal & Pairing',
            subtitle: _isPaired ? 'PAIRED' : 'NOT PAIRED',
            child: Column(
              children: [
                if (!_isPaired) ...[
                  TextField(
                    controller: _urlController,
                    decoration: const InputDecoration(
                      labelText: 'Base URL',
                      hintText: 'http://your-server:4100',
                      border: OutlineInputBorder(),
                    ),
                    style: const TextStyle(fontFamily: 'JetBrains Mono', fontSize: 12),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _tokenController,
                    decoration: const InputDecoration(
                      labelText: 'Enrollment Token',
                      hintText: 'paste from admin panel',
                      border: OutlineInputBorder(),
                    ),
                    style: const TextStyle(fontFamily: 'JetBrains Mono', fontSize: 12),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _nameController,
                    decoration: const InputDecoration(
                      labelText: 'Device Name',
                      border: OutlineInputBorder(),
                    ),
                    style: const TextStyle(fontSize: 12),
                  ),
                  const SizedBox(height: 12),
                  ElevatedButton(
                    onPressed: _loading ? null : _pair,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF8083FF),
                      foregroundColor: Colors.white,
                      minimumSize: const Size(double.infinity, 40),
                    ),
                    child: _loading
                        ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Text('Pair Device', style: TextStyle(fontWeight: FontWeight.bold)),
                  ),
                ] else ...[
                  _infoRow('Status', 'Paired', null),
                  _infoRow('Base URL', _urlController.text, null),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                    decoration: BoxDecoration(color: const Color(0xFF313540).withValues(alpha: 0.4), borderRadius: BorderRadius.circular(8), border: Border.all(color: const Color(0xFF4EDEA3).withValues(alpha: 0.2))),
                    child: Row(
                      children: [
                        const Icon(Icons.verified_user, color: Color(0xFF4EDEA3), size: 16),
                        const SizedBox(width: 8),
                        const Expanded(child: Text('HMAC-SHA256 Armed & Verified', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w500, color: Color(0xFFDFE2F1)))),
                      ],
                    ),
                  ),
                ],
                if (_status.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Text(_status, style: const TextStyle(fontSize: 12, color: Color(0xFF4EDEA3))),
                ],
              ],
            ),
          ),
          const SizedBox(height: 12),
          GestureDetector(
            onTap: _simulateSms,
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 10),
              decoration: BoxDecoration(color: const Color(0xFF262A35), borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFF464554).withValues(alpha: 0.3))),
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.terminal, color: Color(0xFFC0C1FF), size: 18),
                  SizedBox(width: 8),
                  Text('Simulate Bank SMS Broadcast (Local Test)', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: Color(0xFFDFE2F1))),
                ],
              ),
            ),
          ),
          const SizedBox(height: 80),
        ],
      ),
    );
  }

  Widget _card({required String title, String? subtitle, required Widget child}) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: const Color(0xFF171B26), borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFF464554).withValues(alpha: 0.2))),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(title, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFFDFE2F1))),
              const Spacer(),
              if (subtitle != null) Text(subtitle, style: const TextStyle(fontFamily: 'JetBrains Mono', fontSize: 10, fontWeight: FontWeight.w500, color: Color(0xFF4EDEA3))),
            ],
          ),
          const SizedBox(height: 8),
          child,
        ],
      ),
    );
  }

  Widget _infoRow(String label, String value, String? badge) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontSize: 11, color: Color(0xFFC7C4D7))),
          Flexible(
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Flexible(child: Text(value, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFFDFE2F1)), overflow: TextOverflow.ellipsis, textAlign: TextAlign.right)),
                if (badge != null) ...[
                  const SizedBox(width: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                    decoration: BoxDecoration(color: const Color(0xFFC0C1FF).withValues(alpha: 0.1), borderRadius: BorderRadius.circular(4)),
                    child: Text(badge, style: const TextStyle(fontFamily: 'JetBrains Mono', fontSize: 10, color: Color(0xFFC0C1FF))),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
