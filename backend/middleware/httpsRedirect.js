/**
 * HTTPS Redirect Middleware
 *
 * Enforces HTTPS in production by redirecting all HTTP requests to HTTPS.
 * Also checks for X-Forwarded-Proto header (used by load balancers/proxies).
 */

const httpsRedirect = (req, res, next) => {
  // Skip in development
  if (process.env.NODE_ENV !== 'production') {
    return next();
  }

  // Check if request is already secure
  const isSecure = req.secure ||
                   req.headers['x-forwarded-proto'] === 'https' ||
                   req.headers['x-forwarded-ssl'] === 'on';

  if (!isSecure) {
    // Build the HTTPS URL
    const httpsUrl = `https://${req.headers.host}${req.url}`;

    // Log the redirect
    console.log(`[HTTPS] Redirecting HTTP → HTTPS: ${req.url}`);

    // Redirect with 301 (permanent redirect)
    return res.redirect(301, httpsUrl);
  }

  // Request is already HTTPS, continue
  next();
};

module.exports = httpsRedirect;
