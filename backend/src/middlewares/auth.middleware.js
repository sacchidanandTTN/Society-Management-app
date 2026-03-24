import { auth } from "express-oauth2-jwt-bearer";
import ApiError from "../utils/ApiError.js";
import pool from "../db/pool.js";

let jwtMiddlewareRef = null;


function normalizeRole(role) {
  return typeof role === "string" ? role.trim().toLowerCase() : null;
}


function getClaimRoles(payload = {}) {
  const rolesFromToken = payload["https://society-api.example.com/roles"] || [];
  return [...new Set(rolesFromToken.map(normalizeRole).filter(Boolean))];
}


async function findAdminByAuth0Id(auth0Id) {
  const result = await pool.query("SELECT id, role FROM admins WHERE auth0_id = $1 LIMIT 1", [auth0Id]);
  return result.rows[0] || null;
}

async function findResidentByAuth0Id(auth0Id) {
  const result = await pool.query("SELECT id FROM residents WHERE auth0_id = $1 LIMIT 1", [auth0Id]);
  return result.rows[0] || null;
}

async function linkAuth0ToEmail(table, id, auth0Id) {
  await pool.query(`UPDATE ${table} SET auth0_id = $1, updated_at = NOW() WHERE id = $2`, [auth0Id, id]);
}


async function resolveRoleFromDb(payload = {}, claimRoles = []) {
  const startedAt = Date.now();
  const auth0Id = payload.sub;
  const email = payload.email?.trim();
  const emailVerified = payload.email_verified;

  if (!auth0Id) return null;

  try {
    if (claimRoles.includes("admin")) {
      const admin = await findAdminByAuth0Id(auth0Id);
      if (admin?.role) {
        return normalizeRole(admin.role);
      }

      const resident = await findResidentByAuth0Id(auth0Id);
      if (resident?.id) {
        return "user";
      }
    } else {
      const resident = await findResidentByAuth0Id(auth0Id);
      if (resident?.id) {
        return "user";
      }

      const admin = await findAdminByAuth0Id(auth0Id);
      if (admin?.role) {
        return normalizeRole(admin.role);
      }
    }

   
    if (email && emailVerified) {
      const adminByEmail = await pool.query("SELECT id, role FROM admins WHERE LOWER(email) = LOWER($1) LIMIT 1", [email]);
      const residentByEmail = await pool.query("SELECT id FROM residents WHERE LOWER(email) = LOWER($1) LIMIT 1", [email]);

      if (adminByEmail.rows[0]) await linkAuth0ToEmail("admins", adminByEmail.rows[0].id, auth0Id);
      if (residentByEmail.rows[0]) await linkAuth0ToEmail("residents", residentByEmail.rows[0].id, auth0Id);

      if (adminByEmail.rows[0]?.role) {
        return normalizeRole(adminByEmail.rows[0].role);
      }
      if (residentByEmail.rows[0]) {
        return "user";
      }
    }
  } catch (error) {
    return null;
  }

  return null;
}


async function resolveUserRoles(req) {
  const payload = req.auth?.payload || {};
  const claimRoles = getClaimRoles(payload);
  const dbRole = await resolveRoleFromDb(payload, claimRoles);

  let resolvedRoles = [];
  if (dbRole === "admin") resolvedRoles = ["admin", "user"];
  if (dbRole === "user") resolvedRoles = ["user"];

  return resolvedRoles;
}


const checkJwt = (req, res, next) => {
  if (!req.headers.authorization && req.cookies?.token) {
    req.headers.authorization = `Bearer ${req.cookies.token}`;
  }

  const issuerBaseURL = process.env.AUTH0_ISSUER_BASE_URL;
  const audience = process.env.AUTH0_AUDIENCE;
  const frontendClientId = process.env.AUTH0_FRONTEND_CLIENT_ID;

  if (!issuerBaseURL) {
    return next(new ApiError(500, "Auth0 not configured. Set AUTH0_ISSUER_BASE_URL."));
  }

  if (!jwtMiddlewareRef) {
    const options = { issuerBaseURL, tokenSigningAlg: "RS256" };
    const allowedAudiences = [audience, frontendClientId].filter(Boolean);
    if (allowedAudiences.length === 1) options.audience = allowedAudiences[0];
    if (allowedAudiences.length > 1) options.audience = allowedAudiences;
    jwtMiddlewareRef = auth(options);
  }

  return jwtMiddlewareRef(req, res, async (err) => {
    if (err) {
      return next(err);
    }

    try {
      req.userRoles = await resolveUserRoles(req);

      if (!req.userRoles.length) return next(new ApiError(403, "Access denied. Account not mapped."));
      return next();
    } catch (error) {
      return next(error);
    }
  });
};


const requireRole = (...allowedRoles) => (req, res, next) => {
  const normalizedAllowed = allowedRoles.map(normalizeRole).filter(Boolean);
  const userRoles = req.userRoles || [];

  if (!userRoles.length) return next(new ApiError(403, "Access denied. Account not mapped."));

  const matchedRole = userRoles.find((role) => normalizedAllowed.includes(role));
  if (!matchedRole) return next(new ApiError(403, "Access denied."));

  return next();
};

export { checkJwt, requireRole };