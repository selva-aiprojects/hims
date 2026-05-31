import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_service.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

// ─── Providers ────────────────────────────────────────────────────────────────
final myLeavesProvider = FutureProvider.family<List<dynamic>, String>((ref, token) async {
  final api = ref.read(apiServiceProvider);
  final res = await api.getMyLeaves(token);
  return (res.data as List?) ?? [];
});

final teamLeavesProvider = FutureProvider.family<List<dynamic>, String>((ref, token) async {
  final api = ref.read(apiServiceProvider);
  final res = await api.getTeamLeaveRequests(token);
  return (res.data as List?) ?? [];
});

// ─── Main Widget ──────────────────────────────────────────────────────────────
class EmployeeDashboardScreen extends ConsumerStatefulWidget {
  const EmployeeDashboardScreen({super.key});

  @override
  ConsumerState<EmployeeDashboardScreen> createState() =>
      _EmployeeDashboardScreenState();
}

class _EmployeeDashboardScreenState
    extends ConsumerState<EmployeeDashboardScreen>
    with SingleTickerProviderStateMixin {
  // ── State ──────────────────────────────────────────────────────────────────
  String _token = '';
  String _userName = '';
  String _role = '';
  bool _isManager = false;
  bool _isLoading = true;
  int _selectedTab = 0;
  late TabController _tabController;

  // Leave request form state
  final _leaveTypeOptions = ['Casual Leave', 'Sick Leave', 'Emergency Leave', 'Maternity/Paternity'];
  String _selectedLeaveType = 'Casual Leave';
  final _fromController = TextEditingController();
  final _toController   = TextEditingController();
  final _reasonController = TextEditingController();
  bool _submitting = false;

  // ── Init ───────────────────────────────────────────────────────────────────
  @override
  void initState() {
    super.initState();
    _loadUser();
  }

  Future<void> _loadUser() async {
    final prefs = await SharedPreferences.getInstance();
    final token    = prefs.getString('auth_token') ?? '';
    final userName = prefs.getString('user_name')  ?? 'Employee';
    final role     = prefs.getString('user_role')  ?? 'staff';
    final isManager= prefs.getBool('is_manager')   ?? false;

    setState(() {
      _token     = token;
      _userName  = userName;
      _role      = role;
      _isManager = isManager;
      _isLoading = false;
    });

    _tabController = TabController(
      length: _isManager ? 3 : 2,
      vsync: this,
    );
    _tabController.addListener(() => setState(() => _selectedTab = _tabController.index));
  }

  @override
  void dispose() {
    _tabController.dispose();
    _fromController.dispose();
    _toController.dispose();
    _reasonController.dispose();
    super.dispose();
  }

  // ── Leave submission ───────────────────────────────────────────────────────
  Future<void> _submitLeave() async {
    if (_fromController.text.isEmpty || _toController.text.isEmpty) {
      _showSnack('Please select From and To dates.', isError: true);
      return;
    }
    setState(() => _submitting = true);
    try {
      final api = ref.read(apiServiceProvider);
      await api.applyLeave(
        token: _token,
        leaveType: _selectedLeaveType,
        fromDate: _fromController.text,
        toDate: _toController.text,
        reason: _reasonController.text,
      );
      _fromController.clear();
      _toController.clear();
      _reasonController.clear();
      _showSnack('Leave request submitted successfully!');
      ref.invalidate(myLeavesProvider(_token));
    } catch (e) {
      _showSnack('Failed to submit leave request. Try again.', isError: true);
    } finally {
      setState(() => _submitting = false);
    }
  }

  // ── Team leave approval ────────────────────────────────────────────────────
  Future<void> _handleLeaveAction(int leaveId, String action) async {
    try {
      final api = ref.read(apiServiceProvider);
      await api.updateLeaveStatus(token: _token, leaveId: leaveId, status: action);
      _showSnack('Leave ${action == 'approved' ? 'approved' : 'rejected'} successfully.');
      ref.invalidate(teamLeavesProvider(_token));
    } catch (e) {
      _showSnack('Action failed. Please try again.', isError: true);
    }
  }

  void _showSnack(String msg, {bool isError = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(msg),
      backgroundColor: isError ? const Color(0xFFdc2626) : const Color(0xFF16a34a),
      behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
    ));
  }

  // ── Date picker helper ─────────────────────────────────────────────────────
  Future<void> _pickDate(TextEditingController ctrl) async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: now,
      firstDate: now.subtract(const Duration(days: 30)),
      lastDate: now.add(const Duration(days: 365)),
      builder: (ctx, child) => Theme(
        data: Theme.of(ctx).copyWith(
          colorScheme: const ColorScheme.light(
            primary: Color(0xFF3b82f6),
            onPrimary: Colors.white,
            surface: Colors.white,
          ),
        ),
        child: child!,
      ),
    );
    if (picked != null) {
      ctrl.text =
          '${picked.year}-${picked.month.toString().padLeft(2, '0')}-${picked.day.toString().padLeft(2, '0')}';
    }
  }

  // ── Status badge widget ────────────────────────────────────────────────────
  Widget _statusBadge(String status) {
    final map = {
      'pending':  {'bg': const Color(0xFFFEF3C7), 'text': const Color(0xFFD97706)},
      'approved': {'bg': const Color(0xFFDCFCE7), 'text': const Color(0xFF16A34A)},
      'rejected': {'bg': const Color(0xFFFEE2E2), 'text': const Color(0xFFDC2626)},
    };
    final colors = map[status.toLowerCase()] ??
        {'bg': const Color(0xFFF1F5F9), 'text': const Color(0xFF64748B)};
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: colors['bg'] as Color,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        status.toUpperCase(),
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w800,
          color: colors['text'] as Color,
          letterSpacing: 0.5,
        ),
      ),
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // BUILD
  // ─────────────────────────────────────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        backgroundColor: Color(0xFFF8FAFC),
        body: Center(child: CircularProgressIndicator(color: Color(0xFF3b82f6))),
      );
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: SafeArea(
        child: Column(
          children: [
            // ── Top App Bar ─────────────────────────────────────────────────
            _buildAppBar(),

            // ── Tab Bar ─────────────────────────────────────────────────────
            Container(
              color: Colors.white,
              child: TabBar(
                controller: _tabController,
                labelColor: const Color(0xFF3b82f6),
                unselectedLabelColor: const Color(0xFF94A3B8),
                indicatorColor: const Color(0xFF3b82f6),
                indicatorWeight: 3,
                labelStyle: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13),
                tabs: [
                  const Tab(text: 'My Leave'),
                  const Tab(text: 'Apply Leave'),
                  if (_isManager) const Tab(text: 'Team Approvals'),
                ],
              ),
            ),

            // ── Tab Content ─────────────────────────────────────────────────
            Expanded(
              child: TabBarView(
                controller: _tabController,
                children: [
                  _buildMyLeavesTab(),
                  _buildApplyLeaveTab(),
                  if (_isManager) _buildTeamApprovalsTab(),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── App Bar ─────────────────────────────────────────────────────────────────
  Widget _buildAppBar() {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 16),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(bottom: BorderSide(color: Color(0xFFF1F5F9), width: 1)),
      ),
      child: Row(
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: const Color(0xFFEFF6FF),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(Icons.person_outline, color: Color(0xFF3b82f6), size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Hello, $_userName 👋',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w900,
                    color: Color(0xFF0F172A),
                  ),
                ),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: const Color(0xFFEFF6FF),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        _role.toUpperCase().replaceAll('_', ' '),
                        style: const TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF3b82f6),
                        ),
                      ),
                    ),
                    if (_isManager) ...[
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFEF3C7),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: const Text(
                          '★ MANAGER',
                          style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Color(0xFFD97706)),
                        ),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
          IconButton(
            onPressed: () async {
              final prefs = await SharedPreferences.getInstance();
              await prefs.clear();
              if (mounted) Navigator.pushReplacementNamed(context, '/');
            },
            icon: const Icon(Icons.logout_outlined, color: Color(0xFF94A3B8), size: 20),
            tooltip: 'Sign Out',
          ),
        ],
      ),
    );
  }

  // ── My Leaves Tab ───────────────────────────────────────────────────────────
  Widget _buildMyLeavesTab() {
    final leavesAsync = ref.watch(myLeavesProvider(_token));
    return leavesAsync.when(
      loading: () => const Center(child: CircularProgressIndicator(color: Color(0xFF3b82f6))),
      error: (e, _) => _buildErrorState('Could not load your leaves.'),
      data: (leaves) {
        if (leaves.isEmpty) {
          return _buildEmptyState(
            icon: Icons.beach_access_outlined,
            title: 'No leave requests yet',
            subtitle: 'Go to "Apply Leave" to submit your first request.',
          );
        }

        // Summary counts
        final pending  = leaves.where((l) => (l['status'] ?? '') == 'pending').length;
        final approved = leaves.where((l) => (l['status'] ?? '') == 'approved').length;
        final rejected = leaves.where((l) => (l['status'] ?? '') == 'rejected').length;

        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Summary chips
            Row(
              children: [
                _summaryChip('$pending Pending', const Color(0xFFFEF3C7), const Color(0xFFD97706)),
                const SizedBox(width: 8),
                _summaryChip('$approved Approved', const Color(0xFFDCFCE7), const Color(0xFF16A34A)),
                const SizedBox(width: 8),
                _summaryChip('$rejected Rejected', const Color(0xFFFEE2E2), const Color(0xFFDC2626)),
              ],
            ),
            const SizedBox(height: 16),
            ...leaves.map((leave) => _buildLeaveCard(leave)).toList(),
          ],
        );
      },
    );
  }

  Widget _summaryChip(String label, Color bg, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Text(
          label,
          textAlign: TextAlign.center,
          style: TextStyle(fontWeight: FontWeight.w800, fontSize: 12, color: color),
        ),
      ),
    );
  }

  Widget _buildLeaveCard(Map<dynamic, dynamic> leave) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 8, offset: const Offset(0, 2))],
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  leave['leave_type'] ?? 'Leave',
                  style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: Color(0xFF0F172A)),
                ),
                _statusBadge(leave['status'] ?? 'pending'),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                const Icon(Icons.calendar_today_outlined, size: 14, color: Color(0xFF94A3B8)),
                const SizedBox(width: 6),
                Text(
                  '${_fmtDate(leave['from_date'])} → ${_fmtDate(leave['to_date'])}',
                  style: const TextStyle(fontSize: 13, color: Color(0xFF475569), fontWeight: FontWeight.w600),
                ),
              ],
            ),
            if ((leave['reason'] ?? '').isNotEmpty) ...[
              const SizedBox(height: 6),
              Text(
                leave['reason'],
                style: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ],
        ),
      ),
    );
  }

  // ── Apply Leave Tab ─────────────────────────────────────────────────────────
  Widget _buildApplyLeaveTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: const Color(0xFFE2E8F0)),
              boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 12, offset: const Offset(0, 4))],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  '📅 Apply for Leave',
                  style: TextStyle(fontSize: 17, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
                ),
                const SizedBox(height: 4),
                const Text(
                  'Your request will be sent to your manager for approval.',
                  style: TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
                ),
                const SizedBox(height: 20),

                // Leave Type
                _fieldLabel('Leave Type'),
                Container(
                  decoration: BoxDecoration(
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      value: _selectedLeaveType,
                      isExpanded: true,
                      padding: const EdgeInsets.symmetric(horizontal: 14),
                      items: _leaveTypeOptions.map((t) => DropdownMenuItem(value: t, child: Text(t, style: const TextStyle(fontSize: 14)))).toList(),
                      onChanged: (v) => setState(() => _selectedLeaveType = v!),
                    ),
                  ),
                ),
                const SizedBox(height: 16),

                // Date range
                Row(
                  children: [
                    Expanded(child: _buildDateField('From Date', _fromController)),
                    const SizedBox(width: 12),
                    Expanded(child: _buildDateField('To Date', _toController)),
                  ],
                ),
                const SizedBox(height: 16),

                // Reason
                _fieldLabel('Reason (optional)'),
                TextField(
                  controller: _reasonController,
                  maxLines: 3,
                  decoration: InputDecoration(
                    hintText: 'Brief reason for leave...',
                    hintStyle: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 13),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                    focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFF3b82f6), width: 2)),
                    contentPadding: const EdgeInsets.all(14),
                  ),
                ),
                const SizedBox(height: 24),

                // Submit button
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _submitting ? null : _submitLeave,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF3b82f6),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      elevation: 0,
                    ),
                    child: _submitting
                        ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                        : const Text('Submit Leave Request', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDateField(String label, TextEditingController ctrl) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _fieldLabel(label),
        GestureDetector(
          onTap: () => _pickDate(ctrl),
          child: AbsorbPointer(
            child: TextField(
              controller: ctrl,
              decoration: InputDecoration(
                hintText: 'YYYY-MM-DD',
                hintStyle: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 12),
                suffixIcon: const Icon(Icons.calendar_today_outlined, color: Color(0xFF94A3B8), size: 18),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFF3b82f6), width: 2)),
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              ),
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
            ),
          ),
        ),
      ],
    );
  }

  // ── Team Approvals Tab ─────────────────────────────────────────────────────
  Widget _buildTeamApprovalsTab() {
    final teamAsync = ref.watch(teamLeavesProvider(_token));
    return teamAsync.when(
      loading: () => const Center(child: CircularProgressIndicator(color: Color(0xFF3b82f6))),
      error: (e, _) => _buildErrorState('Could not load team leaves.'),
      data: (leaves) {
        final pending = leaves.where((l) => (l['status'] ?? '') == 'pending').toList();
        final others  = leaves.where((l) => (l['status'] ?? '') != 'pending').toList();

        if (leaves.isEmpty) {
          return _buildEmptyState(
            icon: Icons.group_outlined,
            title: 'No team leave requests',
            subtitle: 'Your team has no pending leave requests.',
          );
        }

        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            if (pending.isNotEmpty) ...[
              _sectionHeader('⏳ Awaiting Your Approval (${pending.length})'),
              ...pending.map((l) => _buildTeamLeaveCard(l, isPending: true)).toList(),
              const SizedBox(height: 16),
            ],
            if (others.isNotEmpty) ...[
              _sectionHeader('History'),
              ...others.map((l) => _buildTeamLeaveCard(l, isPending: false)).toList(),
            ],
          ],
        );
      },
    );
  }

  Widget _buildTeamLeaveCard(Map<dynamic, dynamic> leave, {required bool isPending}) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: isPending ? const Color(0xFFFDE68A) : const Color(0xFFE2E8F0)),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 8, offset: const Offset(0, 2))],
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        leave['employee_name'] ?? 'Team Member',
                        style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: Color(0xFF0F172A)),
                      ),
                      Text(
                        leave['leave_type'] ?? 'Leave',
                        style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                      ),
                    ],
                  ),
                ),
                _statusBadge(leave['status'] ?? 'pending'),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                const Icon(Icons.calendar_today_outlined, size: 14, color: Color(0xFF94A3B8)),
                const SizedBox(width: 6),
                Text(
                  '${_fmtDate(leave['from_date'])} → ${_fmtDate(leave['to_date'])}',
                  style: const TextStyle(fontSize: 13, color: Color(0xFF475569), fontWeight: FontWeight.w600),
                ),
              ],
            ),
            if ((leave['reason'] ?? '').isNotEmpty) ...[
              const SizedBox(height: 6),
              Text(
                '"${leave['reason']}"',
                style: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8), fontStyle: FontStyle.italic),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ],
            if (isPending) ...[
              const SizedBox(height: 14),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => _handleLeaveAction(leave['id'], 'rejected'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: const Color(0xFFDC2626),
                        side: const BorderSide(color: Color(0xFFFCA5A5)),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        padding: const EdgeInsets.symmetric(vertical: 10),
                      ),
                      child: const Text('❌ Reject', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () => _handleLeaveAction(leave['id'], 'approved'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF16A34A),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        elevation: 0,
                        padding: const EdgeInsets.symmetric(vertical: 10),
                      ),
                      child: const Text('✅ Approve', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────
  Widget _fieldLabel(String text) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Text(text, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFF475569))),
      );

  Widget _sectionHeader(String text) => Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: Text(text, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
      );

  Widget _buildEmptyState({required IconData icon, required String title, required String subtitle}) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 64, color: const Color(0xFFCBD5E1)),
            const SizedBox(height: 16),
            Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
            const SizedBox(height: 8),
            Text(subtitle, style: const TextStyle(fontSize: 13, color: Color(0xFF94A3B8)), textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }

  Widget _buildErrorState(String message) => Center(
        child: Padding(
          padding: const EdgeInsets.all(40),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.wifi_off_outlined, size: 48, color: Color(0xFFCBD5E1)),
              const SizedBox(height: 12),
              Text(message, style: const TextStyle(fontSize: 14, color: Color(0xFF94A3B8)), textAlign: TextAlign.center),
            ],
          ),
        ),
      );

  String _fmtDate(dynamic raw) {
    if (raw == null) return 'N/A';
    try {
      final d = DateTime.parse(raw.toString());
      return '${d.day.toString().padLeft(2, '0')} ${_monthName(d.month)} ${d.year}';
    } catch (_) {
      return raw.toString();
    }
  }

  String _monthName(int m) =>
      ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1];
}
