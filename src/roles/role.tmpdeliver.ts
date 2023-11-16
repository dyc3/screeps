// This is a tool creep used to set up delivery routes for energy

import * as cartographer from "screeps-cartographer";
import traveler from "../traveler.js";
import util, { isStoreStructure } from "../util.js";
import { Role } from "./meta.js";

String.prototype.hashCode = function () {
	let hash = 0;
	let i;
	let chr;
	if (this.length === 0) {
		return hash;
	}
	for (i = 0; i < this.length; i++) {
		chr = this.charCodeAt(i);
		hash = (hash << 5) - hash + chr;
		hash |= 0; // Convert to 32bit integer
	}
	return hash;
};

const roleTmpDelivery = {
	/**
	 * Checks if the creep's settings have been changed, indicating that cached values should be recalculated.
	 * In this instance, it checks to see if `withdrawTargetId` and `depositTargetId` have changed.
	 * @params {Creep} The creep to check.
	 * @returns {boolean} True if cached values need to be recalculated, false if otherwise.
	 */
	haveSettingsChanged(creep: Creep): boolean {
		const settings = creep.memory.withdrawTargetId + creep.memory.depositTargetId;
		if (!creep.memory._settingsHash) {
			creep.memory._settingsHash = settings.hashCode();
		}

		return settings.hashCode() !== creep.memory._settingsHash;
	},
	/**
	 * Checks if the delivery creep should renew themselves. Should be called before traveling to the next destination.
	 * Does not override the logic in task.renew.
	 * @params {Creep} The creep to check.
	 * @returns {boolean} True if the creep should renew, false if otherwise.
	 */
	shouldRenew(creep: Creep): boolean {
		if (creep.memory.recycle) {
			return false;
		}

		if (!creep.memory._routeDistance) {
			const withdrawTarget = Game.getObjectById(creep.memory.withdrawTargetId);
			const depositTarget = Game.getObjectById(creep.memory.depositTargetId);
			creep.memory._routeDistance = util.calculateEta(
				creep,
				traveler.Traveler.findTravelPath(withdrawTarget, depositTarget, { range: 1, ignoreCreeps: true }).path,
				true
			);
		}

		if (creep.memory.renewAtWithdraw) {
			return creep.ticksToLive <= creep._routeDistance * 2;
		} else {
			return creep.ticksToLive <= creep._routeDistance;
		}
	},

	run(creep: Creep): void {
		if (!creep.memory.withdrawTargetId) {
			creep.say("need info");
			creep.log("needs withdrawTargetId");
			return;
		}

		if (!creep.memory.depositTargetId) {
			creep.say("need info");
			creep.log("needs depositTargetId");
			return;
		}

		if (this.haveSettingsChanged(creep)) {
			delete creep.memory._settingsHash;
			delete creep.memory._routeDistance;
			delete creep.memory.withdrawCachePos;
			delete creep.memory.depositCachePos;
		}

		const withdrawTarget = Game.getObjectById(creep.memory.withdrawTargetId);
		const depositTarget = Game.getObjectById(creep.memory.depositTargetId);

		if (withdrawTarget) {
			creep.memory.withdrawCachePos = withdrawTarget.pos;
		} else {
			// if (creep.memory.withdrawCachePos && Game.rooms[creep.memory.withdrawCachePos.roomName]) {
			// 	delete creep.memory.withdrawTargetId;
			// }
			if (!creep.memory.withdrawCachePos) {
				creep.log("Can't find withdraw target (probably no vision)");
				creep.say("help");
				return;
			}
		}
		if (depositTarget) {
			creep.memory.depositCachePos = depositTarget.pos;
		} else {
			// if (creep.memory.depositCachePos && Game.rooms[creep.memory.depositCachePos.roomName]) {
			// 	delete creep.memory.depositTargetId;
			// }
			if (!creep.memory.depositCachePos) {
				creep.log("Can't find deposit target (probably no vision)");
				creep.say("help");
				return;
			}
		}

		const obstacles = util.getCreeps(Role.Harvester, Role.Relay);

		function avoidTargets(roomName: string): cartographer.MoveTarget[] {
			return obstacles
				.filter(creep => creep.pos.roomName === roomName)
				.map(creep => ({ pos: creep.pos, range: 0 }));
		}

		if (creep.memory.recycle) {
			// recycle this creep at the nearest spawn
			// only occurs if recycleAfterDelivery === true
			if (!creep.memory.recycleAtId) {
				creep.memory.recycleAtId = creep.pos.findClosestByRange(FIND_MY_SPAWNS)?.id;
			}
			if (!creep.memory.recycleAtId) {
				creep.log("Can't find spawn to recycle at");
				creep.say("help");
				return;
			}
			const spawn = Game.getObjectById(creep.memory.recycleAtId);
			if (!spawn) {
				creep.log("Can't find spawn to recycle at");
				creep.say("help");
				return;
			}
			let dontRecycleJustYet = false;
			// if we have extra energy, put it somewhere so we can avoid wasting it
			if (creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
				const adjacent = creep.pos.findInRange(FIND_MY_STRUCTURES, 1, {
					filter: struct =>
						isStoreStructure(struct) && struct.store && struct.store.getFreeCapacity(RESOURCE_ENERGY) > 0,
				});
				if (adjacent) {
					creep.transfer(adjacent[0], RESOURCE_ENERGY);
					if (adjacent.length >= 2) {
						dontRecycleJustYet = true;
					}
				}
			}
			if (creep.pos.isNearTo(spawn)) {
				if (!dontRecycleJustYet) {
					spawn.recycleCreep(creep);
				}
			} else {
				cartographer.moveTo(creep, spawn, { avoidTargets });
			}
		} else if (creep.memory.delivering) {
			// eslint-disable-next-line no-underscore-dangle
			const _cache = creep.memory.depositCachePos;
			const targetPos = depositTarget ? depositTarget.pos : new RoomPosition(_cache.x, _cache.y, _cache.roomName);
			if (creep.pos.isNearTo(targetPos)) {
				let transferResult;
				if (creep.memory.transportOther) {
					for (const resource of RESOURCES_ALL) {
						if (creep.store[resource] > 0 && depositTarget) {
							transferResult = creep.transfer(depositTarget, resource);
							break;
						}
					}
				} else {
					transferResult = creep.transfer(depositTarget, RESOURCE_ENERGY);
				}
				if (transferResult !== ERR_FULL && creep.store.getUsedCapacity() < creep.store.getCapacity() * 0.25) {
					creep.memory.delivering = false;

					if (creep.memory.recycleAfterDelivery) {
						creep.memory.recycle = true;
					}
				}
				if (creep.memory.recycleAfterDeposit) {
					creep.memory.recycle = true;
				}
				if (creep.memory.dropAfterDeposit) {
					creep.drop(RESOURCE_ENERGY);
				}
				if (!creep.memory.renewAtWithdraw && this.shouldRenew(creep)) {
					creep.memory.renewing = true;
				}
			} else {
				if (creep.store.getUsedCapacity() === 0) {
					creep.memory.delivering = false;

					if (this.shouldRenew(creep)) {
						creep.memory.renewing = true;
					}
				} else {
					cartographer.moveTo(creep, targetPos, {
						visualizePathStyle: {},
						avoidTargets,
					});
				}
			}
		} else {
			// eslint-disable-next-line no-underscore-dangle
			const _cache = creep.memory.withdrawCachePos;
			const targetPos = withdrawTarget
				? withdrawTarget.pos
				: new RoomPosition(_cache.x, _cache.y, _cache.roomName);
			if (creep.pos.isNearTo(targetPos) && withdrawTarget) {
				if (creep.memory.transportOther) {
					for (const resource of RESOURCES_ALL) {
						if (creep.store.getFreeCapacity() === 0) {
							break;
						}
						if (resource === RESOURCE_ENERGY) {
							continue;
						}
						creep.withdraw(withdrawTarget, resource);
					}
				} else {
					if (withdrawTarget instanceof Resource) {
						creep.pickup(withdrawTarget);
					} else {
						creep.withdraw(withdrawTarget, RESOURCE_ENERGY);
					}
				}
				if (creep.store.getUsedCapacity() >= creep.store.getCapacity() * 0.75) {
					creep.memory.delivering = true;

					if (this.shouldRenew(creep)) {
						creep.memory.renewing = true;
					}
				}
			} else {
				cartographer.moveTo(creep, targetPos, { avoidTargets, visualizePathStyle: {} });
			}
		}
	},
};

module.exports = roleTmpDelivery;
export default roleTmpDelivery;
