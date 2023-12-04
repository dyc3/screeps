/* eslint-disable no-underscore-dangle */
import * as cartographer from "screeps-cartographer";
import { Role } from "roles/meta";
import taskGather from "./task.gather.js";
import util from "./util.js";

// FIXME: if the creep is not in a room with a spawn, then it defaults renewTarget to the first spawn, which is not necessarily the closest one

const taskRenew = {
	findRenewTarget(creep: Creep | PowerCreep): StructureSpawn | StructurePowerSpawn | undefined {
		let spawn =
			creep instanceof Creep
				? util.getSpawn(creep.room)
				: _.first(util.getStructures(creep.room, STRUCTURE_POWER_SPAWN));
		if (spawn) {
			creep.memory.renewTarget = spawn.id;
			// creep.memory._renewDebug = {
			// 	startTime: Game.time,
			// 	renewTargetSetBy: "checkRenew default",
			// 	targetSpawn: Game.getObjectById(creep.memory.renewTarget).name,
			// 	targetRoom: Game.getObjectById(creep.memory.renewTarget).room.name,
			// };
			return spawn;
		}

		// fallback to closest spawn not in the same room
		if (
			!creep.memory.renewTarget ||
			!creep.memory._lastCheckForCloseSpawn ||
			Game.time - creep.memory._lastCheckForCloseSpawn > 200
		) {
			const approxTicks = 600;
			const countRenewsRequired =
				creep instanceof Creep
					? Math.ceil((approxTicks - (creep.ticksToLive ?? 0)) / util.getRenewTickIncrease(creep.body))
					: 1;
			const closestRooms = util.findClosestOwnedRooms(
				creep.pos,
				creep instanceof Creep
					? room => room.energyCapacityAvailable >= util.getRenewCost(creep.body) * countRenewsRequired
					: undefined
			);
			if (closestRooms.length > 0) {
				for (const room of closestRooms) {
					spawn =
						creep instanceof Creep
							? util.getSpawn(room)
							: _.first(util.getStructures(room, STRUCTURE_POWER_SPAWN));
					if (!spawn) {
						continue;
					}
					creep.memory.renewTarget = spawn.id;
					// creep.memory._renewDebug = {
					// 	startTime: Game.time,
					// 	renewTargetSetBy: "checkRenew fallback 0",
					// 	targetSpawn: Game.getObjectById(creep.memory.renewTarget).name,
					// 	targetRoom: Game.getObjectById(creep.memory.renewTarget).room.name,
					// 	closestRooms: closestRooms.map(r => r.name),
					// };
					break;
				}
				creep.memory._lastCheckForCloseSpawn = Game.time;
			}
		}
		spawn = Game.getObjectById(creep.memory.renewTarget);
		if (spawn) {
			return spawn;
		}
		if (creep instanceof Creep && !spawn) {
			spawn = Object.values(Game.spawns)[0]; // pick first spawn (if it exists)
			creep.memory.renewTarget = spawn.id;
			// creep.memory._renewDebug = {
			// 	startTime: Game.time,
			// 	renewTargetSetBy: "checkRenew fallback",
			// 	targetSpawn: Game.getObjectById(creep.memory.renewTarget).name,
			// 	targetRoom: Game.getObjectById(creep.memory.renewTarget).room.name,
			// };
			return spawn;
		}
		return undefined;
	},

	checkRenew(creep: Creep | PowerCreep): boolean {
		if (creep.memory.renewing) {
			return true;
		}
		if (
			creep instanceof Creep &&
			(!creep.memory.keepAlive || creep.memory.role === "claimer" || creep.getActiveBodyparts(CLAIM) > 0)
		) {
			return false;
		}

		const spawn = this.findRenewTarget(creep);
		if (!spawn) {
			// there are no spawns anyway, just keep doing your job.
			return false;
		}

		let travelTime: number = creep.memory._renewTravelTime;
		if (
			!creep.memory._renewTravelTime ||
			!creep.memory._lastCheckTravelTime ||
			Game.time - creep.memory._lastCheckTravelTime > 30
		) {
			const path = cartographer.cachePath(`renew-${creep.name}`, creep.pos, spawn.pos, { avoidCreeps: false });
			if (!path) {
				creep.log("WARNING: no path found to renew target");
				return false;
			}
			travelTime = util.calculateEta(creep, path);
			creep.memory._renewTravelTime = travelTime;
			creep.memory._lastCheckTravelTime = Game.time;
		}
		if (spawn instanceof StructureSpawn && spawn.spawning) {
			travelTime += spawn.spawning.remainingTime;
		}

		return (creep.ticksToLive ?? 0) < travelTime + (creep.room !== spawn.room ? 100 : 40);
	},

	/**
	 * The target ticks to renew a creep to.
	 */
	getMaxTicks(creep: Creep, renewTarget: AnyStructure): number {
		if (creep.memory.renewForceAmount) {
			return creep.memory.renewForceAmount;
		} else if (creep.memory.role === Role.RemoteHarvester || creep.memory.role === Role.Carrier) {
			return 1000;
		} else if (creep.memory.role === Role.TmpDeliver) {
			if (renewTarget.room.energyAvailable >= 2000) {
				return 1200;
			} else {
				return 700;
			}
		} else if (creep.memory.role === Role.Builder || creep.memory.role === Role.Scientist) {
			if (
				creep.memory.role === Role.Builder &&
				creep.memory.stage === 5 &&
				renewTarget.room.energyAvailable >= 8000
			) {
				return 1200;
			} else if (renewTarget.room.energyAvailable >= 3000) {
				return 900;
			} else {
				return 1000;
			}
		} else if (creep.memory.role === Role.Harvester) {
			if (creep.memory.dedicatedLinkId && renewTarget.room.energyAvailable >= 1600) {
				return 1400;
			}
		} else if (creep.memory.role === Role.Relay) {
			if (renewTarget.room.energyAvailable >= 3000) {
				return 1400;
			} else {
				return 1000;
			}
		}
		return 600;
	},

	run(creep: Creep | PowerCreep): void {
		if (!creep.memory.renewTarget) {
			// if (creep instanceof Creep) {
			// 	let closestSpawn = creep.pos.findClosestByPath(FIND_STRUCTURES, {
			// 		filter: struct => struct.structureType === STRUCTURE_SPAWN && !struct.spawning && struct.isActive(),
			// 	});
			// 	if (!closestSpawn || closestSpawn.room.energyAvailable < 100) {
			// 		closestSpawn = Object.values(Game.spawns)[0]; // pick first spawn (if it exists)
			// 	}
			// 	creep.memory.renewTarget = closestSpawn.id;
			// 	creep.log(`Found renew target: ${creep.memory.renewTarget}`);
			// 	// creep.memory._renewDebug = {
			// 	// 	startTime: Game.time,
			// 	// 	renewTargetSetBy: "run method",
			// 	// 	targetSpawn: closestSpawn.name,
			// 	// 	targetRoom: closestSpawn.room.name,
			// 	// };
			// }
			this.findRenewTarget(creep);
		}
		const renewTarget = Game.getObjectById(creep.memory.renewTarget);

		if (!renewTarget) {
			creep.log("ERROR: No renew target found");
			return;
		}

		const maxTicks = creep instanceof Creep ? this.getMaxTicks(creep, renewTarget) : 1000;

		let renewCost = 0;
		if (creep instanceof Creep) {
			const countRenewsRequired = Math.ceil(
				(maxTicks - (creep.ticksToLive ?? 0)) / util.getRenewTickIncrease(creep.body)
			);
			renewCost = util.getRenewCost(creep.body);
			const totalRenewCost = renewCost * countRenewsRequired;
			creep.log("[task.renew] renews required:", countRenewsRequired, "total cost:", totalRenewCost);

			if (creep.getActiveBodyparts(CARRY) > 0) {
				if (
					!creep.memory._renewGather &&
					creep.room.name === renewTarget.room.name &&
					creep.room.energyAvailable < renewCost * Math.min(countRenewsRequired, 2) &&
					(creep.ticksToLive ?? 0) > 60 &&
					creep.store.getUsedCapacity(RESOURCE_ENERGY) < renewCost
				) {
					creep.memory._renewGather = true;
				} else if (
					creep.memory._renewGather &&
					(creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0 || (creep.ticksToLive ?? 0) < 40)
				) {
					creep.memory._renewGather = false;
				}

				if (creep.memory._renewGather) {
					taskGather.run(creep);
					return;
				}
			}
		}

		cartographer.moveTo(creep, renewTarget, {
			visualizePathStyle: {},
			avoidTargets: roomName => {
				// FIXME: this code is duplicated in commandEnergyRelays job, and should be moved to a common place
				const room = Game.rooms[roomName];
				if (room) {
					if (!room.memory.rootPos || !room.memory.storagePos) {
						return [];
					}
					const rootLinkPos = room.getPositionAt(room.memory.rootPos.x, room.memory.rootPos.y - 2);
					const storagePos = room.getPositionAt(room.memory.storagePos.x, room.memory.storagePos.y);
					let storagePosRelayDirection: DirectionConstant = RIGHT;
					if (room.memory.storagePosDirection) {
						storagePosRelayDirection = room.memory.storagePosDirection;
					}
					if (!rootLinkPos || !storagePos) {
						return [];
					}
					const relayPositions = [
						{ pos: util.getPositionInDirection(rootLinkPos, TOP_LEFT), range: 0 },
						{ pos: util.getPositionInDirection(storagePos, storagePosRelayDirection), range: 0 },
						{ pos: util.getPositionInDirection(rootLinkPos, TOP_RIGHT), range: 0 },
						{ pos: util.getPositionInDirection(rootLinkPos, BOTTOM_LEFT), range: 0 },
						{ pos: util.getPositionInDirection(rootLinkPos, BOTTOM_RIGHT), range: 0 },
					];
					return relayPositions;
				}
				return [];
			},
		});

		if ((creep.ticksToLive ?? 0) < maxTicks) {
			if (creep instanceof Creep && renewTarget instanceof StructureSpawn) {
				switch (renewTarget.renewCreep(creep)) {
					case ERR_NOT_ENOUGH_ENERGY:
						if (renewTarget.room.energyAvailable + creep.store[RESOURCE_ENERGY] >= renewCost) {
							creep.transfer(renewTarget, RESOURCE_ENERGY);
						} else if ((creep.ticksToLive ?? 0) > 220) {
							creep.memory.renewing = false;
							return;
						} else {
							creep.memory.renewTarget = Game.spawns[Object.keys(Game.spawns)[0]].id;
							// if (creep.memory._renewDebug) {
							// 	creep.memory._renewDebug.overwrittenBy = "renew not enough energy";
							// } else {
							// 	creep.memory._renewDebug = {
							// 		overwrittenBy: "renew not enough energy",
							// 	};
							// }
						}
						break;
					case ERR_FULL:
						creep.memory.renewing = false;
						break;
					case ERR_BUSY:
						if ((renewTarget.spawning?.remainingTime ?? 0) > (creep.ticksToLive ?? 0) + 10) {
							delete creep.memory.renewTarget;
							delete creep.memory._renewDebug;
						}
						break;
					default:
						break;
				}
			} else if (creep instanceof PowerCreep && renewTarget instanceof StructurePowerSpawn) {
				creep.renew(renewTarget);
				creep.memory.renewing = false;
			} else {
				creep.log("ERROR: renew target is the wrong type of spawn: ", renewTarget);
			}
		}
		if ((creep.ticksToLive ?? 0) >= maxTicks) {
			creep.memory.renewing = false;
			delete creep.memory.renewForceAmount;
		}

		if (!creep.memory.renewing) {
			delete creep.memory.renewTarget;
			delete creep.memory._renewDebug;
		}
	},
};

module.exports = taskRenew;
export default taskRenew;
