export function getApiErrorMessage(err) {
  return err?.response?.data?.message ?? err?.message ?? "Request failed.";
}
