CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR,
  phone VARCHAR
);
