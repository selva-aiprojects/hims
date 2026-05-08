const jwt = require('jsonwebtoken');
const secret = process.env.JWT_SECRET || "secret";

// Create a test token that matches the auth middleware
const testToken = jwt.sign(
  { 
    user: 'test@example.com',
    tenantId: '71820db3-f8f1-4294-8c11-1dc66ab1056e',
    type: 'tenant',
    role: 'admin'
  }, 
  secret, 
  { expiresIn: '8h' }
);

console.log('Test token:', testToken);
console.log('You can use this token in localStorage or for testing:');
