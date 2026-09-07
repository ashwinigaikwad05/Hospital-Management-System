const API_BASE = '/api';

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('opd_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const errorMessage = (data && data.error) || (data && data.message) || response.statusText || 'Request failed';
    throw new Error(errorMessage);
  }

  return data;
}

function buildQueryString(params = {}) {
  const cleanParams = {};
  for (const [key, value] of Object.entries(params || {})) {
    if (value !== undefined && value !== null && value !== '' && value !== 'undefined' && value !== 'null') {
      cleanParams[key] = value;
    }
  }
  const q = new URLSearchParams(cleanParams).toString();
  return q ? `?${q}` : '';
}

export const api = {
  // Auth
  login: (username, password) => apiRequest('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  getMe: () => apiRequest('/auth/me'),

  // Departments
  getDepartments: (all = false) => apiRequest(`/departments${all ? '?all=true' : ''}`),
  getDepartment: (id) => apiRequest(`/departments/${id}`),
  createDepartment: (data) => apiRequest('/departments', { method: 'POST', body: JSON.stringify(data) }),
  updateDepartment: (id, data) => apiRequest(`/departments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteDepartment: (id) => apiRequest(`/departments/${id}`, { method: 'DELETE' }),

  // Doctors
  getDoctors: (params = {}) => apiRequest(`/doctors${buildQueryString(params)}`),
  getDoctor: (id) => apiRequest(`/doctors/${id}`),
  createDoctor: (data) => apiRequest('/doctors', { method: 'POST', body: JSON.stringify(data) }),
  updateDoctor: (id, data) => apiRequest(`/doctors/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Patients
  getPatients: (params = {}) => apiRequest(`/patients${buildQueryString(params)}`),
  getPatient: (id) => apiRequest(`/patients/${id}`),
  createPatient: (data) => apiRequest('/patients', { method: 'POST', body: JSON.stringify(data) }),
  updatePatient: (id, data) => apiRequest(`/patients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePatient: (id) => apiRequest(`/patients/${id}`, { method: 'DELETE' }),

  // Appointments
  getAppointments: (params = {}) => apiRequest(`/appointments${buildQueryString(params)}`),
  getAppointment: (id) => apiRequest(`/appointments/${id}`),
  createAppointment: (data) => apiRequest('/appointments', { method: 'POST', body: JSON.stringify(data) }),
  checkInAppointment: (id) => apiRequest(`/appointments/${id}/checkin`, { method: 'PUT' }),
  rescheduleAppointment: (id, data) => apiRequest(`/appointments/${id}/reschedule`, { method: 'PUT', body: JSON.stringify(data) }),
  cancelAppointment: (id, data) => apiRequest(`/appointments/${id}/cancel`, { method: 'PUT', body: JSON.stringify(data) }),

  // Queues
  getTodayQueue: (params = {}) => apiRequest(`/queues/today${buildQueryString(params)}`),
  callNextPatient: (doctorId) => apiRequest('/queues/call-next', { method: 'POST', body: JSON.stringify({ doctor_id: doctorId }) }),
  startConsultation: (queueId) => apiRequest(`/queues/start/${queueId}`, { method: 'POST' }),
  skipPatient: (queueId) => apiRequest(`/queues/skip/${queueId}`, { method: 'POST' }),
  requeuePatient: (queueId) => apiRequest(`/queues/requeue/${queueId}`, { method: 'POST' }),
  completeQueue: (queueId) => apiRequest(`/queues/complete/${queueId}`, { method: 'POST' }),

  // Consultations
  getConsultationByAppointment: (aptId) => apiRequest(`/consultations/appointment/${aptId}`),
  getPatientConsultations: (patientId) => apiRequest(`/consultations/patient/${patientId}`),
  saveConsultation: (data) => apiRequest('/consultations', { method: 'POST', body: JSON.stringify(data) }),

  // Prescriptions
  getPrescription: (id) => apiRequest(`/prescriptions/${id}`),
  getPrescriptionByConsultation: (consultId) => apiRequest(`/prescriptions/consultation/${consultId}`),
  savePrescription: (data) => apiRequest('/prescriptions', { method: 'POST', body: JSON.stringify(data) }),
  getPrintPrescription: (id) => apiRequest(`/prescriptions/${id}/print`),

  // Bills
  getBills: (params = {}) => apiRequest(`/bills${buildQueryString(params)}`),
  getBill: (id) => apiRequest(`/bills/${id}`),
  createBill: (data) => apiRequest('/bills', { method: 'POST', body: JSON.stringify(data) }),
  updateBill: (id, data) => apiRequest(`/bills/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  getPrintBill: (id) => apiRequest(`/bills/${id}/print`),

  // Payments
  getPayments: (params = {}) => apiRequest(`/payments${buildQueryString(params)}`),
  getPaymentReceipt: (id) => apiRequest(`/payments/${id}/receipt`),
  recordPayment: (data) => apiRequest('/payments', { method: 'POST', body: JSON.stringify(data) }),

  // Reports & Dashboards
  getDashboardStats: () => apiRequest('/reports/dashboard'),
  getPatientReports: (params = {}) => apiRequest(`/reports/patients${buildQueryString(params)}`),
  getAppointmentReports: (params = {}) => apiRequest(`/reports/appointments${buildQueryString(params)}`),
  getDoctorReports: (params = {}) => apiRequest(`/reports/doctors${buildQueryString(params)}`),
  getRevenueReports: (params = {}) => apiRequest(`/reports/revenue${buildQueryString(params)}`),

  // Users (Admin)
  getUsers: () => apiRequest('/users'),
  createUser: (data) => apiRequest('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id, data) => apiRequest(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id) => apiRequest(`/users/${id}`, { method: 'DELETE' }),

  // System Settings
  getSettings: () => apiRequest('/settings'),
  updateSettings: (data) => apiRequest('/settings', { method: 'PUT', body: JSON.stringify(data) }),
};
