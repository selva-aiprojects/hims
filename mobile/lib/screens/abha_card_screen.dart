import 'package:flutter/material.dart';

class AbhaCardScreen extends StatelessWidget {
  const AbhaCardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFf8fafc),
      appBar: AppBar(title: const Text('Digital ABHA ID')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            // THE ABHA CARD
            Container(
              width: double.infinity,
              height: 220,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF0369a1), Color(0xFF0ea5e9)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(24),
                boxShadow: [
                  BoxShadow(
                      color: Colors.blue.withValues(alpha: 0.3),
                      blurRadius: 20,
                      offset: const Offset(0, 10)),
                ],
              ),
              child: Stack(
                children: [
                  Positioned(
                    right: -20,
                    top: -20,
                    child: Icon(Icons.shield,
                        size: 150, color: Colors.white.withValues(alpha: 0.1)),
                  ),
                  Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text('ABHA ID CARD',
                                style: TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 12,
                                    letterSpacing: 1.5)),
                            Icon(Icons.health_and_safety, color: Colors.white),
                          ],
                        ),
                        const Spacer(),
                        const Text('Selvakumar Balakrishnan',
                            style: TextStyle(
                                color: Colors.white,
                                fontSize: 22,
                                fontWeight: FontWeight.w900)),
                        const Text('91-1234-5678-9012',
                            style: TextStyle(
                                color: Colors.white70,
                                fontSize: 16,
                                letterSpacing: 2)),
                        const SizedBox(height: 16),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('DOB',
                                    style: TextStyle(
                                        color: Colors.white60, fontSize: 10)),
                                Text('15/06/1985',
                                    style: TextStyle(
                                        color: Colors.white,
                                        fontWeight: FontWeight.bold)),
                              ],
                            ),
                            Container(
                              padding: const EdgeInsets.all(6),
                              decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(8)),
                              child: const Icon(Icons.qr_code,
                                  size: 30, color: Color(0xFF0369a1)),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 40),

            // QUICK STATS
            const Row(
              children: [
                Expanded(
                    child: _QuickStat(
                        label: 'LINKED LABS',
                        value: '08',
                        icon: Icons.biotech)),
                SizedBox(width: 16),
                Expanded(
                    child: _QuickStat(
                        label: 'VERIFIED',
                        value: 'YES',
                        icon: Icons.verified_user)),
              ],
            ),

            const SizedBox(height: 32),
            const Text('ABDM SERVICES',
                style: TextStyle(
                    fontWeight: FontWeight.w900,
                    fontSize: 13,
                    color: Color(0xFF64748b),
                    letterSpacing: 1.2)),
            const SizedBox(height: 16),

            _buildServiceItem(
                Icons.sync, 'Sync Health Records', 'Last synced 2 hours ago'),
            _buildServiceItem(Icons.share_location, 'Grant Access to Hospital',
                'Apollo Hospitals (Active)'),
            _buildServiceItem(
                Icons.history, 'Transaction History', 'View consent logs'),
          ],
        ),
      ),
    );
  }

  Widget _buildServiceItem(IconData icon, String title, String subtitle) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: const Color(0xFFe2e8f0))),
      child: Row(
        children: [
          Icon(icon, color: const Color(0xFF0369a1)),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title,
                    style: const TextStyle(
                        fontWeight: FontWeight.bold, fontSize: 14)),
                Text(subtitle,
                    style: const TextStyle(
                        fontSize: 12, color: Color(0xFF64748b))),
              ],
            ),
          ),
          const Icon(Icons.chevron_right, color: Color(0xFFcbd5e1)),
        ],
      ),
    );
  }
}

class _QuickStat extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  const _QuickStat(
      {required this.label, required this.value, required this.icon});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: const Color(0xFFe2e8f0))),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 20, color: const Color(0xFF0369a1)),
          const SizedBox(height: 8),
          Text(value,
              style:
                  const TextStyle(fontSize: 20, fontWeight: FontWeight.w900)),
          Text(label,
              style: const TextStyle(
                  fontSize: 10,
                  color: Color(0xFF64748b),
                  fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
}
