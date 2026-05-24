import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/appointment.dart';
import '../services/api_service.dart';
import '../widgets/breadcrumb.dart';
import 'login_screen.dart';
import 'patient_record_screen.dart';
import 'opd_registration_screen.dart';
import 'lab_results_screen.dart';
import 'telehealth_screen.dart';
import 'voice_note_screen.dart';

class DashboardScreen extends ConsumerStatefulWidget {
  const DashboardScreen({super.key});

  @override
  ConsumerState<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends ConsumerState<DashboardScreen> {
  List<Appointment> _appointments = [];
  bool _isLoadingQueue = true;
  String? _queueError;
  String? _doctorId;

  @override
  void initState() {
    super.initState();
    _loadQueue();
  }

  Future<void> _loadQueue() async {
    setState(() {
      _isLoadingQueue = true;
      _queueError = null;
    });

    try {
      final prefs = await SharedPreferences.getInstance();
      final role = prefs.getString('user_role')?.toLowerCase();
      final userId = prefs.getString('user_id');
      final api = ref.read(apiServiceProvider);
      final res = await api.getAppointments(
        doctorId: role == 'doctor' ? userId : null,
      );
      final data = res.data is List ? res.data as List : const [];
      if (!mounted) return;
      setState(() {
        _doctorId = userId;
        _appointments = data
            .map(
                (item) => Appointment.fromJson(Map<String, dynamic>.from(item)))
            .toList();
        _isLoadingQueue = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _doctorId = null;
        _appointments = _demoAppointments();
        _queueError = 'Live queue unavailable. Showing sample queue.';
        _isLoadingQueue = false;
      });
    }
  }

  Future<void> _logout(BuildContext context) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
    if (context.mounted) {
      Navigator.pushAndRemoveUntil(
        context,
        MaterialPageRoute(builder: (context) => const LoginScreen()),
        (route) => false,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Image.asset('assets/logo.png',
                height: 32,
                errorBuilder: (c, e, s) => const Icon(Icons.health_and_safety,
                    color: Color(0xFF0284c7))),
            const SizedBox(width: 12),
            const Text('Healthezee',
                style: TextStyle(fontWeight: FontWeight.w900, fontSize: 18)),
          ],
        ),
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF1e293b),
        elevation: 0.5,
        actions: [
          IconButton(
            onPressed: () => _logout(context),
            icon: const Icon(Icons.logout, color: Color(0xFFef4444)),
            tooltip: 'Logout',
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Breadcrumb(paths: ['Dashboard', 'Overview']),
            const SizedBox(height: 12),
            // Stats Row
            Row(
              children: [
                _buildStatCard('Appointments', '12', Colors.blue),
                const SizedBox(width: 12),
                _buildStatCard('IPD Rounds', '04', Colors.orange),
              ],
            ),
            const SizedBox(height: 28),

            // Appointment Header
            const Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('UPCOMING QUEUE',
                    style: TextStyle(
                        fontWeight: FontWeight.w900,
                        fontSize: 13,
                        color: Color(0xFF64748b),
                        letterSpacing: 1.2)),
                Text('View All',
                    style: TextStyle(
                        color: Color(0xFF0284c7),
                        fontWeight: FontWeight.bold,
                        fontSize: 12)),
              ],
            ),
            const SizedBox(height: 16),

            if (_queueError != null) ...[
              Text(_queueError!,
                  style: const TextStyle(
                      color: Color(0xFFb45309), fontWeight: FontWeight.bold)),
              const SizedBox(height: 12),
            ],

            _isLoadingQueue
                ? const Center(child: CircularProgressIndicator())
                : _appointments.isEmpty
                    ? _buildEmptyQueue()
                    : ListView.builder(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: _appointments.length,
                        itemBuilder: (context, index) {
                          return _buildAppointmentItem(
                            context,
                            _appointments[index],
                          );
                        },
                      ),

            const SizedBox(height: 32),
            const Text('QUICK ACTIONS',
                style: TextStyle(
                    fontWeight: FontWeight.w900,
                    fontSize: 13,
                    color: Color(0xFF64748b),
                    letterSpacing: 1.2)),
            const SizedBox(height: 16),

            // Action Grid
            GridView.count(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisCount: 2,
              mainAxisSpacing: 12,
              crossAxisSpacing: 12,
              childAspectRatio: 2.5,
              children: [
                _buildActionButton(Icons.add_box, 'Add Patient', Colors.green,
                    () {
                  Navigator.push(
                      context,
                      MaterialPageRoute(
                          builder: (context) => const OPDRegistrationScreen()));
                }),
                _buildActionButton(Icons.mic, 'Voice Note', Colors.purple, () {
                  Navigator.push(
                      context,
                      MaterialPageRoute(
                          builder: (context) =>
                              VoiceNoteScreen(doctorId: _doctorId)));
                }),
                _buildActionButton(Icons.video_call, 'Tele-Health', Colors.red,
                    () {
                  Navigator.push(
                      context,
                      MaterialPageRoute(
                          builder: (context) => const TelehealthScreen()));
                }),
                _buildActionButton(Icons.biotech, 'View Labs', Colors.indigo,
                    () {
                  Navigator.push(
                      context,
                      MaterialPageRoute(
                          builder: (context) => const LabResultsScreen()));
                }),
              ],
            ),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  Widget _buildStatCard(String label, String value, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: color.withValues(alpha: 0.2)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label,
                style: TextStyle(
                    color: color.withValues(alpha: 0.8),
                    fontWeight: FontWeight.bold,
                    fontSize: 12)),
            const SizedBox(height: 4),
            Text(value,
                style: TextStyle(
                    color: color, fontSize: 32, fontWeight: FontWeight.w900)),
          ],
        ),
      ),
    );
  }

  Widget _buildAppointmentItem(BuildContext context, Appointment appointment) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => PatientRecordScreen(
                appointment: appointment,
                fallbackDoctorId: _doctorId,
              ),
            ),
          );
        },
        borderRadius: BorderRadius.circular(20),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: const Color(0xFFe2e8f0)),
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                    color: const Color(0xFFf1f5f9),
                    borderRadius: BorderRadius.circular(14)),
                child: const Icon(Icons.calendar_today,
                    size: 20, color: Color(0xFF64748b)),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(appointment.patientName,
                        style: const TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 15,
                            color: Color(0xFF1e293b))),
                    Text('${appointment.time} • ${appointment.type}',
                        style: const TextStyle(
                            fontSize: 12, color: Color(0xFF64748b))),
                  ],
                ),
              ),
              const Icon(Icons.arrow_forward_ios,
                  size: 14, color: Color(0xFFcbd5e1)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildActionButton(
      IconData icon, String label, Color color, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFe2e8f0)),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 18, color: color),
            const SizedBox(width: 8),
            Text(label,
                style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 13,
                    color: Color(0xFF475569))),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyQueue() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFe2e8f0)),
      ),
      child: const Text(
        'No appointments in queue.',
        style: TextStyle(color: Color(0xFF64748b), fontWeight: FontWeight.bold),
      ),
    );
  }

  List<Appointment> _demoAppointments() {
    return [
      Appointment(
        id: 'demo-1',
        patientName: 'Selvakumar Balakrishnan',
        time: '10:30 AM',
        type: 'OPD',
        status: 'In-Queue',
        symptoms: 'Mild Fever, Cough',
      ),
      Appointment(
        id: 'demo-2',
        patientName: 'Rahul Sharma',
        time: '11:15 AM',
        type: 'Follow-up',
        status: 'In-Queue',
        symptoms: 'Follow-up consultation',
      ),
    ];
  }
}
