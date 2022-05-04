import "../traveler.js";
import util from "../util";
import brainLogistics from "../brain.logistics.js";
import brainAutoPlanner from "../brain.autoplanner.js";

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
			filter: s => {
				if (s.objectId === "5f6fdb1cb5f7d2486aa88e21") {
					return false; // HACK
				}

				if (s.objectId === creep.memory.lastWithdrawStructure) {
					return false;
				}
				if (creep.memory.excludeTransport.includes(s.objectId)) {
					return false;
				}
				if (brainAutoPlanner.isInRootModule(Game.getObjectById(creep.memory.lastWithdrawStructure)) && s.object.structureType === STRUCTURE_STORAGE) {
					return false;
				}

				return true;
			},
		});
		creep.log(`Found ${sinks.length} sinks`);

		if (sinks.length === 0) {
			return null;
		}

		sinks = _.sortByOrder(sinks, [
			s => {
				switch (s.object.structureType) {
					case STRUCTURE_TOWER:
						return 1;
					case STRUCTURE_EXTENSION:
					case STRUCTURE_SPAWN:
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
		delete creep.memory.excludeTransport;

		let aquireTarget;
		if (creep.memory.aquireTarget) {
			aquireTarget = Game.getObjectById(creep.memory.aquireTarget);
			if (aquireTarget && (aquireTarget instanceof Tombstone && aquireTarget.store.getUsedCapacity() > 0)) {
				return aquireTarget;
			}
			else if (aquireTarget && (!aquireTarget.store || aquireTarget.store.getUsedCapacity(RESOURCE_ENERGY) > 0)) {
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
				s => s.object instanceof Resource && s.amount > 600,
				s => creep.pos.getRangeTo(s.object),
			],
			["desc", "desc", "desc", "asc"]);
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
		if (!creep.memory.excludeTransport) {
			creep.memory.excludeTransport = []
		}

		if (creep.fatigue > 0) {
			return;
		}

		if (creep.memory.role === "manager") {
			if (!creep.memory.targetRoom) {
				this.findTargetRoom(creep);
			}
		}

		if (!creep.memory.transporting && (creep.store[RESOURCE_ENERGY] > creep.store.getCapacity(RESOURCE_ENERGY) * .75 || creep.store.getFreeCapacity() === 0)) {
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

		if (creep.memory.transporting) {
			delete creep.memory.aquireTarget;

			if (creep.memory._lastTransferTargetFail !== undefined && Game.time - creep.memory._lastTransferTargetFail < 10) {
				creep.log("Waiting before trying to find a new target to save CPU, because we failed last time.");
				return;
			}

			let transportTarget = this.getTransferTarget(creep);
			if (!transportTarget) {
				if (Game.time % 5 === 0) {
					delete creep.memory.lastWithdrawStructure;
				}
				creep.log("can't get a transport target");
				creep.memory._lastTransferTargetFail = Game.time;
				return;
			}
			delete creep.memory._lastTransferTargetFail;
			creep.room.visual.circle(transportTarget.pos, {stroke:"#00ff00", fill:"transparent", radius: 0.8});
			creep.log(`Transporting to ${transportTarget}`);
			if (creep.pos.isNearTo(transportTarget)) {
				if (transportTarget.structureType === STRUCTURE_STORAGE) {
					if (creep.store.getUsedCapacity() - creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
						for (let resource of RESOURCES_ALL) {
							if (resource == RESOURCE_ENERGY) {
								continue;
							}
							if (creep.store[resource] > 0) {
								creep.transfer(transportTarget, resource);
							}
						}
					}
					else {
						creep.transfer(transportTarget, RESOURCE_ENERGY);
					}
				}
				else if (transportTarget.structureType === STRUCTURE_TERMINAL) {
					const amount = Math.min(Memory.terminalEnergyTarget - transportTarget.store.getUsedCapacity(RESOURCE_ENERGY), transportTarget.store.getFreeCapacity(RESOURCE_ENERGY), creep.store.getUsedCapacity(RESOURCE_ENERGY));
					creep.transfer(transportTarget, RESOURCE_ENERGY, amount);
				}
				else if (transportTarget.structureType === STRUCTURE_FACTORY) {
					const amount = Math.min(Memory.factoryEnergyTarget - transportTarget.store.getUsedCapacity(RESOURCE_ENERGY), transportTarget.store.getFreeCapacity(RESOURCE_ENERGY), creep.store.getUsedCapacity(RESOURCE_ENERGY));
					creep.transfer(transportTarget, RESOURCE_ENERGY, amount);
				}
				else {
					creep.transfer(transportTarget, RESOURCE_ENERGY);
				}
			}
			else {
				let opts = {}
				if (creep.room.name === transportTarget.room.name) {
					opts.maxRooms = 1;
				}
				let result = creep.moveTo(transportTarget, { priority: 10, ...opts })
				if (result.incomplete) {
					creep.log("Incomplete path to transport target, clearing")
					creep.memory.excludeTransport.push(creep.memory.transportTarget);
					delete creep.memory.transportTarget;
				}
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
				else if (aquireTarget instanceof Tombstone) {
					if (aquireTarget.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
						creep.withdraw(aquireTarget, RESOURCE_ENERGY);
					}
					else if (aquireTarget.store.getUsedCapacity() > 0) {
						for (let resource of RESOURCES_ALL) {
							if (resource == RESOURCE_ENERGY) {
								continue;
							}
							if (aquireTarget.store[resource] > 0) {
								creep.withdraw(aquireTarget, resource);
							}
						}
					}
				}
				else {
					creep.withdraw(aquireTarget, RESOURCE_ENERGY);
				}
			}
			else {
				let opts = {};
				if (creep.room.name === aquireTarget.room.name) {
					opts.maxRooms = 1;
				}
				creep.moveTo(aquireTarget, { priority: 10, ...opts })
			}
		}
	},
}

module.exports = roleManager;
export default roleManager;
