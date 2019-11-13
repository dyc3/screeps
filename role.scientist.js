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

var roleScientist = {
	run: function(creep) {
	    if (creep.fatigue > 0) {
	        return;
	    }
	    
		// if (!Memory.scienceQueue) {
			// Memory.scienceQueue = [];
			// sample science queue item: {"target":"G","amount":5000}
		// }

		function isStructureFull(struct) {
			switch (struct.structureType) {
				case STRUCTURE_LAB:
					return struct.mineralAmount == struct.mineralCapacity;
				case STRUCTURE_TERMINAL:
				case STRUCTURE_CONTAINER:
				case STRUCTURE_STORAGE:
				case STRUCTURE_FACTORY:
					return _.sum(struct.store) >= struct.storeCapacity;
				case STRUCTURE_NUKER:
					return struct.ghodium >= struct.ghodiumCapacity;
			}
			return true;
		}

		function isStructureEmpty(struct) {
			switch (struct.structureType) {
				case STRUCTURE_LAB:
					return struct.mineralAmount == 0;
				case STRUCTURE_TERMINAL:
				case STRUCTURE_CONTAINER:
				case STRUCTURE_STORAGE:
				case STRUCTURE_FACTORY:
					return _.sum(struct.store) == 0;
				case STRUCTURE_NUKER:
					return struct.ghodium == 0;
			}
			return true;
		}
		
		// NOTE
		// `targetStruct` is where we deliver the resource
		// `targetStorage` is where we grab the resource from

		let neededMinerals = [];
		if (!creep.memory.targetStruct) {
            // TODO: Loop over flags instead of structures, because there should be less flags than structures at any given time.
// 			let rooms = util.getOwnedRooms();
// 			for (let r = 0; r < rooms.length; r++) {
// 				let room = rooms[r];

// 				let structures = util.getStructures(room);
// 				for (let s = 0; s < structures.length; s++) {
// 					let struct = structures[s];
// 					if (isStructureFull(struct)) {
// 						continue;
// 					}

// 					let fillFlags = struct.pos.lookFor(LOOK_FLAGS).filter(f => f.name.includes("fill"));
// 					if (fillFlags.length > 0) {
// 						for (let f = 0; f < fillFlags.length; f++) {
// 							let fillFlag = fillFlags[f];
// 							neededMinerals[fillFlag.name.split(":")[1]] = struct;
// 						}
// 					}
// 				}
// 			}

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
			let targetStorage = undefined;
			let _mineral = undefined;
			for (let i = 0; i < _.keys(neededMinerals).length; i++) {
				let key = _.keys(neededMinerals)[i];
				_mineral = key;
				// console.log(creep.name, "checking inventory for any", key);
				targetStorage = _.filter(util.getStructures(creep.room), struct => {
				    // exclude structures that need a resource
					if (struct.id == _.values(neededMinerals)[i].id) {
						return false;
					}
					
					// exclude labs if they have a fill flag, include them if they have a make flag (if enough resource is available to fill the creep)
					if (struct.structureType == STRUCTURE_LAB) {
						if (struct.mineralType != _mineral) {
							return false;
						}
						var flags = struct.pos.lookFor(LOOK_FLAGS);
						if (flags.length > 0) {
							for (var f in flags) {
								var flag = flags[f];
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
					return (key in struct.store) && struct.store[key] > 0;
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
		var targetStruct = Game.getObjectById(creep.memory.targetStruct);
		var targetStorage = Game.getObjectById(creep.memory.targetStorage);

		console.log(creep.name, "transfer", creep.memory.targetResource, "from", targetStorage, "=>", targetStruct);

		if (creep.store[creep.memory.targetResource] === 0 && (isStructureFull(targetStruct) || (targetStorage.store && targetStorage.store[creep.memory.targetResource] == 0) || isStructureEmpty(targetStorage))) {
			if (creep.transfer(targetStorage, creep.memory.targetResource) == ERR_NOT_IN_RANGE) {
				creep.travelTo(targetStorage);
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
		}

		// console.log(creep.name, targetStruct, targetStorage, creep.memory.targetResource)

		if (creep.store[creep.memory.targetResource] > 0 || _.sum(creep.store) > 0) {
			if (creep.transfer(targetStruct, creep.memory.targetResource) == ERR_NOT_IN_RANGE) {
				creep.travelTo(targetStruct);
			}
		}
		else {
			switch (creep.withdraw(targetStorage, creep.memory.targetResource)) {
				case ERR_NOT_IN_RANGE:
					creep.travelTo(targetStorage);
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
