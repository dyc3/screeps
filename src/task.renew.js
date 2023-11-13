import * as cartographer from "screeps-cartographer";
import traveler from "./traveler.js";
import util from "./util";
import taskGather from "./task.gather.js";

// FIXME: if the creep is not in a room with a spawn, then it defaults renewTarget to the first spawn, which is not necessarily the closest one

const taskRenew = {
	findRenewTarget(creep) {
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
		if (!spawn) {
			if (
				!creep.memory.renewTarget ||
				!creep.memory._lastCheckForCloseSpawn ||
				Game.time - creep.memory._lastCheckForCloseSpawn > 200
			) {
				let approx_ticks = 600;
				let countRenewsRequired = Math.ceil(
					(approx_ticks - creep.ticksToLive) / util.getRenewTickIncrease(creep.body)
				);
				let closestRooms = util.findClosestOwnedRooms(
					creep.pos,
					room => room.energyCapacityAvailable >= util.getRenewCost(creep.body) * countRenewsRequired
				);
				if (closestRooms.length > 0) {
					try {
						creep.memory.renewTarget = (
							creep instanceof Creep
								? util.getSpawn(closestRooms[0])
								: _.first(util.getStructures(closestRooms[0], STRUCTURE_POWER_SPAWN))
						).id;
						// creep.memory._renewDebug = {
						// 	startTime: Game.time,
						// 	renewTargetSetBy: "checkRenew branch 0",
						// 	targetSpawn: Game.getObjectById(creep.memory.renewTarget).name,
						// 	targetRoom: Game.getObjectById(creep.memory.renewTarget).room.name,
						// 	closestRooms: closestRooms.map(r => r.name),
						// };
					} catch (e) {
						let targetStruct =
							creep instanceof Creep
								? util.getSpawn(closestRooms[1])
								: _.first(util.getStructures(closestRooms[1], STRUCTURE_POWER_SPAWN));
						if (targetStruct) {
							creep.memory.renewTarget = targetStruct.id;
							// creep.memory._renewDebug = {
							// 	startTime: Game.time,
							// 	renewTargetSetBy: "checkRenew branch 1",
							// 	targetSpawn: Game.getObjectById(creep.memory.renewTarget).name,
							// 	targetRoom: Game.getObjectById(creep.memory.renewTarget).room.name,
							// 	closestRooms: closestRooms.map(r => r.name),
							// };
						} else {
							creep.log("No spawn found to renew");
						}
					}
					creep.memory._lastCheckForCloseSpawn = Game.time;
				}
			}
			spawn = Game.getObjectById(creep.memory.renewTarget);
			if (spawn) {
				return spawn;
			}
		}
		if (creep instanceof Creep && !spawn) {
			spawn = Game.spawns[Object.keys(Game.spawns)[0]]; // pick first spawn (if it exists)
			creep.memory.renewTarget = spawn.id;
			// creep.memory._renewDebug = {
			// 	startTime: Game.time,
			// 	renewTargetSetBy: "checkRenew fallback",
			// 	targetSpawn: Game.getObjectById(creep.memory.renewTarget).name,
			// 	targetRoom: Game.getObjectById(creep.memory.renewTarget).room.name,
			// };
			return spawn;
		}
	},

	/** @param {Creep|PowerCreep} creep **/
	checkRenew(creep) {
		if (creep.memory.renewing) {
			return true;
		}
		if (
			creep instanceof Creep &&
			(!creep.memory.keepAlive || creep.memory.role === "claimer" || creep.getActiveBodyparts(CLAIM) > 0)
		) {
			return false;
		}

		let spawn = this.findRenewTarget(creep);
		if (!spawn) {
			// there are no spawns anyway, just keep doing your job.
			return false;
		}

		let travelTime = creep.memory._renewTravelTime;
		if (
			!creep.memory._renewTravelTime ||
			!creep.memory._lastCheckTravelTime ||
			Game.time - creep.memory._lastCheckTravelTime > 30
		) {
			// let path = PathFinder.search(creep.pos, { pos: spawn.pos, range: 1 }).path;
			let path = traveler.Traveler.findTravelPath(creep.pos, spawn.pos, { range: 1, ignoreCreeps: true }).path;
			travelTime = util.calculateEta(creep, path);
			creep.memory._renewTravelTime = travelTime;
			creep.memory._lastCheckTravelTime = Game.time;
		}
		if (spawn instanceof StructureSpawn && spawn.spawning) {
			travelTime += spawn.spawning.remainingTime;
		}

		return creep.ticksToLive < travelTime + (creep.room !== spawn.room ? 100 : 40);
	},

	/** @param {Creep|PowerCreep} creep **/
	run(creep) {
		if (!creep.memory.renewTarget) {
			if (creep instanceof Creep) {
				let closestSpawn = creep.pos.findClosestByPath(FIND_STRUCTURES, {
					filter: struct => struct.structureType === STRUCTURE_SPAWN && !struct.spawning && struct.isActive(),
				});
				if (!closestSpawn || closestSpawn.room.energyAvailable < 100) {
					closestSpawn = Game.spawns[Object.keys(Game.spawns)[0]]; // pick first spawn (if it exists)
				}
				creep.memory.renewTarget = closestSpawn.id;
				creep.log(`Found renew target: ${creep.memory.renewTarget}`);
				// creep.memory._renewDebug = {
				// 	startTime: Game.time,
				// 	renewTargetSetBy: "run method",
				// 	targetSpawn: closestSpawn.name,
				// 	targetRoom: closestSpawn.room.name,
				// };
			}
		}
		let renewTarget = Game.getObjectById(creep.memory.renewTarget);

		let maxTicks = 600;
		if (creep.memory.renew_force_amount) {
			maxTicks = creep.memory.renew_force_amount;
		} else if (creep.memory.role === "remoteharvester" || creep.memory.role === "carrier") {
			maxTicks = 1000;
		} else if (creep.memory.role === "scout" || creep.memory.role === "tmpdeliver") {
			if (renewTarget.room.energyAvailable >= 2000) {
				maxTicks = 1200;
			} else {
				maxTicks = 700;
			}
		} else if (creep.memory.role === "nextroomer") {
			maxTicks = 1000;
		} else if (creep.memory.role === "builder" || creep.memory.role === "scientist") {
			if (
				creep.memory.role === "builder" &&
				creep.memory.stage === 5 &&
				renewTarget.room.energyAvailable >= 8000
			) {
				maxTicks = 1200;
			} else if (renewTarget.room.energyAvailable >= 3000) {
				maxTicks = 900;
			} else {
				maxTicks = 1000;
			}
		} else if (creep.memory.role === "harvester") {
			if (creep.memory.dedicatedLinkId && renewTarget.room.energyAvailable >= 1600) {
				maxTicks = 1400;
			}
		} else if (creep.memory.role === "relay") {
			if (renewTarget.room.energyAvailable >= 3000) {
				maxTicks = 1400;
			} else {
				maxTicks = 1000;
			}
		}

		let renewCost = 0;
		if (creep instanceof Creep) {
			let countRenewsRequired = Math.ceil((maxTicks - creep.ticksToLive) / util.getRenewTickIncrease(creep.body));
			renewCost = util.getRenewCost(creep.body);
			let totalRenewCost = renewCost * countRenewsRequired;
			creep.log("[task.renew] renews required:", countRenewsRequired, "total cost:", totalRenewCost);

			if (creep.getActiveBodyparts(CARRY) > 0) {
				if (
					!creep.memory._renewGather &&
					creep.room.name == renewTarget.room.name &&
					creep.room.energyAvailable < renewCost * Math.min(countRenewsRequired, 2) &&
					creep.ticksToLive > 60 &&
					creep.store.getUsedCapacity(RESOURCE_ENERGY) < renewCost
				) {
					creep.memory._renewGather = true;
				} else if (
					creep.memory._renewGather &&
					(creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0 || creep.ticksToLive < 40)
				) {
					creep.memory._renewGather = false;
				}

				if (creep.memory._renewGather) {
					taskGather.run(creep);
					return;
				}
			}
		}

		if (!creep.pos.isNearTo(renewTarget)) {
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
						let storagePosRelayDirection = RIGHT;
						if (room.memory.storagePosDirection) {
							storagePosRelayDirection = room.memory.storagePosDirection;
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
		} else if (creep.ticksToLive < maxTicks) {
			if (creep instanceof Creep) {
				switch (renewTarget.renewCreep(creep)) {
					case ERR_NOT_ENOUGH_ENERGY:
						if (renewTarget.room.energyAvailable + creep.store[RESOURCE_ENERGY] >= renewCost) {
							creep.transfer(renewTarget, RESOURCE_ENERGY);
						} else if (creep.ticksToLive > 220) {
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
						delete creep.memory.renewTarget;
						delete creep.memory._renewDebug;
					default:
						break;
				}
			} else if (creep instanceof PowerCreep) {
				creep.renew(renewTarget);
				creep.memory.renewing = false;
			}
		}
		if (creep.ticksToLive >= maxTicks) {
			creep.memory.renewing = false;
			delete creep.memory.renew_force_amount;
		}

		if (!creep.memory.renewing) {
			delete creep.memory.renewTarget;
			delete creep.memory._renewDebug;
		}
	},
};

module.exports = taskRenew;
export default taskRenew;
