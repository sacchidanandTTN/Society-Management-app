import { apiClient } from "@/lib/api/client";

const readResponseData = (response) => response.data?.data;

const readListData = (response) => {
  const data = readResponseData(response);
  return {
    items: data?.items || [],
    pagination: data?.pagination || null,
  };
};

export const userApi = {
  async getDashboard() {
    const response = await apiClient.get("/user/dashboard");
    return readResponseData(response);
  },
  async listMonthlyRecords(params = {}) {
    const response = await apiClient.get("/user/monthly-records", { params });
    return readListData(response);
  },
  async listPayments(params = {}) {
    const response = await apiClient.get("/user/payments", { params });
    return readListData(response);
  },
  async payNow(payload) {
    const response = await apiClient.post("/user/payments/pay", payload);
    return readResponseData(response);
  },
  async listNotifications(params = {}) {
    const response = await apiClient.get("/user/notifications", { params });
    return readListData(response);
  },
  async markNotificationRead(userNotificationId) {
    const response = await apiClient.patch(`/user/notifications/${userNotificationId}/read`);
    return readResponseData(response);
  },
  async getProfile() {
    const response = await apiClient.get("/user/profile");
    return readResponseData(response);
  },
  async updateProfile(payload) {
    const response = await apiClient.patch("/user/profile", payload);
    return readResponseData(response);
  },
  async changePassword(payload) {
    const response = await apiClient.patch("/user/profile/password", payload);
    return readResponseData(response);
  },
};
