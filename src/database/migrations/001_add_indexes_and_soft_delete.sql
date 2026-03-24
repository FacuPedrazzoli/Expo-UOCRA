-- =====================================================
-- Database Migrations for Expo UOCRA
-- Run these SQL commands on your Supabase PostgreSQL
-- =====================================================

-- 1. Add indexes for performance
-- =====================================================

-- Index on inscriptos.dni for validation lookups
CREATE INDEX IF NOT EXISTS idx_inscriptos_dni 
ON inscriptos(dni);

-- Index on inscriptos.email for duplicate checking  
CREATE INDEX IF NOT EXISTS idx_inscriptos_email 
ON inscriptos(email);

-- Index on inscriptos_charlas.charlas_id for capacity queries
CREATE INDEX IF NOT EXISTS idx_inscriptos_charlas_charlas_id 
ON inscriptos_charlas(charlas_id);

-- Index on inscriptos_charlas.inscriptos_id for reverse lookups
CREATE INDEX IF NOT EXISTS idx_inscriptos_charlas_inscriptos_id 
ON inscriptos_charlas(inscriptos_id);

-- Index on inscriptos_ingresos.inscriptos_id for validation status
CREATE INDEX IF NOT EXISTS idx_inscriptos_ingresos_inscriptos_id 
ON inscriptos_ingresos(inscriptos_id);

-- Index on inscriptos_ingresos.fecha_ingreso for date range queries
CREATE INDEX IF NOT EXISTS idx_inscriptos_ingresos_fecha 
ON inscriptos_ingresos(fecha_ingreso);

-- Index on charlas.horario for scheduling queries
CREATE INDEX IF NOT EXISTS idx_charlas_horario 
ON charlas(horario);


-- 2. Add soft delete and audit fields
-- =====================================================

-- Add audit fields to inscriptos
ALTER TABLE inscriptos 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Add audit fields to charlas
ALTER TABLE charlas 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Add audit fields to inscriptos_ingresos
ALTER TABLE inscriptos_ingresos 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();


-- 3. Create trigger function for updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';


-- 4. Create triggers for auto-update
-- =====================================================

DROP TRIGGER IF EXISTS update_inscriptos_updated_at ON inscriptos;
CREATE TRIGGER update_inscriptos_updated_at
  BEFORE UPDATE ON inscriptos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_charlas_updated_at ON charlas;
CREATE TRIGGER update_charlas_updated_at
  BEFORE UPDATE ON charlas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- 5. Create views for soft delete
-- =====================================================

-- View for active inscriptos only
CREATE OR REPLACE VIEW v_inscriptos_active AS
SELECT * FROM inscriptos WHERE deleted_at IS NULL;

-- View for active charlas only
CREATE OR REPLACE VIEW v_charlas_active AS
SELECT * FROM charlas WHERE deleted_at IS NULL;


-- 6. Add comments for documentation
-- =====================================================

COMMENT ON TABLE inscriptos IS 'Registered attendees for the event';
COMMENT ON TABLE charlas IS 'Talks/presentations at the event';
COMMENT ON TABLE inscriptos_charlas IS 'Junction table for attendee-talk registrations';
COMMENT ON TABLE inscriptos_ingresos IS 'Check-in records for validated attendees';

COMMENT ON COLUMN inscriptos.created_at IS 'Record creation timestamp';
COMMENT ON COLUMN inscriptos.updated_at IS 'Record last update timestamp';
COMMENT ON COLUMN inscriptos.deleted_at IS 'Soft delete timestamp (NULL = active)';
