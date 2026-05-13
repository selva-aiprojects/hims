import 'package:flutter/material.dart';
import '../widgets/breadcrumb.dart';

class LabResultsScreen extends StatelessWidget {
  const LabResultsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Diagnostic Center'),
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF1e293b),
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Breadcrumb(paths: ['Dashboard', 'Services', 'Laboratory']),
            const SizedBox(height: 24),
            const Text(
              'Recent Lab Reports',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: Color(0xFF0f172a)),
            ),
            const SizedBox(height: 20),
            _buildReportItem('Complete Blood Count (CBC)', 'Yesterday', 'Normal', Colors.green),
            _buildReportItem('Lipid Profile', '3 days ago', 'High Risk', Colors.red),
            _buildReportItem('Liver Function Test', '1 week ago', 'Pending', Colors.orange),
          ],
        ),
      ),
    );
  }

  Widget _buildReportItem(String title, String date, String status, Color statusColor) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFe2e8f0)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: statusColor.withOpacity(0.1), borderRadius: BorderRadius.circular(12)),
            child: Icon(Icons.biotech, color: statusColor, size: 24),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF1e293b))),
                Text(date, style: const TextStyle(fontSize: 12, color: Color(0xFF64748b))),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(color: statusColor.withOpacity(0.1), borderRadius: BorderRadius.circular(8)),
            child: Text(status, style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: statusColor)),
          ),
        ],
      ),
    );
  }
}
