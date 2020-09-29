let traveler = require("traveler");
let util = require("util");
let taskDepositMaterials = require("task.depositmaterials");

function doNoJobsStuff(creep) {
	if (taskDepositMaterials.checkForMaterials(creep, exclude_energy=true)) {
		taskDepositMaterials.run(creep, exclude_energy=true);
	}
	else {
// 		console.log(creep.name, "pretending to be a manager");
		let roleManager = require("role.manager");
		roleManager.run(creep);
	}
}

let roleScientist = {
	run(creep) {
		if (creep.fatigue > 0) {
			return;
		}

		function isStructureFull(struct) {
			switch (struct.structureType) {
				case STRUCTURE_LAB:
					return struct.mineralType && struct.store.getFreeCapacity(struct.mineralType) === 0;
				case STRUCTURE_NUKER:
					return struct.store.getFreeCapacity(RESOURCE_GHODIUM) === 0;
				case STRUCTURE_TERMINAL:
				case STRUCTURE_CONTAINER:
				case STRUCTURE_STORAGE:
				case STRUCTURE_FACTORY:
					return struct.store.getFreeCapacity() === 0;
			}
			return true;
		}

		function isStructureEmpty(struct) {
			switch (struct.structureType) {
				case STRUCTURE_LAB:
					return !struct.mineralType || struct.store.getUsedCapacity(struct.mineralType) === 0;
				case STRUCTURE_NUKER:
					return struct.store.getUsedCapacity(RESOURCE_GHODIUM) === 0;
				case STRUCTURE_TERMINAL:
				case STRUCTURE_CONTAINER:
				case STRUCTURE_STORAGE:
				case STRUCTURE_FACTORY:
					return struct.store.getUsedCapacity() === 0;
			}
			return true;
		}

		// NOTE
		// `targetStruct` is where we deliver the resource
		// `targetStorage` is where we grab the resource from
		// TODO: rename these to `depositTarget` and `withdrawTarget` in `creep.memory`

		let neededMinerals = {};
		if (!creep.memory.targetStruct) {
			for (let f in Game.flags) {
				if (!f.includes("fill")) {
					continue;
				}

				let flag = Game.flags[f];
				let struct = flag.pos.lookFor(LOOK_STRUCTURES).filter(s => s.structureType != STRUCTURE_ROAD)[0];
				if (isStructureFull(struct)) {
					continue;
				}
				neededMinerals[flag.name.split(":")[1]] = struct;
			}
		}

		// look for where to grab the resource from
		if (!creep.memory.targetStorage) {
			creep.log("looking for target storage");
			let targetStorage = undefined;
			let _mineral = undefined;
			for (let i = 0; i < _.keys(neededMinerals).length; i++) {
				let key = _.keys(neededMinerals)[i];
				_mineral = key;
				// creep.log("checking inventory for any", _mineral);
				let structures = _.values(Game.structures);
				for (let room of util.getOwnedRooms()) {
					structures = structures.concat(util.getStructures(room, STRUCTURE_CONTAINER));
				}
				targetStorage = _.filter(structures, struct => {
					// exclude structures that need a resource
					if (struct.id == _.values(neededMinerals)[i].id) {
						return false;
					}

					// exclude labs if they have a fill flag, include them if they have a make flag (if enough resource is available to fill the creep)
					if (struct.structureType == STRUCTURE_LAB) {
						if (struct.mineralType != _mineral) {
							return false;
						}
						let flags = struct.pos.lookFor(LOOK_FLAGS);
						if (flags.length > 0) {
							for (let f in flags) {
								let flag = flags[f];
								if (flag.name.includes("fill")) {
									return false;
								}
								if (flag.name.includes("make") || flag.name.includes("dismantle")) {
									return struct.mineralAmount >= creep.carryCapacity; // why?
								}
							}
						}
					}

					// exclude all structures that are not storage, terminal, or container
					if (struct.structureType != STRUCTURE_STORAGE && struct.structureType != STRUCTURE_TERMINAL && struct.structureType != STRUCTURE_CONTAINER && struct.structureType != STRUCTURE_FACTORY) {
						return false;
					}
					return struct.store.getUsedCapacity(_mineral) > 0;
				})[0];

				// _.filter(Game.structures) only gets owned structures
				// since containers aren't owned by any player, we have to search each room for them
				if (!targetStorage) {
					// TODO find containers in owned rooms
				}

				if (targetStorage) {
				// 	console.log(creep.name, "found target storage:",targetStorage,"has",_mineral);
					creep.memory.targetStruct = neededMinerals[_mineral].id;
					creep.memory.targetStorage = targetStorage.id;
					creep.memory.targetResource = _mineral;
					break;
				}
			}

			if (!targetStorage) {
				// console.log(creep.name, "could not find targetStorage to get minerals from.");
				delete creep.memory.targetStruct;
				doNoJobsStuff(creep);
				return;
			}
		}
		let depositTarget = Game.getObjectById(creep.memory.targetStruct);
		let withdrawTarget = Game.getObjectById(creep.memory.targetStorage);

		creep.log("transfer", creep.memory.targetResource, "from", withdrawTarget, "=>", depositTarget);

		// FIXME: what the fuck does this if statement mean? why is it here?
		if (creep.store[creep.memory.targetResource] === 0 && (isStructureFull(depositTarget) || (withdrawTarget.store && withdrawTarget.store[creep.memory.targetResource] == 0) || isStructureEmpty(withdrawTarget))) {
			if (creep.transfer(withdrawTarget, creep.memory.targetResource) == ERR_NOT_IN_RANGE) {
				creep.travelTo(withdrawTarget);
			}
			if (!creep.carry[creep.memory.targetResource] || creep.carry[creep.memory.targetResource] <= 0) {
				delete creep.memory.targetStruct;
				delete creep.memory.targetStorage;
				delete creep.memory.targetResource;
			}
			doNoJobsStuff(creep);
			return;
		}

		// make sure we don't have any energy on us
		if (creep.store[RESOURCE_ENERGY] > 0) {
			taskDepositMaterials.run(creep, exclude_energy=false);
			return;
		}

		// console.log(creep.name, targetStruct, targetStorage, creep.memory.targetResource)

		if (creep.store[creep.memory.targetResource] > 0 || _.sum(creep.store) > 0) {
			if (creep.transfer(depositTarget, creep.memory.targetResource) == ERR_NOT_IN_RANGE) {
				creep.travelTo(depositTarget);
			}
		}
		else {
			switch (creep.withdraw(withdrawTarget, creep.memory.targetResource)) {
				case ERR_NOT_IN_RANGE:
					creep.travelTo(withdrawTarget);
					break;
				case ERR_NOT_ENOUGH_RESOURCES:
					creep.log("withdraw: NOT ENOUGH RESOURCES");
					delete creep.memory.targetStruct;
					delete creep.memory.targetStorage;
					delete creep.memory.targetResource;
					break;
				default:
					break;
			}
		}
	}
}

module.exports = roleScientist;
