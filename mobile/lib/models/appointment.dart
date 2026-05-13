class Appointment {
  final String id;
  final String patientName;
  final String time;
  final String type; // OPD, IPD, Emergency
  final String status;
  final String symptoms;

  Appointment({
    required this.id,
    required this.patientName,
    required this.time,
    required this.type,
    required this.status,
    required this.symptoms,
  });

  factory Appointment.fromJson(Map<String, dynamic> json) {
    return Appointment(
      id: json['id'] ?? '',
      patientName: json['patient']?['name'] ?? 'Unknown Patient',
      time: json['appointment_time'] ?? 'N/A',
      type: json['type'] ?? 'OPD',
      status: json['status'] ?? 'Scheduled',
      symptoms: json['reason'] ?? 'No complaints listed',
    );
  }
}
