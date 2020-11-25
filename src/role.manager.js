let traveler = require('traveler');
let util = require("util");
let brainLogistics = require("brain.logistics");
let brainAutoPlanner = require("brain.autoplanner");

function doAquire(creep, passively=false) {
	if (creep.memory.aquireTarget && !passively) {
		let aquireTarget = Game.getObjectById(creep.memory.aquireTarget);
		creep.log("aquireTarget:", aquireTarget);
		if (aquireTarget) {
			creep.room.visual.circle(aquireTarget.pos, {stroke:"#ff0000", fill:"transparent", radius: 0.8});
			if (creep.pos.isNearTo(aquireTarget)) {
				// duck typing to figure out what method to use
				if (aquireTarget.store) {
					// has a store

					if (aquireTarget instanceof Tombstone || aquireTarget instanceof Ruin) {
						// prioritize "exotic" resources
						for (let r = 0; r < RESOURCES_ALL.length; r++) {
							if (_.sum(creep.store) == creep.carryCapacity) {
								break;
							}
							let resource = RESOURCES_ALL[r];
							if (resource == RESOURCE_ENERGY) {
								continue;
							}
							if (aquireTarget.store[resource] > 0) {
								creep.withdraw(aquireTarget, resource);
							}
						}
					}

					if (creep.withdraw(aquireTarget, RESOURCE_ENERGY) == OK) {
						creep.memory.lastWithdrawStructure = aquireTarget.id;
						if (aquireTarget.structureType === STRUCTURE_STORAGE) {
							delete creep.memory.aquireTarget;
						}
					}

					if (aquireTarget.store[RESOURCE_ENERGY] == 0) {
						delete creep.memory.aquireTarget;
					}
				}
				else if (aquireTarget instanceof Resource) {
					// dropped resource
					creep.pickup(aquireTarget);
				}
				else {
					creep.say("help");
					creep.log("ERR: I don't know how to withdraw from", aquireTarget);
				}
			}
			else {
				let travelResult = creep.travelTo(aquireTarget, {visualizePathStyle:{}});
				if (travelResult.incomplete) {
					creep.log("Path to aquireTarget is incomplete, skipping...");
					delete creep.memory.aquireTarget;
				}
			}
			return;
		}
		else {
			delete creep.memory.aquireTarget;
		}
	}

	let droppedResources = creep.pos.findInRange(FIND_DROPPED_RESOURCES, (passively ? 1 : 20), {
		filter: (drop) => {
			if (!creep.pos.isNearTo(drop) && drop.amount < global.DROPPED_ENERGY_GATHER_MINIMUM) {
				return false;
			}
			if (util.isDistFromEdge(drop.pos, 2)) {
				return false;
			}
			if (drop.pos.findInRange(FIND_HOSTILE_CREEPS, 6).length > 0) {
				return false;
			}
			if (!passively) {
				if (drop.pos.findInRange(FIND_SOURCES, 1).length > 0) {
					if (drop.pos.findInRange(FIND_STRUCTURES, 1).filter(s => s.structureType === STRUCTURE_LINK).length > 0) {
						return false;
					}
				}
			}
			//console.log("ENERGY DROP",drop.id,drop.amount);
			return creep.pos.findPathTo(drop).length < drop.amount - global.DROPPED_ENERGY_GATHER_MINIMUM;
		}
	});
	if (droppedResources.length > 0) {
		let closest = creep.pos.findClosestByPath(droppedResources);
		if (closest) {
			creep.room.visual.circle(closest.pos, {stroke:"#ff0000", fill:"transparent", radius:1});
			if (creep.pickup(closest) == ERR_NOT_IN_RANGE) {
				creep.memory.aquireTarget = closest.id;
				creep.travelTo(closest, {visualizePathStyle:{}});
			}
		}
	}
	else {
		let tombstones = creep.room.find(FIND_TOMBSTONES, {
			filter: (tomb) => {
				if (util.isDistFromEdge(tomb.pos, 4)) {
					return false;
				}
				if (tomb.pos.findInRange(FIND_HOSTILE_CREEPS, 10).length > 0) {
					return false;
				}
				if (tomb.store[RESOURCE_ENERGY] < global.DROPPED_ENERGY_GATHER_MINIMUM) {
					return false;
				}

				return _.sum(tomb.store) > 0 && creep.pos.findPathTo(tomb).length < tomb.ticksToDecay;
			}
		});
		if (tombstones.length > 0) {
			// NOTE: it might be better to prioritize tombs that will decay sooner (TOMBSTONE_DECAY_PER_PART * [# of creep parts])
			// prioritize tombs with more resources
			tombstones = tombstones.sort((a, b) => { return _.sum(b.store) - _.sum(a.store); });
			let target = tombstones[0];
			creep.room.visual.circle(target.pos, {stroke:"#ff0000", fill:"transparent", radius:1});
			creep.memory.aquireTarget = target.id;
			if (creep.pos.isNearTo(target)) {
				// prioritize "exotic" resources
				for (let r = 0; r < RESOURCES_ALL.length; r++) {
					if (_.sum(creep.carry) == creep.carryCapacity) {
						break;
					}
					let resource = RESOURCES_ALL[r];
					if (resource == RESOURCE_ENERGY) {
						continue;
					}
					if (target.store[resource] > 0) {
						creep.withdraw(target, resource);
					}
				}
				creep.withdraw(target, RESOURCE_ENERGY);
			}
			else {
				creep.travelTo(target, {visualizePathStyle:{}});
			}
		}
		else {
			var filledHarvesters = creep.pos.findInRange(FIND_MY_CREEPS, (passively ? 1 : 4), {
				filter: function(c) {
					// if (c.memory.role == "harvester") {
						// if (c.pos.findInRange(FIND_STRUCTURES, 1, { function(s) { return s.structureType == STRUCTURE_LINK } })) {
						// 	return false;
						// }
					// }
					if (c.memory.role === "carrier") {
						return !c.spawning && c.store[RESOURCE_ENERGY] > 0;
					}
					return !c.spawning && c.memory.role == "harvester" && (!c.memory.hasDedicatedLink || c.memory.stage < 5) && c.store[RESOURCE_ENERGY] >= c.carryCapacity * 0.85;
				}
			});
			if (filledHarvesters.length > 0) {
				let closest = creep.pos.findClosestByPath(filledHarvesters);
				if (closest) {
					creep.room.visual.circle(closest.pos, {stroke:"#ff0000", fill:"transparent", radius:1})
					//console.log("NEARBY FILLED HARVESTER",closest.pos,"dist =",creep.pos.getRangeTo(closest))
					if (closest.transfer(creep, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
						creep.travelTo(closest, {visualizePathStyle:{}});
					}
				}
				else {
					console.log(creep.name, "no path to target harvester");
				}
			}
			else {
				// console.log("Can't withdraw from last deposit:",Game.getObjectById(creep.memory.lastDepositStructure))
				// console.log("last deposit:",Game.getObjectById(creep.memory.lastDepositStructure))
				let containers = creep.pos.findInRange(FIND_STRUCTURES, (passively ? 1 : 50), {
					filter: function(struct) {
						let flags = struct.pos.lookFor(LOOK_FLAGS);
						if (flags.length > 0) {
							if (flags[0].name.includes("dismantle") || flags[0].name.includes("norepair")) {
								return false;
							}
						}
						if (struct.id == creep.memory.lastDepositStructure && creep.room.storage && creep.room.storage.store[RESOURCE_ENERGY] < 800000) {
							return false; // comment this line to increase controller upgrade speed
						}
						if (struct.structureType == STRUCTURE_CONTAINER) {
							let rootPos = struct.room.memory.rootPos;
							if ((struct.pos.x == rootPos.x + 2 || struct.pos.x == rootPos.x - 2) &&
								(struct.pos.y == rootPos.y - 2)) {
								// these containers are in the main base module
								return false;
							}
							if (struct.pos.findInRange(FIND_STRUCTURES, 3, { filter: function(struct) {return struct.structureType == STRUCTURE_CONTROLLER} }).length > 0) {
								return false;
							}

							if (creep.room.storage && creep.room.controller.level > 4) {
								if (struct.pos.findInRange(FIND_SOURCES, 2).length > 0) {
									if (struct.store[RESOURCE_ENERGY] < CONTAINER_CAPACITY * 0.25) {
										return false;
									}
									else if (struct.pos.findInRange(FIND_STRUCTURES, 1).filter(s => s.structureType === STRUCTURE_LINK).length > 0) {
										return false;
									}
								}
							}
						}
						else if (struct.structureType == STRUCTURE_LINK) {
							let relayCreeps = _.filter(util.getCreeps("relay"), c => !c.spawning && c.memory.assignedPos.roomName === creep.memory.targetRoom && c.pos.isEqualTo(new RoomPosition(c.memory.assignedPos.x, c.memory.assignedPos.y, c.memory.assignedPos.roomName)));
							let isNearRelay = false;
							for (let relay of relayCreeps) {
								if (struct.pos.isNearTo(relay)) {
									isNearRelay = true;
									break;
								}
							}
							if (isNearRelay) {
								return false;
							}
							if (struct.energy > 0 && struct.pos.inRangeTo(struct.room.storage, 2)) {
								return true;
							}
						}
						else if (struct.structureType == STRUCTURE_TERMINAL) {
							if (struct.owner.username !== global.WHOAMI) {
								return true;
							}
							else if (struct.store[RESOURCE_ENERGY] > Memory.terminalEnergyTarget) {
								return true;
							}
						}
						else if (struct.structureType == STRUCTURE_FACTORY) {
							if (struct.owner.username !== global.WHOAMI) {
								return true;
							}
							if (struct.store[RESOURCE_ENERGY] > Memory.factoryEnergyTarget) {
								return true;
							}
						}
						return (struct.structureType == STRUCTURE_STORAGE && struct.store[RESOURCE_ENERGY] > creep.carryCapacity) ||
							(struct.structureType == STRUCTURE_CONTAINER && struct.store[RESOURCE_ENERGY] > 0);
					}
				});
				if (containers.length > 0) {
					containers.sort(function(a, b) {
						if (a.structureType != b.structureType) {
							if (a.structureType == STRUCTURE_STORAGE) {
								return 1;
							}
							if (b.structureType == STRUCTURE_STORAGE) {
								return -1;
							}
						}

						var aEnergy = 0
						if (a.store) {
							aEnergy = a.store[RESOURCE_ENERGY];
						}
						else if (a.energy) {
							aEnergy = a.energy;
						}

						var bEnergy = 0
						if (b.store) {
							bEnergy = b.store[RESOURCE_ENERGY];
						}
						else if (b.energy) {
							bEnergy = b.energy;
						}

						return bEnergy - aEnergy; // sort descending, highest energy first
					});
					let closest = containers[0];
					new RoomVisual(creep.room.name).circle(closest.pos, {stroke:"#ff0000", fill:"transparent", radius:1});
					let amount = undefined;
					if (closest.structureType === STRUCTURE_TERMINAL && closest.owner.username === global.WHOAMI) {
						amount = closest.store[RESOURCE_ENERGY] - Memory.terminalEnergyTarget;
					}
					else if (closest.structureType === STRUCTURE_FACTORY && closest.owner.username === global.WHOAMI) {
						amount = closest.store[RESOURCE_ENERGY] - Memory.factoryEnergyTarget;
					}
					amount = Math.min(amount, creep.carryCapacity); // if amount is larger than carry capacity, then it won't withdraw and it'll get stuck
					// console.log(creep.name, "withdrawing", amount, "from", closest);
					if (creep.withdraw(closest, RESOURCE_ENERGY, amount) == ERR_NOT_IN_RANGE) {
						creep.memory.aquireTarget = closest.id;
						creep.travelTo(closest, {visualizePathStyle:{}});
					}
					else {
						if (closest) {
							creep.memory.lastWithdrawStructure = closest.id;
							passivelyWithdrawOtherResources(creep,closest);
						}
					}
				}
				else if (!passively) { // grab energy from other rooms
					// TODO: can be made waaaay more effifient.
					var storages = _.filter(Game.structures, function(struct) {
						if (struct.structureType != STRUCTURE_STORAGE) {
							return false;
						}
						if (struct.room.name == creep.memory.targetRoom) {
							return true;
						}
						var adjacentRooms = _.values(Game.map.describeExits(creep.memory.targetRoom));
						if (adjacentRooms.indexOf(creep.memory.targetRoom) == -1) {
							return false;
						}
						return struct.structureType == STRUCTURE_STORAGE && struct.store[RESOURCE_ENERGY] > 500000;
					});
					if (storages.length > 0) {
						let closest = storages[0];
						new RoomVisual(creep.room.name).circle(closest.pos, {stroke:"#ff0000", fill:"transparent", radius:1});
						if (creep.withdraw(closest, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
							creep.memory.aquireTarget = closest.id;
							creep.travelTo(closest, {visualizePathStyle:{}});
						}
						else {
							creep.memory.lastWithdrawStructure = closest.id;
						}
					}
					else {
						creep.say("help me out");
					}
				}
			}
		}
	}
}

function passivelyWithdrawOtherResources(creep, structure) {
	return;
	// passively withdraw other resources from containers
	if (structure.structureType == STRUCTURE_CONTAINER && (structure.pos.isNearTo(structure.room.controller) || structure.pos.inRangeTo(FIND_SOURCES, 2).length > 0)) {
		console.log(creep.name,"passively withdrawing other resources from",structure)
		if (_.sum(structure.store) - structure.store[RESOURCE_ENERGY] > 0) {
			for (var r = 0; r < RESOURCES_ALL.length; r++) {
				if (_.sum(creep.carry) == creep.carryCapacity) {
					break;
				}
				var resource = RESOURCES_ALL[r];
				if (resource == RESOURCE_ENERGY) {
					continue;
				}
				if (structure.store[resource] > 0) {
					creep.withdraw(structure, resource);
				}
			}
		}
	}
}

// get number of managers assigned to a room
function getManagerCount(room) {
	return _.filter(Game.creeps, creep => creep.memory.role === "manager" && creep.memory.targetRoom === room.name).length;
}

// this role is for transporting energy short distances
let roleManager = {
	findTargetRoom(creep) {
		let rooms = util.getOwnedRooms();
		for (let i = 0; i < rooms.length; i++) {
			let room = rooms[i];
			if (room.controller.level < 4) {
				continue;
			}
			if (getManagerCount(room) < 1) {
				creep.memory.targetRoom = room.name;
				return;
			}
		}
	},

	run_old(creep) {
		if (creep.fatigue > 0) {
			return;
		}

		if (creep.memory.role == "manager") {
			if (!creep.memory.targetRoom) {
				this.findTargetRoom(creep);
			}

			if (creep.room.name != creep.memory.targetRoom) { //  && creep.carry[RESOURCE_ENERGY] > 200
				creep.travelTo(new RoomPosition(25, 25, creep.memory.targetRoom), {visualizePathStyle:{}});
				return;
			}
		}

		if (creep.memory.transporting) {
			delete creep.memory.aquireTarget;
		}
		else {
			delete creep.memory.transportTarget;
		}

		if (!creep.memory.transporting && creep.store[RESOURCE_ENERGY] > creep.store.getCapacity(RESOURCE_ENERGY) * .75) {
			creep.memory.transporting = true;
			creep.say("transport");
		}
		if (creep.memory.transporting && creep.store[RESOURCE_ENERGY] <= 0) {
			creep.memory.transporting = false;
			creep.say("aquiring");
		}

		if (creep.memory.transporting) {
			if (creep.memory.transportTarget) {
				let transportTarget = Game.getObjectById(creep.memory.transportTarget);
				if (transportTarget) {
					creep.room.visual.circle(transportTarget.pos, {stroke:"#00ff00", fill:"transparent", radius: 0.8});
					if (creep.pos.isNearTo(transportTarget)) {
						// duck typing to figure out what method to use
						if (transportTarget.store) {
							// has a store
							let transferResult = creep.transfer(transportTarget, RESOURCE_ENERGY);

							if (transferResult == OK) {
								creep.memory.lastDepositStructure = transportTarget.id;
							}

							if (transferResult == ERR_FULL || _.sum(transportTarget.store) == transportTarget.store.getCapacity()) {
								delete creep.memory.transportTarget;
							}
						}
						else {
							creep.say("help");
							creep.log("ERR: I don't know how to transfer to", transportTarget);
						}
					}
					else {
						let travelResult = creep.travelTo(transportTarget, {visualizePathStyle:{}});
						if (travelResult.incomplete) {
							creep.log("Path to transportTarget is incomplete, skipping...");
							delete creep.memory.transportTarget;
						}
					}

				 	// if (_.sum(transportTarget.store) == transportTarget.store.getCapacity()) {
					if (transportTarget.store.getFreeCapacity(RESOURCE_ENERGY) == 0) {
						delete creep.memory.transportTarget;
						return;
					}

					if (transportTarget instanceof StructureTower && transportTarget.store.getFreeCapacity(RESOURCE_ENERGY) <= TOWER_ENERGY_COST * 2) {
						delete creep.memory.transportTarget;
						return;
					}
					return;
				}
				else {
					delete creep.memory.transportTarget;
				}
			}

			var structPriority = {};
			structPriority[STRUCTURE_EXTENSION] = 1;
			structPriority[STRUCTURE_SPAWN] = 1;
			structPriority[STRUCTURE_TOWER] = 2;
			structPriority[STRUCTURE_POWER_SPAWN] = 4;
			structPriority[STRUCTURE_LAB] = 5;
			structPriority[STRUCTURE_FACTORY] = 5;
			structPriority[STRUCTURE_NUKER] = 6;
			structPriority[STRUCTURE_CONTAINER] = 9;
			structPriority[STRUCTURE_STORAGE] = 9;
			structPriority[STRUCTURE_TERMINAL] = 9;

			// console.log("Can't transfer to last withdraw:",Game.getObjectById(creep.memory.lastWithdrawStructure))
			var hungryStructures = creep.room.find(FIND_STRUCTURES, {
				filter: function(struct) {
					var flags = struct.pos.lookFor(LOOK_FLAGS);
					if (flags.length > 0) {
						if (flags[0].name.includes("dismantle") || flags[0].name.includes("norepair")) {
							return false;
						}
					}
					if (struct.structureType == STRUCTURE_ROAD) {
						return false;
					}

					if (struct.id == creep.memory.lastWithdrawStructure) {
						return false;
					}

					if (struct.structureType == STRUCTURE_CONTAINER) {
						return _.sum(struct.store) < struct.storeCapacity * 0.5 &&
							struct.pos.findInRange(FIND_STRUCTURES, 3, { filter: (struct) => struct.structureType == STRUCTURE_CONTROLLER }).length > 0;
					}

					if (struct.structureType == STRUCTURE_TERMINAL) {
						if (struct.owner.username !== global.WHOAMI) {
							return false;
						}
						if (struct.room.storage && struct.room.storage.store[RESOURCE_ENERGY] > 150000) {
							if (struct.store[RESOURCE_ENERGY] < Memory.terminalEnergyTarget) {
								return true;
							}
						}
					}

					if (struct.structureType == STRUCTURE_FACTORY) {
						if (struct.room.storage && struct.room.storage.store[RESOURCE_ENERGY] > 150000) {
							if (struct.store[RESOURCE_ENERGY] < Memory.factoryEnergyTarget) {
								return true;
							}
						}
					}

					if (creep.room.controller.level >= 4) {
						if (struct.structureType == STRUCTURE_EXTENSION && struct.energy < struct.energyCapacity) {
							return true;
						}
					}

					if (struct.structureType === STRUCTURE_EXTENSION || struct.structureType === STRUCTURE_SPAWN) {
						let relayCreeps = _.filter(util.getCreeps("relay"), c => !c.spawning && c.memory.assignedPos.roomName === creep.memory.targetRoom && c.pos.isEqualTo(new RoomPosition(c.memory.assignedPos.x, c.memory.assignedPos.y, c.memory.assignedPos.roomName)));
						let isNearRelay = false;
						for (let relay of relayCreeps) {
							if (struct.pos.isNearTo(relay)) {
								isNearRelay = true;
								break;
							}
						}
						if (isNearRelay) {
							return false;
						}
					}

					if (struct.structureType == STRUCTURE_TOWER) {
						if (struct.store.getFreeCapacity(RESOURCE_ENERGY) <= TOWER_ENERGY_COST * 2) {
							return false;
						}

						if (struct.energy < struct.energyCapacity * (struct.room.memory.defcon > 0 ? 0.5 : 0.4)) {
							structPriority[STRUCTURE_TOWER] = 1;
							structPriority[STRUCTURE_SPAWN] = 2;
							structPriority[STRUCTURE_EXTENSION] = 2;
						}
					}

					return ((struct.structureType == STRUCTURE_SPAWN || struct.structureType == STRUCTURE_EXTENSION ||
							struct.structureType == STRUCTURE_LAB || struct.structureType == STRUCTURE_POWER_SPAWN ||
							struct.structureType == STRUCTURE_TOWER || struct.structureType == STRUCTURE_NUKER)
							&& struct.energy < struct.energyCapacity) ||
							(struct.structureType == STRUCTURE_STORAGE && _.sum(struct.store) < struct.store.getCapacity());
				}
			});
			// creep.say("structs="+hungryStructures.length);
			if (hungryStructures.length > 0) {
				hungryStructures.sort(function(a, b){
					if (a.structureType != b.structureType && structPriority[a.structureType] - structPriority[b.structureType] != 0) {
						return structPriority[a.structureType] - structPriority[b.structureType];
					}
					else {
						return creep.pos.getRangeTo(a) - creep.pos.getRangeTo(b);
					}
				});
				let closest = hungryStructures[0];
				creep.memory.transportTarget = closest.id;
				if (closest) {
					creep.room.visual.circle(closest.pos, {stroke:"#00ff00", fill:"transparent", radius:1})
					if (creep.transfer(closest, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
						creep.travelTo(closest, {visualizePathStyle:{}});
					}
					else {
						creep.memory.lastDepositStructure = closest.id;
						passivelyWithdrawOtherResources(creep,closest);
					}
				}
				else {
					console.log("ERROR:", creep.name, "can't find closest hungryStructure");
				}
			}
			else {
				var hungryCreeps = creep.pos.findInRange(FIND_MY_CREEPS, 4, {
					filter: function(c) {
						if (c.memory.role == "builder" || c.memory.role == "upgrader" || c.memory.role == "nextroomer") {
							if (c.memory.role == "builder" && c.memory.mineralTarget) {
								return false;
							}
							//console.log(c.carry[RESOURCE_ENERGY],c.carryCapacity);
							return !c.spawning && c.store[RESOURCE_ENERGY] < c.store.getCapacity() * 0.5 && !c.memory.renewing && c.memory.keepAlive;
						}
						return false;
					}
				});
				//console.log(hungryCreeps.length);
				if (hungryCreeps.length > 0) {
					let closest = creep.pos.findClosestByPath(hungryCreeps);
					if (closest) {
						creep.memory.transportTarget = closest.id;
						creep.room.visual.circle(closest.pos, {stroke:"#00ff00", fill:"transparent", radius:1});
						if (creep.transfer(closest, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
							creep.travelTo(closest, {visualizePathStyle:{}});
						}
					}
				}
				else {
					if (Game.time % 5 == 0) {
						delete creep.memory.lastDepositStructure;
						delete creep.memory.lastWithdrawStructure;
					}
					if (creep.memory.lastDepositStructure == creep.memory.lastWithdrawStructure) {
						delete creep.memory.lastDepositStructure;
					}
					if (creep.room.energyAvailable < creep.room.energyCapacityAvailable * 0.1) {
						delete creep.memory.lastWithdrawStructure;
					}
					creep.travelTo(creep.room.storage, {visualizePathStyle:{}});
				}
			}

			// passively aquire if not full
			if (_.sum(creep.store) < creep.store.getCapacity()) {
				// doAquire(creep, true);
			}
		}
		// aquire resources
		else {
			doAquire(creep, false);
		}
	},

	getTransferTarget(creep) {
		let transportTarget;
		if (creep.memory.transportTarget) {
			transportTarget = Game.getObjectById(creep.memory.transportTarget);
			if (transportTarget && transportTarget.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
				return transportTarget;
			}
			else {
				creep.log("Discarding current transport target");
				delete creep.memory.transportTarget;
				transportTarget = null;
			}
		}

		let sinks = brainLogistics.findSinks({
			resource: RESOURCE_ENERGY,
			roomName: creep.memory.targetRoom,
			filter: s => s.objectId !== creep.memory.lastWithdrawStructure && (!brainAutoPlanner.isInRootModule(Game.getObjectById(creep.memory.lastWithdrawStructure)) || s.object.structureType !== STRUCTURE_STORAGE) &&
			s.objectId !== "5f6fdb1cb5f7d2486aa88e21", // HACK
		});
		creep.log(`Found ${sinks.length} sinks`);

		if (sinks.length === 0) {
			return null;
		}

		sinks = _.sortByOrder(sinks, [
			s => {
				switch (s.object.structureType) {
					case STRUCTURE_EXTENSION:
					case STRUCTURE_SPAWN:
						return 1;
					case STRUCTURE_TOWER:
						return 2;
					case STRUCTURE_POWER_SPAWN:
						return 4;
					case STRUCTURE_LAB:
					case STRUCTURE_FACTORY:
						return 5;
					case STRUCTURE_NUKER:
						return 6;
					case STRUCTURE_CONTAINER:
					case STRUCTURE_STORAGE:
					case STRUCTURE_TERMINAL:
						return 9;
					default:
						return 8;
				}
			},
			s => creep.pos.getRangeTo(s.object),
		],
		["asc", "asc"]);

		transportTarget = _.first(sinks).object;
		if (transportTarget) {
			creep.memory.transportTarget = transportTarget.id;
			return transportTarget;
		}
		else {
			return null;
		}
	},

	getAquireTarget(creep) {
		let aquireTarget;
		if (creep.memory.aquireTarget) {
			aquireTarget = Game.getObjectById(creep.memory.aquireTarget);
			if (aquireTarget && (!aquireTarget.store || aquireTarget.store.getUsedCapacity(RESOURCE_ENERGY) > 0)) {
				return aquireTarget;
			}
			else {
				delete creep.memory.aquireTarget;
				aquireTarget = null;
			}
		}

		let sources = brainLogistics.findSources({
			resource: RESOURCE_ENERGY,
			roomName: creep.memory.targetRoom,
			filter: s => s.objectId !== creep.memory.lastDepositStructure,
		});
		creep.log(`Found ${sources.length} sources`);

		if (sources.length === 0) {
			if (Game.rooms[creep.memory.targetRoom] && !Game.rooms[creep.memory.targetRoom].storage) {
				creep.log(`Falling back because we have no storage`)
				sources = brainLogistics.findSources({
					resource: RESOURCE_ENERGY,
					filter: s => s.objectId !== creep.memory.lastDepositStructure,
				});
				creep.log(`Found ${sources.length} sources`);
				if (sources.length === 0) {
					delete creep.memory.lastDepositStructure;
					return null;
				}
			}
			else {
				delete creep.memory.lastDepositStructure;
				return null;
			}
		}

		if (creep.room.energyAvailable <= creep.room.energyCapacityAvailable * 0.50) {
			sources = _.sortByOrder(sources, [
				s => creep.pos.getRangeTo(s.object),
			],
			["asc"]);
		}
		else {
			sources = _.sortByOrder(sources, [
				s => s.object instanceof Resource,
				s => s.object instanceof Tombstone || s.object instanceof Ruin,
				s => creep.pos.getRangeTo(s.object),
			],
			["desc", "desc", "asc"]);
		}


		aquireTarget = _.first(sources).object;
		if (aquireTarget) {
			creep.memory.aquireTarget = aquireTarget.id;
			return aquireTarget;
		}
		else {
			return null;
		}
	},

	run(creep) {
		if (creep.fatigue > 0) {
			return;
		}

		if (creep.memory.role === "manager") {
			if (!creep.memory.targetRoom) {
				this.findTargetRoom(creep);
			}

			// if (creep.room.name !== creep.memory.targetRoom) {
			// 	creep.travelTo(new RoomPosition(25, 25, creep.memory.targetRoom), { visualizePathStyle:{}, range: 8, });
			// 	return;
			// }
		}

		if (!creep.memory.transporting && creep.store[RESOURCE_ENERGY] > creep.store.getCapacity(RESOURCE_ENERGY) * .75) {
			creep.memory.transporting = true;
			creep.memory.lastWithdrawStructure = creep.memory.aquireTarget;
			creep.say("transport");
		}
		if (creep.memory.transporting && creep.store[RESOURCE_ENERGY] <= 0) {
			creep.memory.transporting = false;
			creep.memory.lastDepositStructure = creep.memory.transportTarget;
			creep.say("aquiring");
		}

		if (creep.memory.lastDepositStructure == creep.memory.lastWithdrawStructure) {
			delete creep.memory.lastDepositStructure;
		}

		let obstacles = util.getCreeps("harvester", "relay");

		if (creep.memory.transporting) {
			delete creep.memory.aquireTarget;

			let transportTarget = this.getTransferTarget(creep);
			if (!transportTarget) {
				if (Game.time % 5 === 0) {
					delete creep.memory.lastWithdrawStructure;
				}
				creep.log("can't get a transport target");
				return;
			}
			creep.room.visual.circle(transportTarget.pos, {stroke:"#00ff00", fill:"transparent", radius: 0.8});
			creep.log(`Transporting to ${transportTarget}`);
			if (creep.pos.isNearTo(transportTarget)) {
				if (transportTarget.structureType === STRUCTURE_TERMINAL) {
					amount = Math.min(Memory.terminalEnergyTarget - transportTarget.store.getUsedCapacity(RESOURCE_ENERGY), transportTarget.store.getFreeCapacity(RESOURCE_ENERGY), creep.store.getUsedCapacity(RESOURCE_ENERGY));
					creep.transfer(transportTarget, RESOURCE_ENERGY, amount);
				}
				else if (transportTarget.structureType === STRUCTURE_FACTORY) {
					amount = Math.min(Memory.factoryEnergyTarget - transportTarget.store.getUsedCapacity(RESOURCE_ENERGY), transportTarget.store.getFreeCapacity(RESOURCE_ENERGY), creep.store.getUsedCapacity(RESOURCE_ENERGY));
					creep.transfer(transportTarget, RESOURCE_ENERGY, amount);
				}
				else {
					creep.transfer(transportTarget, RESOURCE_ENERGY);
				}
			}
			else {
				opts = { obstacles }
				if (creep.room.name === transportTarget.room.name) {
					opts.maxRooms = 1;
				}
				creep.travelTo(transportTarget, opts)
			}
		}
		else {
			delete creep.memory.transportTarget;

			let aquireTarget = this.getAquireTarget(creep);
			if (!aquireTarget) {
				if (Game.time % 5 === 0) {
					delete creep.memory.lastDepositStructure;
				}
				creep.log("can't get a aquire target");
				return;
			}
			creep.room.visual.circle(aquireTarget.pos, {stroke:"#ff0000", fill:"transparent", radius: 0.8});
			creep.log(`Aquiring from ${aquireTarget}`);
			if (creep.pos.isNearTo(aquireTarget)) {
				if (aquireTarget instanceof Resource) {
					creep.pickup(aquireTarget);
				}
				else {
					creep.withdraw(aquireTarget, RESOURCE_ENERGY);
				}
			}
			else {
				opts = { obstacles }
				if (creep.room.name === aquireTarget.room.name) {
					opts.maxRooms = 1;
				}
				creep.travelTo(aquireTarget, opts)
			}
		}
	},
}

module.exports = roleManager;
