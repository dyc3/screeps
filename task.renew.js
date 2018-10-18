var util = require("util");
var taskGather = require("task.gather");

var taskRenew = {
	/** @param {Creep} creep **/
	checkRenew: function(creep) {
		if (!creep.memory.keepAlive || creep.memory.role == "claimer" || creep.getActiveBodyparts(CLAIM) > 0)
		{
			return false;
		}

		var spawn = util.getSpawn(creep.room);
		if (!spawn) {
			spawn = Game.spawns[Object.keys(Game.spawns)[0]]; // pick first spawn (if it exists)
		}
		if (!spawn) {
			// there are no spawns anyway, just keep doing your job.
			return false;
		}

		if (creep.memory.renewing)
		{
			return true;
		}

		// NOTE: this isn't really exact, treat it like a rough estimate
		var travelTime = creep.pos.findPathTo(spawn).length + ((creep.room != spawn.room) ? 160 : 70);
		if (spawn.spawning) {
			travelTime += spawn.spawning.remainingTime;
		}
		return creep.ticksToLive < travelTime;
	},

	/** @param {Creep} creep **/
	run: function(creep) {
		if (!creep.memory.renewTarget) {
			var closestSpawn = creep.pos.findClosestByPath(FIND_STRUCTURES, {
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

		var maxTicks = ((creep.memory.role == "multiroom-harvester" || creep.memory.role == "carrier") ? 1000 : 600);
		if (creep.memory.role == "scout") {
			maxTicks = 1200;
		}
		else if (creep.memory.role == "nextroomer") {
			maxTicks = 1000;
		}
		else if (creep.memory.role == "builder" || creep.memory.role == "scientist") {
			if (renewTarget.room.energyAvailable >= 3000) {
				maxTicks = 900;
			}
		}
		else if (creep.memory.role == "harvester") {
			if (creep.memory.hasDedicatedLink && renewTarget.room.energyAvailable >= 1600) {
				maxTicks = 1000;
			}
		}

		if (!creep.pos.isNearTo(renewTarget)) {
			creep.moveTo(renewTarget, {visualizePathStyle:{}});
		}
		else if (!renewTarget.spawning && creep.ticksToLive < maxTicks) {
			switch (renewTarget.renewCreep(creep)) {
				case ERR_NOT_ENOUGH_ENERGY:
					if (creep.carry[RESOURCE_ENERGY] > 0) {
						creep.transfer(renewTarget, RESOURCE_ENERGY);
					}
					else if (creep.ticksToLive > 220) {
						creep.memory.renewing = false;
						return;
					}
					break;
				case ERR_FULL:
					creep.memory.renewing = false;
					break;
				default:
					break;
			}
		}
		if (creep.ticksToLive >= maxTicks) {
			creep.memory.renewing = false;
		}

		if (!creep.memory.renewing) {
			delete creep.memory.renewTarget;
		}
	}
}

module.exports = taskRenew;
