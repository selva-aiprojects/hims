import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../widgets/breadcrumb.dart';
import '../services/api_service.dart';

class OPDRegistrationScreen extends ConsumerStatefulWidget {
  const OPDRegistrationScreen({super.key});

  @override
  ConsumerState<OPDRegistrationScreen> createState() => _OPDRegistrationScreenState();
}

class _OPDRegistrationScreenState extends ConsumerState<OPDRegistrationScreen> {
  final _formKey = GlobalKey<FormState>();
  
  // Patient Details
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _abhaIdController = TextEditingController();
  String _gender = 'Male';
  
  // ABHA State
  String _aadhaarInput = '';
  String _otpInput = '';
  String? _txnId;
  bool _isAbhaLoading = false;
  bool _isAbhaVerified = false;
  bool _hasConsent = false;
  
  // Clinical State
  final _weightController = TextEditingController();
  final _bpController = TextEditingController();
  String? _selectedDoctorId;
  List<dynamic> _doctors = [];
  bool _isLoadingDoctors = true;

  @override
  void initState() {
    super.initState();
    _fetchDoctors();
  }

  Future<void> _fetchDoctors() async {
    try {
      final api = ref.read(apiServiceProvider);
      final res = await api.getDoctors();
      setState(() {
        _doctors = res.data;
        _isLoadingDoctors = false;
      });
    } catch (e) {
      setState(() => _isLoadingDoctors = false);
    }
  }

  Future<void> _generateAbhaOtp() async {
    if (_aadhaarInput.length != 12) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Enter 12-digit Aadhaar')));
      return;
    }
    setState(() => _isAbhaLoading = true);
    try {
      final api = ref.read(apiServiceProvider);
      final res = await api.generateAbhaOtp(_aadhaarInput);
      setState(() {
        _txnId = res.data['txnId'];
        _isAbhaLoading = false;
      });
      _showOtpDialog();
    } catch (e) {
      setState(() => _isAbhaLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Failed to generate OTP')));
    }
  }

  Future<void> _verifyAbhaOtp() async {
    setState(() => _isAbhaLoading = true);
    try {
      final api = ref.read(apiServiceProvider);
      final res = await api.verifyAbhaOtp(_otpInput, _txnId!);
      final profile = res.data;
      setState(() {
        _nameController.text = profile['name'] ?? '';
        _gender = profile['gender'] == 'M' ? 'Male' : 'Female';
        _abhaIdController.text = profile['healthId'] ?? '';
        _isAbhaVerified = true;
        _isAbhaLoading = false;
      });
      Navigator.pop(context); // Close OTP Dialog
    } catch (e) {
      setState(() => _isAbhaLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Verification Failed')));
    }
  }

  void _showOtpDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Enter Aadhaar OTP'),
        content: TextField(
          onChanged: (v) => _otpInput = v,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(hintText: '6-digit code'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          ElevatedButton(onPressed: _verifyAbhaOtp, child: const Text('Verify')),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFf8fafc),
      appBar: AppBar(
        title: const Text('Clinical Intake Desk'),
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF1e293b),
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Breadcrumb(paths: ['Dashboard', 'OPD', 'Registration']),
              const SizedBox(height: 20),
              
              // ABHA SECTION
              _buildSectionTitle(Icons.shield, 'ABHA IDENTITY (ABDM)'),
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.blue.withOpacity(0.05),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: Colors.blue.withOpacity(0.1)),
                ),
                child: Column(
                  children: [
                    Row(
                      children: [
                        Checkbox(
                          value: _hasConsent, 
                          onChanged: (v) => setState(() => _hasConsent = v!),
                          activeColor: const Color(0xFF0284c7),
                        ),
                        const Expanded(
                          child: Text('I consent to share my ABHA for clinical purposes', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    if (!_isAbhaVerified) ...[
                      TextField(
                        onChanged: (v) => _aadhaarInput = v,
                        decoration: InputDecoration(
                          labelText: 'Aadhaar Number',
                          fillColor: Colors.white,
                          filled: true,
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          suffixIcon: IconButton(
                            icon: _isAbhaLoading ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.send),
                            onPressed: _hasConsent ? _generateAbhaOtp : null,
                          ),
                        ),
                      ),
                    ] else ...[
                      const Row(
                        children: [
                          Icon(Icons.check_circle, color: Colors.green),
                          SizedBox(width: 12),
                          Text('ABHA Identity Verified', style: TextStyle(color: Colors.green, fontWeight: FontWeight.bold)),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
              
              const SizedBox(height: 32),
              _buildSectionTitle(Icons.person_add, 'PATIENT DEMOGRAPHICS'),
              _buildTextField(_nameController, 'Full Name', Icons.person),
              const SizedBox(height: 16),
              _buildTextField(_phoneController, 'Phone Number', Icons.phone, keyboardType: TextInputType.phone),
              const SizedBox(height: 16),
              const Text('Gender', style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF64748b))),
              const SizedBox(height: 8),
              Row(
                children: ['Male', 'Female', 'Other'].map((g) => _buildGenderChip(g)).toList(),
              ),
              
              const SizedBox(height: 32),
              _buildSectionTitle(Icons.monitor_heart, 'INITIAL VITALS'),
              Row(
                children: [
                  Expanded(child: _buildTextField(_weightController, 'Weight (kg)', Icons.scale)),
                  const SizedBox(width: 16),
                  Expanded(child: _buildTextField(_bpController, 'BP (Sys/Dia)', Icons.speed)),
                ],
              ),
              
              const SizedBox(height: 32),
              _buildSectionTitle(Icons.assignment_ind, 'ASSIGN CONSULTANT'),
              _isLoadingDoctors 
                ? const Center(child: CircularProgressIndicator())
                : Column(
                    children: _doctors.map((doc) => _buildDoctorCard(doc)).toList(),
                  ),
                  
              const SizedBox(height: 40),
              ElevatedButton(
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Patient Registered & Token Issued!'), backgroundColor: Colors.green),
                  );
                  Navigator.pop(context);
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF0f172a),
                  foregroundColor: Colors.white,
                  minimumSize: const Size(double.infinity, 64),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                  elevation: 8,
                  shadowColor: const Color(0xFF0f172a).withOpacity(0.4),
                ),
                child: const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.offline_bolt),
                    SizedBox(width: 12),
                    Text('FINALIZE & ISSUE TOKEN', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                  ],
                ),
              ),
              const SizedBox(height: 40),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSectionTitle(IconData icon, String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        children: [
          Icon(icon, size: 18, color: const Color(0xFF0284c7)),
          const SizedBox(width: 8),
          Text(title, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w900, color: Color(0xFF64748b), letterSpacing: 1.1)),
        ],
      ),
    );
  }

  Widget _buildTextField(TextEditingController controller, String label, IconData icon, {TextInputType keyboardType = TextInputType.text}) {
    return TextField(
      controller: controller,
      keyboardType: keyboardType,
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: Icon(icon, color: const Color(0xFF94a3b8), size: 20),
        filled: true,
        fillColor: Colors.white,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: Color(0xFFe2e8f0))),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: Color(0xFFe2e8f0))),
      ),
    );
  }

  Widget _buildGenderChip(String label) {
    final isSelected = _gender == label;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: ChoiceChip(
        label: Text(label),
        selected: isSelected,
        onSelected: (v) => setState(() => _gender = label),
        selectedColor: const Color(0xFF0284c7),
        labelStyle: TextStyle(color: isSelected ? Colors.white : const Color(0xFF64748b), fontWeight: FontWeight.bold),
      ),
    );
  }

  Widget _buildDoctorCard(dynamic doc) {
    final isSelected = _selectedDoctorId == doc['id'].toString();
    return GestureDetector(
      onTap: () => setState(() => _selectedDoctorId = doc['id'].toString()),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFFf0f9ff) : Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: isSelected ? const Color(0xFF0284c7) : const Color(0xFFe2e8f0), width: 2),
        ),
        child: Row(
          children: [
            CircleAvatar(backgroundColor: const Color(0xFFf1f5f9), child: Icon(Icons.person, color: isSelected ? const Color(0xFF0284c7) : const Color(0xFF94a3b8))),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(doc['name'], style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                  Text(doc['specialization'] ?? 'Consultant', style: const TextStyle(fontSize: 12, color: Color(0xFF64748b))),
                ],
              ),
            ),
            if (isSelected) const Icon(Icons.check_circle, color: Color(0xFF0284c7)),
          ],
        ),
      ),
    );
  }
}
