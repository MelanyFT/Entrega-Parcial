-- Esquema de la base de datos del chatbot de rastreo de pedidos.
CREATE DATABASE IF NOT EXISTS chatbot
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE chatbot;

CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(32) NOT NULL,
  customer_name VARCHAR(120) NOT NULL,
  status VARCHAR(40) NOT NULL,
  location VARCHAR(160) NOT NULL,
  estimated_delivery DATETIME NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE = InnoDB;
