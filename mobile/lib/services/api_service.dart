import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:flutter/foundation.dart';

class ApiService {
  final Dio _dio = Dio();

  // Smart Base URL: Configurable for local development
  static String get _baseUrl {
    // Use environment variable or default to localhost for development
    const String? envUrl = String.fromEnvironment('API_BASE_URL');
    if (envUrl != null && envUrl.isNotEmpty) {
      return envUrl;
    }
    
    if (kReleaseMode) {
      return "https://hims-kappa.vercel.app/api";
    }
    if (kIsWeb) {
      return Uri.base.origin.contains('localhost')
          ? "http://localhost:4000/api"
          : "https://hims-kappa.vercel.app/api";
    }
    return "http://10.0.2.2:4000/api"; // Android Emulator fallback
  }

  final String baseUrl = _baseUrl;

  ApiService() {
    _dio.options.baseUrl = baseUrl;
    _dio.options.connectTimeout = const Duration(seconds: 30);
    _dio.options.receiveTimeout = const Duration(seconds: 30);
    
    // Enable logging for debugging
    _dio.interceptors.add(LogInterceptor(
      requestBody: true,
      responseBody: true,
      error: true,
      logPrint: (obj) {
        if (kDebugMode) print(obj);
      },
    ));

    // Global Interceptor for Headers (Multi-tenancy & Auth)
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final prefs = await SharedPreferences.getInstance();
        final token = prefs.getString('auth_token');
        final tenantId = prefs.getString('tenant_id');

        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        if (tenantId != null) {
          options.headers['x-tenant-id'] = tenantId;
        }

        return handler.next(options);
      },
      onError: (error, handler) {
        if (kDebugMode) {
          print('API Error: ${error.error}');
          print('Request URL: ${error.requestOptions.uri}');
        }
        return handler.next(error);
      },
    ));
  }

  // Auth Methods
  Future<Response> login(String email, String password, String facility,
      {String type = "tenant"}) async {
    return _dio.post('/auth/login', data: {
      'email': email,
      'password': password,
      'facility': facility,
      'type': type,
    });
  }

  // Patient Methods
  Future<Response> getPatients() async {
    return _dio.get('/patients');
  }

  Future<Response> getAppointments({String? doctorId}) async {
    return _dio.get(
      '/appointments',
      queryParameters:
          doctorId == null || doctorId.isEmpty ? null : {'doctorId': doctorId},
    );
  }

  Future<Response> createAppointment(Map<String, dynamic> appointmentData) async {
    return _dio.post('/appointments', data: appointmentData);
  }

  // ABHA / ABDM Methods
  Future<Response> generateAbhaOtp(String aadhaar) async {
    return _dio.post('/abha/generate-otp', data: {'aadhaar': aadhaar});
  }

  Future<Response> verifyAbhaOtp(String otp, String txnId) async {
    return _dio.post('/abha/verify-otp', data: {'otp': otp, 'txnId': txnId});
  }

  Future<Response> searchAbhaByMobile(String mobile) async {
    return _dio.post('/abha/search-mobile', data: {'mobile': mobile});
  }

  // Clinical Master Data
  Future<Response> getDoctors() async {
    return _dio.get('/hospital/doctors');
  }

  Future<Response> validateAppointmentSlot(
      String doctorId, String appointmentTime) async {
    return _dio.get('/appointments/validate',
        queryParameters: {
          'doctorId': doctorId,
          'appointmentTime': appointmentTime,
        });
  }

  Future<Response> searchPatients(String query) async {
    return _dio.get('/patients', queryParameters: {'search': query});
  }

  // Encounter / Registration
  Future<Response> registerPatient(Map<String, dynamic> patientData) async {
    return _dio.post('/patients', data: patientData);
  }

  Future<Response> createEncounter(Map<String, dynamic> encounterData) async {
    return _dio.post('/consultations', data: encounterData);
  }

  Future<Response> createPrescription(String encounterId, List<Map<String, dynamic>> items) async {
    return _dio.post('/hospital/encounters/$encounterId/prescriptions', data: { 'items': items });
  }

  Future<Response> createLabOrders(String encounterId, List<String> diagnosticIds, {String priority = 'Normal'}) async {
    return _dio.post('/hospital/encounters/$encounterId/lab-orders', data: { 'diagnosticIds': diagnosticIds, 'priority': priority });
  }

  Future<Response> createAdmission(Map<String, dynamic> admissionData) async {
    return _dio.post('/hospital/ipd/admissions', data: admissionData);
  }

  Future<Response> getBedMap() async {
    return _dio.get('/hospital/ipd/bedmap');
  }

  Future<Response> getWardBeds(String wardId) async {
    return _dio.get('/hospital/ipd/wards/$wardId/beds');
  }

  // Public: register a lightweight patient complaint when no auth token is present
  Future<Response> postPatientComplaint(String patientId, Map<String, dynamic> complaintData) async {
    return _dio.post('/public/patients/$patientId/complaints', data: complaintData);
  }

  Future<Response> updateAppointmentStatus(
      String appointmentId, String status) {
    return _dio.patch('/appointments/$appointmentId', data: {'status': status});
  }

  // Nexus Methods
  Future<Response> getPublicTenants() async {
    return _dio.get('/nexus/tenants/public');
  }
}

final apiServiceProvider = Provider((ref) => ApiService());
