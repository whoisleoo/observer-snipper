import type { SearchHistoryRepository } from "../database/repositories/searchHistoryRepository";
import type { Nick } from "../models/Nick";
import type { MojangService } from "../services/mojangService";

export interface NickController {
    checkNick(nick: string): Promise<Nick>;
}

export function createNickController(
    mojangService: MojangService,
    searchHistoryRepository: SearchHistoryRepository,
): NickController {
    throw new Error("TODO: orchestrate mojangService.checkAvailability + persist via searchHistoryRepository");
}
