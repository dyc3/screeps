import * as cartographer from "screeps-cartographer";
import "../traveler.js";
import util from "../util";
import taskGather from "../task.gather.js";

let roleBuilder = {
	findTargets() {
		let targets = [];
		let rooms = util.getOwnedRooms();
		for (let room of rooms) {
			let sites = room.find(FIND_CONSTRUCTION_SITES);
			if (sites.length === 0) {
				continue;
			}
			targets = targets.concat(sites);
		}
		return targets.filter(site => !!site);
	},

	/** @param {Creep} creep **/
	run(creep) {
		if (creep.memory.building && creep.store[RESOURCE_ENERGY] === 0) {
			creep.memory.building = false;
			creep.say("gathering");
		} else if (!creep.memory.building && creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
			creep.memory.building = true;
			creep.say("building");
		}

		if (creep.memory.building) {
			if (!creep.memory.buildTargetId) {
				let targets = this.findTargets();
				if (targets.length) {
					targets = _.sortByOrder(
						targets,
						[
							s => s.structureType === STRUCTURE_SPAWN,
							s => s.structureType === STRUCTURE_TOWER,
							s => s.structureType === STRUCTURE_EXTENSION,
							s => s.structureType !== STRUCTURE_ROAD,
							s => s.progress / s.progressTotal,
						],
						["desc", "desc", "desc", "desc", "desc"]
					);
					let target = _.first(targets);
					if (target) {
						creep.memory.buildTargetId = target.id;
					} else {
						creep.log("ERR: Unable to find a build target");
					}
				} else {
					creep.say("ERR: No construction sites");
				}
			}

			if (creep.memory.buildTargetId) {
				let target = Game.getObjectById(creep.memory.buildTargetId);
				if (target) {
					if (creep.pos.inRangeTo(target, 3)) {
						creep.build(target);
					} else {
						cartographer.moveTo(creep, target);
					}
				} else {
					delete creep.memory.buildTargetId;
				}
			} else {
				creep.say("ERR: No build target");
			}
		} else {
			taskGather.run(creep);
		}
	},
};

module.exports = roleBuilder;
export default roleBuilder;
