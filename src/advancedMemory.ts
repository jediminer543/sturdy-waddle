export const OurMemory = Memory as OurMemory;

export interface OurMemory extends Memory {
    rooms: { [name: string]: OurRoomMemory };
}

export interface RoomSourceInfo {
    id: Id<Source>
    exposedSides: number
    pos: RoomPosition
}

export interface OurRoomMemory extends RoomMemory {
    sources: RoomSourceInfo[]
}
