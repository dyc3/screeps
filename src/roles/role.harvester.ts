import * as cartographer from "screeps-cartographer";

import { Role } from "./meta";
import toolEnergySource from "../tool.energysource.js";
import util from "../util.js";

type HarvesterDepositMode = "wait" | "link" | "drop" | "recovery" | "direct";

const roleHarvester = {
	findTransferTargets(creep: Creep): Structure[] {
		if (!creep.memory.harvestTarget) {
			creep.log("ERROR: Can't find transfer targets without harvestTarget");
			return [];
		}
		const harvestTarget = Game.getObjectById(creep.memory.harvestTarget);
		if (harvestTarget) {
			let dedicatedLink = creep.memory.dedicatedLinkId ? Game.getObjectById(creep.memory.dedicatedLinkId) : null;
			if (!dedicatedLink && (creep.room.controller?.level ?? 0) >= 5) {
				if (
					!creep.memory.lastCheckForDedicatedLink ||
					(creep.memory.lastCheckForDedicatedLink && Game.time - creep.memory.lastCheckForDedicatedLink > 100)
				) {
					dedicatedLink = harvestTarget.pos.findInRange(FIND_STRUCTURES, 3, {
						filter: struct => {
							return struct.structureType === STRUCTURE_LINK;
						},
					})[0] as StructureLink | null;
					if (dedicatedLink) {
						creep.memory.dedicatedLinkId = dedicatedLink.id;
					} else {
						creep.memory.lastCheckForDedicatedLink = Game.time;
					}
				}
			}
		}

		let targets = creep.room.find(FIND_STRUCTURES, {
			filter: struct => {
				const flags = struct.pos.lookFor(LOOK_FLAGS);
				if (flags.length > 0) {
					if (flags[0].name.includes("dismantle") || flags[0].name.includes("norepair")) {
						return false;
					}
				}
				if (creep.memory.dedicatedLinkId && !creep.pos.inRangeTo(struct, 3)) {
					return false;
				}
				if (struct.structureType === STRUCTURE_LINK) {
					if (struct.room.storage && struct.pos.inRangeTo(struct.room.storage, 2)) {
						return false;
					}
					if (creep.pos.inRangeTo(struct, 4)) {
						return struct.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
					}
				} else if (!(creep.getActiveBodyparts(MOVE) === 1 && creep.getActiveBodyparts(WORK) >= 5)) {
					// check if creep is "optimized"
					if (struct.structureType === STRUCTURE_EXTENSION) {
						if (!creep.pos.inRangeTo(struct, 8)) {
							return false;
						}
					} else if (struct.structureType === STRUCTURE_SPAWN) {
						if (
							CONTROLLER_STRUCTURES[STRUCTURE_SPAWN][creep.room.controller?.level ?? 0] > 1 &&
							creep.pos.inRangeTo(struct, 3)
						) {
							return true;
						}
					}
				}
				const a =
					(struct.structureType === STRUCTURE_EXTENSION ||
						(struct.structureType === STRUCTURE_SPAWN &&
							(creep.room.controller?.level === 1 || creep.room.energyAvailable > 295)) ||
						struct.structureType === STRUCTURE_TOWER) &&
					struct.energy < struct.energyCapacity;
				const b =
					(struct.structureType === STRUCTURE_CONTAINER || struct.structureType === STRUCTURE_STORAGE) &&
					struct.store.getFreeCapacity() > 0;
				return a || b;
			},
		});
		if (targets.length > 0) {
			// 			var harvestTarget = Game.getObjectById(creep.memory.harvestTarget);
			if (!creep.memory.haveManagerForRoom || Game.time % 10 === 0) {
				creep.memory.haveManagerForRoom =
					_.filter(Game.creeps, function (c) {
						if (!Game.creeps[c.name]) {
							// checks if the creep is alive? maybe?
							return false;
						}
						return c.memory.role === "manager" && c.memory.targetRoom === creep.room.name;
					}).length > 0;
			}
			// console.log(creep.name, "has manager in room", creep.room.name, "=", haveManagerForRoom);
			// HACK: these aren't using the STRUCTURE_* constants
			const structPriority = {
				[STRUCTURE_EXTENSION]: 1,
				[STRUCTURE_TOWER]: 2,
				[STRUCTURE_LINK]: 3,
				[STRUCTURE_SPAWN]: 4,
				[STRUCTURE_CONTAINER]: 5,
				[STRUCTURE_STORAGE]: 6,
			};
			if (creep.memory.haveManagerForRoom) {
				structPriority[STRUCTURE_LINK] = 1;
				structPriority[STRUCTURE_CONTAINER] = 2;
				structPriority[STRUCTURE_SPAWN] = 3;
				structPriority[STRUCTURE_STORAGE] = 3;
				structPriority[STRUCTURE_EXTENSION] = 3;
				structPriority[STRUCTURE_TOWER] = 3;
			}
			if (creep.memory.dedicatedLinkId && harvestTarget) {
				targets = targets.filter(struct => {
					return harvestTarget.pos.inRangeTo(struct, 3);
				});
			}
			if (creep.memory.haveManagerForRoom && creep.memory.dedicatedLinkId) {
				structPriority[STRUCTURE_LINK] = 1;
				structPriority[STRUCTURE_SPAWN] = 2;
				structPriority[STRUCTURE_EXTENSION] = 3;
				structPriority[STRUCTURE_TOWER] = 3;
				structPriority[STRUCTURE_CONTAINER] = 5;
				structPriority[STRUCTURE_STORAGE] = 6;
			}
			targets.sort(function (a, b) {
				if (a.structureType !== b.structureType) {
					// @ts-expect-error this is fine, not causing problems. remove this comment if this line changes
					return structPriority[a.structureType] - structPriority[b.structureType];
				} else {
					return creep.pos.getRangeTo(a) - creep.pos.getRangeTo(b);
				}
			});
		}
		return targets;
	},

	findHarvestTarget(creep: Creep): Id<Source> | undefined {
		let sources: Source[] = [];
		const rooms = util.getOwnedRooms();
		for (const room of rooms) {
			const roomSources = room.find(FIND_SOURCES, { filter: source => toolEnergySource.canAssignSource(source) });
			// console.log(roomSources.length)
			if (roomSources && roomSources !== undefined && roomSources.length > 0) {
				sources = sources.concat(roomSources);
			}
		}
		// console.log(sources)

		if (sources.length > 0) {
			// var closest = creep.pos.findClosestByPath(sources);
			const closest = sources[0];
			if (closest) {
				// console.log(closest)
				return closest.id;
			} else {
				console.log(creep.name, "no closest harvestTarget (wtf?)");
			}
		} else {
			console.log(creep.name, "no harvestTarget");
		}
		return undefined;
	},

	/** gets this creep's energy deposit mode depending on the current situation **/
	getDepositMode(creep: Creep): HarvesterDepositMode {
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

		if (creep.memory.forceMode) {
			return creep.memory.forceMode as HarvesterDepositMode;
		}

		if (!creep.memory.harvestTarget) {
			creep.log("Can't determine harvest mode without harvestTarget");
			return "wait";
		}

		const harvestTarget = Game.getObjectById(creep.memory.harvestTarget);
		if (!harvestTarget) {
			creep.log("Can't determine harvest mode without harvestTarget");
			return "wait";
		}
		if (harvestTarget.room.storage && harvestTarget.pos.getRangeTo(harvestTarget.room.storage) <= 2) {
			return "direct";
		}

		const dedicatedLink = creep.memory.dedicatedLinkId ? Game.getObjectById(creep.memory.dedicatedLinkId) : null;
		if (dedicatedLink) {
			return "link";
		}

		const highLevelRooms = util
			.getOwnedRooms()
			.filter(
				room =>
					(room.controller?.level ?? 0) > 4 &&
					room.storage &&
					room.storage.store.getUsedCapacity(RESOURCE_ENERGY) > 300000
			);
		if (highLevelRooms.length === 0) {
			if (
				Object.keys(Game.creeps).length <= 3 ||
				(harvestTarget.room.controller?.level ?? 0) < 2 ||
				util.getCreeps(Role.Manager).filter(c => c.memory.targetRoom === creep.memory.targetRoom).length === 0
			) {
				return "recovery";
			}
		}

		return "drop";
	},

	/** Get the harvester creep's harvest position. The creep must have `harvestTarget` set. */
	getHarvestPosition(creep: Creep): RoomPosition {
		const harvestTarget = Game.getObjectById(creep.memory.harvestTarget as Id<Source>);
		if (!harvestTarget) {
			creep.log("ERROR: Can't get harvest position because this creep does not have a harvestTarget");
			return creep.pos;
		}
		const targetRoom = harvestTarget.room;
		const { x, y } = targetRoom.memory.harvestPositions[harvestTarget.id];
		return targetRoom.getPositionAt(x, y) ?? creep.pos;
	},

	/** Meant to replace findTransferTargets **/
	getTransferTarget(creep: Creep): AnyStoreStructure | null {
		// check adjacent positions for empty extensions
		if (!creep.memory.refreshFillTargets) {
			creep.memory.refreshFillTargets = Game.time - 50;
		}

		const harvestPos = this.getHarvestPosition(creep);

		if (!creep.memory.fillTargetIds || Game.time - creep.memory.refreshFillTargets > 50) {
			const adjacentStructs = _.filter(
				creep.room.lookForAtArea(
					LOOK_STRUCTURES,
					harvestPos.y - 1,
					harvestPos.x - 1,
					harvestPos.y + 1,
					harvestPos.x + 1,
					true
				),
				result => result.structure.structureType === STRUCTURE_EXTENSION
			);
			const targets: Id<AnyStoreStructure>[] = [];
			for (const struct of adjacentStructs) {
				targets.push(struct.structure.id as Id<AnyStoreStructure>);
			}
			creep.memory.fillTargetIds = targets;
			creep.memory.refreshFillTargets = Game.time;
		}
		const targetIdsNotFull = _.filter(creep.memory.fillTargetIds, id => {
			const struct = Game.getObjectById(id);
			if (!struct) {
				return false;
			}
			return struct.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
		});
		if (targetIdsNotFull.length > 0) {
			return targetIdsNotFull[0] ? Game.getObjectById(targetIdsNotFull[0]) : null;
		}

		if (creep.memory.depositMode === "direct") {
			return creep.room.storage ?? null;
		}

		if (creep.memory.depositMode === "link" && creep.memory.dedicatedLinkId) {
			const link = Game.getObjectById(creep.memory.dedicatedLinkId);
			if (link) {
				return link;
			} else {
				delete creep.memory.dedicatedLinkId;
			}
		}

		if (creep.memory.depositMode === "recovery") {
			const targets: AnyStoreStructure[] = creep.room.find(FIND_STRUCTURES, {
				filter: struct => {
					const flags = struct.pos.lookFor(LOOK_FLAGS);
					if (flags.length > 0) {
						if (flags[0].name.includes("dismantle") || flags[0].name.includes("norepair")) {
							return false;
						}
					}
					if (struct.structureType === STRUCTURE_LINK) {
						if (struct.room.storage && struct.pos.inRangeTo(struct.room.storage, 2)) {
							return false;
						}
						if (creep.pos.inRangeTo(struct, 4)) {
							return struct.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
						}
					} else if (!(creep.getActiveBodyparts(MOVE) === 1 && creep.getActiveBodyparts(WORK) >= 5)) {
						// check if creep is "optimized"
						if (struct.structureType === STRUCTURE_EXTENSION) {
							if (!creep.pos.inRangeTo(struct, 8)) {
								return false;
							}
						} else if (struct.structureType === STRUCTURE_SPAWN) {
							if (
								CONTROLLER_STRUCTURES[STRUCTURE_SPAWN][creep.room.controller?.level ?? 0] > 1 &&
								creep.pos.inRangeTo(struct, 3)
							) {
								return true;
							}
						}
					}
					const a =
						(struct.structureType === STRUCTURE_EXTENSION ||
							(struct.structureType === STRUCTURE_SPAWN &&
								(creep.room.controller?.level === 1 ||
									struct.store.getFreeCapacity(RESOURCE_ENERGY) > 5)) ||
							struct.structureType === STRUCTURE_TOWER) &&
						struct.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
					const b =
						(struct.structureType === STRUCTURE_CONTAINER || struct.structureType === STRUCTURE_STORAGE) &&
						struct.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
					return a || b;
				},
			});
			if (targets.length > 0) {
				// 			var harvestTarget = Game.getObjectById(creep.memory.harvestTarget);
				if (!creep.memory.haveManagerForRoom || Game.time % 10 === 0) {
					creep.memory.haveManagerForRoom =
						_.filter(Game.creeps, function (c) {
							if (!Game.creeps[c.name]) {
								// checks if the creep is alive? maybe?
								return false;
							}
							return c.memory.role === Role.Manager && c.memory.targetRoom === creep.room.name;
						}).length > 0;
				}
				// console.log(creep.name, "has manager in room", creep.room.name, "=", haveManagerForRoom);
				const structPriority = {
					[STRUCTURE_EXTENSION]: 1,
					[STRUCTURE_SPAWN]: 1,
					[STRUCTURE_TOWER]: 2,
					[STRUCTURE_LINK]: 4,
					[STRUCTURE_CONTAINER]: 5,
					[STRUCTURE_STORAGE]: 6,
				};
				if (creep.memory.haveManagerForRoom) {
					structPriority[STRUCTURE_LINK] = 1;
					structPriority[STRUCTURE_CONTAINER] = 2;
					structPriority[STRUCTURE_SPAWN] = 3;
					structPriority[STRUCTURE_STORAGE] = 3;
					structPriority[STRUCTURE_EXTENSION] = 3;
					structPriority[STRUCTURE_TOWER] = 3;
				}
				targets.sort(function (a, b) {
					if (a.structureType !== b.structureType) {
						// @ts-expect-error this is fine
						return structPriority[a.structureType] - structPriority[b.structureType];
					} else {
						return creep.pos.getRangeTo(a) - creep.pos.getRangeTo(b);
					}
				});
				return targets[0];
			}
		}
		return null;
	},

	passiveMaintainContainer(creep: Creep): void {
		if (creep.store[RESOURCE_ENERGY] === 0) {
			return;
		}

		const lookResult = creep.pos.look();
		for (const result of lookResult) {
			if (result.type === LOOK_CONSTRUCTION_SITES && result.constructionSite) {
				creep.build(result.constructionSite);
				return;
			} else if (result.type === LOOK_STRUCTURES && result.structure) {
				if (result.structure.hits < result.structure.hitsMax) {
					creep.repair(result.structure);
				}
				return;
			}
		}
	},

	run(creep: Creep): void {
		// console.log(creep.name, "pos:", creep.memory.harvestPos, "mode:", creep.memory.depositMode, "harvestTarget:", creep.memory.harvestTarget, "transferTarget:", creep.memory.transferTarget, "link:", creep.memory.dedicatedLinkId);

		if (!creep.memory.harvestTarget) {
			creep.memory.harvestTarget = this.findHarvestTarget(creep);
		}
		if (!creep.memory.harvestTarget) {
			creep.log("ERROR: Can't run harvester without harvestTarget");
			creep.say("error");
			return;
		}

		const harvestTarget = Game.getObjectById(creep.memory.harvestTarget);
		if (!harvestTarget) {
			creep.log("ERROR: harvestTarget invalid");
			creep.say("error");
			delete creep.memory.harvestTarget;
			return;
		}
		const targetRoom = harvestTarget.room;

		const { x, y } = targetRoom.memory.harvestPositions[harvestTarget.id];
		const harvestPos = targetRoom.getPositionAt(x, y);
		if (!harvestPos) {
			creep.log("ERROR: harvestPos invalid");
			creep.say("error");
			return;
		}

		if (harvestPos.roomName !== creep.memory.targetRoom) {
			creep.memory.targetRoom = harvestPos.roomName;
		}

		if (!creep.memory.depositMode || (creep.memory.depositMode === "wait" && Game.time % 2 === 0)) {
			creep.memory.depositMode = this.getDepositMode(creep);
			if (creep.memory.depositMode === "wait") {
				creep.say("waiting"); // makes debugging quicker
				return;
			}
		}

		if (
			creep.room.name === creep.memory.targetRoom &&
			CONTROLLER_STRUCTURES[STRUCTURE_LINK][creep.room.controller?.level ?? 0] > 0
		) {
			if (
				!creep.memory.lastCheckForDedicatedLink ||
				(creep.memory.lastCheckForDedicatedLink && Game.time - creep.memory.lastCheckForDedicatedLink > 100)
			) {
				const nearbyLinks: StructureLink[] = harvestTarget.pos.findInRange(FIND_STRUCTURES, 3, {
					filter: struct => {
						return struct.structureType === STRUCTURE_LINK;
					},
				});
				if (nearbyLinks.length > 0) {
					creep.memory.dedicatedLinkId = nearbyLinks[0].id;
				} else {
					creep.memory.lastCheckForDedicatedLink = Game.time;
				}
			}
		}

		if ((creep.memory.depositMode === "drop" || creep.memory.depositMode === "recovery") && Game.time % 10 === 0) {
			creep.memory.depositMode = this.getDepositMode(creep);
		} else if (Game.time % 40 === 0) {
			creep.memory.depositMode = this.getDepositMode(creep);
		}

		if (creep.memory.depositMode === "drop") {
			delete creep.memory.transferTarget;
		} else if (creep.memory.depositMode !== "link" && creep.memory.dedicatedLinkId) {
			delete creep.memory.dedicatedLinkId;
		} else if (creep.memory.depositMode === "link" && !creep.memory.dedicatedLinkId) {
			const nearbyLinks: StructureLink[] = harvestTarget.pos.findInRange(FIND_STRUCTURES, 2, {
				filter: struct => {
					return struct.structureType === STRUCTURE_LINK;
				},
			});
			if (nearbyLinks.length > 0) {
				creep.memory.dedicatedLinkId = nearbyLinks[0].id;
			} else {
				creep.memory.lastCheckForDedicatedLink = Game.time;
			}
		}

		const dedicatedLink = creep.memory.dedicatedLinkId ? Game.getObjectById(creep.memory.dedicatedLinkId) : null;

		// for link mode, pick up energy on the ground below the harvester
		if (
			((creep.memory.depositMode === "link" &&
				dedicatedLink &&
				dedicatedLink.store[RESOURCE_ENERGY] < LINK_CAPACITY) ||
				creep.memory.depositMode === "recovery" ||
				creep.memory.depositMode === "direct") &&
			creep.memory.harvesting
		) {
			const dropped = creep.pos.lookFor(LOOK_ENERGY);
			if (dropped.length > 0) {
				creep.pickup(dropped[0]);
			} else {
				const structs = creep.pos
					.lookFor(LOOK_STRUCTURES)
					.filter(s => s.structureType === STRUCTURE_CONTAINER) as StructureContainer[];
				if (structs.length > 0 && structs[0].store[RESOURCE_ENERGY] > 0) {
					creep.withdraw(structs[0], RESOURCE_ENERGY);
				}
			}
		}

		// The amount of energy that will drop on the ground if the creep harvests and it becomes full
		const harvestOverflow = Math.max(
			HARVEST_POWER * creep.getActiveBodyparts(WORK) - creep.store.getFreeCapacity(),
			0
		);

		if (!creep.memory.harvesting && creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
			creep.memory.harvesting = true;
			creep.say("harvesting");
		}
		if (creep.memory.harvesting) {
			// this special case helps prevent wasting energy from decay
			if (
				creep.memory.depositMode === "link" &&
				creep.store.getFreeCapacity(RESOURCE_ENERGY) <= harvestOverflow
			) {
				creep.memory.harvesting = false;
				creep.say("transport");
			} else if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
				creep.memory.harvesting = false;
				creep.say("transport");
			}
		}

		if (creep.memory.harvesting) {
			if (creep.room.name === harvestTarget.room.name) {
				cartographer.moveTo(creep, { pos: harvestPos, range: 0 }, { priority: 1000 });
				if (creep.pos.isEqualTo(harvestPos)) {
					creep.harvest(harvestTarget);
				}
			} else {
				cartographer.moveTo(creep, new RoomPosition(25, 25, harvestTarget.room.name), {
					visualizePathStyle: {},
					priority: 100,
				});
			}
		} else {
			let target = creep.memory.transferTarget ? Game.getObjectById(creep.memory.transferTarget) : null;
			if (!target) {
				target = this.getTransferTarget(creep);
				if (!target) {
					if (
						creep.memory.depositMode === "recovery" &&
						Object.keys(Game.creeps).length !== util.getCreeps(Role.Harvester).length
					) {
						creep.log("no transfer targets available, returning to harvestPos to keep harvesting...");
						cartographer.moveTo(creep, { pos: harvestPos, range: 0 }, { priority: 1000 });
						if (creep.pos.isEqualTo(harvestPos)) {
							creep.harvest(harvestTarget);
						}
						creep.memory.depositMode = this.getDepositMode(creep);
					} else if (creep.memory.depositMode === "drop") {
						cartographer.moveTo(creep, { pos: harvestPos, range: 0 }, { priority: 1000 });
						if (creep.pos.isEqualTo(harvestPos)) {
							creep.harvest(harvestTarget);
						}
					} else {
						creep.memory.depositMode = this.getDepositMode(creep);
					}
					return;
				}
				creep.memory.transferTarget = target.id;
			}

			if (
				creep.memory.depositMode === "link" &&
				(target.structureType === STRUCTURE_CONTAINER || target.structureType === STRUCTURE_LINK) &&
				creep.room.energyAvailable < creep.room.energyCapacityAvailable
			) {
				delete creep.memory.transferTarget;
			}

			const transferResult = creep.transfer(target, RESOURCE_ENERGY);
			if (transferResult === OK && creep.memory.depositMode === "recovery") {
				delete creep.memory.transferTarget;
			} else if (transferResult === ERR_NOT_IN_RANGE) {
				cartographer.moveTo(creep, target, { visualizePathStyle: {} });
			} else if (transferResult === ERR_FULL) {
				console.log(creep.name, "failed to transfer: target full");
				creep.memory.harvesting = true;
				delete creep.memory.transferTarget;
				if (creep.memory.depositMode === "link") {
					creep.drop(RESOURCE_ENERGY);
				}
			} else if (transferResult !== OK) {
				console.log(creep.name, "failed to transfer:", transferResult);
			}
		}

		if (
			creep.memory.depositMode !== "recovery" &&
			creep.store[RESOURCE_ENERGY] > 0 &&
			Game.time % 6 === 0 &&
			creep.pos.lookFor(LOOK_ENERGY).length > 0
		) {
			this.passiveMaintainContainer(creep);
		}

		// this.visualizeState(creep);
	},

	visualizeState(creep: Creep): void {
		const vis = creep.room.visual;
		if (!creep.memory.harvestPos) {
			creep.log("ERROR: Can't visualize state because this creep does not have a harvestPos");
			return;
		}
		const harvestPos = new RoomPosition(
			creep.memory.harvestPos.x,
			creep.memory.harvestPos.y,
			creep.memory.harvestPos.roomName
		);

		const harvestTarget = creep.memory.harvestTarget ? Game.getObjectById(creep.memory.harvestTarget) : null;
		const link = creep.memory.dedicatedLinkId ? Game.getObjectById(creep.memory.dedicatedLinkId) : null;
		if (harvestTarget) {
			vis.line(harvestPos, harvestTarget.pos, {
				color: "#ff0",
				opacity: 0.7,
			});
		}
		if (link) {
			vis.line(harvestPos, link.pos, {
				color: link.id === creep.memory.transferTarget ? "#f0a" : "#ff0",
				opacity: 0.7,
			});
		}

		// draw lines to fill targets
		if (creep.memory.fillTargetIds) {
			for (const targetId of creep.memory.fillTargetIds) {
				const target = Game.getObjectById(targetId);
				if (!target) {
					creep.log("WARN: target", targetId, "does not exist");
					continue;
				}

				vis.line(harvestPos, target.pos, {
					color: target.id === creep.memory.transferTarget ? "#f0a" : "#00f",
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
		} else {
			vis.rect(harvestPos.x - 0.3, harvestPos.y - 0.3, 0.6, 0.6, {
				stroke: "#f00",
				fill: "#f00",
			});
		}
	},
};

module.exports = roleHarvester;
export default roleHarvester;
