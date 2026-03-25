-- NoS Divers Database Initialization
-- Run this on first deployment

CREATE DATABASE IF NOT EXISTS nos_divers
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE nos_divers;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  provider_id VARCHAR(128) NOT NULL UNIQUE,
  provider VARCHAR(32) NOT NULL,
  name TEXT,
  email VARCHAR(320),
  profile_image TEXT,
  role ENUM('user', 'admin') DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_signed_in TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tours table
CREATE TABLE IF NOT EXISTS tours (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  date VARCHAR(100) DEFAULT '',
  location VARCHAR(255) DEFAULT '',
  invite_code VARCHAR(32) NOT NULL UNIQUE,
  access_code VARCHAR(4) NOT NULL DEFAULT '0000',
  created_by VARCHAR(255) DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Participants table
CREATE TABLE IF NOT EXISTS participants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tour_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  last_modified_by VARCHAR(255) DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_tour_id (tour_id)
);

-- Expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tour_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  amount INT NOT NULL,
  paid_by INT NOT NULL,
  split_among TEXT NOT NULL,
  split_type VARCHAR(20) DEFAULT 'equal',
  split_amounts TEXT,
  last_modified_by VARCHAR(255) DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_tour_id (tour_id)
);

-- Waivers table (면책동의서)
CREATE TABLE IF NOT EXISTS waivers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tour_id INT NOT NULL,
  signer_name VARCHAR(255) NOT NULL,
  personal_info TEXT NOT NULL,
  health_checklist TEXT NOT NULL,
  health_other TEXT,
  signature_image MEDIUMTEXT NOT NULL,
  signed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  agreed BOOLEAN DEFAULT TRUE,
  INDEX idx_tour_id (tour_id)
);
