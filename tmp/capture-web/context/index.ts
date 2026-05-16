'use client'
import {create} from 'zustand'

export type User = {
    id: string;
    email: string;
    name: string;
    image?: string | null;
}

export type Session = {
    user: User;
    expires: string;
}

export type Video = {
    id: string;
    title: string;
    url: string;
    thumbnail: string;
    duration: number;
    createdAt: Date;
}


export type CaptureStore = {
    videos: Video[];
    setVideos: (videos: Video[]) => void;
    addVideo: (video: Video) => void;
    session: Session | null;
    setSession: (session: Session | null) => void;
}

export const useCaptureStore = create<CaptureStore>((set) => ({
    videos: [],
    setVideos: (videos) => set({videos}),
    addVideo: (video) => set((state) => ({ videos: [...state.videos, video] })),
    session: null,
    setSession: (session) => set({session}),
}))