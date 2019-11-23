let traveler = require('traveler');
let util = require('util');

// Game.spawns["Spawn5"].createCreep([WORK,WORK,WORK,WORK,MOVE,MOVE,MOVE,MOVE], "remoteharvester_1", {role:"remoteharvester", keepAlive:true, stage: 0 }); Game.spawns["Spawn1"].createCreep([CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE], "carrier_1", {role:"carrier", keepAlive:true, stage: 0 })

let roleCarrier = {
	findDespositTarget(creep) {
		if (creep.memory.mode === "remote-mining" && !creep.memory.harvestTarget) {
			creep.log("Can't find despositTarget without harvestTarget");
			return;
		}

		let pos = creep.pos;
		if (creep.memory.mode === "remote-mining") {
			pos = new RoomPosition(creep.memory.harvestTarget.x, creep.memory.harvestTarget.y, creep.memory.harvestTarget.roomName);
		}
		else if (creep.memory.mode === "invader-core-harvesting") {
			pos = new RoomPosition(25, 25, creep.memory.targetRoom);
		}

		let rooms = _.filter(util.findClosestOwnedRooms(pos), r => r.storage);
		if (rooms.length === 0) {
			creep.log("ERR: All rooms don't have storage");
			return;
		}

		return rooms[0].storage.id;
	},

	passiveMaintainRoads(creep) {
		if (creep.store[RESOURCE_ENERGY] === 0) {
			return;
		}

		let lookResult = creep.pos.look();
		for (let result of lookResult) {
			if (result.type === LOOK_CONSTRUCTION_SITES) {
				creep.build(result.constructionSite);
				return;
			}
			else if (result.type === LOOK_STRUCTURES) {
				if (result.structure.hits < result.structure.hitsMax) {
					creep.repair(result.structure);
				}
				if (result.structure.structureType === STRUCTURE_ROAD && result.structure.hits < result.structure.hitsMax * 0.5) {
					creep.cancelOrder("move");
				}
				return;
			}
		}
	},

	modes: {
		"remote-mining"(roleCarrier, creep) {
			if (!creep.memory.depositTarget) {
				creep.memory.depositTarget = roleCarrier.findDespositTarget(creep);
			}

			if (!creep.memory.harvestTarget) {
				console.log(creep.name, "ERR: no harvest target, this needs to be assigned by a job (similar to how relays are assigned)");
				return;
			}
			if (!creep.memory.depositTarget) {
				console.log(creep.name, "ERR: need deposit target");
				return;
			}

			if (!creep.memory.delivering && creep.room.name !== creep.memory.harvestTarget.roomName) {
				creep.travelTo(new RoomPosition(creep.memory.harvestTarget.x, creep.memory.harvestTarget.y, creep.memory.harvestTarget.roomName));
				return;
			}
			let harvestPos = new RoomPosition(creep.memory.harvestTarget.harvestPos.x, creep.memory.harvestTarget.harvestPos.y, creep.memory.harvestTarget.roomName);

			if (!creep.memory.droppedEnergyId) {
				try {
					let lookResult = harvestPos.lookFor(LOOK_RESOURCES);
					if (lookResult.length > 0) {
						creep.memory.droppedEnergyId = lookResult[0].id;
					}
				}
				catch {
					creep.log("ERR: don't have vision for room at", harvestPos);
				}
			}

			let harvestTarget = Game.getObjectById(creep.memory.harvestTarget.id);
			if (!harvestTarget) {
				console.log(creep.name, "CRITICAL: Unable to access harvest target");
				return;
			}

			if (creep.memory.delivering && _.sum(creep.store) == 0) {
				creep.memory.delivering = false;
			}
			else if (!creep.memory.delivering && _.sum(creep.store) == creep.carryCapacity) {
				creep.memory.delivering = true;
			}

			if (creep.memory.delivering) {
				let depositTarget = Game.getObjectById(creep.memory.depositTarget);
				if (creep.pos.isNearTo(depositTarget)) {
					creep.transfer(depositTarget, RESOURCE_ENERGY);
				}
				else {
					creep.travelTo(depositTarget);
				}
			}
			else {
				if (creep.pos.isEqualTo(harvestPos)) {
					creep.move([TOP_RIGHT, BOTTOM_LEFT, BOTTOM_RIGHT, TOP][Math.floor(Math.random() * 4)]);
					return;
				}
				if (util.isTreasureRoom(harvestTarget.room.name)) {
					let hostiles = harvestTarget.pos.findInRange(FIND_HOSTILE_CREEPS, 7);
					if (hostiles.length > 0) {
						creep.travelTo(Game.getObjectById(creep.memory.depositTarget));
						return;
					}
				}
				let dropped = Game.getObjectById(creep.memory.droppedEnergyId);
				if (!dropped) {
					delete creep.memory.droppedEnergyId;
				}
				if (!creep.pos.isNearTo(harvestPos)) {
					creep.travelTo(harvestPos);
				}
				else if (dropped) {
					creep.pickup(dropped);
				}
			}

			roleCarrier.passiveMaintainRoads(creep);
		},
		"invader-core-harvesting"(roleCarrier, creep) {
			if (!creep.memory.targetRoom) {
				creep.log("needs targetRoom to be set externally");
				return;
			}

			if (!creep.memory.depositTarget) {
				creep.memory.depositTarget = roleCarrier.findDespositTarget(creep);
			}

			if (creep.memory.delivering && _.sum(creep.store) === 0) {
				creep.memory.delivering = false;
			}
			else if (!creep.memory.delivering && _.sum(creep.store) >= creep.store.getCapacity()) {
				creep.memory.delivering = true;
			}

			if (creep.memory.delivering) {
				// take resources back to deposit target
				let depositTarget = Game.getObjectById(creep.memory.depositTarget);
				if (creep.pos.isNearTo(depositTarget)) {
					for (let resource of RESOURCES_ALL) {
						if (creep.store[resource] > 0) {
							creep.transfer(depositTarget, resource);
						}
					}
				}
				else {
					creep.travelTo(depositTarget);
				}
			}
			else {
				if (creep.room.name !== creep.memory.targetRoom) {
					creep.travelTo(new RoomPosition(25, 25, creep.memory.targetRoom));
					return;
				}

				let containers = creep.room.find(FIND_RUINS).concat(util.getStructures(creep.room, STRUCTURE_CONTAINER));
				containers = _.filter(containers, s => _.sum(s.store) > 0);
				if (containers.length > 0) {
					let target = containers[0];
					creep.log("target: ", target);
					if (creep.pos.isNearTo(target)) {
						for (const resource of RESOURCES_ALL) {
							if (target.store[resource] == 0) {
								continue;
							}
							let withdrawResult = creep.withdraw(target, resource);
							if (withdrawResult !== OK) {
								creep.log("ERR: can't withdraw from target", target, "error", withdrawResult);
								break;
							}
						}
					}
					else {
						creep.travelTo(target);
					}
				}
				else {
					creep.say("help");
					creep.log("no containers found");
				}
			}
		},
	},

	/** @param {Creep} creep **/
	run: function(creep) {
		if (!creep.memory.mode) {
			creep.memory.mode = "remote-mining";
		}

		// run different code for different modes
		this.modes[creep.memory.mode](this, creep);
	}
}

module.exports = roleCarrier;
