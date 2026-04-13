const pool = require('../config/database');

const schema = `
-- Users table for staff authentication
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'receptionist', 'housekeeping')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Room types table
CREATE TABLE IF NOT EXISTS room_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    base_price DECIMAL(10, 2) NOT NULL,
    max_occupancy INTEGER DEFAULT 2,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Rooms table
CREATE TABLE IF NOT EXISTS rooms (
    id SERIAL PRIMARY KEY,
    room_number VARCHAR(10) UNIQUE NOT NULL,
    room_type_id INTEGER REFERENCES room_types(id),
    floor INTEGER,
    description TEXT,
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'cleaning', 'maintenance')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Guests table
CREATE TABLE IF NOT EXISTS guests (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(100),
    id_number VARCHAR(50),
    id_type VARCHAR(20) DEFAULT 'national_id' CHECK (id_type IN ('national_id', 'passport', 'drivers_license', 'other')),
    address TEXT,
    nationality VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bookings table (for check-ins and reservations)
CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,
    guest_id INTEGER REFERENCES guests(id),
    room_id INTEGER REFERENCES rooms(id),
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    actual_check_in_time TIMESTAMP,
    actual_check_out_time TIMESTAMP,
    status VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show')),
    total_amount DECIMAL(10, 2) NOT NULL,
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    booking_id INTEGER REFERENCES bookings(id),
    amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('cash', 'm_pesa', 'card', 'bank_transfer')),
    payment_type VARCHAR(20) DEFAULT 'full' CHECK (payment_type IN ('full', 'partial', 'advance')),
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'failed', 'refunded')),
    reference_number VARCHAR(100),
    notes TEXT,
    processed_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Extra charges table (minibar, room service, etc.)
CREATE TABLE IF NOT EXISTS extra_charges (
    id SERIAL PRIMARY KEY,
    booking_id INTEGER REFERENCES bookings(id),
    description VARCHAR(200) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    charge_type VARCHAR(50),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Housekeeping tasks table
CREATE TABLE IF NOT EXISTS housekeeping_tasks (
    id SERIAL PRIMARY KEY,
    room_id INTEGER REFERENCES rooms(id),
    task_type VARCHAR(50) DEFAULT 'cleaning' CHECK (task_type IN ('cleaning', 'deep_cleaning', 'turndown', 'maintenance_request')),
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'verified')),
    notes TEXT,
    assigned_to INTEGER REFERENCES users(id),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    verified_at TIMESTAMP
);

-- Audit log table
CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);
CREATE INDEX IF NOT EXISTS idx_bookings_guest_id ON bookings(guest_id);
CREATE INDEX IF NOT EXISTS idx_bookings_room_id ON bookings(room_id);
CREATE INDEX IF NOT EXISTS idx_bookings_check_in_date ON bookings(check_in_date);
CREATE INDEX IF NOT EXISTS idx_bookings_check_out_date ON bookings(check_out_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_housekeeping_room_id ON housekeeping_tasks(room_id);
CREATE INDEX IF NOT EXISTS idx_housekeeping_status ON housekeeping_tasks(status);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);
`;

const seedData = `
-- Insert default room types
INSERT INTO room_types (name, description, base_price, max_occupancy)
VALUES 
    ('Standard Single', 'Comfortable single room with essential amenities', 5000, 1),
    ('Standard Double', 'Comfortable double room for two guests', 7000, 2),
    ('Deluxe Room', 'Spacious room with premium amenities', 10000, 2),
    ('Suite', 'Luxury suite with separate living area', 15000, 4),
    ('Family Room', 'Large room suitable for families', 12000, 4)
ON CONFLICT (name) DO NOTHING;

-- Insert default admin user (password: admin123)
INSERT INTO users (username, password, full_name, role)
VALUES ('admin', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'System Administrator', 'admin')
ON CONFLICT (username) DO NOTHING;

-- Insert sample rooms
INSERT INTO rooms (room_number, room_type_id, floor, description, status)
SELECT 
    '101', rt.id, 1, 'Room 101 - Standard Single', 'available'
FROM room_types rt WHERE rt.name = 'Standard Single'
ON CONFLICT (room_number) DO NOTHING;

INSERT INTO rooms (room_number, room_type_id, floor, description, status)
SELECT 
    '102', rt.id, 1, 'Room 102 - Standard Double', 'available'
FROM room_types rt WHERE rt.name = 'Standard Double'
ON CONFLICT (room_number) DO NOTHING;

INSERT INTO rooms (room_number, room_type_id, floor, description, status)
SELECT 
    '103', rt.id, 1, 'Room 103 - Deluxe Room', 'available'
FROM room_types rt WHERE rt.name = 'Deluxe Room'
ON CONFLICT (room_number) DO NOTHING;

INSERT INTO rooms (room_number, room_type_id, floor, description, status)
SELECT 
    '201', rt.id, 2, 'Room 201 - Suite', 'available'
FROM room_types rt WHERE rt.name = 'Suite'
ON CONFLICT (room_number) DO NOTHING;

INSERT INTO rooms (room_number, room_type_id, floor, description, status)
SELECT 
    '202', rt.id, 2, 'Room 202 - Family Room', 'available'
FROM room_types rt WHERE rt.name = 'Family Room'
ON CONFLICT (room_number) DO NOTHING;
`;

async function initDatabase() {
  try {
    console.log('Initializing database schema...');
    await pool.query(schema);
    console.log('Schema created successfully!');
    
    console.log('Seeding initial data...');
    await pool.query(seedData);
    console.log('Seed data inserted successfully!');
    
    console.log('Database initialization complete!');
    process.exit(0);
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

initDatabase();
