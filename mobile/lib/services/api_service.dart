import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:flutter/foundation.dart';
import 'dart:html' as html; // ignore: avoid_web_libraries_in_flutter

class ApiService {
  final Dio _dio = Dio();
  
  // Smart Base URL: Pointing to your live HIMS-KAPPA backend
  static String get _baseUrl {
    if (kIsWeb) {
      final String origin = html.window.location.origin;
      // If running locally, use localhost:4000. If on Vercel, use the KAPPA production API.
      return origin.contains('localhost') ? "http://localhost:4000/api" : "https://hims-kappa.vercel.app/api";
    }
    return "http://10.0.2.2:4000/api"; // Android Emulator fallback
  }

  final String baseUrl = _baseUrl;

  ApiService() {
    _dio.options.baseUrl = baseUrl;
    _dio.options.connectTimeout = const Duration(seconds: 10);
    _dio.options.receiveTimeout = const Duration(seconds: 10);
    
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
    ));
  }

  // Auth Methods
  Future<Response> login(String email, String password, String facility, {String type = "tenant"}) async {
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

  Future<Response> searchPatients(String query) async {
    return _dio.get('/patients', queryParameters: {'search': query});
  }

  // Encounter / Registration
  Future<Response> registerPatient(Map<String, dynamic> patientData) async {
    return _dio.post('/patients', data: patientData);
  }

  Future<Response> createEncounter(Map<String, dynamic> encounterData) async {
    return _dio.post('/hospital/encounters', data: encounterData);
  }

  // Nexus Methods
  Future<Response> getPublicTenants() async {
    return _dio.get('/nexus/tenants/public');
  }
}

final apiServiceProvider = Provider((ref) => ApiService());
