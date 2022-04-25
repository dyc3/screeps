var toolEnergySource = require('tool.energysource');
var toolFriends = require('tool.friends');
var util = require("../util");

let defaultScoreFreshnessThreshold = 50000;

function isRoomHostile(roomName) {
	var hasHostileOwner = false;
	if (Memory.roomInfo[roomName] && Memory.roomInfo[roomName].ownership) {
		hasHostileOwner = (Memory.roomInfo[roomName].ownership != undefined ? Memory.roomInfo[roomName].ownership.username != WHOAMI : false)
	}
	return hasHostileOwner;
}

/** @param {Room} room **/ // NOTE: room can also be the room name as a string
function isRoomScoreFresh(room) {
    let roomName = typeof room == "string" ? room : room.name;
    if (!Memory.roomInfo[roomName]) {
        return false;
    }
    // console.log("FRESH CHECK:", roomName, Game.time - Memory.roomInfo[roomName].timestamp > Memory.freshnessThreshold);
    return Game.time - Memory.roomInfo[roomName].timestamp <= Memory.freshnessThreshold;
}

function findRoute(fromRoom, toRoom) {
	return Game.map.findRoute(fromRoom, toRoom, {
		routeCallback(roomName, fromRoomName) {
			if(Memory.roomInfo[roomName] && Memory.roomInfo[roomName].ownership) { // avoid room with players
				return Infinity;
			}
			return 1;
		}});
}

/**
 * Shuffles array in place.
 * @param {Array} a items An array containing the items.
 */
function shuffle(a) {
    var j, x, i;
    for (i = a.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        x = a[i];
        a[i] = a[j];
        a[j] = x;
    }
    return a;
}

var roleScout = {

	/** @param {Creep} creep **/
	findUnscoredRoom: function(creep) {
		var roomStack = []
		function findUnscoredAdjacentRecursive(roomName, excludeRoom=null, recursionLevel=0) {
			// console.log("findUnscoredAdjacentRecursive", roomName, recursionLevel)
			roomStack.push(roomName)
			if (Game.cpu.bucket == 10000 && Game.cpu.getUsed() > Game.cpu.limit) {
			    console.log("WARN: Aborting search for unscored room");
			    return null;
			}
			if (Game.cpu.bucket < 10000 && recursionLevel > 4) {
				console.log("WARN: Aborting search for unscored room");
				return null;
			}
			var exits = Game.map.describeExits(roomName);
			exits = shuffle(exits);
			for (var e in exits) {
				var exit = exits[e]; //
				var hasHostileOwner = isRoomHostile(exit);
				var route = findRoute(creep.room, exit);
				if ((!Memory.roomInfo[exit] || (Memory.roomInfo[exit] && !isRoomScoreFresh(exit))) &&
					exit != creep.memory.homeRoom && !hasHostileOwner && route != -2) {
					Memory.tmpScoutRoute = route;
					return exit;
				}
			}

			// no exit found, enter recursion
			for (var e in exits) {
				var exit = exits[e];
				if (excludeRoom != null && excludeRoom == exit) {
					continue;
				}
				if (Memory.roomInfo[exit] && Memory.roomInfo[exit].blocked) {
				    continue;
				}
				if (isRoomHostile(exit)) {
					continue;
				}
				var possibleTarget = findUnscoredAdjacentRecursive(exit, roomName, recursionLevel + 1);
				if (possibleTarget != null && (!Memory.roomInfo[possibleTarget] || !Memory.roomInfo[possibleTarget].score)) {
					return possibleTarget;
				}
			}
			roomStack.pop();
			return null
		}
// 		console.log(roomStack);
		return findUnscoredAdjacentRecursive(creep.room.name);
	},

	// NOTE: scoring is experimental, no precise reasoning behind the scoring rules
	/** @param {Room} room **/
	getRoomScore: function(room) {
		let score = 0;
		for (let y = 1; y < 49; y++) {
			for (let x = 1; x < 49; x++) {
				let currentPos = new RoomPosition(x, y, room.name);
				let terrain = currentPos.lookFor(LOOK_TERRAIN);

				switch (terrain[0]) {
					case 'swamp':
						score -= 1;
						break;
					case 'plain':
						score += 0.25;
						break;
					default:
						break;
				}
			}
		}
		// console.log("score after terrain: ", score);

		let sources = room.find(FIND_SOURCES);
		for (let s in sources) {
			let source = sources[s];
			let m = toolEnergySource.getMaxHarvesters(source);
			score += 100 * (m > 3 ? 3 : m);
		}
		// console.log("score after sources: ", score);

		let minerals = room.find(FIND_MINERALS);
		for (let m in minerals) {
			let mineral = minerals[m];
			let mineralScore = 0;
			switch (mineral.mineralType) {
				case RESOURCE_KEANIUM:
				case RESOURCE_LEMERGIUM:
				case RESOURCE_UTRIUM:
				case RESOURCE_ZYNTHIUM:
					mineralScore = 60;
					break;
				default:
					mineralScore = 20;
					break;
			}
			mineralScore *= mineral.density;
			score += mineralScore;
		}
		// console.log("score after minerals: ", score);

		if (!room.controller) { // FIXME: `room.controller` is supposed to return false when the room has no controller
			score -= 200;
		}
		// console.log("score after controller: ", score);

		let exits = Game.map.describeExits(room.name);
		score += _.values(exits).length * 40;
		// console.log("score after exits: ", score);

		return score;
	},

	/** @param {Room} room **/
	getRoomOwnershipInfo: function(room) {
		return (room.controller ? room.controller.owner : undefined);
	},

	/** @param {Room} room **/
	getRoomControllerInfo: function(room) {
		if (!room.controller || room.controller == undefined) {
			return undefined;
		}
		var controllerInfo = {
			level:room.controller.level,
			progress:room.controller.progress,
			progressTotal:room.controller.progressTotal,
			reservation:room.controller.reservation,
			safeMode:room.controller.safeMode,
			safeModeAvailable:room.controller.safeModeAvailable,
			safeModeCooldown:room.controller.safeModeCooldown,
			sign:room.controller.sign,
			ticksToDowngrade:room.controller.ticksToDowngrade,
		}
		return controllerInfo;
	},

    /** @param {Room} room **/
    getKeeperInfo: function(room) {
        let keepers = [];

        let lairs = util.getStructures(room, STRUCTURE_KEEPER_LAIR);
        for (let l = 0; l < lairs.length; l++) {
            let lair = lairs[l];
            console.log("found lair: ", lair);
            let keeper = {
                pos: lair.pos,
                ticksToSpawn: lair.ticksToSpawn
            };
            keepers.append(keeper);
        }

        return keepers.length > 0 ? keepers : null;
    },



	/** @param {Creep} creep **/
	run: function(creep) {
		// set up memory
		if (!Memory.roomInfo) { Memory.roomInfo = {}; }
		if (!Memory.freshnessThreshold) { Memory.freshnessThreshold = defaultScoreFreshnessThreshold; }

		// wait until we are done spawning
		if (creep.spawning) { return; }
		Game.map.visual.text("👁", creep.pos);
		creep.notifyWhenAttacked(false);

		// be friendly
		// creep.say("greetings", true);

        // manual override to be annoying
		if (creep.getActiveBodyparts(WORK) > 0 && Game.flags["scoutdismantle"]) {
		    if (creep.pos.isNearTo(Game.flags["scoutdismantle"])) {
		        let lookResult = Game.flags["scoutdismantle"].pos.lookFor(LOOK_STRUCTURES);
		        if (lookResult.length > 0) {
		            creep.dismantle(lookResult[0]);
		        }
		    }
		    else {
		        creep.travelTo(Game.flags["scoutdismantle"]);
		    }
		    return;
		}

		// lets go around and score rooms
		// first, we need to find a target room to score
		// if (!creep.memory.targetRoomToScore) {
		// 	creep.memory.targetRoomToScore = this.findUnscoredRoom(creep);
		// }

		// we should have a target now, go to the room if we aren't in it
		if (creep.memory.targetRoomToScore) {
			if (creep.room.name != creep.memory.targetRoomToScore) {
				var route = Memory.tmpScoutRoute.slice(0); // .slice(0) is a hack to clone the array
				var nextRoom = route[0].room;
				if (nextRoom == creep.room.name) {
					Memory.tmpScoutRoute = route.slice(1); // remove the first element
					nextRoom = route[0].room;
				}
				console.log(creep.name,"current:", creep.room.name, "next room:", nextRoom, "target:", creep.memory.targetRoomToScore);
				// creep.say("n:"+nextRoom)

				var roomPos = new RoomPosition(25, 25, nextRoom);
				var destinationPos = (Game.flags["roomToScore"] ? Game.flags["roomToScore"].pos : roomPos);
				let moveResult = creep.travelTo(destinationPos);
				if (moveResult == ERR_NO_PATH) {
				    console.log(creep.name, "WARN: No path to target room:", creep.memory.targetRoomToScore, ", marking as fresh...");
				    Memory.roomInfo[creep.memory.targetRoomToScore] = { timestamp: Game.time, score: null, blocked: true };
				    delete creep.memory.targetRoomToScore;
				}
			}
			if (creep.room.name == creep.memory.targetRoomToScore) {
				if (Game.flags["roomToScore"] && creep.room.name == Game.flags["roomToScore"].room.name) {
					Game.flags["roomToScore"].remove();
				}
				creep.travelTo(new RoomPosition(25, 25, creep.room.name)); // prevent moving out before scouting is complete
				Memory.roomInfo[creep.room.name] = {}
				Memory.roomInfo[creep.room.name].timestamp = Game.time;
				Memory.roomInfo[creep.room.name].score = this.getRoomScore(creep.room);
				Memory.roomInfo[creep.room.name].ownership = this.getRoomOwnershipInfo(creep.room);
				Memory.roomInfo[creep.room.name].controller = this.getRoomControllerInfo(creep.room);
				Memory.roomInfo[creep.room.name].keepers = this.getKeeperInfo(creep.room);
			}
		}

		// if (!Memory.roomInfo[creep.room].score) {
		// 	Memory.roomInfo[creep.room.name].score = this.getRoomScore(creep.room);
		// }
		//
		// if (!Memory.roomInfo[creep.room.name].ownership ||
		// 	(Memory.roomInfo[creep.room.name].ownership && Game.time - Memory.roomInfo[creep.room.name].timestamp >= 10000)) {
		// 	Memory.roomInfo[creep.room.name].ownership = this.getRoomOwnershipInfo(creep.room);
		// }

		if (Memory.roomInfo[creep.memory.targetRoomToScore] && isRoomScoreFresh(creep.memory.targetRoomToScore)) {
			delete creep.memory.targetRoomToScore;
		}
	}
}

module.exports = roleScout;
