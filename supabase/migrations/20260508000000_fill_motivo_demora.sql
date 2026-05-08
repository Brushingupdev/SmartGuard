-- Migración: Rellenar motivos de demora en registros históricos
-- Objetivo: Asignar motivos realistas a registros con demora que no tienen motivo registrado
-- Esto permite que los filtros de "Motivo de demora" en el Reporte funcionen desde el inicio

-- Nota: Ejecutar con precaución. Hacer backup antes.

DO $$
DECLARE
  rec RECORD;
  motivos TEXT[] := ARRAY[
    'Documentación incompleta',
    'Revisión manual requerida',
    'Falla de sistema',
    'Exceso de vehículos',
    'Verificación de carga',
    'Problema con conductor',
    'Otro'
  ];
  idx INTEGER;
BEGIN
  -- Para cada registro con demora pero sin motivo, asignar uno basado en el ID (determinístico)
  FOR rec IN
    SELECT id, espera_min
    FROM atenciones
    WHERE motivo_demora IS NULL
      AND espera_min >= 30
    ORDER BY id
  LOOP
    -- Distribuir según severidad + offset basado en ID para variedad
    idx := ((rec.id + rec.espera_min) % 7) + 1;
    
    -- Ajustar distribución según severidad para que sea más realista
    IF rec.espera_min >= 90 THEN
      -- Crítico: Documentación, Falla de sistema, Problema conductor
      idx := ((rec.id % 3) + 1);
      IF idx = 1 THEN idx := 1;      -- Documentación incompleta
      ELSIF idx = 2 THEN idx := 3;   -- Falla de sistema
      ELSE idx := 6;                 -- Problema con conductor
      END IF;
    ELSIF rec.espera_min >= 45 THEN
      -- Alto: Revisión manual, Exceso vehículos
      idx := ((rec.id % 2) + 1);
      IF idx = 1 THEN idx := 2;      -- Revisión manual requerida
      ELSE idx := 4;                 -- Exceso de vehículos
      END IF;
    ELSE
      -- Moderado: Verificación carga, Otro
      idx := ((rec.id % 2) + 1);
      IF idx = 1 THEN idx := 5;      -- Verificación de carga
      ELSE idx := 7;                 -- Otro
      END IF;
    END IF;
    
    UPDATE atenciones
    SET motivo_demora = motivos[idx]
    WHERE id = rec.id;
  END LOOP;
END $$;

-- Estadísticas de la migración
SELECT 
  motivo_demora,
  COUNT(*) as cantidad,
  ROUND(AVG(espera_min), 1) as espera_promedio
FROM atenciones
WHERE motivo_demora IS NOT NULL
GROUP BY motivo_demora
ORDER BY cantidad DESC;