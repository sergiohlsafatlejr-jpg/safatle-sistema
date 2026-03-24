export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Return the native login route.
export const getLoginUrl = () => "/login";

export const getDevBypassUrl = () => {
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    return "/api/dev-login";
  }
  return "/login";
};
