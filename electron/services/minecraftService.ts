import axios from 'axios'
import type { MinecraftProfile } from '../types/minecraft'

const PROFILE_URL = 'https://api.minecraftservices.com/minecraft/profile'

export async function getMinecraftProfile(token: string): Promise<MinecraftProfile> {
    try{
        const { data } = await axios.get<MinecraftProfile>(PROFILE_URL, {
            headers:{
                Authorization: `Bearer ${token}`
            },
        })
        return data;
    }catch (error){
        if(axios.isAxiosError(error) && error.response?.status === 404){
            throw new Error('This account doesnt have minecraft.');
        }
        throw error
    }
}