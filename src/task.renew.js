let traveler = require("traveler");
let util = require("util");
let taskGather = require("task.gather");

// FIXME: if the creep is not in a room with a spawn, then it defaults renewTarget to the first spawn, which is not necessarily the closest one

let taskRenew = {
	/** @param {Creep} creep **/
	checkRenew: function(creep) {
		if (creep.memory.renewing) {
			return true;
		}
		if (!creep.memory.keepAlive || creep.memory.role == "claimer" || creep.getActiveBodyparts(CLAIM) > 0) {
			return false;
		}

		let spawn = util.getSpawn(creep.room);
		if (!spawn) {
			if (!creep.memory.renewTarget || !creep.memory._lastCheckForCloseSpawn || Game.time - creep.memory._lastCheckForCloseSpawn > 50) {
			    let closestRooms = util.findClosestOwnedRooms(creep.pos);
			    try {
			        creep.memory.renewTarget = util.getSpawn(closestRooms[0]).id
			    }
			    catch {
			        creep.memory.renewTarget = util.getSpawn(closestRooms[1]).id
			    }
				creep.memory._lastCheckForCloseSpawn = Game.time;
			}
			spawn = Game.getObjectById(creep.memory.renewTarget);
		}
		if (!spawn) {
			spawn = Game.spawns[Object.keys(Game.spawns)[0]]; // pick first spawn (if it exists)
		}
		if (!spawn) {
			// there are no spawns anyway, just keep doing your job.
			return false;
		}

		let travelTime = creep.memory._renewTravelTime;
		if (!creep.memory._renewTravelTime || !creep.memory._lastCheckTravelTime || Game.time - creep.memory._lastCheckTravelTime > 8) {
 			// let path = PathFinder.search(creep.pos, { pos: spawn.pos, range: 1 }).path;
			let path = traveler.Traveler.findTravelPath(creep.pos, spawn.pos, { range: 1, ignoreCreeps: true }).path;
			travelTime = util.calculateEta(creep, path);
			creep.memory._renewTravelTime = travelTime;
			creep.memory._lastCheckTravelTime = Game.time;
		}
		if (spawn.spawning) {
			travelTime += spawn.spawning.remainingTime;
		}

		return creep.ticksToLive < travelTime + ((creep.room != spawn.room) ? 100 : 40);
	},

	/** @param {Creep} creep **/
	run: function(creep) {
		if (!creep.memory.renewTarget) {
			let closestSpawn = creep.pos.findClosestByPath(FIND_STRUCTURES, {
				filter: (struct) => { return struct.structureType == STRUCTURE_SPAWN && !struct.spawning; }
			});
			if (!closestSpawn || closestSpawn.room.energyAvailable < 100) {
				closestSpawn = Game.spawns[Object.keys(Game.spawns)[0]]; // pick first spawn (if it exists)
			}
			creep.memory.renewTarget = closestSpawn.id;
		}
		let renewTarget = Game.getObjectById(creep.memory.renewTarget);

		if (creep.room.name == renewTarget.room.name && creep.room.energyAvailable < 40 && creep.ticksToLive > 60 && creep.carry[RESOURCE_ENERGY] < 10) {
			taskGather.run(creep);
			return;
		}

		let maxTicks = 600;
		if (creep.memory.renew_force_amount) {
			maxTicks = creep.memory.renew_force_amount;
		}
		else if (creep.memory.role == "remoteharvester" || creep.memory.role == "carrier") {
			maxTicks = 1000;
		}
		else if (creep.memory.role == "scout" || creep.memory.role == "tmpdeliver") {
			if (renewTarget.room.energyAvailable >= 2000) {
				maxTicks = 1200;
			}
			else {
				maxTicks = 700;
			}
		}
		else if (creep.memory.role == "nextroomer") {
			maxTicks = 1000;
		}
		else if (creep.memory.role == "builder" || creep.memory.role == "scientist") {
			if (creep.memory.role == "builder" && creep.memory.stage === 5 && renewTarget.room.energyAvailable >= 8000) {
				maxTicks = 1200;
			}
			else if (renewTarget.room.energyAvailable >= 3000) {
				maxTicks = 900;
			}
		}
		else if (creep.memory.role == "harvester") {
			if (creep.memory.dedicatedLinkId && renewTarget.room.energyAvailable >= 1600) {
				maxTicks = 1000;
			}
		}
		else if (creep.memory.role == "relay") {
			if (renewTarget.room.energyAvailable >= 3000) {
				maxTicks = 1400;
			}
			else {
				maxTicks = 1000;
			}
		}

		let countRenewsRequired = Math.ceil((maxTicks - creep.ticksToLive) / util.getRenewTickIncrease(creep.body));
		let renewCost = util.getRenewCost(creep.body);
		let totalRenewCost = renewCost * countRenewsRequired;
		creep.log("[task.renew] renews required:", countRenewsRequired, "total cost:", totalRenewCost);

		if (!creep.pos.isNearTo(renewTarget)) {
			creep.travelTo(renewTarget, {visualizePathStyle:{}});
		}
		else if (creep.ticksToLive < maxTicks) {
			switch (renewTarget.renewCreep(creep)) {
				case ERR_NOT_ENOUGH_ENERGY:
					if (renewTarget.room.energyAvailable + creep.store[RESOURCE_ENERGY] >= renewCost) {
						creep.transfer(renewTarget, RESOURCE_ENERGY);
					}
					else if (creep.ticksToLive > 220) {
						creep.memory.renewing = false;
						return;
					}
					else {
						creep.memory.renewTarget = Game.spawns[Object.keys(Game.spawns)[0]].id;
					}
					break;
				case ERR_FULL:
					creep.memory.renewing = false;
					break;
				case ERR_BUSY:
				    delete creep.memory.renewTarget;
				default:
					break;
			}
		}
		if (creep.ticksToLive >= maxTicks) {
			creep.memory.renewing = false;
			delete creep.memory.renew_force_amount;
		}

		if (!creep.memory.renewing) {
			delete creep.memory.renewTarget;
		}
	}
}

module.exports = taskRenew;
