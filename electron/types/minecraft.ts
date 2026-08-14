export interface MinecraftSkin {
    id: string;
    url: string;
}

export interface MinecraftProfile {
    id: string;
    name: string;
    skins: MinecraftSkin[];
}