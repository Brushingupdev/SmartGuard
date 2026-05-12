-- Tiempo de salida del vehículo de la planta.
-- Permite calcular el TAT completo: h_registro → h_salida.
ALTER TABLE atenciones ADD COLUMN IF NOT EXISTS h_salida TIME;
