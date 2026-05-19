import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../../components/Sidebar";
import Header from "../../../components/Header";
import { API_BASE_URL as API_BASE } from "../../../config/api";
import { 
  Search, 
  User, 
  Phone, 
  Calendar, 
  Stethoscope, 
  FileText, 
  Plus, 
  Info, 
  X, 
  Activity, 
  Heart, 
  ShieldAlert, 
  UserCheck 
} from "lucide-react";

export default function PatientRegisterPage() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const getHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("token")}`,
    "x-tenant-id": localStorage.getItem("tenant") || ""
  });

  const fetchPatients = async (query = "") => {
    setLoading(true);
    try {
      const res = await axios.get(
        `${API_BASE}/api/patients?detailed=true&search=${encodeURIComponent(query)}`,
        { headers: getHeaders() }
      );
      setPatients(res.data || []);
    } catch (err) {
      console.error("Error fetching patients detailed list:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPatients(searchQuery);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    // If search is cleared, fetch default list
    if (val.trim() === "") {
      fetchPatients("");
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric"
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="dashboard-layout" style={{ backgroundColor: "#f8fafc", display: "flex", flexDirection: isMobile ? "column" : "row", minHeight: "100vh" }}>
      <Sidebar />
      <main className="main-content" style={{ padding: isMobile ? "16px" : "32px", flex: 1, width: "100%" }}>
        <Header title="Patient Registry & Archives" />

        {/* Hero Section */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "12px", marginBottom: "32px", marginTop: "8px" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "16px", background: "#eff6ff", display: "grid", placeItems: "center", color: "#2563eb", boxShadow: "0 10px 15px -3px rgba(37, 99, 235, 0.1)" }}>
            <User size={24} />
          </div>
          <p style={{ margin: 0, color: "#475569", fontSize: "13px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "1px" }}>Clinical Directory Hub</p>
          <p style={{ margin: 0, color: "#64748b", fontSize: "15px", fontWeight: 500, maxWidth: "600px" }}>
            Search complete patient records, view clinical histories, check primary doctor relationships, and instantly schedule appointments.
          </p>
        </div>

        {/* Search & Actions Bar */}
        <div className="page-card" style={{ padding: "20px", marginBottom: "24px", display: "flex", flexDirection: isMobile ? "column" : "row", gap: "16px", justifyContent: "space-between", alignItems: "center", background: "white", borderRadius: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <form onSubmit={handleSearchSubmit} style={{ display: "flex", width: isMobile ? "100%" : "60%", gap: "8px" }}>
            <div style={{ position: "relative", flex: 1 }}>
              <Search size={18} style={{ position: "absolute", left: "14px", top: "13px", color: "#94a3b8" }} />
              <input
                type="text"
                placeholder="Search by Patient Name, MRN, or Phone Number..."
                value={searchQuery}
                onChange={handleSearchChange}
                style={{
                  width: "100%",
                  padding: "10px 16px 10px 42px",
                  border: "1px solid #e2e8f0",
                  borderRadius: "10px",
                  fontSize: "14px",
                  fontWeight: 500,
                  outline: "none",
                  boxShadow: "inset 0 1px 2px rgba(0,0,0,0.02)"
                }}
              />
            </div>
            <button 
              type="submit" 
              style={{
                padding: "10px 20px",
                background: "#0f172a",
                color: "white",
                border: "none",
                borderRadius: "10px",
                fontWeight: 700,
                fontSize: "13px",
                cursor: "pointer",
                transition: "opacity 0.2s"
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = "0.9"}
              onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
            >
              Search
            </button>
          </form>

          <button 
            onClick={() => navigate("/tenant/opd/registration")}
            style={{
              padding: "10px 20px",
              background: "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: "10px",
              fontWeight: 700,
              fontSize: "13px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              width: isMobile ? "100%" : "auto",
              justifyContent: "center",
              boxShadow: "0 4px 6px -1px rgba(59, 130, 246, 0.15)"
            }}
          >
            <Plus size={16} /> Register New Patient
          </button>
        </div>

        {/* Patients Table Card */}
        <div style={{ background: "white", borderRadius: "16px", border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
          {loading ? (
            <div style={{ padding: "80px", textAlign: "center", color: "#64748b" }}>
              <div style={{ fontSize: "16px", fontWeight: 600, marginBottom: "8px" }}>Loading patient records...</div>
              <div style={{ fontSize: "13px", color: "#94a3b8" }}>Compiling archives & clinical activity logs</div>
            </div>
          ) : patients.length === 0 ? (
            <div style={{ padding: "80px", textAlign: "center", color: "#94a3b8" }}>
              <User size={48} style={{ margin: "0 auto 16px", opacity: 0.3 }} />
              <p style={{ fontWeight: 700, fontSize: "16px", color: "#475569", margin: "0 0 4px" }}>No Patients Found</p>
              <p style={{ fontSize: "13px", color: "#94a3b8", margin: 0 }}>Try adjusting your search criteria or register a new patient profile.</p>
            </div>
          ) : isMobile ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", padding: "16px" }}>
              {patients.map((p, i) => (
                <div key={p.id || i} style={{ background: "#f8fafc", borderRadius: "12px", padding: "16px", border: "1px solid #f1f5f9" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                    <div>
                      <div style={{ fontSize: "11px", fontWeight: 800, color: "#3b82f6", textTransform: "uppercase" }}>{p.mrn || "No MRN"}</div>
                      <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "15px" }}>{p.name}</div>
                    </div>
                    <button 
                      onClick={() => setSelectedPatient(p)}
                      style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer" }}
                    >
                      <Info size={18} />
                    </button>
                  </div>

                  <div style={{ fontSize: "13px", color: "#475569", display: "flex", flexDirection: "column", gap: "4px", marginBottom: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Phone size={12} style={{ color: "#94a3b8" }} /> {p.phone || "No phone contact"}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Stethoscope size={12} style={{ color: "#94a3b8" }} /> 
                      <span style={{ fontWeight: 600 }}>Doctor:</span> {p.primary_doctor || "No primary physician"}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Calendar size={12} style={{ color: "#94a3b8" }} /> 
                      <span style={{ fontWeight: 600 }}>Last Visit:</span> {formatDate(p.last_visit_date) || "No visits yet"}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "8px" }}>
                    <button 
                      onClick={() => setSelectedPatient(p)}
                      style={{ flex: 1, padding: "8px", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: "8px", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}
                    >
                      View Profile
                    </button>
                    <button 
                      onClick={() => navigate(`/tenant/appointments/book?patientId=${p.id}`)}
                      style={{ flex: 1.5, padding: "8px", background: "#3b82f6", color: "white", border: "none", borderRadius: "8px", fontSize: "12px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}
                    >
                      <Calendar size={12} /> Book Appt
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left", background: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
                  <th style={{ padding: "16px 24px", fontSize: "12px", color: "#64748b", fontWeight: 800 }}>PATIENT ID (MRN)</th>
                  <th style={{ padding: "16px 24px", fontSize: "12px", color: "#64748b", fontWeight: 800 }}>PATIENT NAME</th>
                  <th style={{ padding: "16px 24px", fontSize: "12px", color: "#64748b", fontWeight: 800 }}>PHONE NUMBER</th>
                  <th style={{ padding: "16px 24px", fontSize: "12px", color: "#64748b", fontWeight: 800 }}>PATIENT HISTORY</th>
                  <th style={{ padding: "16px 24px", fontSize: "12px", color: "#64748b", fontWeight: 800 }}>PRIMARY DOCTOR</th>
                  <th style={{ padding: "16px 24px", fontSize: "12px", color: "#64748b", fontWeight: 800 }}>LAST VISITED DATE</th>
                  <th style={{ padding: "16px 24px", fontSize: "12px", color: "#64748b", fontWeight: 800, textAlign: "right" }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((p, i) => (
                  <tr key={p.id || i} style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.2s" }} className="hover-light">
                    <td style={{ padding: "16px 24px" }}>
                      <span style={{ fontSize: "13px", fontWeight: 900, color: "#3b82f6", background: "#eff6ff", padding: "4px 8px", borderRadius: "6px" }}>
                        {p.mrn || "N/A"}
                      </span>
                    </td>
                    <td style={{ padding: "16px 24px" }}>
                      <div style={{ fontWeight: 800, color: "#0f172a" }}>{p.name}</div>
                      {p.age && <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>{p.gender || "Gender N/A"}, {p.age} Yrs</div>}
                    </td>
                    <td style={{ padding: "16px 24px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 600, color: "#475569", fontSize: "13px" }}>
                        <Phone size={13} style={{ color: "#94a3b8" }} />
                        {p.phone || "—"}
                      </div>
                    </td>
                    <td style={{ padding: "16px 24px", maxWidth: "250px" }}>
                      <div style={{ fontSize: "13px", color: "#475569", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                        {p.medical_history || "No recorded history"}
                      </div>
                      {p.allergies && (
                        <div style={{ fontSize: "11px", color: "#ef4444", fontWeight: 700, display: "flex", alignItems: "center", gap: "4px", marginTop: "2px" }}>
                          Allergies: {p.allergies}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "16px 24px" }}>
                      {p.primary_doctor ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981" }}></span>
                          <span style={{ fontWeight: 700, color: "#334155", fontSize: "13px" }}>Dr. {p.primary_doctor}</span>
                        </div>
                      ) : (
                        <span style={{ color: "#94a3b8", fontSize: "12px", fontStyle: "italic" }}>None assigned</span>
                      )}
                    </td>
                    <td style={{ padding: "16px 24px" }}>
                      {p.last_visit_date ? (
                        <span style={{ fontSize: "12px", color: "#1e293b", background: "#f1f5f9", padding: "4px 8px", borderRadius: "20px", fontWeight: 700 }}>
                          {formatDate(p.last_visit_date)}
                        </span>
                      ) : (
                        <span style={{ fontSize: "12px", color: "#64748b", background: "#f8fafc", border: "1px dashed #e2e8f0", padding: "3px 8px", borderRadius: "20px", fontWeight: 500 }}>
                          No visits yet
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "16px 24px", textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: "8px" }}>
                        <button 
                          onClick={() => setSelectedPatient(p)}
                          style={{
                            padding: "8px 14px",
                            background: "#f1f5f9",
                            color: "#475569",
                            border: "none",
                            borderRadius: "8px",
                            fontWeight: 700,
                            fontSize: "12px",
                            cursor: "pointer",
                            transition: "all 0.2s"
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = "#e2e8f0"}
                          onMouseLeave={(e) => e.currentTarget.style.background = "#f1f5f9"}
                        >
                          View Profile
                        </button>
                        <button 
                          onClick={() => navigate(`/tenant/appointments/book?patientId=${p.id}`)}
                          style={{
                            padding: "8px 14px",
                            background: "#3b82f6",
                            color: "white",
                            border: "none",
                            borderRadius: "8px",
                            fontWeight: 700,
                            fontSize: "12px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            transition: "all 0.2s"
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = "#2563eb"}
                          onMouseLeave={(e) => e.currentTarget.style.background = "#3b82f6"}
                        >
                          <Calendar size={13} />
                          Book Appt
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Patient Profile Detail Modal */}
        {selectedPatient && (
          <div style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1050
          }}>
            <div style={{
              background: "white", padding: "32px", borderRadius: "24px", width: "90%", maxWidth: "700px",
              maxHeight: "90vh", overflowY: "auto", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              border: "1px solid #e2e8f0", animation: "modalIn 0.3s ease-out"
            }}>
              {/* Modal Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9", paddingBottom: "16px", marginBottom: "24px" }}>
                <div>
                  <span style={{ fontSize: "11px", fontWeight: 800, color: "#3b82f6", background: "#eff6ff", padding: "4px 8px", borderRadius: "6px", textTransform: "uppercase" }}>
                    Patient Dossier • {selectedPatient.mrn || "No MRN"}
                  </span>
                  <h3 style={{ margin: "4px 0 0", fontSize: "22px", fontWeight: 900, color: "#0f172a" }}>{selectedPatient.name}</h3>
                </div>
                <button 
                  onClick={() => setSelectedPatient(null)}
                  style={{ background: "#f1f5f9", border: "none", borderRadius: "50%", padding: "8px", cursor: "pointer", display: "grid", placeItems: "center", color: "#64748b" }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                
                {/* Section 1: Demographics */}
                <div>
                  <h4 style={{ margin: "0 0 12px", fontSize: "13px", fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <UserCheck size={14} style={{ color: "#3b82f6" }} /> Personal Demographics
                  </h4>
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: "16px", background: "#f8fafc", padding: "16px", borderRadius: "12px", border: "1px solid #f1f5f9" }}>
                    <div>
                      <span style={{ display: "block", fontSize: "11px", color: "#64748b", fontWeight: 600 }}>GENDER & AGE</span>
                      <span style={{ fontSize: "13px", fontWeight: 700, color: "#334155" }}>
                        {selectedPatient.gender || "—"}, {selectedPatient.age || "—"} yrs
                      </span>
                    </div>
                    <div>
                      <span style={{ display: "block", fontSize: "11px", color: "#64748b", fontWeight: 600 }}>DATE OF BIRTH</span>
                      <span style={{ fontSize: "13px", fontWeight: 700, color: "#334155" }}>
                        {selectedPatient.dob ? formatDate(selectedPatient.dob) : "—"}
                      </span>
                    </div>
                    <div>
                      <span style={{ display: "block", fontSize: "11px", color: "#64748b", fontWeight: 600 }}>BLOOD GROUP</span>
                      <span style={{ fontSize: "13px", fontWeight: 700, color: "#ef4444", display: "flex", alignItems: "center", gap: "4px" }}>
                        <Heart size={12} fill="#ef4444" /> {selectedPatient.blood_group || "—"}
                      </span>
                    </div>
                    <div>
                      <span style={{ display: "block", fontSize: "11px", color: "#64748b", fontWeight: 600 }}>CONTACT PHONE</span>
                      <span style={{ fontSize: "13px", fontWeight: 700, color: "#334155" }}>{selectedPatient.phone || "—"}</span>
                    </div>
                    <div>
                      <span style={{ display: "block", fontSize: "11px", color: "#64748b", fontWeight: 600 }}>EMAIL ADDRESS</span>
                      <span style={{ fontSize: "13px", fontWeight: 700, color: "#334155" }}>{selectedPatient.email || "—"}</span>
                    </div>
                    <div>
                      <span style={{ display: "block", fontSize: "11px", color: "#64748b", fontWeight: 600 }}>OCCUPATION</span>
                      <span style={{ fontSize: "13px", fontWeight: 700, color: "#334155" }}>{selectedPatient.occupation || "—"}</span>
                    </div>
                    <div style={{ gridColumn: isMobile ? "span 1" : "span 3" }}>
                      <span style={{ display: "block", fontSize: "11px", color: "#64748b", fontWeight: 600 }}>RESIDENTIAL ADDRESS</span>
                      <span style={{ fontSize: "13px", fontWeight: 700, color: "#334155" }}>{selectedPatient.address || "—"}</span>
                    </div>
                  </div>
                </div>

                {/* Section 2: Guardian Details */}
                <div>
                  <h4 style={{ margin: "0 0 12px", fontSize: "13px", fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Activity size={14} style={{ color: "#10b981" }} /> Emergency contact & Guardian
                  </h4>
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "16px", background: "#f8fafc", padding: "16px", borderRadius: "12px", border: "1px solid #f1f5f9" }}>
                    <div>
                      <span style={{ display: "block", fontSize: "11px", color: "#64748b", fontWeight: 600 }}>GUARDIAN NAME</span>
                      <span style={{ fontSize: "13px", fontWeight: 700, color: "#334155" }}>{selectedPatient.guardian_name || "—"}</span>
                    </div>
                    <div>
                      <span style={{ display: "block", fontSize: "11px", color: "#64748b", fontWeight: 600 }}>GUARDIAN PHONE</span>
                      <span style={{ fontSize: "13px", fontWeight: 700, color: "#334155" }}>{selectedPatient.guardian_phone || "—"}</span>
                    </div>
                  </div>
                </div>

                {/* Section 3: Clinical Information */}
                <div>
                  <h4 style={{ margin: "0 0 12px", fontSize: "13px", fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Stethoscope size={14} style={{ color: "#f59e0b" }} /> Clinical Profile
                  </h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div style={{ background: "#fffbeb", padding: "16px", borderRadius: "12px", border: "1px solid #fef3c7" }}>
                      <span style={{ display: "block", fontSize: "11px", color: "#b45309", fontWeight: 800, textTransform: "uppercase" }}>Primary Medical History</span>
                      <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#78350f", fontWeight: 600, lineHeight: 1.5 }}>
                        {selectedPatient.medical_history || "No documented primary medical history."}
                      </p>
                    </div>

                    {selectedPatient.allergies && (
                      <div style={{ background: "#fef2f2", padding: "16px", borderRadius: "12px", border: "1px solid #fee2e2" }}>
                        <span style={{ fontSize: "11px", color: "#b91c1c", fontWeight: 800, textTransform: "uppercase", display: "flex", alignItems: "center", gap: "4px" }}>
                          <ShieldAlert size={12} /> Critical Allergies & Intolerances
                        </span>
                        <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#991b1b", fontWeight: 700, lineHeight: 1.5 }}>
                          {selectedPatient.allergies}
                        </p>
                      </div>
                    )}

                    {selectedPatient.ai_summary && (
                      <div style={{ background: "#f0fdf4", padding: "16px", borderRadius: "12px", border: "1px solid #dcfce7" }}>
                        <span style={{ fontSize: "11px", color: "#166534", fontWeight: 800, textTransform: "uppercase", display: "flex", alignItems: "center", gap: "4px" }}>
                          <FileText size={12} /> AI Clinical Summary
                        </span>
                        <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#14532d", fontWeight: 600, lineHeight: 1.5, whiteSpace: "pre-line" }}>
                          {selectedPatient.ai_summary}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Section 4: Visitation & Physician */}
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "16px", background: "#f8fafc", padding: "16px", borderRadius: "12px", border: "1px solid #f1f5f9" }}>
                  <div>
                    <span style={{ display: "block", fontSize: "11px", color: "#64748b", fontWeight: 600 }}>PRIMARY ASSIGNED PHYSICIAN</span>
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "#334155" }}>
                      {selectedPatient.primary_doctor ? `Dr. ${selectedPatient.primary_doctor}` : "No physician consultations recorded."}
                    </span>
                  </div>
                  <div>
                    <span style={{ display: "block", fontSize: "11px", color: "#64748b", fontWeight: 600 }}>LAST VISIT DATE</span>
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "#334155" }}>
                      {selectedPatient.last_visit_date ? formatDate(selectedPatient.last_visit_date) : "No records of clinical visits."}
                    </span>
                  </div>
                </div>

              </div>

              {/* Modal Footer */}
              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "32px", borderTop: "1px solid #f1f5f9", paddingTop: "16px" }}>
                <button 
                  onClick={() => setSelectedPatient(null)}
                  style={{ padding: "10px 20px", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: "10px", fontWeight: 700, fontSize: "13px", cursor: "pointer" }}
                >
                  Close Dossier
                </button>
                <button 
                  onClick={() => {
                    const pid = selectedPatient.id;
                    setSelectedPatient(null);
                    navigate(`/tenant/appointments/book?patientId=${pid}`);
                  }}
                  style={{ padding: "10px 20px", background: "#3b82f6", color: "white", border: "none", borderRadius: "10px", fontWeight: 700, fontSize: "13px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <Calendar size={14} /> Schedule Appointment
                </button>
              </div>

            </div>
          </div>
        )}
      </main>
      
      <style>{`
        .hover-light:hover {
          background-color: #f8fafc;
        }
        @keyframes modalIn {
          from {
            transform: scale(0.95);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
