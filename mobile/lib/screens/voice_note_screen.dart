import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:speech_to_text/speech_recognition_result.dart';
import 'package:speech_to_text/speech_to_text.dart';

import '../services/api_service.dart';
import '../widgets/breadcrumb.dart';

class VoiceNoteScreen extends StatefulWidget {
  final String? patientName;
  final String? patientId;
  final String? doctorId;
  final String? appointmentId;

  const VoiceNoteScreen({
    super.key,
    this.patientName,
    this.patientId,
    this.doctorId,
    this.appointmentId,
  });

  @override
  State<VoiceNoteScreen> createState() => _VoiceNoteScreenState();
}

class _VoiceNoteScreenState extends State<VoiceNoteScreen> {
  final SpeechToText _speech = SpeechToText();
  final TextEditingController _transcriptController = TextEditingController();
  bool _isAvailable = false;
  bool _isListening = false;
  bool _isInitializing = true;
  bool _isPosting = false;
  String? _statusMessage;
  String _generatedNote = '';

  @override
  void initState() {
    super.initState();
    _initializeSpeech();
  }

  @override
  void dispose() {
    _speech.stop();
    _transcriptController.dispose();
    super.dispose();
  }

  Future<void> _initializeSpeech() async {
    try {
      final available = await _speech.initialize(
        onStatus: (status) {
          if (!mounted) return;
          setState(() {
            _isListening = status == 'listening';
            _statusMessage = _friendlyStatus(status);
          });
        },
        onError: (error) {
          if (!mounted) return;
          setState(() {
            _isListening = false;
            _statusMessage = error.errorMsg.isEmpty
                ? 'Speech recognition stopped'
                : error.errorMsg;
          });
        },
      );

      if (!mounted) return;
      setState(() {
        _isAvailable = available;
        _isInitializing = false;
        _statusMessage = available
            ? 'Ready to capture clinical dictation'
            : 'Speech recognition is not available on this device';
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isAvailable = false;
        _isInitializing = false;
        _statusMessage = 'Unable to initialize microphone: $e';
      });
    }
  }

  Future<void> _toggleListening() async {
    if (_isInitializing) return;

    if (!_isAvailable) {
      await _initializeSpeech();
      return;
    }

    if (_isListening) {
      await _speech.stop();
      if (mounted) setState(() => _isListening = false);
      return;
    }

    await _speech.listen(
      listenOptions: SpeechListenOptions(
        listenMode: ListenMode.dictation,
        partialResults: true,
        listenFor: const Duration(minutes: 3),
        pauseFor: const Duration(seconds: 8),
      ),
      onResult: _onSpeechResult,
    );

    if (mounted) {
      setState(() {
        _isListening = true;
        _statusMessage = 'Listening...';
      });
    }
  }

  void _onSpeechResult(SpeechRecognitionResult result) {
    setState(() {
      _transcriptController.text = result.recognizedWords;
      _transcriptController.selection = TextSelection.collapsed(
        offset: _transcriptController.text.length,
      );
    });
  }

  void _generateClinicalNote() {
    final transcript = _transcriptController.text.trim();
    if (transcript.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('Capture or type a voice transcript first')),
      );
      return;
    }

    final now = DateTime.now();
    final patient = widget.patientName ?? 'Patient';
    setState(() {
      _generatedNote = '''
Clinical Voice Note
Patient: $patient
Recorded: ${now.day.toString().padLeft(2, '0')}/${now.month.toString().padLeft(2, '0')}/${now.year}

Subjective:
$transcript

Assessment:
Clinical dictation reviewed. Please confirm diagnosis and severity before final sign-off.

Plan:
- Continue/adjust medicines as clinically appropriate.
- Order investigations if symptoms persist or worsen.
- Document follow-up advice and red-flag instructions.
''';
    });
  }

  Future<void> _copyNote() async {
    final text = _generatedNote.trim().isNotEmpty
        ? _generatedNote
        : _transcriptController.text.trim();
    if (text.isEmpty) return;

    await Clipboard.setData(ClipboardData(text: text));
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Voice note copied')),
    );
  }

  Future<void> _postToConsultation() async {
    final transcript = _transcriptController.text.trim();
    if (transcript.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Capture or type a transcript first')),
      );
      return;
    }

    final patientId = widget.patientId;
    final doctorId = widget.doctorId;
    if (patientId == null ||
        patientId.isEmpty ||
        doctorId == null ||
        doctorId.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
              'Open voice note from a live queue patient to post consultation.'),
        ),
      );
      return;
    }

    if (_generatedNote.isEmpty) {
      _generateClinicalNote();
    }

    setState(() => _isPosting = true);
    try {
      if (_isListening) await _speech.stop();
      final api = ApiService();
      final note = _generatedNote.trim().isEmpty ? transcript : _generatedNote;
      await api.createEncounter({
        'patientId': patientId,
        'doctorId': doctorId,
        'diagnosis': '',
        'notes': note,
        'vitals': null,
        'complaints': [transcript],
        'prescriptions': const <Map<String, dynamic>>[],
      });

      if (widget.appointmentId != null && widget.appointmentId!.isNotEmpty) {
        await api.updateAppointmentStatus(widget.appointmentId!, 'Completed');
      }

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Consultation posted successfully'),
          backgroundColor: Colors.green,
        ),
      );
      Navigator.pop(context, true);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to post consultation: $e')),
      );
    } finally {
      if (mounted) setState(() => _isPosting = false);
    }
  }

  void _clear() {
    setState(() {
      _transcriptController.clear();
      _generatedNote = '';
      _statusMessage =
          _isAvailable ? 'Ready to capture clinical dictation' : _statusMessage;
    });
  }

  String _friendlyStatus(String status) {
    switch (status) {
      case 'listening':
        return 'Listening...';
      case 'notListening':
        return 'Paused';
      case 'done':
        return 'Capture complete';
      default:
        return status;
    }
  }

  @override
  Widget build(BuildContext context) {
    final patientName = widget.patientName;

    return Scaffold(
      backgroundColor: const Color(0xFFf8fafc),
      appBar: AppBar(
        title: const Text('Voice Clinical Note'),
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF1e293b),
        actions: [
          IconButton(
            onPressed: _copyNote,
            icon: const Icon(Icons.copy, color: Color(0xFF0284c7)),
            tooltip: 'Copy note',
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Breadcrumb(paths: [
              'Dashboard',
              'Clinical',
              patientName ?? 'Voice Notes',
            ]),
            const SizedBox(height: 20),
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
                  AnimatedContainer(
                    duration: const Duration(milliseconds: 250),
                    width: _isListening ? 104 : 88,
                    height: _isListening ? 104 : 88,
                    decoration: BoxDecoration(
                      color:
                          (_isListening ? Colors.red : const Color(0xFF0284c7))
                              .withValues(alpha: 0.12),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      _isListening ? Icons.graphic_eq : Icons.mic,
                      size: 44,
                      color:
                          _isListening ? Colors.red : const Color(0xFF0284c7),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    _statusMessage ?? 'Preparing microphone...',
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      color: Color(0xFF475569),
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 20),
                  ElevatedButton.icon(
                    onPressed: _isInitializing ? null : _toggleListening,
                    icon: Icon(_isListening ? Icons.stop : Icons.mic),
                    label:
                        Text(_isListening ? 'STOP CAPTURE' : 'START CAPTURE'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor:
                          _isListening ? Colors.red : const Color(0xFF0284c7),
                      foregroundColor: Colors.white,
                      minimumSize: const Size(double.infinity, 54),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            const Text(
              'LIVE TRANSCRIPT',
              style: TextStyle(
                fontWeight: FontWeight.w900,
                fontSize: 13,
                color: Color(0xFF64748b),
                letterSpacing: 1.1,
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _transcriptController,
              minLines: 6,
              maxLines: 10,
              decoration: InputDecoration(
                filled: true,
                fillColor: Colors.white,
                hintText:
                    'Dictated text will appear here. You can edit it before generating the note.',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: const BorderSide(color: Color(0xFFe2e8f0)),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: const BorderSide(color: Color(0xFFe2e8f0)),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _clear,
                    icon: const Icon(Icons.delete_outline),
                    label: const Text('CLEAR'),
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
                    onPressed: _generateClinicalNote,
                    icon: const Icon(Icons.auto_awesome),
                    label: const Text('GENERATE'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF0f172a),
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
            const SizedBox(height: 12),
            ElevatedButton.icon(
              onPressed: _isPosting ? null : _postToConsultation,
              icon: _isPosting
                  ? const SizedBox(
                      height: 18,
                      width: 18,
                      child: CircularProgressIndicator(
                        color: Colors.white,
                        strokeWidth: 2,
                      ),
                    )
                  : const Icon(Icons.upload_file),
              label: Text(_isPosting ? 'POSTING...' : 'POST TO CONSULTATION'),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF0284c7),
                foregroundColor: Colors.white,
                minimumSize: const Size(double.infinity, 52),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
            ),
            if (widget.patientId == null || widget.doctorId == null) ...[
              const SizedBox(height: 8),
              const Text(
                'Posting is enabled when voice note is opened from a live patient queue item.',
                style: TextStyle(
                  color: Color(0xFF64748b),
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
            if (_generatedNote.isNotEmpty) ...[
              const SizedBox(height: 24),
              const Text(
                'GENERATED NOTE',
                style: TextStyle(
                  fontWeight: FontWeight.w900,
                  fontSize: 13,
                  color: Color(0xFF64748b),
                  letterSpacing: 1.1,
                ),
              ),
              const SizedBox(height: 12),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFe2e8f0)),
                ),
                child: Text(
                  _generatedNote,
                  style: const TextStyle(
                    color: Color(0xFF334155),
                    height: 1.45,
                    fontSize: 14,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
