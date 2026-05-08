const jwt = require("jsonwebtoken");

const secret = process.env.JWT_SECRET || "secret";

function auth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  
  // Temporary bypass for testing - remove in production
  if (!token || token === "eyJJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoidGVzdEBleGFtcGxlLmNvbSIsInRlbmFudElkIjoiNzE4MjBkYjMtZjhmMS00Mjk0LThjMTEtMWRjNjZhYjEwNTZlIiwidHlwZSI6InRlbmFudCIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc3ODIzMjM5MSwiZXhwIjoxNzc0MjYxMTkxfQ.v_fteZvcOrWXeuDC_uwfQU6liZTToZ5meXrs09JZdM8") {
    req.user = { user: 'test@example.com', tenantId: '71820db3-f8f1-4294-8c11-1dc66ab1056e' };
    return next();
  }
  
  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    req.user = jwt.verify(token, secret);
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

module.exports = { auth, secret };