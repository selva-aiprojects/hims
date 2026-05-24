import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';

import '../widgets/breadcrumb.dart';

class TelehealthScreen extends StatefulWidget {
  final String? patientName;
  final String? appointmentId;

  const TelehealthScreen({
    super.key,
    this.patientName,
    this.appointmentId,
  });

  @override
  State<TelehealthScreen> createState() => _TelehealthScreenState();
}

class _TelehealthScreenState extends State<TelehealthScreen> {
  late final TextEditingController _roomController;
  bool _isLaunching = false;

  @override
  void initState() {
    super.initState();
    _roomController = TextEditingController(text: _defaultRoomName());
  }

  @override
  void dispose() {
    _roomController.dispose();
    super.dispose();
  }

  String _defaultRoomName() {
    final source = widget.appointmentId?.isNotEmpty == true
        ? widget.appointmentId!
        : '${widget.patientName ?? 'consult'}-${DateTime.now().millisecondsSinceEpoch}';
    final slug = source
        .toLowerCase()
        .replaceAll(RegExp(r'[^a-z0-9]+'), '-')
        .replaceAll(RegExp(r'^-+|-+$'), '');
    return 'healthezee-${slug.isEmpty ? 'consult' : slug}';
  }

  Uri get _meetingUri => Uri.parse(
        'https://meet.jit.si/${Uri.encodeComponent(_roomController.text.trim())}',
      );

  Future<void> _startCall() async {
    final room = _roomController.text.trim();
    if (room.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Enter a room name')),
      );
      return;
    }

    setState(() => _isLaunching = true);
    try {
      final uri = _meetingUri;
      final launched =
          await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (!launched && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Unable to open $uri')),
        );
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Unable to start tele-health: $e')),
      );
    } finally {
      if (mounted) setState(() => _isLaunching = false);
    }
  }

  Future<void> _copyLink() async {
    await Clipboard.setData(ClipboardData(text: _meetingUri.toString()));
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Tele-health link copied')),
    );
  }

  @override
  Widget build(BuildContext context) {
    final patientName = widget.patientName;

    return Scaffold(
      backgroundColor: const Color(0xFFf8fafc),
      appBar: AppBar(
        title: const Text('Tele-Health'),
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF1e293b),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Breadcrumb(paths: [
              'Dashboard',
              'Consultation',
              patientName ?? 'Virtual',
            ]),
            const SizedBox(height: 20),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(22),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFe2e8f0)),
              ),
              child: Column(
                children: [
                  Container(
                    width: 88,
                    height: 88,
                    decoration: BoxDecoration(
                      color: Colors.red.withValues(alpha: 0.1),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.video_call,
                      size: 44,
                      color: Colors.red,
                    ),
                  ),
                  const SizedBox(height: 18),
                  Text(
                    patientName == null
                        ? 'Start a secure virtual consultation'
                        : 'Start virtual consult for $patientName',
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w900,
                      color: Color(0xFF1e293b),
                    ),
                  ),
                  const SizedBox(height: 18),
                  TextField(
                    controller: _roomController,
                    decoration: InputDecoration(
                      labelText: 'Room name',
                      prefixIcon: const Icon(Icons.meeting_room),
                      filled: true,
                      fillColor: const Color(0xFFf8fafc),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: _copyLink,
                          icon: const Icon(Icons.copy),
                          label: const Text('COPY LINK'),
                          style: OutlinedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: _isLaunching ? null : _startCall,
                          icon: _isLaunching
                              ? const SizedBox(
                                  height: 18,
                                  width: 18,
                                  child: CircularProgressIndicator(
                                    color: Colors.white,
                                    strokeWidth: 2,
                                  ),
                                )
                              : const Icon(Icons.open_in_new),
                          label: Text(_isLaunching ? 'OPENING' : 'JOIN CALL'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.red,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            Text(
              _meetingUri.toString(),
              style: const TextStyle(
                color: Color(0xFF64748b),
                fontSize: 12,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
