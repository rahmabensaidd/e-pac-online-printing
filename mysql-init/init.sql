-- Allow the application user from any host (Docker network)
CREATE USER IF NOT EXISTS 'eprinting_user'@'%' IDENTIFIED BY 'eprinting_pass123';
GRANT ALL PRIVILEGES ON eprinting_db.* TO 'eprinting_user'@'%';
FLUSH PRIVILEGES;