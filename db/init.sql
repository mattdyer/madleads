CREATE TABLE IF NOT EXISTS leads (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  company VARCHAR(255),
  source VARCHAR(100),
  status ENUM('new','contacted','qualified','proposal','won','lost') NOT NULL DEFAULT 'new',
  value DECIMAL(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status (status),
  INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO leads (name, email, phone, company, source, status, value, notes) VALUES
  ('Ada Lovelace', 'ada@analyticalengine.co', '+44 20 7946 0001', 'Analytical Engine Co', 'referral', 'qualified', 12500.00, 'Very interested in the enterprise tier.'),
  ('Grace Hopper', 'grace@navy.mil', '+1 202 555 0142', 'US Navy', 'website', 'contacted', 8000.00, 'Scheduling a demo for next week.'),
  ('Alan Turing', 'alan@bletchley.uk', '+44 1908 640404', 'Bletchley Park', 'conference', 'new', 0.00, 'Met at the computing expo.'),
  ('Margaret Hamilton', 'margaret@apollo.org', '+1 617 555 0173', 'MIT Instrumentation Lab', 'cold-outreach', 'proposal', 32000.00, 'Sent a proposal for the guidance systems upgrade.'),
  ('Linus Torvalds', 'linus@kernel.org', '+358 9 1234567', 'Linux Foundation', 'website', 'won', 45000.00, 'Signed a 12-month contract.'),
  ('Katherine Johnson', 'katherine@nasa.gov', '+1 757 555 0199', 'NASA', 'referral', 'lost', 15000.00, 'Went with a competitor this cycle.');
