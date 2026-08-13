import type { CandidateRepository } from "../database/repositories/candidateRepository";
import type { Nick } from "../models/Nick";
import type { MojangService } from "../services/mojangService";

export interface NickController {
    checkNick(nick: string): Promise<Nick>;
}

export function createNickController(
    mojangService: MojangService,
    candidateRepository: CandidateRepository,
): NickController {
    throw new Error("TODO: orchestrate mojangService.checkAvailability + persist via candidateRepository");
}
