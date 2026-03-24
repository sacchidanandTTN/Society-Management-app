import ApiError from "../utils/ApiError.js";
import axios from "axios";

const getPushConfig = () => ({
  provider: process.env.PUSH_PROVIDER,
  oneSignalAppId: process.env.ONESIGNAL_APP_ID,
  oneSignalApiKey: process.env.ONESIGNAL_API_KEY,
});

const postOneSignalNotification = async ({ oneSignalAppId, oneSignalApiKey, body }) => {
  const response = await axios.post("https://api.onesignal.com/notifications", body, {
    headers: {
      Authorization: `Key ${oneSignalApiKey}`,
      "Content-Type": "application/json",
    },
    validateStatus: () => true,
  });
  const payload = response.data || {};
  if (response.status < 200 || response.status >= 300) {
    throw new ApiError(
      response.status,
      payload?.errors?.[0] || payload?.error || "OneSignal push request failed."
    );
  }
  return payload;
};

const normalizeOneSignalResult = ({ ids, payload }) => {
  if (Array.isArray(payload?.errors) && payload.errors.length) {
    return {
      sent: false,
      provider: "onesignal",
      reason: payload.errors[0],
      response: payload,
    };
  }

  if (typeof payload?.recipients === "number" && payload.recipients < 1) {
    return {
      sent: false,
      provider: "onesignal",
      reason: "no_subscribed_recipients",
      response: payload,
    };
  }

  return {
    sent: true,
    provider: "onesignal",
    recipients: ids.length,
    response: payload,
  };
};

const sendOneSignalPush = async ({ title, message, recipientExternalIds }) => {
  const { oneSignalAppId, oneSignalApiKey } = getPushConfig();
  if (!oneSignalAppId || !oneSignalApiKey) {
    return { sent: false, reason: "onesignal_not_configured" };
  }

  const ids = (recipientExternalIds || [])
    .map((id) => String(id).trim())
    .filter(Boolean);

  if (!ids.length) {
    return { sent: false, reason: "no_recipients" };
  }

  const baseBody = {
    app_id: oneSignalAppId,
    target_channel: "push",
    headings: { en: title },
    contents: { en: message },
  };

  // Primary path: external_id set by OneSignal.login(residentId)
  const externalPayload = await postOneSignalNotification({
    oneSignalAppId,
    oneSignalApiKey,
    body: {
      ...baseBody,
      include_aliases: {
        external_id: ids,
      },
    },
  });
  const externalResult = normalizeOneSignalResult({ ids, payload: externalPayload });
  if (externalResult.sent) {
    return externalResult;
  }

  // Fallback: keep backward compatibility for older alias mapping.
  const shouldFallback =
    externalResult.reason === "no_subscribed_recipients" ||
    externalResult.reason === "All included players are not subscribed";
  if (!shouldFallback) {
    return externalResult;
  }

  const residentAliasPayload = await postOneSignalNotification({
    oneSignalAppId,
    oneSignalApiKey,
    body: {
      ...baseBody,
      include_aliases: {
        resident_id: ids,
      },
    },
  });
  const aliasResult = normalizeOneSignalResult({ ids, payload: residentAliasPayload });
  if (aliasResult.sent) {
    return aliasResult;
  }

  return {
    ...aliasResult,
    detail: "Both external_id and resident_id alias delivery returned no subscribed recipients.",
  };
};

const sendPushNotification = async ({ title, message, residentIds }) => {
  const { provider, oneSignalAppId, oneSignalApiKey } = getPushConfig();
  const resolvedProvider =
    provider || (oneSignalAppId && oneSignalApiKey ? "onesignal" : "");

  if (!resolvedProvider) {
    return { sent: false, reason: "provider_not_configured" };
  }

  if (resolvedProvider === "onesignal") {
    return sendOneSignalPush({
      title,
      message,
      recipientExternalIds: residentIds,
    });
  }

  return { sent: false, reason: "unsupported_provider", provider: resolvedProvider };
};

export { sendPushNotification };
