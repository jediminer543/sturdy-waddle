import { OurMemory, OurRoomMemory, RoomSourceInfo } from "advancedMemory";

/**
 * Ensure a given room is setup with the required information to function
 *
 * @param room
 */
export function processRoom(room: Room) {
    console.log(`Establishing room ${room.name}`);
    let roomMemory = {} as OurRoomMemory;
    roomMemory.sources = processSources(room);
    OurMemory.rooms[room.name] = roomMemory;
}

export function processSources(room: Room): RoomSourceInfo[] {
    let roomTerrain = new Room.Terrain(room.name);
    let sources = room.find(FIND_SOURCES);
    return sources.map(src => {
        var rsi = {} as RoomSourceInfo;
        rsi.id = src.id;
        rsi.pos = src.pos;
        rsi.exposedSides = 0;
        for (var x = rsi.pos.x - 1; x <= rsi.pos.x + 1; x++) {
            for (var y = rsi.pos.y - 1; y <= rsi.pos.y + 1; y++) {
                if (x == rsi.pos.x && y == rsi.pos.y) continue;
                if (roomTerrain.get(x, y) != TERRAIN_MASK_WALL) {
                    rsi.exposedSides++;
                }
            }
        }
        return rsi;
    });
}
