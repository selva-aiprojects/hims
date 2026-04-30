CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR,
  db_name VARCHAR,
  plan VARCHAR,
  default_pwd VARCHAR,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE tenant_admin_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  contact_name VARCHAR,
  email VARCHAR,
  phone VARCHAR,
  address VARCHAR,
  created_at TIMESTAMP DEFAULT NOW()
);
