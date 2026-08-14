import type Database from "better-sqlite3";
import type { BulkStatus, Candidate, NewCandidate, VerifyStatus } from "../../models/Candidate";

export interface CandidateRepository {
    /** Insere candidatos novos, ignorando os que ja existem (por name). Devolve quantos eram realmente novos. */
    add(candidates: NewCandidate[]): number;

    /** Nomes ainda nao passaram pelo lookup em lote (etapa 1). */
    pendingBulkCheck(length?: number): Candidate[];

    /** Nomes livres (bulk_status='free') ainda nao verificados (etapa 2), melhor score primeiro. */
    pendingVerify(length?: number): Candidate[];

    markBulkChecked(name: string, status: BulkStatus): void;

    markVerified(name: string, status: VerifyStatus): void;

    /** Todos os candidatos (pra exibir na UI), mais recentes primeiro. */
    list(): Candidate[];

    /** Apaga todos os candidatos, pra comecar uma pesquisa do zero. */
    clear(): void;
}

interface CandidateRow {
    name: string;
    length: number;
    origin: string;
    bulk_status: BulkStatus | null;
    verify_status: VerifyStatus | null;
    quality_score: number | null;
    checked_at: number | null;
    verified_at: number | null;
    created_at: number;
}

function toCandidate(row: CandidateRow): Candidate {
    return {
        name: row.name,
        length: row.length,
        origin: row.origin,
        bulkStatus: row.bulk_status,
        verifyStatus: row.verify_status,
        qualityScore: row.quality_score,
        checkedAt: row.checked_at,
        verifiedAt: row.verified_at,
        createdAt: row.created_at,
    };
}

/*
*       Agradecimento especial a
*       Bruno Dion pelos ensinamentos de queries.
*       Dito isso, obrigado claude por fazer por mim.
*/
export function createCandidateRepository(db: Database.Database): CandidateRepository {
    const insertStmt = db.prepare(
        `INSERT OR IGNORE INTO candidates (name, origin, quality_score) VALUES (@name, @origin, @qualityScore)`,
    );
    const insertMany = db.transaction((candidates: NewCandidate[]) => {
        let inserted = 0;
        for (const candidate of candidates) {
            const result = insertStmt.run({
                name: candidate.name,
                origin: candidate.origin,
                qualityScore: candidate.qualityScore ?? null,
            });
            inserted += result.changes;
        }
        return inserted;
    });

    const pendingBulkStmt = db.prepare(
        `SELECT * FROM candidates WHERE bulk_status IS NULL AND length = ? ORDER BY name`,
    );
    const pendingBulkAllStmt = db.prepare(
        `SELECT * FROM candidates WHERE bulk_status IS NULL ORDER BY length, name`,
    );

    const pendingVerifyStmt = db.prepare(
        `SELECT * FROM candidates WHERE bulk_status = 'free' AND verify_status IS NULL AND length = ? ORDER BY quality_score DESC`,
    );
   

    const pendingVerifyAllStmt = db.prepare(
        `SELECT * FROM candidates WHERE bulk_status = 'free' AND verify_status IS NULL ORDER BY quality_score DESC`,
    );

    const listStmt = db.prepare(`SELECT * FROM candidates ORDER BY created_at DESC`);
    const clearStmt = db.prepare(`DELETE FROM candidates`);

    const markBulkStmt = db.prepare(
        `UPDATE candidates SET bulk_status = ?, checked_at = unixepoch() WHERE name = ?`,
    );
    const markVerifyStmt = db.prepare(
        `UPDATE candidates SET verify_status = ?, verified_at = unixepoch() WHERE name = ?`,
    );

    return {
        add(candidates) {
            return insertMany(candidates);
        },

        pendingBulkCheck(length) {
            const rows = (length ? pendingBulkStmt.all(length) : pendingBulkAllStmt.all()) as CandidateRow[];
            return rows.map(toCandidate);
        },

        pendingVerify(length) {
            const rows = (length ? pendingVerifyStmt.all(length) : pendingVerifyAllStmt.all()) as CandidateRow[];
            return rows.map(toCandidate);
        },

        markBulkChecked(name, status) {
            markBulkStmt.run(status, name);
        },

        markVerified(name, status) {
            markVerifyStmt.run(status, name);
        },

        list() {
            const rows = listStmt.all() as CandidateRow[];
            return rows.map(toCandidate);
        },

        clear() {
            clearStmt.run();
        },
    };
}
