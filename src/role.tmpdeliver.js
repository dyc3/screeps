// This is a tool creep used to set up delivery routes for energy

let traveler = require('traveler');
let util = require("util");

String.prototype.hashCode = function() {
	var hash = 0, i, chr;
	if (this.length === 0) {
		return hash;
	}
	for (i = 0; i < this.length; i++) {
		chr = this.charCodeAt(i);
		hash = ((hash << 5) - hash) + chr;
		hash |= 0; // Convert to 32bit integer
	}
	return hash;
};

let roleTmpDelivery = {
	/**
	 * Checks if the creep's settings have been changed, indicating that cached values should be recalculated.
	 * In this instance, it checks to see if `withdrawTargetId` and `depositTargetId` have changed.
	 * @params {Creep} The creep to check.
	 * @returns {boolean} True if cached values need to be recalculated, false if otherwise.
	 */
	haveSettingsChanged(creep) {
		let settings = creep.memory.withdrawTargetId + creep.memory.depositTargetId;
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
	shouldRenew(creep) {
		if (this.haveSettingsChanged(creep)) {
			delete creep.memory._routeDistance;
		}

		if (!creep.memory._routeDistance) {
			let withdrawTarget = Game.getObjectById(creep.memory.withdrawTargetId);
			let depositTarget = Game.getObjectById(creep.memory.depositTargetId);
			creep.memory._routeDistance = util.calculateEta(creep, traveler.Traveler.findTravelPath(withdrawTarget, depositTarget, { range: 1, ignoreCreeps: true }).path, true);
		}

		return creep.ticksToLive <= creep._routeDistance;
	},

	run(creep) {
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

		let withdrawTarget = Game.getObjectById(creep.memory.withdrawTargetId);
		let depositTarget = Game.getObjectById(creep.memory.depositTargetId);

		if (withdrawTarget) {
			creep.memory.withdrawCachePos = withdrawTarget.pos
		}
		else {
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
			creep.memory.depositCachePos = depositTarget.pos
		}
		else {
			// if (creep.memory.depositCachePos && Game.rooms[creep.memory.depositCachePos.roomName]) {
			// 	delete creep.memory.depositTargetId;
			// }
			if (!creep.memory.depositCachePos) {
				creep.log("Can't find deposit target (probably no vision)");
				creep.say("help");
				return;
			}
		}

		let obstacles = util.getCreeps("harvester", "relay");

		if (creep.memory.recycle) {
			// recycle this creep at the nearest spawn
			// only occurs if recycleAfterDelivery === true
			if (!creep.memory.recycleAtId) {
				creep.memory.recycleAtId = creep.pos.findClosestByRange(FIND_MY_SPAWNS).id;
			}
			let spawn = Game.getObjectById(creep.memory.recycleAtId);
			let dontRecycleJustYet = false;
			// if we have extra energy, put it somewhere so we can avoid wasting it
			if (creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
				let adjacent = creep.pos.findInRange(FIND_MY_STRUCTURES, 1, {
					filter: struct => struct.store && struct.store.getFreeCapacity(RESOURCE_ENERGY) > 0,
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
			}
			else {
				creep.travelTo(spawn, { obstacles });
			}
		}
		else if (creep.memory.delivering) {
			let _cache = creep.memory.depositCachePos;
			let targetPos = depositTarget ? depositTarget.pos : new RoomPosition(_cache.x, _cache.y, _cache.roomName);
			if (creep.pos.isNearTo(targetPos)) {
				let transferResult;
				if (creep.memory.transportOther) {
					for (let resource of RESOURCES_ALL) {
						if (creep.store[resource] > 0) {
							transferResult = creep.transfer(depositTarget, resource);
							break;
						}
					}
				}
				else {
					transferResult = creep.transfer(depositTarget, RESOURCE_ENERGY);
				}
				if (transferResult !== ERR_FULL && creep.store.getUsedCapacity() < creep.store.getCapacity() * 0.25) {
					creep.memory.delivering = false;

					if (creep.memory.recycleAfterDelivery) {
						creep.memory.recycle = true;
					}
					else if (this.shouldRenew(creep)) {
						creep.memory.renewing = true;
					}
				}
			}
			else {
				if (creep.store.getUsedCapacity() === 0) {
					creep.memory.delivering = false;

					if (this.shouldRenew(creep)) {
						creep.memory.renewing = true;
					}
				}
				else {
					creep.travelTo(targetPos, { obstacles, visualizePathStyle:{}, ensurePath: true });
				}
			}
		}
		else {
			let _cache = creep.memory.withdrawCachePos;
			let targetPos = withdrawTarget ? withdrawTarget.pos : new RoomPosition(_cache.x, _cache.y, _cache.roomName);
			if (creep.pos.isNearTo(targetPos)) {
				if (creep.memory.transportOther) {
					for (let resource of RESOURCES_ALL) {
						if (creep.store.getFreeCapacity() === 0) {
							break;
						}
						if (resource == RESOURCE_ENERGY) {
							continue;
						}
						creep.withdraw(withdrawTarget, resource);
					}
				}
				else {
					if (withdrawTarget instanceof Resource) {
						creep.pickup(withdrawTarget);
					}
					else {
						creep.withdraw(withdrawTarget, RESOURCE_ENERGY);
					}
				}
				if (creep.store.getUsedCapacity() < creep.store.getCapacity() * 0.75) {
					creep.memory.delivering = true;

					if (this.shouldRenew(creep)) {
						creep.memory.renewing = true;
					}
				}
			}
			else {
				creep.travelTo(targetPos, { obstacles, visualizePathStyle:{}, ensurePath: true });
			}
		}
	}
}

module.exports = roleTmpDelivery;