import { apiClient } from "@/lib/api/client";

const readResponseData = (response) => response.data?.data;

export const adminApi = {
  async listResidents(params = {}) {
    const response = await apiClient.get("/admin/residents", { params });
    return readResponseData(response);
  },
  async createResident(payload) {
    const response = await apiClient.post("/admin/residents", payload);
    return readResponseData(response);
  },
  async updateResident(residentId, payload) {
    const response = await apiClient.patch(`/admin/residents/${residentId}`, payload);
    return readResponseData(response);
  },
  async deactivateResident(residentId) {
    const response = await apiClient.patch(`/admin/residents/${residentId}/deactivate`);
    return readResponseData(response);
  },
  async activateResident(residentId) {
    const response = await apiClient.patch(`/admin/residents/${residentId}/activate`);
    return readResponseData(response);
  },

  async listFlatTypes() {
    const response = await apiClient.get("/admin/flat-types");
    return readResponseData(response);
  },
  async createFlatType(payload) {
    const response = await apiClient.post("/admin/flat-types", payload);
    return readResponseData(response);
  },
  async listFlats(params = {}) {
    const response = await apiClient.get("/admin/flats", { params });
    return readResponseData(response);
  },
  async createFlat(payload) {
    const response = await apiClient.post("/admin/flats", payload);
    return readResponseData(response);
  },
  async updateFlat(flatId, payload) {
    const response = await apiClient.patch(`/admin/flats/${flatId}`, payload);
    return readResponseData(response);
  },
  async deactivateFlat(flatId) {
    const response = await apiClient.patch(`/admin/flats/${flatId}/deactivate`);
    return readResponseData(response);
  },
  async activateFlat(flatId) {
    const response = await apiClient.patch(`/admin/flats/${flatId}/activate`);
    return readResponseData(response);
  },

  async createAllocation(payload) {
    const response = await apiClient.post("/admin/allocations", payload);
    return readResponseData(response);
  },
  async endAllocation(allocationId, payload = {}) {
    const response = await apiClient.patch(`/admin/allocations/${allocationId}/end`, payload);
    return readResponseData(response);
  },

  async listSubscriptionPlans(params = {}) {
    const response = await apiClient.get("/admin/subscription-plans", { params });
    return readResponseData(response);
  },
  async createSubscriptionPlan(payload) {
    const response = await apiClient.post("/admin/subscription-plans", payload);
    return readResponseData(response);
  },
  async generateMonthlyRecords(payload) {
    const response = await apiClient.post("/admin/monthly-records/generate", payload);
    return readResponseData(response);
  },
  async listMonthlyRecords(params = {}) {
    const response = await apiClient.get("/admin/monthly-records", { params });
    return readResponseData(response);
  },

  async listPayments(params = {}) {
    const response = await apiClient.get("/admin/payments", { params });
    return readResponseData(response);
  },
  async createPayment(payload) {
    const response = await apiClient.post("/admin/payments", payload);
    return readResponseData(response);
  },

  async listNotifications(params = {}) {
    const response = await apiClient.get("/admin/notifications", { params });
    return readResponseData(response);
  },
  async createNotification(payload) {
    const response = await apiClient.post("/admin/notifications", payload);
    return readResponseData(response);
  },
};
