import 'package:flutter/material.dart';
import 'abha_card_screen.dart';

class PatientDashboardScreen extends StatelessWidget {
  const PatientDashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Patient Portal'),
        actions: [
          IconButton(onPressed: () {}, icon: const Icon(Icons.logout, color: Color(0xFF64748b))),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Welcome back,', style: TextStyle(fontSize: 16, color: Color(0xFF64748b))),
            const Text('Selvakumar', style: TextStyle(fontSize: 28, fontWeight: FontWeight.w900, color: Color(0xFF1e293b))),
            const SizedBox(height: 32),

            // ABHA Shortcut
            GestureDetector(
              onTap: () => Navigator.push(context, MaterialPageRoute(builder: (context) => const AbhaCardScreen())),
              child: Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(colors: [Color(0xFF0284c7), Color(0xFF0369a1)]),
                  borderRadius: BorderRadius.circular(24),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.shield_rounded, color: Colors.white, size: 32),
                    SizedBox(width: 16),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Your ABHA ID is Active', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                        Text('Tap to view Digital Card', style: TextStyle(color: Colors.white70, fontSize: 12)),
                      ],
                    ),
                    Spacer(),
                    Icon(Icons.arrow_forward_ios, color: Colors.white, size: 16),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 40),
            const Text('HEALTH SERVICES', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 13, color: Color(0xFF64748b), letterSpacing: 1.2)),
            const SizedBox(height: 16),

            // Services Grid
            GridView.count(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisCount: 2,
              mainAxisSpacing: 16,
              crossAxisSpacing: 16,
              children: [
                _buildServiceCard(context, Icons.event_available, 'Book Appointment', 'Next: May 20', Colors.blue),
                _buildServiceCard(context, Icons.description, 'Lab Reports', '02 New Reports', Colors.green),
                _buildServiceCard(context, Icons.receipt_long, 'My Bills', 'All cleared', Colors.orange),
                _buildServiceCard(context, Icons.medical_services, 'Prescriptions', '05 Active', Colors.purple),
              ],
            ),

            const SizedBox(height: 40),
            const Text('UPCOMING VISITS', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 13, color: Color(0xFF64748b), letterSpacing: 1.2)),
            const SizedBox(height: 16),

            _buildAppointmentReminder(),

          ],
        ),
      ),
    );
  }

  Widget _buildServiceCard(BuildContext context, IconData icon, String title, String subtitle, Color color) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFFe2e8f0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(12)),
            child: Icon(icon, color: color, size: 24),
          ),
          const Spacer(),
          Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
          Text(subtitle, style: const TextStyle(fontSize: 11, color: Color(0xFF64748b))),
        ],
      ),
    );
  }

  Widget _buildAppointmentReminder() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(24), border: Border.all(color: const Color(0xFFe2e8f0))),
      child: Row(
        children: [
          const CircleAvatar(backgroundColor: Color(0xFFf1f5f9), child: Icon(Icons.person, color: Color(0xFF0284c7))),
          const SizedBox(width: 16),
          const Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Dr. Selvakumar', style: TextStyle(fontWeight: FontWeight.bold)),
              Text('General Physician • 10:30 AM', style: TextStyle(fontSize: 12, color: Color(0xFF64748b))),
            ],
          ),
          const Spacer(),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(color: const Color(0xFFeff6ff), borderRadius: BorderRadius.circular(8)),
            child: const Text('MAY 20', style: TextStyle(color: Color(0xFF3b82f6), fontWeight: FontWeight.bold, fontSize: 11)),
          ),
        ],
      ),
    );
  }
}
