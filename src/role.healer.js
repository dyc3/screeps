let traveler = require("traveler");
var taskGather = require("task.gather");

var roleHealer = {

	/** @param {Creep} creep **/
	run: function(creep) {
	    if (creep.fatigue > 0 || Game.cpu.bucket <= 50) {
	        return;
	    }
	    
		var damagedCreeps = creep.pos.findInRange(FIND_MY_CREEPS, 15, {
			filter: (mycreep) => {
				return mycreep.hits < mycreep.hitsMax;
			}
		});
		if (damagedCreeps.length > 0) {
			var closest = creep.pos.findClosestByPath(damagedCreeps);
			if (creep.heal(closest) == ERR_NOT_IN_RANGE) {
				if (Game.time % 2 == 0 || closest.hits < closest.hitsMax * 0.5) {
					if (creep.rangedHeal() == ERR_NOT_IN_RANGE) {
						creep.travelTo(closest);
					}
				}
				else {
					creep.travelTo(closest);
				}
			}
		}
		else {
			var attackCreeps = _.filter(Game.creeps, (creep) => creep.memory.role == "attacker" && creep.memory.mode == "attack");
			var doMoveTo = undefined;
			for (var i = 0; i < attackCreeps.length; i++) {
				if (!creep.pos.inRangeTo(attackCreeps[i], 3)) {
					doMoveTo = attackCreeps[i];
				}
			}
			if (doMoveTo != undefined) {
				creep.travelTo(doMoveTo);
			}
			else if (attackCreeps.length == 0) {
				creep.travelTo(Game.flags["Defend"]);
			}
		}
	}
}

module.exports = roleHealer;
