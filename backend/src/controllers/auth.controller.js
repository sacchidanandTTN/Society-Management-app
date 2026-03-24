import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";

const getCurrentUser = asyncHandler(async (req, res) => {
  const payload = req.auth?.payload || {};
  const roles = req.userRoles?.length ? req.userRoles : [];
  return res.status(200).json(
    new ApiResponse(200, "Profile fetched.", {
      sub: payload.sub,
      email: payload.email,
      roles,
      permissions: payload.permissions || [],
    })
  );
});
export { getCurrentUser };
