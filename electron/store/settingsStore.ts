import type Store from "electron-store";

export interface Settings {
    monitoredNicks: string[];
    checkIntervalMs: number;
}

export function createSettingsStore(): Store<Settings> {
    throw new Error("TODO: instantiate electron-store with Settings schema/defaults");
}
