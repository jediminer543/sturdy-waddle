// Old code to look at

//Creep States
//0 - Identifying
//1 - WORK finding sources
//2 - CARRY home

function deregSource(creep: Creep) {
    if (creep.memory.targetSourceType == 0 && creep.memory.targetSourceId in Memory.source) {
                Memory.source[creep.memory.targetSourceId].mineUseCount =
                    Math.max(Memory.source[creep.memory.targetSourceId].mineUseCount-1, 0);
    }
    creep.memory.targetSourceId = null;
}

function flagSources() {
    if (Memory.source == null) {
        Memory.source = {}
    }
    var ourRooms = []
    for (const i in Game.creeps) {
        var creep = Game.creeps[i];
        if (ourRooms.indexOf(creep.pos.roomName)==-1) {
            ourRooms.push(creep.pos.roomName)
        }
    }
    for (const i in ourRooms) {
        var iroom = Game.rooms[ourRooms[i]]
        var sources = iroom.find(FIND_SOURCES)
        for (const j in sources) {
            var source = sources[j]
            if (Memory.source[source.id] == null) {
                console.log("new Source")
                Memory.source[source.id] = {}
            } else {
                continue;
            }
            if (Memory.source[source.id].found != true) {
                Memory.source[source.id].found = true;
                Memory.source[source.id].minePos = [];
                for (var x = -1; x<=1; x++) {
                    for (var y = -1; y<=1; y++) {
                        var tgtPos = iroom.getPositionAt(source.pos.x + x, source.pos.y + y)
                        //console.log(tgtPos);
                        //console.log(iroom.lookForAt(LOOK_TERRAIN, tgtPos));
                        if (iroom.lookForAt(LOOK_TERRAIN, tgtPos) != "wall") {
                            Memory.source[source.id].minePos.push(tgtPos)
                            //iroom.createFlag(tgtPos, x+":"+y, COLOR_YELLOW, COLOR_GREY)
                        }
                        //iroom.createFlag(source.pos, "SourceMiningSpot", COLOR_YELLOW, COLOR_GREY)
                    }
                }
                Memory.source[source.id].mineUse = Array(Memory.source[source.id].minePos.length).fill(false);
                Memory.source[source.id].mineAvailCount = Memory.source[source.id].minePos.length;
                Memory.source[source.id].mineUseCount = 0;
            }
        }
    }
}

function moveToQuick(creep: Creep, target: RoomPosition, opts={reusePath: 7, maxOps: 1000}) {
    if (creep.fatigue == 0) {
        creep.moveTo(target, opts)
    }
}

function harvestSource(creep: Creep) {
    if (creep.memory.targetSourceId == null) {
        var target: RoomObject | null = creep.pos.findClosestByRange(FIND_DROPPED_RESOURCES);
        var sourceType = 1;
        if (target == null) {
            target = creep.pos.findClosestByRange(FIND_TOMBSTONES);
            sourceType = 2;
        }
        if (target == null) {
            //OLD MODE
            //target = creep.pos.findClosestByRange(FIND_SOURCES_ACTIVE);
            sourceType = 0;
            //NEW MODE
            for (const source in Memory.source) {
                if (Memory.source[source].mineAvailCount > Memory.source[source].mineUseCount) {
                    target = Game.getObjectById(source);
                    Memory.source[source].mineUseCount += 1;
                    break;
                }
            }
        }
        if (target == null) {
            console.log("ERR: NO TARGET");
            return;
        }
        creep.memory.targetSourceId = target.id;
        creep.memory.targetSourceType = sourceType;
    } else {
        var targetSource = Game.getObjectById(creep.memory.targetSourceId);
        if (targetSource == null) {
            creep.memory.targetSourceId = null;
            return;
        }
        var result = null;
        switch (creep.memory.targetSourceType) {
            case 0:
                result=creep.harvest(targetSource);
                break;
            case 1:
                result=creep.pickup(targetSource);
                break;
            case 2:
                result=creep.withdraw(targetSource, RESOURCE_ENERGY);
                break;
        }
        switch (result) {
            case ERR_NOT_IN_RANGE:
                //creep.moveTo(targetSource);
                moveToQuick(creep, targetSource)
                break;
            case ERR_NOT_FOUND:
            case ERR_NOT_ENOUGH_ENERGY:
            case ERR_NOT_ENOUGH_RESOURCES:
                creep.memory.targetSourceId = null;
            default:
                break;
        }
        if (creep.carry.energy == creep.carryCapacity) {
            creep.memory.state = 1;
            deregSource(creep);
            creep.say("Done mining")
        }
    }
}

function unloadEnergy(creep: Creep) {
    if (creep.memory.targetDumpId != null && creep.memory.dumpType == 0) {
        var targetDump = Game.getObjectById(creep.memory.targetDumpId);
        if (targetDump != null) {
            if (!(targetDump instanceof StructureController) && targetDump.energy == targetDump.energyCapacity) {
                console.log("Full");
                creep.memory.targetDumpId = null;
            }
        }
    }
    var dumpType = 0;
    targetDump = creep.pos.findClosestByRange(FIND_MY_SPAWNS);
    //console.log("Test " + creep.name  + creep.memory.targetDumpId)
    if (creep.memory.targetDumpId == null) {
        var skip = false;
        if (Game.rooms[creep.pos.roomName].controller.ticksToDowngrade < 6000) {
            creep.say("CTRL ECode")
            targetDump = Game.rooms[creep.pos.roomName].controller
            dumpType = 0;
            creep.memory.targetDumpId = targetDump.id;
            creep.memory.dumpType = dumpType;
            skip = true;
        }
        if (!skip && (targetDump == null || targetDump.energy == targetDump.energyCapacity)) {
            targetDump = creep.pos.findClosestByRange(FIND_MY_STRUCTURES, {
                filter: function(struct) { return struct!=null&&struct.structureType==STRUCTURE_TOWER&&struct.energy<struct.energyCapacity }
            });
            dumpType = 0;
        }
        if (!skip && (targetDump == null || targetDump.energy == targetDump.energyCapacity)) {
            targetDump = creep.pos.findClosestByRange(FIND_MY_STRUCTURES, {
                filter: function(struct) { return struct!=null&&struct.structureType==STRUCTURE_EXTENSION&&struct.energy<struct.energyCapacity }
            });
            dumpType = 0;
        }
        if (!skip && (targetDump == null || targetDump.energy == targetDump.energyCapacity)) {
            targetDump = creep.pos.findClosestByRange(FIND_CONSTRUCTION_SITES);
            dumpType = 1;
        }
        if (!skip && targetDump == null) {
            targetDump = creep.pos.findClosestByRange(FIND_STRUCTURES, {
                filter: function(struct) {
                    return struct!=null &&
                        (
                            (struct.hits<(struct.hitsMax*0.8) && !(struct instanceof StructureWall))
                         || (struct.hits<300000 && (struct instanceof StructureWall))
                        )

                }
            });
            dumpType = 2;
        }
        if (targetDump == null) {
            targetDump = Game.rooms[creep.pos.roomName].controller
            dumpType = 0;
        }
        creep.memory.targetDumpId = targetDump.id;
        creep.memory.dumpType = dumpType;
    }
    targetDump = Game.getObjectById(creep.memory.targetDumpId);
    var state = null;
    if (targetDump == null) {
        console.log("Invalid dumpsite " + creep.name + " " + creep.memory.targetDumpId)
        creep.memory.targetDumpId = null;
        return;
    }
    switch (creep.memory.dumpType) {
        case 0:
            state = creep.transfer(targetDump, RESOURCE_ENERGY);
            break;
        case 1:
            state = creep.build(targetDump);
            break;
        case 2:
            state = creep.repair(targetDump);
            break;
    }
    switch (state) {
        case ERR_NOT_IN_RANGE:
            //creep.moveTo(targetDump);
            moveToQuick(creep, targetDump)
            break;
        case ERR_NOT_ENOUGH_ENERGY:
            creep.memory.state=0;
            creep.memory.targetDumpId=null;
            creep.say("Done spending")
            break;
        case ERR_FULL:
            creep.memory.targetDumpId=null;
            break;
        default:
            if (creep.memory.dumpType == 2 && (targetDump instanceof Structure && targetDump.hits == targetDump.hitsMax)) {
                console.log("Repaired dumpsite " + creep.name + " " + creep.memory.targetDumpId)
                creep.memory.targetDumpId=null;
            }
            break;
    }
}

function die(creep: Creep) {
    if (creep.memory.targetDeathId == null) {
        var targetDump = creep.pos.findClosestByRange(FIND_MY_SPAWNS);
        creep.memory.targetDeathId = targetDump.id;
        creep.say("Dying")
    } else {
        var target = Game.getObjectById(creep.memory.targetDeathId)
        switch (target.recycleCreep(creep)) {
            case ERR_NOT_IN_RANGE:
                creep.moveTo(target)
                break;
            default:
                creep.memory = {}
                break;
        }
    }
}

function kill(creep: Creep) {
    if (creep.memory.targetKillId == null) {
        var targetDump = creep.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
        if (targetDump == null) {
            moveToQuick(creep, Game.flags["Rally Point"]);
            return;
        }
        creep.memory.targetKillId = targetDump.id;
        creep.say("Killin")

    } else {
        var target = Game.getObjectById(creep.memory.targetKillId)
        switch (creep.rangedAttack(target)) {
            case ERR_NOT_IN_RANGE:
                moveToQuick(creep, target);
                break;
            default:
                break;
        }
    }
}

function defendRoom(room: Room) {
    var hostiles = room.find(FIND_HOSTILE_CREEPS);
    if(hostiles.length > 0) {
        var username = hostiles[0].owner.username;
        Game.notify(`User ${username} spotted in room ${room.name}`);
        var towers = room.find(
            FIND_MY_STRUCTURES, {filter: {structureType: STRUCTURE_TOWER}});
        towers.forEach(tower => (tower as StructureTower).attack(hostiles[0]));
    }
}

var targetWorkCreep = 12;
var targetCombatCreep = 2;

module.exports.loop = function () {
    //console.log("clock")
    flagSources()
    var creepCount = 0;
    var workCreep = 0;
    var combatCreep = 0;
    for(const i in Game.creeps) {
        creepCount++;
        creep = Game.creeps[i];
        //console.log(creep.body.includes(RANGED_ATTACK));
        if (creep.body.map(x => x.type).includes(RANGED_ATTACK)) {
            combatCreep++;
        } else {
            workCreep++;
        }
        if (creep.memory.state == null) {
            creep.say("Init")
            if (creep.body.map(x => x.type).includes(RANGED_ATTACK)) {
                //Creep is rigged for combat
                creep.memory.state = 8
            } else {
                creep.memory.state = 0
            }
        }
        if (creep.ticksToLive < 100) {
            deregSource(creep);
            creep.memory.state = 9;
        }
        switch (creep.memory.state) {
            case 0:
                //console.log(creep.name + " harvest")
                harvestSource(creep);
                break;
            case 1:
                //console.log(creep.name + " dump")
                unloadEnergy(creep);
                break;
            case 9:
                //console.log(creep.name + " die")
                die(creep);
                break;
            case 8:
                //Killy Creep
                kill(creep);
                break;
            default:
                break;
        }
        if (Game.cpu.getUsed() > 19 && Game.cpu.bucket < 1000) {
            break;
        }
    }
    if (workCreep < targetWorkCreep) {
        Game.spawns.HomeSpa.createCreep([WORK, WORK, CARRY, CARRY, MOVE, MOVE])
    }

    if (!(workCreep < targetWorkCreep) && (combatCreep < targetCombatCreep)) {
        Game.spawns.HomeSpa.createCreep([RANGED_ATTACK, RANGED_ATTACK, MOVE, MOVE])
    }

    defendRoom(Game.spawns.HomeSpa.room)
    //console.log("Time used: " + Game.cpu.getUsed())
}
