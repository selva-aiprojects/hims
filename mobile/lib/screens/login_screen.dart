import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_service.dart';
import 'role_dashboard_router.dart';
import 'patient_dashboard_screen.dart';

// Provider to fetch tenants from the database
final tenantsProvider = FutureProvider<List<dynamic>>((ref) async {
  final apiService = ref.read(apiServiceProvider);
  final response = await apiService.getPublicTenants();
  return response.data as List<dynamic>;
});

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  String? _selectedFacilityId;
  bool _isLoading = false;
  String? _errorMessage;

  Future<void> _handleLogin() async {
    if (_selectedFacilityId == null) {
      setState(() => _errorMessage = 'Please select a facility');
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final apiService = ref.read(apiServiceProvider);
      final response = await apiService.login(
        _emailController.text,
        _passwordController.text,
        _selectedFacilityId!,
      );

      if (response.statusCode == 200) {
        final data = response.data;
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('auth_token', data['token']);
        await prefs.setString('tenant_id', data['tenantId']);
        await prefs.setString('user_role', data['role'] ?? 'doctor');
        await prefs.setString('user_name', data['userName'] ?? 'User');
        await prefs.setBool('is_manager', data['isManager'] == true);
        if (data['userId'] != null) {
          await prefs.setString('user_id', data['userId'].toString());
        }

        if (mounted) {
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(builder: (context) => const RoleDashboardRouter()),
          );
        }
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Login failed. Please check your credentials.';
      });
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final tenantsAsync = ref.watch(tenantsProvider);

    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 40),
              Center(
                child: Image.asset(
                  'assets/logo.png',
                  height: 120,
                  errorBuilder: (context, error, stackTrace) {
                    return const Icon(Icons.health_and_safety,
                        size: 80, color: Color(0xFF0284c7));
                  },
                ),
              ),
              const SizedBox(height: 24),
              const Text(
                'Healthezee',
                textAlign: TextAlign.center,
                style: TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.w900,
                    color: Color(0xFF1e293b)),
              ),
              const Text(
                'Professional Clinical Suite',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 16, color: Color(0xFF64748b)),
              ),
              const SizedBox(height: 48),

              // Dynamic Facility Selection Dropdown
              tenantsAsync.when(
                data: (tenants) {
                  // Ensure selected ID is valid
                  if (_selectedFacilityId == null && tenants.isNotEmpty) {
                    _selectedFacilityId = tenants.first['id'].toString();
                  }

                  return DropdownButtonFormField<String>(
                    initialValue: _selectedFacilityId,
                    decoration: InputDecoration(
                      labelText: 'Select Facility / Tenant',
                      border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(16)),
                      prefixIcon:
                          const Icon(Icons.business, color: Color(0xFF0284c7)),
                      filled: true,
                      fillColor: Colors.white,
                    ),
                    items: tenants.map((dynamic tenant) {
                      return DropdownMenuItem<String>(
                        value: tenant['id'].toString(),
                        child: Text(tenant['name'].toString(),
                            style: const TextStyle(fontSize: 14)),
                      );
                    }).toList(),
                    onChanged: (String? newValue) {
                      setState(() {
                        _selectedFacilityId = newValue;
                      });
                    },
                  );
                },
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (err, stack) => DropdownButtonFormField<String>(
                  decoration: InputDecoration(
                    labelText: 'Facility (Offline Mode)',
                    border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(16)),
                    prefixIcon: const Icon(Icons.warning, color: Colors.orange),
                  ),
                  items: const [
                    DropdownMenuItem(value: '1', child: Text('City Clinic')),
                    DropdownMenuItem(
                        value: '2', child: Text('Metropolis Diagnostics')),
                  ],
                  onChanged: (v) {},
                ),
              ),

              const SizedBox(height: 16),
              TextField(
                controller: _emailController,
                decoration: InputDecoration(
                  labelText: 'Email Address',
                  border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(16)),
                  prefixIcon: const Icon(Icons.email, color: Color(0xFF64748b)),
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _passwordController,
                obscureText: true,
                decoration: InputDecoration(
                  labelText: 'Password',
                  border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(16)),
                  prefixIcon: const Icon(Icons.lock, color: Color(0xFF64748b)),
                ),
              ),

              if (_errorMessage != null) ...[
                const SizedBox(height: 16),
                Text(
                  _errorMessage!,
                  style: const TextStyle(
                      color: Colors.red, fontWeight: FontWeight.bold),
                  textAlign: TextAlign.center,
                ),
              ],

              const SizedBox(height: 32),
              ElevatedButton(
                onPressed: _isLoading ? null : _handleLogin,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF0284c7),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 18),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16)),
                  elevation: 2,
                ),
                child: _isLoading
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(
                            color: Colors.white, strokeWidth: 2))
                    : const Text('STAFF SIGN IN',
                        style: TextStyle(
                            fontWeight: FontWeight.bold, fontSize: 16)),
              ),
              const SizedBox(height: 12),
              OutlinedButton(
                onPressed: () {
                  Navigator.pushReplacement(
                    context,
                    MaterialPageRoute(
                        builder: (context) => const PatientDashboardScreen()),
                  );
                },
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 18),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16)),
                  side: const BorderSide(color: Color(0xFFe2e8f0)),
                ),
                child: const Text('SWITCH TO PATIENT VIEW',
                    style: TextStyle(
                        color: Color(0xFF64748b), fontWeight: FontWeight.bold)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
