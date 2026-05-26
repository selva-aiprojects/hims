import 'package:flutter/material.dart';
import '../widgets/breadcrumb.dart';
import 'patient_dashboard_screen.dart';

/// Patient Appointment Confirmation Screen
/// 
/// This screen is shown to patients AFTER they book an appointment.
/// It provides a READ-ONLY view showing:
/// - Appointment details
/// - Vitals submitted
/// - Status message indicating they must wait for doctor consultation
/// 
/// Patients CANNOT access prescription, lab orders, or admission features
/// until the doctor completes the consultation.
class PatientAppointmentConfirmationScreen extends StatelessWidget {
  final String patientName;
  final String? doctorId;
  final DateTime appointmentTime;

  const PatientAppointmentConfirmationScreen({
    super.key,
    required this.patientName,
    this.doctorId,
    required this.appointmentTime,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFf8fafc),
      appBar: AppBar(
        title: const Text('Appointment Confirmed'),
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF1e293b),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () {
            // Navigate back to patient dashboard (no back to booking flow)
            Navigator.pushAndRemoveUntil(
              context,
              MaterialPageRoute(builder: (context) => const PatientDashboardScreen()),
              (route) => false,
            );
          },
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Breadcrumb(paths: [
              'Patient',
              'Appointment',
              'Confirmation'
            ]),
            const SizedBox(height: 24),

            // Success Banner
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF16a34a), Color(0xFF22c55e)],
                ),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Column(
                children: [
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.2),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.check_circle_rounded,
                      size: 48,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'Appointment Booked!',
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.w900,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Your appointment has been successfully scheduled',
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.white.withOpacity(0.9),
                    ),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),

            const SizedBox(height: 32),

            // Important Notice - Patient Flow Restriction
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: const Color(0xFFfef3c7),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFfcd34d), width: 2),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.info_outline, color: Color(0xFFb45309), size: 24),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          'Important Information',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w900,
                            color: const Color(0xFFb45309),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'Your appointment is confirmed. Please wait for the doctor to begin your consultation. After the doctor completes the consultation, you will be able to view:',
                    style: TextStyle(
                      fontSize: 13,
                      color: const Color(0xFF92400e),
                      height: 1.5,
                    ),
                  ),
                  const SizedBox(height: 12),
                  _buildFeatureItem(Icons.description, 'Prescription & Medicines'),
                  _buildFeatureItem(Icons.biotech, 'Lab Tests & Diagnostics'),
                  _buildFeatureItem(Icons.monitor_heart, 'Vitals & Health Records'),
                  _buildFeatureItem(Icons.history, 'Medical History & Follow-ups'),
                ],
              ),
            ),

            const SizedBox(height: 32),

            // Appointment Details Section
            const Text(
              'APPOINTMENT DETAILS',
              style: TextStyle(
                fontWeight: FontWeight.w900,
                fontSize: 13,
                color: Color(0xFF64748b),
                letterSpacing: 1.2,
              ),
            ),
            const SizedBox(height: 16),

            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFe2e8f0)),
              ),
              child: Column(
                children: [
                  _buildDetailRow(
                    Icons.calendar_today,
                    'Date',
                    '${appointmentTime.day.toString().padLeft(2, '0')}/${appointmentTime.month.toString().padLeft(2, '0')}/${appointmentTime.year}',
                  ),
                  const Divider(height: 24),
                  _buildDetailRow(
                    Icons.access_time,
                    'Time',
                    '${appointmentTime.hour.toString().padLeft(2, '0')}:${appointmentTime.minute.toString().padLeft(2, '0')}',
                  ),
                  const Divider(height: 24),
                  _buildDetailRow(
                    Icons.person,
                    'Patient Name',
                    patientName,
                  ),
                  if (doctorId != null) ...[
                    const Divider(height: 24),
                    _buildDetailRow(
                      Icons.medical_services,
                      'Doctor ID',
                      doctorId!,
                    ),
                  ],
                ],
              ),
            ),

            const SizedBox(height: 32),

            // Submitted Vitals Section
            const Text(
              'VITALS SUBMITTED',
              style: TextStyle(
                fontWeight: FontWeight.w900,
                fontSize: 13,
                color: Color(0xFF64748b),
                letterSpacing: 1.2,
              ),
            ),
            const SizedBox(height: 16),

            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFe2e8f0)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _buildVitalSummary('BP', 'Recorded', Colors.red),
                  _buildVitalSummary('Temp', 'Recorded', Colors.orange),
                  _buildVitalSummary('Weight', 'Recorded', Colors.green),
                ],
              ),
            ),

            const SizedBox(height: 40),

            // Status Timeline
            const Text(
              'CONSULTATION STATUS',
              style: TextStyle(
                fontWeight: FontWeight.w900,
                fontSize: 13,
                color: Color(0xFF64748b),
                letterSpacing: 1.2,
              ),
            ),
            const SizedBox(height: 16),

            _buildStatusTimeline(),

            const SizedBox(height: 40),

            // Return to Dashboard Button
            ElevatedButton.icon(
              onPressed: () {
                Navigator.pushAndRemoveUntil(
                  context,
                  MaterialPageRoute(builder: (context) => const PatientDashboardScreen()),
                  (route) => false,
                );
              },
              icon: const Icon(Icons.home),
              label: const Text('RETURN TO DASHBOARD'),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF0284c7),
                foregroundColor: Colors.white,
                minimumSize: const Size(double.infinity, 56),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
            ),

            const SizedBox(height: 16),

            Center(
              child: Text(
                'You will be notified when the doctor starts your consultation',
                style: TextStyle(
                  fontSize: 12,
                  color: const Color(0xFF64748b),
                  fontStyle: FontStyle.italic,
                ),
              ),
            ),

            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _buildFeatureItem(IconData icon, String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Icon(icon, size: 16, color: const Color(0xFF16a34a)),
          const SizedBox(width: 8),
          Text(
            text,
            style: TextStyle(
              fontSize: 13,
              color: const Color(0xFF92400e),
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDetailRow(IconData icon, String label, String value) {
    return Row(
      children: [
        Icon(icon, size: 20, color: const Color(0xFF0284c7)),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: const TextStyle(
                  fontSize: 11,
                  color: Color(0xFF64748b),
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                value,
                style: const TextStyle(
                  fontSize: 15,
                  color: Color(0xFF1e293b),
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildVitalSummary(String label, String status, Color color) {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: color.withOpacity(0.1),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(Icons.check, color: color, size: 24),
        ),
        const SizedBox(height: 8),
        Text(
          label,
          style: const TextStyle(
            fontSize: 12,
            color: Color(0xFF64748b),
            fontWeight: FontWeight.bold,
          ),
        ),
        Text(
          status,
          style: TextStyle(
            fontSize: 11,
            color: color,
            fontWeight: FontWeight.w700,
          ),
        ),
      ],
    );
  }

  Widget _buildStatusTimeline() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFe2e8f0)),
      ),
      child: Column(
        children: [
          _buildTimelineStep(
            'Appointment Booked',
            'Completed',
            true,
            true,
          ),
          const SizedBox(height: 20),
          _buildTimelineStep(
            'Waiting for Doctor',
            'In Progress',
            false,
            true,
          ),
          const SizedBox(height: 20),
          _buildTimelineStep(
            'Doctor Consultation',
            'Pending',
            false,
            false,
          ),
          const SizedBox(height: 20),
          _buildTimelineStep(
            'Prescription & Reports',
            'Locked',
            false,
            false,
            isLocked: true,
          ),
        ],
      ),
    );
  }

  Widget _buildTimelineStep(
    String title,
    String status,
    bool isPast,
    bool isCurrent, {
    bool isLocked = false,
  }) {
    return Row(
      children: [
        Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: isLocked
                ? const Color(0xFFe2e8f0)
                : isCurrent
                    ? const Color(0xFF0284c7)
                    : isPast
                        ? const Color(0xFF16a34a)
                        : const Color(0xFFe2e8f0),
            shape: BoxShape.circle,
          ),
          child: Icon(
            isLocked ? Icons.lock : Icons.check,
            size: 20,
            color: isLocked
                ? const Color(0xFF64748b)
                : Colors.white,
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: isLocked
                      ? const Color(0xFF94a3b8)
                      : const Color(0xFF1e293b),
                ),
              ),
              Text(
                status,
                style: TextStyle(
                  fontSize: 11,
                  color: isLocked
                      ? const Color(0xFF94a3b8)
                      : isCurrent
                          ? const Color(0xFF0284c7)
                          : isPast
                              ? const Color(0xFF16a34a)
                              : const Color(0xFF64748b),
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
