import * as cartographer from "screeps-cartographer";
import util, { isOwnedStructure } from "../util.js";
import { Role } from "./meta";
import taskDismantle from "../task.dismantle.js";
import taskGather from "../task.gather.js";

const ENABLE_WALL_REPAIR = true;

/**
 * get number of repairers assigned to a room
 */
function getRepairerCount(room: Room) {
	return _.filter(Game.creeps, creep => creep.memory.role === Role.Repairer && creep.memory.targetRoom === room.name)
		.length;
}

const roleRepairer = {
	findRepairTargetNew(creep: Creep): void {
		let room;
		if (Game.rooms[creep.memory.targetRoom as string]) {
			room = Game.rooms[creep.memory.targetRoom as string];
		} else {
			room = creep.room;
		}
		if (Game.flags.repairme) {
			const flag = Game.flags.repairme;
			if (flag.pos.roomName === room.name) {
				const target = flag.pos.lookFor(LOOK_STRUCTURES)[0];
				if (target) {
					creep.memory.repairTarget = target.id as Id<AnyStructure>;
					return;
				}
			}
		}
		let targets = room.find(FIND_STRUCTURES, {
			filter: struct => {
				if (isOwnedStructure(struct) && struct.my) {
					return false;
				}
				const flags = struct.pos.lookFor(LOOK_FLAGS);
				if (flags.length > 0) {
					if (flags[0].name.includes("dismantle") || flags[0].name.includes("norepair")) {
						return false;
					}
				}
				if (struct.hits > struct.hitsMax * 0.75) {
					return false;
				}
				if (struct.structureType === STRUCTURE_ROAD && struct.hits >= struct.hitsMax * 0.5) {
					return false;
				}
				if (
					// @ts-expect-error this is perfectly valid, shut up typescript
					[STRUCTURE_WALL, STRUCTURE_RAMPART].includes(struct.structureType) &&
					(!creep.room.storage || creep.room.storage.store[RESOURCE_ENERGY] < 200000)
				) {
					return false;
				}
				return struct.hits < struct.hitsMax;
			},
		});

		if (room.storage && room.storage.store[RESOURCE_ENERGY] < 700000 && ENABLE_WALL_REPAIR) {
			let avgWallHits = 0;
			let sumWallHits = 0;
			let countWalls = 0;
			for (const target of targets) {
				if (target.structureType !== STRUCTURE_WALL && target.structureType !== STRUCTURE_RAMPART) {
					continue;
				}
				countWalls += 1;
				sumWallHits += target.hits;
			}
			avgWallHits = sumWallHits / countWalls;
			targets = _.reject(targets, struct => {
				return (
					(struct.structureType === STRUCTURE_WALL || struct.structureType === STRUCTURE_RAMPART) &&
					struct.hits > avgWallHits * 1.1
				);
			});
		} else {
			targets = _.reject(targets, struct => {
				return struct.structureType === STRUCTURE_WALL || struct.structureType === STRUCTURE_RAMPART;
			});
		}

		targets = _.sortByOrder(
			targets,
			[
				struct => {
					switch (struct.structureType) {
						case STRUCTURE_ROAD:
							return 1;
						case STRUCTURE_WALL:
							return 2;
						case STRUCTURE_RAMPART:
							return 2;
						default:
							return 0;
					}
				},
				struct => struct.hits,
				struct => struct.pos.getRangeTo(creep),
			],
			["asc", "asc", "asc"]
		);

		if (targets.length > 0) {
			creep.memory.repairTarget = targets[0].id;
		} else {
			creep.log("WARN: no repair targets found");
		}
	},

	run(creep: Creep): void {
		// make sure we are in our assigned room first
		if (creep.memory.role === Role.Repairer) {
			// exclude builders
			if (!creep.memory.targetRoom) {
				const rooms = util.getOwnedRooms();
				for (const room of rooms) {
					if (getRepairerCount(room) < 1) {
						creep.memory.targetRoom = room.name;
						break;
					}
				}
			}

			if (
				creep.memory.targetRoom &&
				(creep.room.name !== creep.memory.targetRoom || util.isOnEdge(creep.pos)) &&
				!creep.memory.repairTarget
			) {
				cartographer.moveTo(
					creep,
					{ pos: new RoomPosition(25, 25, creep.memory.targetRoom), range: 15 },
					{
						visualizePathStyle: {},
						keepTargetInRoom: true,
					}
				);
				return;
			}
		}

		if (creep.memory.repairTarget) {
			const repairTarget = Game.getObjectById<Structure>(creep.memory.repairTarget);
			// console.log("repairTarget:",repairTarget);
			if (repairTarget) {
				creep.room.visual.circle(repairTarget.pos, { fill: "transparent", radius: 0.5, stroke: "#ffff00" });

				if (creep.memory.role === "repairer" && repairTarget.room.name !== creep.memory.targetRoom) {
					delete creep.memory.repairTarget;
				} else if (repairTarget.hits === repairTarget.hitsMax) {
					console.log(creep.name, "target fully repaired");
					delete creep.memory.repairTarget;
				} else if (
					repairTarget.structureType === STRUCTURE_WALL &&
					((repairTarget.hits >= 70000 && repairTarget.hits <= 75000) ||
						(repairTarget.hits >= 100000 && repairTarget.hits <= 105000) ||
						repairTarget.hits >= 200000)
				) {
					if (Game.time % 10 === 0) {
						delete creep.memory.repairTarget;
					}
				} else if (
					repairTarget.structureType === STRUCTURE_RAMPART &&
					((repairTarget.hits >= 80000 && repairTarget.hits <= 85000) ||
						(repairTarget.hits >= 105000 && repairTarget.hits <= 110000) ||
						repairTarget.hits >= 200000)
				) {
					if (Game.time % 18 === 0) {
						delete creep.memory.repairTarget;
					}
				} else {
					const weakRamparts = creep.room.find(FIND_STRUCTURES, {
						filter(struct) {
							return struct.structureType === STRUCTURE_RAMPART && struct.hits < 3000;
						},
					});
					if (weakRamparts.length > 0) {
						delete creep.memory.repairTarget;
					}
				}
			} else if (!repairTarget) {
				// console.log(creep.name,"repairTarget =",repairTarget);
				delete creep.memory.repairTarget;
			}
		} else {
			// find a repair target if we don't have one
			this.findRepairTargetNew(creep);

			// if we don't have a lot of energy, refill before repairing
			if (creep.store[RESOURCE_ENERGY] <= creep.store.getCapacity() * 0.1) {
				creep.memory.repairing = false;
			}
		}

		if (creep.memory.repairing && creep.store[RESOURCE_ENERGY] === 0) {
			creep.memory.repairing = false;
			creep.say("gathering");
		} else if (!creep.memory.repairing && creep.store[RESOURCE_ENERGY] === creep.store.getCapacity()) {
			creep.memory.repairing = true;
			creep.say("repairing");
		}

		if (creep.memory.repairing) {
			const repairTarget = Game.getObjectById(creep.memory.repairTarget as Id<AnyStructure>);
			// if (creep.memory.role === "repairer") {
			// 	console.log(creep.name,"repairTarget:",repairTarget,repairTarget.hits+"/"+repairTarget.hitsMax,"dist:",creep.pos.getRangeTo(repairTarget));
			// }
			if (repairTarget) {
				cartographer.moveTo(creep, { pos: repairTarget.pos, range: 3 }, { visualizePathStyle: {} });
				creep.repair(repairTarget);
			} else {
				if (taskDismantle.run(creep)) {
					creep.say("dismantle");
				} else {
					const constructionSite = creep.pos.findClosestByRange(FIND_CONSTRUCTION_SITES, {
						filter(site) {
							return site.structureType === STRUCTURE_WALL || site.structureType === STRUCTURE_RAMPART;
						},
					});
					if (constructionSite) {
						cartographer.moveTo(creep, { pos: constructionSite.pos, range: 3 });
						creep.build(constructionSite);
					}
				}
			}
		} else {
			taskGather.run(creep);
		}
	},
};

module.exports = roleRepairer;
export default roleRepairer;
