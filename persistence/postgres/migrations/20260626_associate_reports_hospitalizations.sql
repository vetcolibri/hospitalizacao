ALTER TABLE reports ADD COLUMN IF NOT EXISTS hospitalization_id VARCHAR(50);

UPDATE reports AS report
SET hospitalization_id = (
    SELECT hospitalization.hospitalization_id
    FROM hospitalizations AS hospitalization
    WHERE hospitalization.system_id = report.system_id
      AND hospitalization.entry_date <= report.created_at
      AND (hospitalization.discharge_date IS NULL OR report.created_at <= hospitalization.discharge_date)
    ORDER BY hospitalization.entry_date DESC, hospitalization.hospitalization_id DESC
    LIMIT 1
)
WHERE report.hospitalization_id IS NULL;

ALTER TABLE reports ALTER COLUMN hospitalization_id SET NOT NULL;
ALTER TABLE reports
    ADD CONSTRAINT fk_reports_hospitalizations
    FOREIGN KEY (hospitalization_id)
    REFERENCES hospitalizations(hospitalization_id)
    ON DELETE CASCADE;
