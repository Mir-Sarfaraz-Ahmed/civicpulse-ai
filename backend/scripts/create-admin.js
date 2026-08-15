const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const readline = require('readline');
const { initDb, query } = require('../db');

// Ensure db tables are initialized
initDb();

function getArgs() {
  const args = {};
  process.argv.slice(2).forEach(val => {
    const parts = val.split('=');
    if (parts.length === 2 && parts[0].startsWith('--')) {
      const key = parts[0].substring(2);
      args[key] = parts[1];
    }
  });
  return args;
}

const args = getArgs();

if (args.email && args.password && args.name) {
  createAdmin(args.email, args.password, args.name);
} else {
  // Interactive mode
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log('--- CivicPulse AI Admin Setup ---');
  rl.question('Admin Name: ', (name) => {
    rl.question('Admin Email: ', (email) => {
      rl.question('Admin Password: ', (password) => {
        if (!name || !email || !password) {
          console.error('Error: All fields are required!');
          rl.close();
          process.exit(1);
        }
        createAdmin(email, password, name);
        rl.close();
      });
    });
  });
}

function createAdmin(email, password, name) {
  try {
    // Basic validations
    if (!email.includes('@')) {
      console.error('Error: Invalid email format.');
      process.exit(1);
    }
    if (password.length < 6) {
      console.error('Error: Password must be at least 6 characters.');
      process.exit(1);
    }

    // Check if user already exists
    const existing = query.get('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
    if (existing) {
      if (existing.role === 'admin') {
        console.log(`User ${email} is already an admin. Updating password...`);
        const passwordHash = bcrypt.hashSync(password, 10);
        query.run('UPDATE users SET password_hash = ?, name = ? WHERE email = ?', [passwordHash, name, email.toLowerCase()]);
        console.log(`Admin ${email} updated successfully.`);
      } else {
        console.error(`Error: User with email ${email} already exists and is a civilian.`);
        process.exit(1);
      }
    } else {
      const id = uuidv4();
      const passwordHash = bcrypt.hashSync(password, 10);
      query.run(
        'INSERT INTO users (id, email, password_hash, role, name) VALUES (?, ?, ?, ?, ?)',
        [id, email.toLowerCase(), passwordHash, 'admin', name]
      )
      console.log(`[Success] Created Admin Account!`);
      console.log(`Email: ${email}`);
      console.log(`Role: admin`);
    }
    process.exit(0);
  } catch (error) {
    console.error('Failed to create admin:', error.message);
    process.exit(1);
  }
}
