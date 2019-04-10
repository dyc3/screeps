var traveler = require('traveler');
var taskGather = require("task.gather");
var util = require("util");

var roleBuilder = {
	findTargets: function(creep) {
		var targets = [];
		var rooms = util.getOwnedRooms();
		for (var r = 0; r < rooms.length; r++) {
			var room = rooms[r];
			var sites = room.find(FIND_CONSTRUCTION_SITES);
			if (sites.length == 0) {
				continue;
			}
			targets = targets.concat(sites);
		}
		return targets.filter((site) => { return site != null && site != undefined });
	},

	/** @param {Creep} creep **/
	run: function(creep) {

		if(creep.memory.building && creep.carry.energy < 5) {
			creep.memory.building = false;
			creep.say('gathering');
		}
		else if(!creep.memory.building && creep.carry.energy == creep.carryCapacity) {
			creep.memory.building = true;
			creep.say('building');
		}

		if(creep.memory.building) {
			// var targets = creep.room.find(FIND_CONSTRUCTION_SITES);
			var targets = this.findTargets(creep);
			// console.log(creep.name,"targets:",targets)
			if(targets.length) {
				targets.sort(function(a,b) {
					return (a.progress / a.progressTotal) - (b.progress / b.progressTotal);
				});
				targets.reverse();
				targets.splice(4, targets.length - 5);
				// var target = creep.pos.findClosestByPath(targets);
				var target = targets[0];
				if (target == null) {
					target = targets[0]; // ????
				}
				if(creep.build(target) == ERR_NOT_IN_RANGE) {
					creep.travelTo(target);
				}
			}
			else{
				creep.say('ERR: No construction sites');
			}
		}
		else {
			taskGather.run(creep);
		}
	}
};

module.exports = roleBuilder;
