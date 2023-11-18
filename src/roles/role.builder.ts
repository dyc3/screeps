import * as cartographer from "screeps-cartographer";

import taskGather from "../task.gather.js";
import util from "../util";

const roleBuilder = {
	findTargets(): ConstructionSite[] {
		let targets: ConstructionSite[] = [];
		const rooms = util.getOwnedRooms();
		for (const room of rooms) {
			const sites = room.find(FIND_CONSTRUCTION_SITES);
			if (sites.length === 0) {
				continue;
			}
			targets = targets.concat(sites);
		}
		return targets.filter(site => !!site);
	},

	run(creep: Creep): void {
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
							(s: ConstructionSite) => s.structureType === STRUCTURE_SPAWN,
							(s: ConstructionSite) => s.structureType === STRUCTURE_TOWER,
							(s: ConstructionSite) => s.structureType === STRUCTURE_EXTENSION,
							(s: ConstructionSite) => s.structureType !== STRUCTURE_ROAD,
							(s: ConstructionSite) => s.progress / s.progressTotal,
						],
						["desc", "desc", "desc", "desc", "desc"]
					);
					const target = _.first(targets);
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
				const target = Game.getObjectById(creep.memory.buildTargetId);
				if (target) {
					cartographer.moveTo(creep, { pos: target.pos, range: 3 });
					if (creep.pos.inRangeTo(target, 3)) {
						creep.build(target);
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
