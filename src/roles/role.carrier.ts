import * as cartographer from "screeps-cartographer";

import { remoteMiningDangerousRooms } from "../remotemining";
import util from "../util";

// Game.spawns["Spawn5"].createCreep([WORK,WORK,WORK,WORK,MOVE,MOVE,MOVE,MOVE], "remoteharvester_1", {role:"remoteharvester", keepAlive:true, stage: 0 }); Game.spawns["Spawn1"].createCreep([CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE], "carrier_1", {role:"carrier", keepAlive:true, stage: 0 })

const DEFAULT_MOVE_OPTS = {
	routeCallback,
	visualizePathStyle: {},
};

const DANGER_MOVE_OPTS = {
	...DEFAULT_MOVE_OPTS,
	avoidTargets(roomName: string) {
		const room = Game.rooms[roomName];
		if (!room) return [];
		return room.find(FIND_HOSTILE_CREEPS).map(c => {
			return {
				pos: c.pos,
				range: 6,
			};
		});
	},
	avoidTargetGradient: 0.9,
};

/** Used when planning multi room routes */
function routeCallback(roomName: string, fromRoomName: string): number | undefined {
	const dangerous = remoteMiningDangerousRooms();
	if (dangerous.includes(roomName)) {
		return Infinity;
	}

	return undefined;
}

function findDespositTarget(creep: Creep) {
	if (creep.memory.mode === "remote-mining" && !creep.memory.harvestTarget) {
		creep.log("Can't find despositTarget without harvestTarget");
		return;
	}

	let pos = creep.pos;
	if (creep.memory.mode === "remote-mining") {
		const harvestTarget = _.find(Memory.remoteMining.targets, target => target.id === creep.memory.harvestTarget);
		if (!harvestTarget) {
			creep.log("ERR: depositTarget: can't find harvest target");
			delete creep.memory.harvestTarget;
			return;
		}

		pos = new RoomPosition(harvestTarget.x, harvestTarget.y, harvestTarget.roomName);
	} else if (creep.memory.mode === "invader-core-harvesting" && creep.memory.targetRoom) {
		pos = new RoomPosition(25, 25, creep.memory.targetRoom);
	}

	const rooms = _.filter(util.findClosestOwnedRooms(pos), r => r.storage);
	if (rooms.length === 0) {
		creep.log("ERR: All rooms don't have storage");
		return;
	}

	return rooms[0]?.storage?.id;
}

/**
 * This is quite CPU intensive. Ideally we'd be able to tap in to the repairer's logic somehow so we could reuse those results.
 */
function passiveMaintainRoads(creep: Creep) {
	if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
		return;
	}

	const construction = creep.pos.findInRange(FIND_MY_CONSTRUCTION_SITES, 3);
	if (construction.length > 0) {
		creep.build(construction[0]);
		return;
	}

	let structs = creep.pos.findInRange(FIND_STRUCTURES, 3).filter(s => s.hits < s.hitsMax);
	if (structs.length > 0) {
		structs = _.sortByOrder(
			structs,
			[s => s.structureType === STRUCTURE_RAMPART, s => s.hits / s.hitsMax],
			["desc", "asc"]
		);
		creep.repair(structs[0]);
	}
}

const roleCarrier = {
	modes: {
		// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
		"remote-mining"(creep: Creep) {
			if (!creep.memory.depositTarget) {
				creep.memory.depositTarget = findDespositTarget(creep);
			}

			if (!creep.memory.harvestTarget) {
				creep.log(
					creep.name,
					"ERR: no harvest target, this needs to be assigned by a job (similar to how relays are assigned)"
				);
				return;
			}
			if (!creep.memory.depositTarget) {
				creep.log(creep.name, "ERR: need deposit target");
				return;
			}

			const harvestTarget = _.find(
				Memory.remoteMining.targets,
				target => target.id === creep.memory.harvestTarget
			);

			if (!harvestTarget) {
				creep.log(creep.name, "ERR: can't find harvest target");
				return;
			}

			if (!creep.memory.delivering && creep.room.name !== harvestTarget.roomName && harvestTarget.danger === 0) {
				cartographer.moveTo(
					creep,
					new RoomPosition(harvestTarget.x, harvestTarget.y, harvestTarget.roomName),
					DEFAULT_MOVE_OPTS
				);
				return;
			} else if (!creep.memory.delivering && harvestTarget.danger > 0 && harvestTarget.dangerPos) {
				const dangerPos = new RoomPosition(
					harvestTarget.dangerPos[harvestTarget.danger].x,
					harvestTarget.dangerPos[harvestTarget.danger].y,
					harvestTarget.dangerPos[harvestTarget.danger].roomName
				);
				cartographer.moveTo(creep, dangerPos, DANGER_MOVE_OPTS);
				return;
			}
			const harvestPos = new RoomPosition(
				harvestTarget.harvestPos.x,
				harvestTarget.harvestPos.y,
				harvestTarget.roomName
			);

			if (!creep.memory.droppedEnergyId) {
				try {
					const lookResult = harvestPos.lookFor(LOOK_RESOURCES);
					if (lookResult.length > 0) {
						creep.memory.droppedEnergyId = lookResult[0].id;
					}
				} catch (e) {
					creep.log("ERR: don't have vision for room at", harvestPos);
				}
			}

			if (creep.memory.delivering && creep.store.getUsedCapacity() === 0) {
				creep.memory.delivering = false;
			} else if (!creep.memory.delivering && creep.store.getFreeCapacity() === 0) {
				creep.memory.delivering = true;
			}

			if (creep.memory.delivering) {
				const depositTarget = Game.getObjectById(creep.memory.depositTarget);
				if (!depositTarget) {
					creep.log("ERR: can't find deposit target");
					return;
				}
				if (creep.pos.isNearTo(depositTarget)) {
					creep.transfer(depositTarget, RESOURCE_ENERGY);
				} else {
					cartographer.moveTo(creep, depositTarget, DEFAULT_MOVE_OPTS);
				}
			} else {
				if (creep.pos.isEqualTo(harvestPos)) {
					cartographer.moveTo(creep, harvestPos, { ...DEFAULT_MOVE_OPTS, flee: true });
					return;
				}

				if (harvestTarget.danger > 0 && harvestTarget.dangerPos) {
					creep.say("flee");
					if (creep.store[RESOURCE_ENERGY] > 0) {
						creep.memory.delivering = true;
					} else {
						const dangerPos = new RoomPosition(
							harvestTarget.dangerPos[harvestTarget.danger].x,
							harvestTarget.dangerPos[harvestTarget.danger].y,
							harvestTarget.dangerPos[harvestTarget.danger].roomName
						);
						cartographer.moveTo(creep, dangerPos, DANGER_MOVE_OPTS);
					}
					return;
				}

				if (util.isTreasureRoom(harvestTarget.roomName)) {
					if (creep.pos.isNearTo(harvestPos)) {
						const tombstones = harvestPos.findInRange(FIND_TOMBSTONES, 2);
						if (tombstones.length > 0 && tombstones[0].store[RESOURCE_ENERGY] > 0) {
							creep.withdraw(tombstones[0], RESOURCE_ENERGY);
							return;
						}
					}
				}
				const dropped = creep.memory.droppedEnergyId ? Game.getObjectById(creep.memory.droppedEnergyId) : null;
				if (!dropped) {
					delete creep.memory.droppedEnergyId;
				}
				if (!creep.pos.isNearTo(harvestPos)) {
					cartographer.moveTo(creep, harvestPos, DEFAULT_MOVE_OPTS);
				} else if (dropped) {
					creep.pickup(dropped);
				}
			}

			// this is CPU intensive (about 50% of the CPU for this creep)
			if (creep.getActiveBodyparts(WORK) > 0) {
				passiveMaintainRoads(creep);
			}
		},
		// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
		"invader-core-harvesting"(creep: Creep) {
			if (!creep.memory.targetRoom) {
				creep.log("needs targetRoom to be set externally");
				return;
			}

			if (!creep.memory.depositTarget) {
				creep.memory.depositTarget = findDespositTarget(creep);
			}

			if (!creep.memory.depositTarget) {
				creep.log("ERR: need deposit target");
				return;
			}

			if (creep.memory.delivering && _.sum(creep.store) === 0) {
				creep.memory.delivering = false;
			} else if (!creep.memory.delivering && _.sum(creep.store) >= creep.store.getCapacity()) {
				creep.memory.delivering = true;
			}

			if (creep.memory.delivering) {
				// take resources back to deposit target
				const depositTarget = Game.getObjectById(creep.memory.depositTarget);
				if (!depositTarget) {
					creep.log("ERR: can't find deposit target");
					return;
				}
				if (creep.pos.isNearTo(depositTarget)) {
					for (const resource of RESOURCES_ALL) {
						if (creep.store[resource] > 0) {
							creep.transfer(depositTarget, resource);
						}
					}
				} else {
					cartographer.moveTo(creep, depositTarget, DEFAULT_MOVE_OPTS);
				}
			} else {
				if (creep.room.name !== creep.memory.targetRoom) {
					cartographer.moveTo(creep, new RoomPosition(25, 25, creep.memory.targetRoom), DEFAULT_MOVE_OPTS);
					return;
				}

				let containers: (Ruin | StructureContainer)[] = creep.room.find(FIND_RUINS);
				containers = containers.concat(util.getStructures(creep.room, STRUCTURE_CONTAINER));
				containers = _.filter(containers, s => s.store.getUsedCapacity() > 0);
				if (containers.length > 0) {
					const target = containers[0];
					creep.log("target: ", target);
					if (creep.pos.isNearTo(target)) {
						for (const resource of RESOURCES_ALL) {
							if (target.store[resource] === 0) {
								continue;
							}
							const withdrawResult = creep.withdraw(target, resource);
							if (withdrawResult !== OK) {
								creep.log("ERR: can't withdraw from target", target, "error", withdrawResult);
								break;
							}
						}
					} else {
						cartographer.moveTo(creep, target, DEFAULT_MOVE_OPTS);
					}
				} else {
					creep.say("help");
					creep.log("no containers found");
				}
			}
		},
	},

	run(creep: Creep): void {
		if (!creep.memory.mode) {
			creep.memory.mode = "remote-mining";
		}

		// run different code for different modes
		// @ts-expect-error this is valid, but typescript doesn't like it
		const mode = this.modes[creep.memory.mode] as (creep: Creep) => void;
		if (!mode) {
			creep.log("ERR: invalid mode", creep.memory.mode);
			return;
		}
		mode(creep);
	},
};

module.exports = roleCarrier;
export default roleCarrier;
