let traveler = require('traveler');
let toolEnergySource = require('tool.energysource');
let util = require("util");

let roleHarvester = {
	/** @param {Creep} creep **/
	findTransferTargets: function(creep) {
		let harvestTarget = Game.getObjectById(creep.memory.harvestTarget);
		if (harvestTarget) {
			let dedicatedLink = Game.getObjectById(creep.memory.dedicatedLinkId);
			if (!dedicatedLink && creep.room.controller.level >= 5) {
				if (!creep.memory.last_check_for_dedicated_link || creep.memory.last_check_for_dedicated_link && Game.time - creep.memory.last_check_for_dedicated_link > 100) {
					dedicatedLink = harvestTarget.pos.findInRange(FIND_STRUCTURES, 3, {
						filter: (struct) => { return struct.structureType == STRUCTURE_LINK; }
					})[0];
					if (dedicatedLink) {
						creep.memory.dedicatedLinkId = dedicatedLink.id;
					}
					else {
						creep.memory.last_check_for_dedicated_link = Game.time;
					}
				}

			}
		}

		var targets = creep.room.find(FIND_STRUCTURES, {
			filter: (struct) => {
				var flags = struct.pos.lookFor(LOOK_FLAGS);
				if (flags.length > 0) {
					if (flags[0].name.includes("dismantle") || flags[0].name.includes("norepair")) {
						return false;
					}
				}
				if (creep.memory.dedicatedLinkId && !creep.pos.inRangeTo(struct, 3)) {
					return false;
				}
				if (struct.structureType == STRUCTURE_LINK) {
					if (struct.room.storage && struct.pos.inRangeTo(struct.room.storage, 2)) {
						return false;
					}
					if (creep.pos.inRangeTo(struct, 4)) {
						return struct.energy < struct.energyCapacity;
					}
				}
				else if (!(creep.getActiveBodyparts(MOVE) == 1 && creep.getActiveBodyparts(WORK) >= 5)) { // check if creep is "optimized"
					if (struct.structureType == STRUCTURE_EXTENSION) {
						if (!creep.pos.inRangeTo(struct, 8)) {
							return false;
						}
					}
					else if (struct.structureType == STRUCTURE_SPAWN) {
						if (CONTROLLER_STRUCTURES[STRUCTURE_SPAWN][creep.room.level] > 1 && creep.pos.inRangeTo(struct, 3)) {
							return true;
						}
					}
				}
				var a = (struct.structureType == STRUCTURE_EXTENSION ||
						(struct.structureType == STRUCTURE_SPAWN && (creep.room.controller.level == 1 || creep.room.energyAvailable > 295)) ||
						struct.structureType == STRUCTURE_TOWER) && struct.energy < struct.energyCapacity;
				var b = (struct.structureType == STRUCTURE_CONTAINER ||
						struct.structureType == STRUCTURE_STORAGE) &&
						//_.sum(struct.store) == struct.store[RESOURCE_ENERGY] &&
						_.sum(struct.store) < struct.storeCapacity;
				return a || b;
			}
		});
		if (targets.length > 0) {
// 			var harvestTarget = Game.getObjectById(creep.memory.harvestTarget);
			if (!creep.memory.haveManagerForRoom || Game.time % 10 == 0) {
				creep.memory.haveManagerForRoom = _.filter(Game.creeps, function(c) {
					if (!Game.creeps[c.name]) { // checks if the creep is alive? maybe?
						return false;
					}
					return (c.memory.role == "manager") && (c.memory.targetRoom == creep.room.name);
				}).length > 0;
			}
			// console.log(creep.name, "has manager in room", creep.room.name, "=", haveManagerForRoom);
			// HACK: these aren't using the STRUCTURE_* constants
			var structPriority = {
				"extension":1,
				"tower":2,
				"link":3,
				"spawn":4,
				"container":5,
				"storage":6,
			};
			if (creep.memory.haveManagerForRoom) {
				structPriority[STRUCTURE_LINK] = 1;
				structPriority[STRUCTURE_CONTAINER] = 2;
				structPriority[STRUCTURE_SPAWN] = 3;
				structPriority[STRUCTURE_STORAGE] = 3;
				structPriority[STRUCTURE_EXTENSION] = 3;
				structPriority[STRUCTURE_TOWER] = 3;
			}
			if (creep.memory.dedicatedLinkId) {
				targets = targets.filter((struct) => { return harvestTarget.pos.inRangeTo(struct, 3); });
			}
			if (creep.memory.haveManagerForRoom && creep.memory.dedicatedLinkId) {
				structPriority[STRUCTURE_LINK] = 1;
				structPriority[STRUCTURE_SPAWN] = 2;
				structPriority[STRUCTURE_EXTENSION] = 3;
				structPriority[STRUCTURE_TOWER] = 3;
				structPriority[STRUCTURE_CONTAINER] = 5;
				structPriority[STRUCTURE_STORAGE] = 6;
			}
			targets.sort(function(a, b){
				if (a.structureType != b.structureType) {
					return structPriority[a.structureType] - structPriority[b.structureType];
				}
				else {
					return creep.pos.getRangeTo(a) - creep.pos.getRangeTo(b);
				}
			});
		}
		return targets;
	},

	findHarvestTarget(creep) {
		let sources = [];
		let rooms = util.getOwnedRooms();
		for (let room of rooms) {
			let roomSources = room.find(FIND_SOURCES, { filter: source => toolEnergySource.canAssignSource(source) });
			// console.log(roomSources.length)
			if (roomSources && roomSources != undefined && roomSources.length > 0) {
				sources = sources.concat(roomSources);
			}
		}
		// console.log(sources)

		if (sources.length > 0) {
			// var closest = creep.pos.findClosestByPath(sources);
			var closest = sources[0];
			if (closest) {
				// console.log(closest)
				return closest.id;
			}
			else {
				console.log(creep.name, "no closest harvestTarget (wtf?)");
			}
		}
		else {
			console.log(creep.name, "no harvestTarget");
		}
	},

	/** gets this creep's energy deposit mode depending on the current situation **/
	/** @param {Creep} creep **/
	getDepositMode: function(creep) {
		/*
		* These are the different modes:
		* wait - edge case
		* link - sit where link and source are reachable without moving, transfer all energy to link (indicated with `transferTarget`).
		* drop - stand on container (if applicable), drop all harvested energy on the ground
		* recovery - when full of energy, deposit it into spawns/extensions, then towers, then upgrade controller
		* direct - put the energy straight into adjacent storage
		*
		* `transferTarget` should indicate the current target structure and should NOT be used to determine mode.
		*/

		if (creep.memory.force_mode) {
			return creep.memory.force_mode
		}

		if (!creep.memory.harvestTarget) {
			creep.log("Can't determine harvest mode without harvestTarget");
			return "wait";
		}

		let harvestTarget = Game.getObjectById(creep.memory.harvestTarget);
		if (harvestTarget.pos.getRangeTo(harvestTarget.room.storage) <= 2) {
			return "direct";
		}

		let dedicatedLink = Game.getObjectById(creep.memory.dedicatedLinkId);
		if (dedicatedLink) {
			return "link";
		}

		if (Object.keys(Game.creeps).length <= 3 || harvestTarget.room.controller.level < 4 || util.getCreeps("manager").length === 0) {
			return "recovery";
		}

		return "drop";
	},

	/** Meant to replace findTransferTargets **/
	getTransferTarget: function(creep) {
		// check adjacent positions for empty extensions
		if (!creep.memory.refresh_fill_targets) {
			creep.memory.refresh_fill_targets = Game.time - 50;
		}

		if (!creep.memory.fillTargetIds || Game.time - creep.memory.refresh_fill_targets > 50) {
			let harvestPos = new RoomPosition(creep.memory.harvestPos.x, creep.memory.harvestPos.y, creep.memory.harvestPos.roomName);
			let adjacentStructs = _.filter(creep.room.lookForAtArea(LOOK_STRUCTURES, harvestPos.y - 1, harvestPos.x - 1, harvestPos.y + 1, harvestPos.x + 1, asArray=true), (result) => result.structure.structureType === STRUCTURE_EXTENSION);
			let targets = [];
			for (let i = 0; i < adjacentStructs.length; i++) {
				const struct = adjacentStructs[i].structure;
				targets.push(struct.id);
			}
			creep.memory.fillTargetIds = targets;
			creep.memory.refresh_fill_targets = Game.time;
		}
		let targetIdsNotFull = _.filter(creep.memory.fillTargetIds, (id) => {
			let struct = Game.getObjectById(id);
			return struct.energy < struct.energyCapacity;
		});
		if (targetIdsNotFull.length > 0) {
			return Game.getObjectById(targetIdsNotFull[0]);
		}

		if (creep.memory.depositMode === "direct") {
			return creep.room.storage;
		}

		if (creep.memory.depositMode === "link") {
			return Game.getObjectById(creep.memory.dedicatedLinkId);
		}

		if (creep.memory.depositMode === "recovery") {
			var targets = creep.room.find(FIND_STRUCTURES, {
				filter: (struct) => {
					var flags = struct.pos.lookFor(LOOK_FLAGS);
					if (flags.length > 0) {
						if (flags[0].name.includes("dismantle") || flags[0].name.includes("norepair")) {
							return false;
						}
					}
					if (struct.structureType == STRUCTURE_LINK) {
						if (struct.room.storage && struct.pos.inRangeTo(struct.room.storage, 2)) {
							return false;
						}
						if (creep.pos.inRangeTo(struct, 4)) {
							return struct.energy < struct.energyCapacity;
						}
					}
					else if (!(creep.getActiveBodyparts(MOVE) == 1 && creep.getActiveBodyparts(WORK) >= 5)) { // check if creep is "optimized"
						if (struct.structureType == STRUCTURE_EXTENSION) {
							if (!creep.pos.inRangeTo(struct, 8)) {
								return false;
							}
						}
						else if (struct.structureType == STRUCTURE_SPAWN) {
							if (CONTROLLER_STRUCTURES[STRUCTURE_SPAWN][creep.room.level] > 1 && creep.pos.inRangeTo(struct, 3)) {
								return true;
							}
						}
					}
					var a = (struct.structureType == STRUCTURE_EXTENSION ||
							(struct.structureType == STRUCTURE_SPAWN && (creep.room.controller.level == 1 || struct.store.getFreeCapacity(RESOURCE_ENERGY) > 5)) ||
							struct.structureType == STRUCTURE_TOWER) && struct.energy < struct.energyCapacity;
					var b = (struct.structureType == STRUCTURE_CONTAINER ||
							struct.structureType == STRUCTURE_STORAGE) &&
							//_.sum(struct.store) == struct.store[RESOURCE_ENERGY] &&
							_.sum(struct.store) < struct.storeCapacity;
					return a || b;
				}
			});
			if (targets.length > 0) {
	// 			var harvestTarget = Game.getObjectById(creep.memory.harvestTarget);
				if (!creep.memory.haveManagerForRoom || Game.time % 10 == 0) {
					creep.memory.haveManagerForRoom = _.filter(Game.creeps, function(c) {
						if (!Game.creeps[c.name]) { // checks if the creep is alive? maybe?
							return false;
						}
						return (c.memory.role == "manager") && (c.memory.targetRoom == creep.room.name);
					}).length > 0;
				}
				// console.log(creep.name, "has manager in room", creep.room.name, "=", haveManagerForRoom);
				// HACK: these aren't using the STRUCTURE_* constants
				var structPriority = {
					"extension":1,
					"spawn":1,
					"tower":2,
					"link":4,
					"container":5,
					"storage":6,
				};
				if (creep.memory.haveManagerForRoom) {
					structPriority[STRUCTURE_LINK] = 1;
					structPriority[STRUCTURE_CONTAINER] = 2;
					structPriority[STRUCTURE_SPAWN] = 3;
					structPriority[STRUCTURE_STORAGE] = 3;
					structPriority[STRUCTURE_EXTENSION] = 3;
					structPriority[STRUCTURE_TOWER] = 3;
				}
				targets.sort(function(a, b){
					if (a.structureType !== b.structureType) {
						return structPriority[a.structureType] - structPriority[b.structureType];
					}
					else {
						return creep.pos.getRangeTo(a) - creep.pos.getRangeTo(b);
					}
				});
				return targets[0];
			}
			return;
		}
	},

	passiveMaintainContainer(creep) {
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
				return;
			}
		}
	},

	/** @param {Creep} creep **/
	run: function(creep) {
		// console.log(creep.name, "pos:", creep.memory.harvestPos, "mode:", creep.memory.depositMode, "harvestTarget:", creep.memory.harvestTarget, "transferTarget:", creep.memory.transferTarget, "link:", creep.memory.dedicatedLinkId);

		if (!creep.memory.harvestTarget) {
			creep.memory.harvestTarget = this.findHarvestTarget(creep);
		}

		let harvestTarget = Game.getObjectById(creep.memory.harvestTarget);

		// TODO: harvestPos should probably be set when we plan buldings
		if (!creep.memory.harvestPos) {
			let brainAutoPlanner = require("brain.autoplanner");
			let adj = util.getAdjacent(harvestTarget.pos).filter(pos => {
				let lookResult = pos.look();
				for (let l = 0; l < lookResult.length; l++) {
					let look = lookResult[l];
					if (look.type !== LOOK_STRUCTURES && look.type !== LOOK_TERRAIN) {
						continue;
					}

					if (look.type === LOOK_TERRAIN && look.terrain === 'wall') {
						return false;
					}
					else if (look.type === LOOK_STRUCTURES) {
						if (look.structure.structureType !== STRUCTURE_ROAD && look.structure.structureType !== STRUCTURE_CONTAINER) {
							return false;
						}
					}
				}
				planned = brainAutoPlanner.getPlansAtPosition(pos);
				return !planned || [STRUCTURE_ROAD, STRUCTURE_CONTAINER].includes(planned);
			});
			adj = _.sortByOrder(adj, [
				pos => !util.isDistFromEdge(pos, 2),
				pos => brainAutoPlanner.getPlansAtPosition(pos) === STRUCTURE_CONTAINER,
			],
			["desc", "desc"]);
			creep.memory.harvestPos = adj[0];
		}

		let harvestPos = new RoomPosition(creep.memory.harvestPos.x, creep.memory.harvestPos.y, creep.memory.harvestPos.roomName);

		if (harvestPos.roomName !== creep.memory.targetRoom) {
			creep.memory.targetRoom = harvestPos.roomName;
		}

		if (!creep.memory.depositMode || (creep.memory.depositMode == "wait" && Game.time % 2 == 0)) {
			creep.memory.depositMode = this.getDepositMode(creep);
			if (creep.memory.depositMode == "wait") {
				creep.say("waiting"); // makes debugging quicker
				return;
			}
		}

		if (creep.room.name === creep.memory.targetRoom && CONTROLLER_STRUCTURES[STRUCTURE_LINK][creep.room.controller.level] > 0) {
			if (!creep.memory.last_check_for_dedicated_link || creep.memory.last_check_for_dedicated_link && Game.time - creep.memory.last_check_for_dedicated_link > 100) {
				let nearbyLinks = harvestTarget.pos.findInRange(FIND_STRUCTURES, 3, {
					filter: (struct) => { return struct.structureType == STRUCTURE_LINK; }
				});
				if (nearbyLinks.length > 0) {
					creep.memory.dedicatedLinkId = nearbyLinks[0].id;
				}
				else {
					creep.memory.last_check_for_dedicated_link = Game.time;
				}
			}
		}

		if ((creep.memory.depositMode == "drop" || creep.memory.depositMode == "recovery") && Game.time % 10 == 0) {
			creep.memory.depositMode = this.getDepositMode(creep);
		}
		else if (Game.time % 40 == 0) {
			creep.memory.depositMode = this.getDepositMode(creep);
		}

		if (creep.memory.depositMode === "drop") {
			delete creep.memory.transferTarget;
		}
		else if (creep.memory.depositMode !== "link" && creep.memory.dedicatedLinkId) {
			delete creep.memory.dedicatedLinkId;
		}
		else if (creep.memory.depositMode === "link" && !creep.memory.dedicatedLinkId) {
			let nearbyLinks = harvestTarget.pos.findInRange(FIND_STRUCTURES, 2, {
				filter: (struct) => { return struct.structureType == STRUCTURE_LINK; }
			});
			if (nearbyLinks.length > 0) {
				creep.memory.dedicatedLinkId = nearbyLinks[0].id;
			}
			else {
				creep.memory.last_check_for_dedicated_link = Game.time;
			}
		}

		// for link mode, pick up energy on the ground below the harvester
		if (((creep.memory.depositMode === "link" && Game.getObjectById(creep.memory.dedicatedLinkId).store[RESOURCE_ENERGY] < LINK_CAPACITY) || creep.memory.depositMode === "recovery" || creep.memory.depositMode === "direct") && creep.memory.harvesting) {
			let dropped = creep.pos.lookFor(LOOK_ENERGY);
			if (dropped.length > 0) {
				creep.pickup(dropped[0]);
			}
			else {
				let structs = creep.pos.lookFor(LOOK_STRUCTURES).filter(s => s.structureType == STRUCTURE_CONTAINER);
				if (structs.length > 0 && structs[0].store[RESOURCE_ENERGY] > 0) {
					creep.withdraw(structs[0], RESOURCE_ENERGY);
				}
			}
		}

		if(!creep.memory.harvesting && creep.carry.energy == 0) {
			creep.memory.harvesting = true;
			creep.say('harvesting');
		}
		if(creep.memory.harvesting && (creep.carry.energy == creep.carryCapacity) && creep.memory.depositMode !== "drop") {
			creep.memory.harvesting = false;
			creep.say('transport');
		}
		if (!creep.memory.harvesting && creep.memory.depositMode === "drop") {
			creep.memory.harvesting = true;
		}

		if(creep.memory.harvesting) {
			if (creep.room.name == harvestTarget.room.name) {
				if (creep.pos.isEqualTo(harvestPos)) {
					creep.harvest(harvestTarget);
				}
				else {
					creep.travelTo(harvestPos);
				}
			}
			else {
				creep.travelTo(new RoomPosition(25,25,harvestTarget.room.name), {visualizePathStyle:{}});
			}
		}
		else {
			let target = Game.getObjectById(creep.memory.transferTarget);
			if (!target) {
				target = this.getTransferTarget(creep);
				if (!target) {
					if (creep.memory.depositMode === "recovery" && Object.keys(Game.creeps).length !== util.getCreeps("harvester").length) {
						creep.log("no transfer targets available, returning to harvestPos to keep harvesting...");
						if (creep.pos.isEqualTo(harvestPos)) {
							creep.harvest(harvestTarget);
						}
						else {
							creep.travelTo(harvestPos);
						}
					}
					creep.memory.depositMode = this.getDepositMode(creep);
					return;
				}
				creep.memory.transferTarget = target.id;
			}

			if (creep.memory.depositMode === "link" &&
				(target.structureType === STRUCTURE_CONTAINER || target.structureType === STRUCTURE_LINK) &&
				creep.room.energyAvailable < creep.room.energyCapacityAvailable) {
				delete creep.memory.transferTarget;
			}

			let transfer_result = creep.transfer(target, RESOURCE_ENERGY);
			if (transfer_result === OK && creep.memory.depositMode === "recovery") {
				delete creep.memory.transferTarget;
			}
			else if (transfer_result === ERR_NOT_IN_RANGE) {
				creep.travelTo(target, {visualizePathStyle:{}});
			}
			else if (transfer_result === ERR_FULL) {
				console.log(creep.name, "failed to transfer: target full");
				creep.memory.harvesting = true;
				delete creep.memory.transferTarget;
				if (creep.memory.depositMode === "link") {
					creep.drop(RESOURCE_ENERGY);
				}
			}
			else if (transfer_result !== OK) {
				console.log(creep.name, "failed to transfer:", transfer_result);
			}
		}

		if (creep.memory.depositMode !== "recovery" && creep.store[RESOURCE_ENERGY] > 0 && Game.time % 6 == 0 && creep.pos.lookFor(LOOK_ENERGY).length > 0) {
			this.passiveMaintainContainer(creep);
		}

		// this.visualizeState(creep);
	},

	visualizeState(creep) {
		let vis = creep.room.visual;
		if (!creep.memory.harvestPos) {
			creep.log("ERROR: Can't visualize state because this creep does not have a harvestPos");
			return;
		}
		let harvestPos = new RoomPosition(creep.memory.harvestPos.x, creep.memory.harvestPos.y, creep.memory.harvestPos.roomName);

		let harvestTarget = Game.getObjectById(creep.memory.harvestTarget);
		let link = Game.getObjectById(creep.memory.dedicatedLinkId);
		if (harvestTarget) {
			vis.line(harvestPos, harvestTarget.pos, {
				color: "#ff0",
				opacity: 0.7,
			});
		}
		if (link) {
			vis.line(harvestPos, link.pos, {
				color: link.id == creep.memory.transferTarget ? "#f0a" : "#ff0",
				opacity: 0.7,
			});
		}

		// draw lines to fill targets
		if (creep.memory.fillTargetIds) {
			for (let targetId of creep.memory.fillTargetIds) {
				let target = Game.getObjectById(targetId);
				if (!target) {
					creep.log("WARN: target", targetId, "does not exist");
					continue;
				}

				vis.line(harvestPos, target.pos, {
					color: target.id == creep.memory.transferTarget ? "#f0a" : "#00f",
					opacity: 0.7,
				});
			}
		}

		// draw harvest position on top
		if (creep.pos.isEqualTo(harvestPos)) {
			vis.circle(harvestPos, {
				radius: 0.3,
				stroke: "#0f0",
				fill: "#0f0",
			});
		}
		else {
			vis.rect(harvestPos.x - 0.3, harvestPos.y - 0.3, 0.6, 0.6, {
				stroke: "#f00",
				fill: "#f00",
			});
		}
	}
};

module.exports = roleHarvester;
