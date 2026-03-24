CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar NOT NULL,
  email varchar UNIQUE NOT NULL,
  auth0_id varchar NOT NULL,
  role varchar NOT NULL DEFAULT 'admin',
  created_at timestamp NOT NULL DEFAULT NOW(),
  updated_at timestamp NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS flat_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar NOT NULL,
  description text,
  created_at timestamp NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS flats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flat_number varchar UNIQUE NOT NULL,
  flat_type_id uuid NOT NULL REFERENCES flat_types(id),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp NOT NULL DEFAULT NOW(),
  updated_at timestamp NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flat_type_id uuid NOT NULL REFERENCES flat_types(id),
  monthly_amount numeric NOT NULL CHECK (monthly_amount > 0),
  effective_from date NOT NULL,
  created_at timestamp NOT NULL DEFAULT NOW(),
  updated_at timestamp NOT NULL DEFAULT NOW(),
  UNIQUE (flat_type_id, effective_from)
);

CREATE TABLE IF NOT EXISTS residents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar NOT NULL,
  email varchar UNIQUE NOT NULL,
  phone varchar NOT NULL,
  auth0_id varchar NOT NULL,
  created_at timestamp NOT NULL DEFAULT NOW(),
  updated_at timestamp NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS monthly_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flat_id uuid NOT NULL REFERENCES flats(id),
  month integer NOT NULL CHECK (month BETWEEN 1 AND 12),
  year integer NOT NULL CHECK (year >= 2000),
  amount numeric NOT NULL CHECK (amount >= 0),
  status varchar NOT NULL CHECK (status IN ('pending', 'paid')),
  due_date date NOT NULL,
  created_at timestamp NOT NULL DEFAULT NOW(),
  updated_at timestamp NOT NULL DEFAULT NOW(),
  UNIQUE (flat_id, month, year)
);

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  monthly_record_id uuid NOT NULL REFERENCES monthly_records(id),
  amount numeric NOT NULL CHECK (amount > 0),
  payment_mode varchar NOT NULL CHECK (payment_mode IN ('cash', 'upi', 'razorpay')),
  payment_status varchar NOT NULL CHECK (payment_status IN ('pending', 'completed', 'failed')),
  transaction_id varchar UNIQUE NOT NULL,
  payment_date timestamp NOT NULL DEFAULT NOW(),
  recorded_by_admin_id uuid REFERENCES admins(id),
  created_at timestamp NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title varchar NOT NULL,
  message text NOT NULL,
  sent_by_admin_id uuid REFERENCES admins(id),
  created_at timestamp NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid NOT NULL REFERENCES residents(id),
  notification_id uuid NOT NULL REFERENCES notifications(id),
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp NOT NULL DEFAULT NOW(),
  UNIQUE (resident_id, notification_id)
);

CREATE TABLE IF NOT EXISTS flat_residents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flat_id uuid NOT NULL REFERENCES flats(id),
  resident_id uuid NOT NULL REFERENCES residents(id),
  role varchar NOT NULL CHECK (role IN ('user')),
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  is_current boolean NOT NULL DEFAULT true
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_active_allocation_per_flat
  ON flat_residents(flat_id)
  WHERE is_current = true;

CREATE UNIQUE INDEX IF NOT EXISTS uq_completed_payment_per_monthly_record
  ON payments(monthly_record_id)
  WHERE payment_status = 'completed';
