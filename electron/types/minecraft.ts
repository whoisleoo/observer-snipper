export interface MinecraftProfileSkin {
    id: string;
    state: string;
    url: string;
    variant: string;
}

export interface MinecraftProfile {
    id: string;
    name: string;
    skins: MinecraftProfileSkin[];
}
