import ApiError from "../utils/ApiError.js";
import axios from "axios";

let cachedToken = null;
let cachedTokenExpiryEpochMs = 0;
const auth0UserCache = new Map();

const getAuth0UserCacheTtlMs = () => {
  const raw = Number(process.env.AUTH0_USER_CACHE_TTL_MS);
  if (Number.isFinite(raw) && raw > 0) return raw;
  return 60_000;
};

const getConfig = () => {
  const domain = (process.env.AUTH0_DOMAIN || "").replace(/^https?:\/\//, "");
  const clientId = process.env.AUTH0_M2M_CLIENT_ID;
  const clientSecret = process.env.AUTH0_M2M_CLIENT_SECRET;
  const audience = process.env.AUTH0_MANAGEMENT_AUDIENCE;
  const dbConnection = process.env.AUTH0_DB_CONNECTION;

  const missing = [];
  if (!domain) missing.push("domain");
  if (!clientId) missing.push("clientId");
  if (!clientSecret) missing.push("clientSecret");
  if (!audience) missing.push("audience");
  if (!dbConnection) missing.push("dbConnection");

  if (missing.length) {
    throw new ApiError(500, `Missing Auth0 config: ${missing.join(", ")}.`);
  }

  return { domain, clientId, clientSecret, audience, dbConnection };
};

const callManagementApi = async (method, path, token, body = null) => {
  const { domain } = getConfig();
  const res = await axios({
    method,
    url: `https://${domain}${path}`,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    data: body || undefined,
    validateStatus: () => true,
  });
  const data = res.data;

  if (res.status < 200 || res.status >= 300) {
    throw new ApiError(
      res.status,
      data?.message || "Auth0 request failed.",
      data ? [data] : []
    );
  }

  return data;
};

const getManagementToken = async () => {
  if (cachedToken && Date.now() < cachedTokenExpiryEpochMs - 10_000) {
    return cachedToken;
  }

  const { domain, clientId, clientSecret, audience } = getConfig();

  const res = await axios.post(
    `https://${domain}/oauth/token`,
    {
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
      audience,
    },
    {
      headers: { "Content-Type": "application/json" },
      validateStatus: () => true,
    }
  );
  const data = res.data;

  if (res.status < 200 || res.status >= 300) {
    throw new ApiError(
      res.status,
      data?.error_description || "Failed to get Auth0 token.",
      data ? [data] : []
    );
  }

  cachedToken = data.access_token;
  cachedTokenExpiryEpochMs = Date.now() + (data.expires_in || 3600) * 1000;
  return cachedToken;
};

const createAuth0ResidentUser = async ({ name, email, password }) => {
  const token = await getManagementToken();
  const { dbConnection } = getConfig();

  const createdUser = await callManagementApi("POST", "/api/v2/users", token, {
    connection: dbConnection,
    email,
    name,
    password,
    email_verified: false,
    verify_email: true,
    app_metadata: {
      role: "user",
    },
  });

  return createdUser;
};

const changeAuth0UserPassword = async (auth0Id, newPassword) => {
  const token = await getManagementToken();
  const { dbConnection } = getConfig();
  const id = encodeURIComponent(auth0Id);

  return callManagementApi("PATCH", `/api/v2/users/${id}`, token, {
    password: newPassword,
    connection: dbConnection,
  });
};

const updateAuth0ResidentUser = async (auth0Id, payload) => {
  const token = await getManagementToken();
  const id = encodeURIComponent(auth0Id);
  const body = {};

  if (payload.name !== undefined) body.name = payload.name;
  if (payload.email !== undefined) body.email = payload.email;
  if (!Object.keys(body).length) return null;

  return callManagementApi("PATCH", `/api/v2/users/${id}`, token, body);
};

const blockAuth0ResidentUser = async (auth0Id) => {
  const token = await getManagementToken();
  const id = encodeURIComponent(auth0Id);
  return callManagementApi("PATCH", `/api/v2/users/${id}`, token, { blocked: true });
};

const unblockAuth0ResidentUser = async (auth0Id) => {
  const token = await getManagementToken();
  const id = encodeURIComponent(auth0Id);
  return callManagementApi("PATCH", `/api/v2/users/${id}`, token, { blocked: false });
};

const getAuth0UserById = async (auth0Id) => {
  const cacheKey = String(auth0Id || "");
  const now = Date.now();
  const cached = auth0UserCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.user;
  }

  const token = await getManagementToken();
  const id = encodeURIComponent(auth0Id);
  const user = await callManagementApi("GET", `/api/v2/users/${id}`, token);
  auth0UserCache.set(cacheKey, {
    user,
    expiresAt: now + getAuth0UserCacheTtlMs(),
  });
  return user;
};

const deleteAuth0ResidentUser = async (auth0Id) => {
  const token = await getManagementToken();
  const id = encodeURIComponent(auth0Id);
  await callManagementApi("DELETE", `/api/v2/users/${id}`, token);
};

export {
  createAuth0ResidentUser,
  updateAuth0ResidentUser,
  blockAuth0ResidentUser,
  unblockAuth0ResidentUser,
  getAuth0UserById,
  deleteAuth0ResidentUser,
  changeAuth0UserPassword,
};
