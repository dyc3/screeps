var traveler = require('traveler');
var taskGather = require("task.gather");
var util = require("util");

var roleBuilder = {
	findTargets: function(creep) {
		let targets = [];
		let rooms = util.getOwnedRooms();
		for (let r = 0; r < rooms.length; r++) {
			let room = rooms[r];
			let sites = room.find(FIND_CONSTRUCTION_SITES);
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
			if (!creep.memory.buildTargetId) {
				let targets = this.findTargets(creep);
				if(targets.length) {
					targets = _.sortByOrder(targets, [
						s => {
							return s.progress / s.progressTotal;
						},
						s => {
							return s.structureType === STRUCTURE_SPAWN;
						}
					], ["desc", "desc"]);
					let target = _.first(targets);
					if (target) {
						creep.memory.buildTargetId = target.id;
					}
					else {
						creep.log("ERR: Unable to find a build target");
					}
				}
				else{
					creep.say('ERR: No construction sites');
				}
			}

			if (creep.memory.buildTargetId) {
				let target = Game.getObjectById(creep.memory.buildTargetId);
				if (target) {
					if(creep.build(target) == ERR_NOT_IN_RANGE) {
						creep.travelTo(target);
					}
				}
				else {
					delete creep.memory.buildTargetId;
				}
			}
			else{
				creep.say('ERR: No build target');
			}
		}
		else {
			taskGather.run(creep);
		}
	}
};

module.exports = roleBuilder;
