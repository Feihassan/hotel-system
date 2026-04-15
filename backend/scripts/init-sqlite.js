const { initializeDatabase, getDb } = require('../config/sqlite');
const bcrypt = require('bcryptjs');

const schema = `
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'receptionist', 'housekeeping')),
    permissions TEXT DEFAULT '[]',
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS room_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    base_price DECIMAL(10, 2) NOT NULL,
    max_occupancy INTEGER DEFAULT 2,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_number TEXT UNIQUE NOT NULL,
    room_type_id INTEGER REFERENCES room_types(id),
    floor INTEGER,
    description TEXT,
    status TEXT DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'cleaning', 'maintenance')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS guests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    id_number TEXT,
    id_type TEXT DEFAULT 'national_id' CHECK (id_type IN ('national_id', 'passport', 'drivers_license', 'other')),
    address TEXT,
    nationality TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guest_id INTEGER REFERENCES guests(id),
    room_id INTEGER REFERENCES rooms(id),
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    actual_check_in_time DATETIME,
    actual_check_out_time DATETIME,
    status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show')),
    total_amount DECIMAL(10, 2) NOT NULL,
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    checked_in_by INTEGER REFERENCES users(id),
    checked_out_by INTEGER REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id INTEGER REFERENCES bookings(id),
    amount DECIMAL(10, 2) NOT NULL,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'm_pesa', 'card', 'bank_transfer')),
    payment_type TEXT DEFAULT 'full' CHECK (payment_type IN ('full', 'partial', 'advance')),
    status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'failed', 'refunded')),
    reference_number TEXT,
    notes TEXT,
    processed_by INTEGER REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS extra_charges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id INTEGER REFERENCES bookings(id),
    description TEXT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    charge_type TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shifts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    started_at DATETIME NOT NULL,
    ended_at DATETIME,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    summary TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id INTEGER,
    details TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS housekeeping_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER REFERENCES rooms(id),
    task_type TEXT DEFAULT 'cleaning' CHECK (task_type IN ('cleaning', 'deep_cleaning', 'turndown', 'maintenance_request')),
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'verified')),
    notes TEXT,
    assigned_to INTEGER REFERENCES users(id),
    created_by INTEGER REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    verified_at DATETIME
);
`;

const seedData = [
  "INSERT OR IGNORE INTO room_types (name, description, base_price, max_occupancy) VALUES ('Standard Single', 'Comfortable single room with essential amenities', 5000, 1)",
  "INSERT OR IGNORE INTO room_types (name, description, base_price, max_occupancy) VALUES ('Standard Double', 'Comfortable double room for two guests', 7000, 2)",
  "INSERT OR IGNORE INTO room_types (name, description, base_price, max_occupancy) VALUES ('Deluxe Room', 'Spacious room with premium amenities', 10000, 2)",
  "INSERT OR IGNORE INTO room_types (name, description, base_price, max_occupancy) VALUES ('Suite', 'Luxury suite with separate living area', 15000, 4)",
  "INSERT OR IGNORE INTO room_types (name, description, base_price, max_occupancy) VALUES ('Family Room', 'Large room suitable for families', 12000, 4)",
  `INSERT OR IGNORE INTO users (username, password, full_name, role) VALUES ('admin', '${bcrypt.hashSync('admin123', 12)}', 'System Administrator', 'admin')`,
];

async function initDatabase() {
  try {
    console.log('Initializing SQLite database...');
    
    // Wait for database to be initialized
    await initializeDatabase();
    
    const db = getDb();
    if (!db) {
      console.error('Database not ready');
      return;
    }
    
    db.exec(schema);
    console.log('Schema created successfully!');
    
    seedData.forEach(sql => {
      db.exec(sql);
    });
    
    db.saveToFile();
    console.log('Seed data inserted successfully!');
    console.log('Database initialization complete!');
  } catch (err) {
    console.error('Database initialization error:', err);
    process.exit(1);
  }
}

// Run initialization
initDatabase().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Failed to initialize database:', error);
  process.exit(1);
});