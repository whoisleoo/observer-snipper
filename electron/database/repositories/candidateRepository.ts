import type Database from "better-sqlite3";
import type { BulkStatus, Candidate, NewCandidate, VerifyStatus } from "../../models/Candidate";

export interface CandidateRepository {
    /** Inserir candidatos */
    add(candidates: NewCandidate[]): void;

    /** Lookup em lote pendente (etapa 1) */
    pendingBulkCheck(length?: number): Candidate[];

    /** Nomes livres (bulk_status='free') ainda nao verificados (etapa 2), melhor score primeiro. */
    pendingVerify(length?: number): Candidate[];

    markBulkChecked(name: string, status: BulkStatus): void;

    markVerified(name: string, status: VerifyStatus): void;
}

export function createCandidateRepository(db: Database.Database): CandidateRepository {
    throw new Error("TODO: implementar as queries acima em cima da tabela candidates");
}
