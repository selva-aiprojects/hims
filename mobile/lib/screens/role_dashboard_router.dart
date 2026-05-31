import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'admin_billing_dashboard_screen.dart';
import 'pharmacist_dashboard_screen.dart';
import 'lab_assistant_dashboard_screen.dart';
import 'dashboard_screen.dart';
import 'employee_dashboard_screen.dart';

class RoleDashboardRouter extends StatefulWidget {
  const RoleDashboardRouter({super.key});

  @override
  State<RoleDashboardRouter> createState() => _RoleDashboardRouterState();
}

class _RoleDashboardRouterState extends State<RoleDashboardRouter> {
  String _role = 'staff';
  bool _isLoading = true;

  // Employee roles — get the light-theme employee dashboard
  static const _employeeRoles = {'staff', 'nurse', 'receptionist', 'hr', 'accountant'};

  @override
  void initState() {
    super.initState();
    _loadRoleInfo();
  }

  Future<void> _loadRoleInfo() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _role = prefs.getString('user_role') ?? 'staff';
      _isLoading = false;
    });
  }

  Future<void> _switchRole(String newRole) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('user_role', newRole);
    setState(() => _role = newRole);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Switched view to ${newRole.toUpperCase()} mode'),
          backgroundColor: const Color(0xFF0284c7),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        backgroundColor: Color(0xFFF8FAFC),
        body: Center(child: CircularProgressIndicator(color: Color(0xFF0284c7))),
      );
    }

    Widget dashboardBody;
    final normalizedRole = _role.toLowerCase();

    if (normalizedRole.contains('admin') || normalizedRole.contains('billing')) {
      dashboardBody = const AdminBillingDashboardScreen();
    } else if (normalizedRole.contains('pharmacy') || normalizedRole.contains('pharmacist')) {
      dashboardBody = const PharmacistDashboardScreen();
    } else if (normalizedRole.contains('lab')) {
      dashboardBody = const LabAssistantDashboardScreen();
    } else if (normalizedRole.contains('doctor')) {
      dashboardBody = const DashboardScreen();
    } else if (_employeeRoles.any((r) => normalizedRole.contains(r))) {
      // All general staff / non-clinical roles → clean employee dashboard
      dashboardBody = const EmployeeDashboardScreen();
    } else {
      // Fallback: unknown role → employee dashboard (safest default)
      dashboardBody = const EmployeeDashboardScreen();
    }

    return Scaffold(
      body: Stack(
        children: [
          dashboardBody,
          // ── Dev Role Switcher Fab (hidden in release mode) ────────────────
          Positioned(
            bottom: 16 + MediaQuery.of(context).padding.bottom,
            right: 16,
            child: Material(
              elevation: 6,
              shadowColor: Colors.black.withValues(alpha: 0.25),
              borderRadius: BorderRadius.circular(30),
              color: const Color(0xFF1e293b),
              child: InkWell(
                borderRadius: BorderRadius.circular(30),
                onTap: () => _showRoleSwitcherDialog(context),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.swap_horiz, color: Colors.white, size: 18),
                      SizedBox(width: 6),
                      Text(
                        'Switch Role',
                        style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _showRoleSwitcherDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.supervised_user_circle, color: Color(0xFF0284c7)),
            SizedBox(width: 10),
            Text('Select Active Role', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
          ],
        ),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _buildRoleOption('Doctor',          'doctor',       Icons.medical_services_outlined,      const Color(0xFF0284c7)),
            _buildRoleOption('Admin / Billing',  'admin',        Icons.admin_panel_settings_outlined,  const Color(0xFF0ea5e9)),
            _buildRoleOption('Pharmacist',       'pharmacist',   Icons.local_pharmacy_outlined,        const Color(0xFF10b981)),
            _buildRoleOption('Lab Assistant',    'lab_assistant',Icons.biotech_outlined,               const Color(0xFF6366f1)),
            _buildRoleOption('Nurse / Staff',    'nurse',        Icons.badge_outlined,                 const Color(0xFFf59e0b)),
            _buildRoleOption('Receptionist',     'receptionist', Icons.desk_outlined,                  const Color(0xFFec4899)),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close', style: TextStyle(color: Color(0xFF64748b))),
          ),
        ],
      ),
    );
  }

  Widget _buildRoleOption(String label, String roleKey, IconData icon, Color color) {
    final isSelected = _role.toLowerCase().contains(roleKey);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: ListTile(
        onTap: () {
          Navigator.pop(context);
          _switchRole(roleKey);
        },
        leading: Icon(icon, color: isSelected ? Colors.white : color),
        title: Text(
          label,
          style: TextStyle(
            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
            color: isSelected ? Colors.white : const Color(0xFF1e293b),
          ),
        ),
        tileColor: isSelected ? color : Colors.transparent,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        trailing: isSelected ? const Icon(Icons.check_circle, color: Colors.white) : null,
        dense: true,
      ),
    );
  }
}
