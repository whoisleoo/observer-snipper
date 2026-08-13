import type Database from "better-sqlite3";

export function up(db: Database.Database): void {
    db.exec(`
        CREATE TABLE IF NOT EXISTS candidates (
            name          TEXT PRIMARY KEY,
            length        INTEGER GENERATED ALWAYS AS (LENGTH(name)) STORED,
            origin        TEXT NOT NULL,
            bulk_status   TEXT,
            verify_status TEXT,
            quality_score REAL,
            checked_at    INTEGER,
            verified_at   INTEGER,
            created_at    INTEGER NOT NULL DEFAULT (unixepoch()),

            CHECK (length BETWEEN 3 AND 16),
            CHECK (bulk_status IN ('taken', 'free') OR bulk_status IS NULL),
            CHECK (verify_status IN ('AVAILABLE', 'NOT_ALLOWED', 'DUPLICATE') OR verify_status IS NULL)
        ) WITHOUT ROWID;

        -- fila do lookup em lote (etapa 1): nomes ainda nao checados
        CREATE INDEX IF NOT EXISTS idx_pending_bulk ON candidates(length, name)
            WHERE bulk_status IS NULL;

        -- fila do verify autenticado (etapa 2): livres, nao verificados, melhor score primeiro
        CREATE INDEX IF NOT EXISTS idx_pending_verify ON candidates(length, quality_score DESC)
            WHERE bulk_status = 'free' AND verify_status IS NULL;

        CREATE INDEX IF NOT EXISTS idx_origin ON candidates(origin);
    `);
}
