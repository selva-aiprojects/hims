import 'package:flutter/material.dart';

import '../models/appointment.dart';
import 'telehealth_screen.dart';
import 'voice_note_screen.dart';

class PatientRecordScreen extends StatelessWidget {
  final Appointment? appointment;
  final String patientName;
  final String? fallbackDoctorId;

  PatientRecordScreen({
    super.key,
    this.appointment,
    String? patientName,
    this.fallbackDoctorId,
  }) : patientName = patientName ?? appointment?.patientName ?? 'Patient';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Patient Record'),
        actions: [
          IconButton(
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => TelehealthScreen(
                    patientName: patientName,
                    appointmentId: appointment?.id,
                  ),
                ),
              );
            },
            icon: const Icon(Icons.video_call, color: Color(0xFF0284c7)),
            tooltip: 'Start tele-health',
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Patient Header
            Row(
              children: [
                const CircleAvatar(
                  radius: 30,
                  backgroundColor: Color(0xFFe0f2fe),
                  child: Icon(Icons.person, size: 35, color: Color(0xFF0284c7)),
                ),
                const SizedBox(width: 16),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(patientName,
                        style: const TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.w900,
                            color: Color(0xFF1e293b))),
                    const Text('MRN-2405-001243 • Male • 38y',
                        style: TextStyle(
                            color: Color(0xFF64748b),
                            fontWeight: FontWeight.bold)),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 32),

            // Vitals Section
            const Text('LATEST VITALS',
                style: TextStyle(
                    fontWeight: FontWeight.w900,
                    fontSize: 13,
                    color: Color(0xFF64748b),
                    letterSpacing: 1.2)),
            const SizedBox(height: 16),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _buildVitalCard('BP', '120/80', 'mmHg', Colors.red),
                  _buildVitalCard('Temp', '98.6', '°F', Colors.orange),
                  _buildVitalCard('Weight', '72', 'kg', Colors.green),
                  _buildVitalCard('SPO2', '98', '%', Colors.blue),
                ],
              ),
            ),

            const SizedBox(height: 32),
            const Text('CLINICAL TIMELINE',
                style: TextStyle(
                    fontWeight: FontWeight.w900,
                    fontSize: 13,
                    color: Color(0xFF64748b),
                    letterSpacing: 1.2)),
            const SizedBox(height: 16),

            // Timeline Items
            _buildTimelineItem('OPD Consultation', 'May 12, 2026', 'Dr. Selva',
                'Patient complained of mild fever and dry cough. Prescribed Paracetamol and rest.'),
            _buildTimelineItem('Lab Report', 'May 10, 2026', 'Diagnostic Lab',
                'Complete Blood Count (CBC) - All parameters within normal range.'),
            _buildTimelineItem('Admission', 'Jan 15, 2026', 'Emergency',
                'Admitted for acute gastroenteritis. Discharged after 2 days.'),
          ],
        ),
      ),
      // Floating AI Action
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => VoiceNoteScreen(
                patientName: patientName,
                patientId: appointment?.patientId,
                doctorId: appointment?.doctorId ?? fallbackDoctorId,
                appointmentId: appointment?.id.startsWith('demo-') == true
                    ? null
                    : appointment?.id,
              ),
            ),
          );
        },
        backgroundColor: const Color(0xFF0284c7),
        icon: const Icon(Icons.mic, color: Colors.white),
        label: const Text('AI VOICE NOTE',
            style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
      ),
    );
  }

  Widget _buildVitalCard(String label, String value, String unit, Color color) {
    return Container(
      width: 100,
      margin: const EdgeInsets.only(right: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withValues(alpha: 0.1)),
      ),
      child: Column(
        children: [
          Text(label,
              style: TextStyle(
                  color: color, fontWeight: FontWeight.bold, fontSize: 11)),
          const SizedBox(height: 4),
          Text(value,
              style: const TextStyle(
                  fontWeight: FontWeight.w900,
                  fontSize: 18,
                  color: Color(0xFF1e293b))),
          Text(unit,
              style: const TextStyle(fontSize: 10, color: Color(0xFF64748b))),
        ],
      ),
    );
  }

  Widget _buildTimelineItem(
      String title, String date, String author, String note) {
    return Container(
      margin: const EdgeInsets.only(bottom: 20),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Column(
            children: [
              const Icon(Icons.circle, size: 12, color: Color(0xFF0284c7)),
              Container(width: 2, height: 80, color: const Color(0xFFe2e8f0)),
            ],
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(title,
                        style: const TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 15,
                            color: Color(0xFF1e293b))),
                    Text(date,
                        style: const TextStyle(
                            fontSize: 11, color: Color(0xFF94a3b8))),
                  ],
                ),
                Text('By $author',
                    style: const TextStyle(
                        fontSize: 12,
                        color: Color(0xFF0284c7),
                        fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                Text(note,
                    style: const TextStyle(
                        fontSize: 13, color: Color(0xFF475569), height: 1.4)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
