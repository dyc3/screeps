import * as cartographer from "screeps-cartographer";
import brainLogistics, { ResourceSink, ResourceSource } from "../brain.logistics";
import brainAutoPlanner from "../brain.autoplanner.js";
import util from "../util.js";

// 	if (creep.memory.aquireTarget && !passively) {
// 		const aquireTarget: AnyStoreStructure | Resource = Game.getObjectById(creep.memory.aquireTarget);
// 		creep.log("aquireTarget:", aquireTarget);
// 		if (aquireTarget) {
// 			creep.room.visual.circle(aquireTarget.pos, { stroke: "#ff0000", fill: "transparent", radius: 0.8 });
// 			if (creep.pos.isNearTo(aquireTarget)) {
// 				// duck typing to figure out what method to use
// 				if (aquireTarget.store) {
// 					// has a store

// 					if (aquireTarget instanceof Tombstone || aquireTarget instanceof Ruin) {
// 						// prioritize "exotic" resources
// 						for (const resource of RESOURCES_ALL) {
// 							if (creep.store.getFreeCapacity() === 0) {
// 								break;
// 							}
// 							if (resource === RESOURCE_ENERGY) {
// 								continue;
// 							}
// 							if (aquireTarget.store[resource] > 0) {
// 								creep.withdraw(aquireTarget, resource);
// 							}
// 						}
// 					}

// 					if (creep.withdraw(aquireTarget, RESOURCE_ENERGY) === OK) {
// 						creep.memory.lastWithdrawStructure = aquireTarget.id;
// 						if (aquireTarget.structureType === STRUCTURE_STORAGE) {
// 							delete creep.memory.aquireTarget;
// 						}
// 					}

// 					if (aquireTarget.store[RESOURCE_ENERGY] === 0) {
// 						delete creep.memory.aquireTarget;
// 					}
// 				} else if (aquireTarget instanceof Resource) {
// 					// dropped resource
// 					creep.pickup(aquireTarget);
// 				} else {
// 					creep.say("help");
// 					creep.log("ERR: I don't know how to withdraw from", aquireTarget);
// 				}
// 			} else {
// 				const travelResult = cartographer.moveTo(creep, aquireTarget, { visualizePathStyle: {} });
// 				if (travelResult.incomplete) {
// 					creep.log("Path to aquireTarget is incomplete, skipping...");
// 					delete creep.memory.aquireTarget;
// 				}
// 			}
// 			return;
// 		} else {
// 			delete creep.memory.aquireTarget;
// 		}
// 	}

// 	const droppedResources = creep.pos.findInRange(FIND_DROPPED_RESOURCES, passively ? 1 : 20, {
// 		filter: drop => {
// 			if (!creep.pos.isNearTo(drop) && drop.amount < global.DROPPED_ENERGY_GATHER_MINIMUM) {
// 				return false;
// 			}
// 			if (util.isDistFromEdge(drop.pos, 2)) {
// 				return false;
// 			}
// 			if (drop.pos.findInRange(FIND_HOSTILE_CREEPS, 6).length > 0) {
// 				return false;
// 			}
// 			if (!passively) {
// 				if (drop.pos.findInRange(FIND_SOURCES, 1).length > 0) {
// 					if (
// 						drop.pos.findInRange(FIND_STRUCTURES, 1).filter(s => s.structureType === STRUCTURE_LINK)
// 							.length > 0
// 					) {
// 						return false;
// 					}
// 				}
// 			}
// 			// console.log("ENERGY DROP",drop.id,drop.amount);
// 			return creep.pos.findPathTo(drop).length < drop.amount - global.DROPPED_ENERGY_GATHER_MINIMUM;
// 		},
// 	});
// 	if (droppedResources.length > 0) {
// 		const closest = creep.pos.findClosestByPath(droppedResources);
// 		if (closest) {
// 			creep.room.visual.circle(closest.pos, { stroke: "#ff0000", fill: "transparent", radius: 1 });
// 			if (creep.pickup(closest) === ERR_NOT_IN_RANGE) {
// 				creep.memory.aquireTarget = closest.id;
// 				cartographer.moveTo(creep, closest, { visualizePathStyle: {} });
// 			}
// 		}
// 	} else {
// 		let tombstones = creep.room.find(FIND_TOMBSTONES, {
// 			filter: tomb => {
// 				if (util.isDistFromEdge(tomb.pos, 4)) {
// 					return false;
// 				}
// 				if (tomb.pos.findInRange(FIND_HOSTILE_CREEPS, 10).length > 0) {
// 					return false;
// 				}
// 				if (tomb.store[RESOURCE_ENERGY] < global.DROPPED_ENERGY_GATHER_MINIMUM) {
// 					return false;
// 				}

// 				return _.sum(tomb.store) > 0 && creep.pos.findPathTo(tomb).length < tomb.ticksToDecay;
// 			},
// 		});
// 		if (tombstones.length > 0) {
// 			// NOTE: it might be better to prioritize tombs that will decay sooner (TOMBSTONE_DECAY_PER_PART * [# of creep parts])
// 			// prioritize tombs with more resources
// 			tombstones = tombstones.sort((a, b) => {
// 				return _.sum(b.store) - _.sum(a.store);
// 			});
// 			const target = tombstones[0];
// 			creep.room.visual.circle(target.pos, { stroke: "#ff0000", fill: "transparent", radius: 1 });
// 			creep.memory.aquireTarget = target.id;
// 			if (creep.pos.isNearTo(target)) {
// 				// prioritize "exotic" resources
// 				for (const resource of RESOURCES_ALL) {
// 					if (creep.store.getFreeCapacity() === 0) {
// 						break;
// 					}
// 					if (resource === RESOURCE_ENERGY) {
// 						continue;
// 					}
// 					if (target.store[resource] > 0) {
// 						creep.withdraw(target, resource);
// 					}
// 				}
// 				creep.withdraw(target, RESOURCE_ENERGY);
// 			} else {
// 				cartographer.moveTo(creep, target, { visualizePathStyle: {} });
// 			}
// 		} else {
// 			const filledHarvesters = creep.pos.findInRange(FIND_MY_CREEPS, passively ? 1 : 4, {
// 				filter(c) {
// 					// if (c.memory.role === "harvester") {
// 					// if (c.pos.findInRange(FIND_STRUCTURES, 1, { function(s) { return s.structureType === STRUCTURE_LINK } })) {
// 					// 	return false;
// 					// }
// 					// }
// 					if (c.memory.role === Role.Carrier) {
// 						return !c.spawning && c.store[RESOURCE_ENERGY] > 0;
// 					}
// 					return (
// 						!c.spawning &&
// 						c.memory.role === Role.Harvester &&
// 						(!c.memory.hasDedicatedLink || c.memory.stage < 5) &&
// 						c.store[RESOURCE_ENERGY] >= c.store.getCapacity() * 0.85
// 					);
// 				},
// 			});
// 			if (filledHarvesters.length > 0) {
// 				const closest = creep.pos.findClosestByPath(filledHarvesters);
// 				if (closest) {
// 					creep.room.visual.circle(closest.pos, { stroke: "#ff0000", fill: "transparent", radius: 1 });
// 					// console.log("NEARBY FILLED HARVESTER",closest.pos,"dist =",creep.pos.getRangeTo(closest))
// 					if (closest.transfer(creep, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
// 						cartographer.moveTo(creep, closest, { visualizePathStyle: {} });
// 					}
// 				} else {
// 					console.log(creep.name, "no path to target harvester");
// 				}
// 			} else {
// 				// console.log("Can't withdraw from last deposit:",Game.getObjectById(creep.memory.lastDepositStructure))
// 				// console.log("last deposit:",Game.getObjectById(creep.memory.lastDepositStructure))
// 				const containers = creep.pos.findInRange(FIND_STRUCTURES, passively ? 1 : 50, {
// 					filter(struct) {
// 						const flags = struct.pos.lookFor(LOOK_FLAGS);
// 						if (flags.length > 0) {
// 							if (flags[0].name.includes("dismantle") || flags[0].name.includes("norepair")) {
// 								return false;
// 							}
// 						}
// 						if (
// 							struct.id === creep.memory.lastDepositStructure &&
// 							creep.room.storage &&
// 							creep.room.storage.store[RESOURCE_ENERGY] < 800000
// 						) {
// 							return false; // comment this line to increase controller upgrade speed
// 						}
// 						if (struct.structureType === STRUCTURE_CONTAINER) {
// 							const rootPos = struct.room.memory.rootPos;
// 							if (
// 								rootPos &&
// 								(struct.pos.x === rootPos.x + 2 || struct.pos.x === rootPos.x - 2) &&
// 								struct.pos.y === rootPos.y - 2
// 							) {
// 								// these containers are in the main base module
// 								return false;
// 							}
// 							if (
// 								struct.pos.findInRange(FIND_STRUCTURES, 3, {
// 									filter(s) {
// 										return s.structureType === STRUCTURE_CONTROLLER;
// 									},
// 								}).length > 0
// 							) {
// 								return false;
// 							}

// 							if (creep.room.storage && (creep.room.controller?.level ?? 0) > 4) {
// 								if (struct.pos.findInRange(FIND_SOURCES, 2).length > 0) {
// 									if (struct.store[RESOURCE_ENERGY] < CONTAINER_CAPACITY * 0.25) {
// 										return false;
// 									} else if (
// 										struct.pos
// 											.findInRange(FIND_STRUCTURES, 1)
// 											.filter(s => s.structureType === STRUCTURE_LINK).length > 0
// 									) {
// 										return false;
// 									}
// 								}
// 							}
// 						} else if (struct.structureType === STRUCTURE_LINK) {
// 							const relayCreeps = _.filter(
// 								util.getCreeps(Role.Relay),
// 								c =>
// 									!c.spawning &&
// 									c.memory.assignedPos &&
// 									creep.memory.targetRoom &&
// 									c.memory.assignedPos.roomName === creep.memory.targetRoom &&
// 									c.pos.isEqualTo(
// 										new RoomPosition(
// 											c.memory.assignedPos.x,
// 											c.memory.assignedPos.y,
// 											creep.memory.targetRoom
// 										)
// 									)
// 							);
// 							let isNearRelay = false;
// 							for (const relay of relayCreeps) {
// 								if (struct.pos.isNearTo(relay)) {
// 									isNearRelay = true;
// 									break;
// 								}
// 							}
// 							if (isNearRelay) {
// 								return false;
// 							}
// 							if (
// 								struct.store.getUsedCapacity(RESOURCE_ENERGY) > 0 &&
// 								struct.room.storage &&
// 								struct.pos.inRangeTo(struct.room.storage, 2)
// 							) {
// 								return true;
// 							}
// 						} else if (struct.structureType === STRUCTURE_TERMINAL) {
// 							if (struct.my) {
// 								return true;
// 							} else if (struct.store[RESOURCE_ENERGY] > Memory.terminalEnergyTarget) {
// 								return true;
// 							}
// 						} else if (struct.structureType === STRUCTURE_FACTORY) {
// 							if (struct.my) {
// 								return true;
// 							}
// 							if (struct.store[RESOURCE_ENERGY] > Memory.factoryEnergyTarget) {
// 								return true;
// 							}
// 						}
// 						return (
// 							(struct.structureType === STRUCTURE_STORAGE &&
// 								struct.store[RESOURCE_ENERGY] > creep.store.getCapacity()) ||
// 							(struct.structureType === STRUCTURE_CONTAINER && struct.store[RESOURCE_ENERGY] > 0)
// 						);
// 					},
// 				});
// 				if (containers.length > 0) {
// 					containers.sort(function (a: AnyStoreStructure, b: AnyStoreStructure) {
// 						if (a.structureType !== b.structureType) {
// 							if (a.structureType === STRUCTURE_STORAGE) {
// 								return 1;
// 							}
// 							if (b.structureType === STRUCTURE_STORAGE) {
// 								return -1;
// 							}
// 						}

// 						let aEnergy = 0;
// 						if (a.store) {
// 							aEnergy = a.store[RESOURCE_ENERGY];
// 						}

// 						let bEnergy = 0;
// 						if (b.store) {
// 							bEnergy = b.store[RESOURCE_ENERGY];
// 						}

// 						return bEnergy - aEnergy; // sort descending, highest energy first
// 					});
// 					const closest = containers[0];
// 					new RoomVisual(creep.room.name).circle(closest.pos, {
// 						stroke: "#ff0000",
// 						fill: "transparent",
// 						radius: 1,
// 					});
// 					let amount;
// 					if (closest.structureType === STRUCTURE_TERMINAL && closest.my) {
// 						amount = closest.store[RESOURCE_ENERGY] - Memory.terminalEnergyTarget;
// 					} else if (closest.structureType === STRUCTURE_FACTORY && closest.my) {
// 						amount = closest.store[RESOURCE_ENERGY] - Memory.factoryEnergyTarget;
// 					}
// 					amount = Math.min(amount, creep.store.getCapacity()); // if amount is larger than carry capacity, then it won't withdraw and it'll get stuck
// 					// console.log(creep.name, "withdrawing", amount, "from", closest);
// 					if (creep.withdraw(closest, RESOURCE_ENERGY, amount) === ERR_NOT_IN_RANGE) {
// 						creep.memory.aquireTarget = closest.id;
// 						cartographer.moveTo(creep, closest, { visualizePathStyle: {} });
// 					} else {
// 						if (closest) {
// 							creep.memory.lastWithdrawStructure = closest.id;
// 							passivelyWithdrawOtherResources(creep, closest);
// 						}
// 					}
// 				} else if (!passively) {
// 					// grab energy from other rooms
// 					// TODO: can be made waaaay more effifient.
// 					const storages = _.filter(Game.structures, function (struct: AnyStoreStructure) {
// 						if (struct.structureType !== STRUCTURE_STORAGE) {
// 							return false;
// 						}
// 						if (struct.room.name === creep.memory.targetRoom) {
// 							return true;
// 						}
// 						const adjacentRooms = _.values(Game.map.describeExits(creep.memory.targetRoom));
// 						if (adjacentRooms.indexOf(creep.memory.targetRoom) === -1) {
// 							return false;
// 						}
// 						return (
// 							struct.structureType === STRUCTURE_STORAGE &&
// 							struct.store.getUsedCapacity(RESOURCE_ENERGY) > 500000
// 						);
// 					}) as AnyStoreStructure[];
// 					if (storages.length > 0) {
// 						const closest = storages[0];
// 						new RoomVisual(creep.room.name).circle(closest.pos, {
// 							stroke: "#ff0000",
// 							fill: "transparent",
// 							radius: 1,
// 						});
// 						if (creep.withdraw(closest, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
// 							creep.memory.aquireTarget = closest.id;
// 							cartographer.moveTo(creep, closest, { visualizePathStyle: {} });
// 						} else {
// 							creep.memory.lastWithdrawStructure = closest.id;
// 						}
// 					} else {
// 						creep.say("help me out");
// 					}
// 				}
// 			}
// 		}
// 	}
// }

// function passivelyWithdrawOtherResources(creep: Creep, structure: AnyStoreStructure) {
// 	return;
// 	// passively withdraw other resources from containers
// 	if (
// 		structure.structureType === STRUCTURE_CONTAINER &&
// 		(structure.pos.isNearTo(structure.room.controller) || structure.pos.inRangeTo(FIND_SOURCES, 2).length > 0)
// 	) {
// 		console.log(creep.name, "passively withdrawing other resources from", structure);
// 		if (_.sum(structure.store) - structure.store[RESOURCE_ENERGY] > 0) {
// 			for (const resource of RESOURCES_ALL) {
// 				if (creep.store.getFreeCapacity() === 0) {
// 					break;
// 				}
// 				if (resource === RESOURCE_ENERGY) {
// 					continue;
// 				}
// 				if (structure.store[resource] > 0) {
// 					creep.withdraw(structure, resource);
// 				}
// 			}
// 		}
// 	}
// }

// get number of managers assigned to a room
function getManagerCount(room: Room): number {
	return _.filter(Game.creeps, creep => creep.memory.role === "manager" && creep.memory.targetRoom === room.name)
		.length;
}

// this role is for transporting energy short distances
const roleManager = {
	findTargetRoom(creep: Creep): void {
		const rooms = util.getOwnedRooms();
		for (const room of rooms) {
			if ((room.controller?.level ?? 0) < 4) {
				continue;
			}
			if (getManagerCount(room) < 1) {
				creep.memory.targetRoom = room.name;
				return;
			}
		}
	},

	getTransferTarget(creep: Creep): AnyStoreStructure | null {
		let transportTarget;
		if (creep.memory.transportTarget) {
			transportTarget = Game.getObjectById(creep.memory.transportTarget);
			if (transportTarget && transportTarget.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
				return transportTarget;
			} else {
				creep.log("Discarding current transport target");
				delete creep.memory.transportTarget;
				transportTarget = null;
			}
		}

		let sinks = brainLogistics.findSinks({
			resource: RESOURCE_ENERGY,
			roomName: creep.memory.targetRoom,
			filter: s => {
				if (s.objectId === creep.memory.lastWithdrawStructure) {
					return false;
				}
				if (creep.memory.excludeTransport) {
					if (creep.memory.excludeTransport.includes(s.objectId)) {
						return false;
					}
					if (
						creep.memory.lastWithdrawStructure &&
						brainAutoPlanner.isInRootModule(
							Game.getObjectById(creep.memory.lastWithdrawStructure) as Structure
						) &&
						s.object instanceof Structure &&
						s.object.structureType === STRUCTURE_STORAGE
					) {
						return false;
					}
				}

				if (s.object instanceof Structure && s.object.structureType === STRUCTURE_TOWER) {
					if (s.object.store.getFreeCapacity(RESOURCE_ENERGY) < 100) {
						return false;
					}
				}

				return true;
			},
		});
		creep.log(`Found ${sinks.length} sinks`);

		if (sinks.length === 0) {
			return null;
		}

		sinks = _.sortByOrder(
			sinks,
			[
				(s: ResourceSink) => {
					if (!s.object) {
						return Infinity;
					}
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
				(s: ResourceSink) => (s.object ? creep.pos.getRangeTo(s.object) : Infinity),
			],
			["asc", "asc"]
		);

		transportTarget = _.first(sinks).object;
		if (transportTarget) {
			creep.memory.transportTarget = transportTarget.id;
			return transportTarget;
		} else {
			return null;
		}
	},

	getAquireTarget(creep: Creep): AnyStoreStructure | Resource | Tombstone | Ruin | null {
		delete creep.memory.excludeTransport;
		if (!creep.memory.targetRoom) {
			creep.log("No target room, aborting");
			return null;
		}

		let aquireTarget: AnyStoreStructure | Resource | Tombstone | Ruin | null;
		if (creep.memory.aquireTarget) {
			aquireTarget = Game.getObjectById(creep.memory.aquireTarget);
			if (aquireTarget && aquireTarget instanceof Tombstone && aquireTarget.store.getUsedCapacity() > 0) {
				return aquireTarget;
			} else if (
				aquireTarget &&
				(aquireTarget instanceof Resource || aquireTarget.store.getUsedCapacity(RESOURCE_ENERGY) > 0)
			) {
				return aquireTarget;
			} else {
				delete creep.memory.aquireTarget;
				aquireTarget = null;
			}
		}

		let sources = brainLogistics.findSources({
			resource: RESOURCE_ENERGY,
			roomName: creep.memory.targetRoom,
			filter: s => {
				return (
					s.objectId !== creep.memory.lastDepositStructure &&
					!(s.object instanceof Resource && s.amount < 100)
				);
			},
		});
		creep.log(`Found ${sources.length} sources`);

		if (sources.length === 0) {
			if (Game.rooms[creep.memory.targetRoom] && !Game.rooms[creep.memory.targetRoom].storage) {
				creep.log(`Falling back because we have no storage`);
				sources = brainLogistics.findSources({
					resource: RESOURCE_ENERGY,
					filter: s => s.objectId !== creep.memory.lastDepositStructure,
				});
				creep.log(`Found ${sources.length} sources`);
				if (sources.length === 0) {
					delete creep.memory.lastDepositStructure;
					return null;
				}
			} else {
				delete creep.memory.lastDepositStructure;
				return null;
			}
		}

		if (creep.room.energyAvailable <= creep.room.energyCapacityAvailable * 0.5) {
			sources = _.sortByOrder(
				sources,
				[(s: ResourceSource) => (s.object ? creep.pos.getRangeTo(s.object) : Infinity)],
				["asc"]
			);
		} else {
			sources = _.sortByOrder(
				sources,
				[
					(s: ResourceSource) => s.object instanceof Resource,
					(s: ResourceSource) => s.object instanceof Tombstone || s.object instanceof Ruin,
					(s: ResourceSource) => s.object instanceof Resource && s.amount > 600,
					(s: ResourceSource) => (s.object ? creep.pos.getRangeTo(s.object) : Infinity),
				],
				["desc", "desc", "desc", "asc"]
			);
		}

		aquireTarget = _.first(sources).object;
		if (aquireTarget) {
			creep.memory.aquireTarget = aquireTarget.id;
			return aquireTarget;
		} else {
			return null;
		}
	},

	run(creep: Creep): void {
		if (!creep.memory.excludeTransport) {
			creep.memory.excludeTransport = [];
		}

		if (creep.fatigue > 0) {
			return;
		}

		if (creep.memory.role === "manager") {
			if (!creep.memory.targetRoom) {
				this.findTargetRoom(creep);
			}
		}

		if (
			!creep.memory.transporting &&
			(creep.store[RESOURCE_ENERGY] > creep.store.getCapacity(RESOURCE_ENERGY) * 0.75 ||
				creep.store.getFreeCapacity() === 0)
		) {
			creep.memory.transporting = true;
			creep.memory.lastWithdrawStructure = creep.memory.aquireTarget;
			creep.say("transport");
		}
		if (creep.memory.transporting && creep.store[RESOURCE_ENERGY] <= 0) {
			creep.memory.transporting = false;
			creep.memory.lastDepositStructure = creep.memory.transportTarget;
			creep.say("aquiring");
		}

		if (creep.memory.lastDepositStructure === creep.memory.lastWithdrawStructure) {
			delete creep.memory.lastDepositStructure;
		}

		if (creep.memory.transporting) {
			delete creep.memory.aquireTarget;

			if (creep.memory.lastCheckForWork !== undefined && Game.time - creep.memory.lastCheckForWork < 10) {
				creep.log("Waiting before trying to find a new target to save CPU, because we failed last time.");
				return;
			}

			const transportTarget = this.getTransferTarget(creep);
			if (!transportTarget || !creep.memory.transportTarget) {
				if (Game.time % 5 === 0) {
					delete creep.memory.lastWithdrawStructure;
				}
				creep.log("can't get a transport target");
				// eslint-disable-next-line no-underscore-dangle
				creep.memory.lastCheckForWork = Game.time;
				return;
			}
			// eslint-disable-next-line no-underscore-dangle
			delete creep.memory.lastCheckForWork;
			creep.room.visual.circle(transportTarget.pos, { stroke: "#00ff00", fill: "transparent", radius: 0.8 });
			creep.log(`Transporting to ${transportTarget}`);
			if (creep.pos.isNearTo(transportTarget)) {
				if (transportTarget.structureType === STRUCTURE_STORAGE) {
					if (creep.store.getUsedCapacity() - creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
						offloadNonEnergy(creep, transportTarget);
					} else {
						creep.transfer(transportTarget, RESOURCE_ENERGY);
					}
				} else if (transportTarget.structureType === STRUCTURE_TERMINAL) {
					const amount = Math.min(
						Memory.terminalEnergyTarget - transportTarget.store.getUsedCapacity(RESOURCE_ENERGY),
						transportTarget.store.getFreeCapacity(RESOURCE_ENERGY),
						creep.store.getUsedCapacity(RESOURCE_ENERGY)
					);
					creep.transfer(transportTarget, RESOURCE_ENERGY, amount);
				} else if (transportTarget.structureType === STRUCTURE_FACTORY) {
					const amount = Math.min(
						Memory.factoryEnergyTarget - transportTarget.store.getUsedCapacity(RESOURCE_ENERGY),
						transportTarget.store.getFreeCapacity(RESOURCE_ENERGY),
						creep.store.getUsedCapacity(RESOURCE_ENERGY)
					);
					creep.transfer(transportTarget, RESOURCE_ENERGY, amount);
				} else {
					const transferResult = creep.transfer(transportTarget, RESOURCE_ENERGY);

					if (transferResult === OK && transportTarget.structureType === STRUCTURE_TOWER) {
						delete creep.memory.transportTarget;
					}
				}
			} else {
				const result = cartographer.moveTo(creep, transportTarget, {
					keepTargetInRoom: true,
				});
				if (result === ERR_NO_PATH) {
					creep.log("Incomplete path to transport target, clearing");
					creep.memory.excludeTransport.push(creep.memory.transportTarget);
					delete creep.memory.transportTarget;
				}
			}
		} else {
			delete creep.memory.transportTarget;

			const aquireTarget = this.getAquireTarget(creep);
			if (!aquireTarget) {
				if (Game.time % 5 === 0) {
					delete creep.memory.lastDepositStructure;
				}
				creep.log("can't get a aquire target");
				if (
					creep.memory.targetRoom &&
					creep.room.name !== creep.memory.targetRoom &&
					!Game.rooms[creep.memory.targetRoom]
				) {
					cartographer.moveTo(
						creep,
						{ pos: new RoomPosition(25, 25, creep.memory.targetRoom), range: 23 },
						{
							visualizePathStyle: {},
						}
					);
				}
				return;
			}
			creep.room.visual.circle(aquireTarget.pos, { stroke: "#ff0000", fill: "transparent", radius: 0.8 });
			creep.log(`Aquiring from ${aquireTarget}`);
			if (creep.pos.isNearTo(aquireTarget)) {
				if (aquireTarget instanceof Resource) {
					creep.pickup(aquireTarget);
				} else if (aquireTarget instanceof Tombstone) {
					if (aquireTarget.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
						creep.withdraw(aquireTarget, RESOURCE_ENERGY);
					} else if (aquireTarget.store.getUsedCapacity() > 0) {
						for (const resource of RESOURCES_ALL) {
							if (resource === RESOURCE_ENERGY) {
								continue;
							}
							if (aquireTarget.store[resource] > 0) {
								creep.withdraw(aquireTarget, resource);
							}
						}
					}
				} else {
					if (
						aquireTarget instanceof Structure &&
						aquireTarget.structureType === STRUCTURE_STORAGE &&
						aquireTarget.store.getFreeCapacity() > 0 &&
						creep.store.getUsedCapacity() - creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0
					) {
						offloadNonEnergy(creep, aquireTarget);
					} else {
						creep.withdraw(aquireTarget, RESOURCE_ENERGY);
					}
				}
			} else {
				cartographer.moveTo(creep, aquireTarget, {
					keepTargetInRoom: true,
				});
			}
		}
	},
};

function offloadNonEnergy(creep: Creep, structure: AnyStoreStructure): void {
	for (const resource of RESOURCES_ALL) {
		if (resource === RESOURCE_ENERGY) {
			continue;
		}
		if (creep.store[resource] > 0) {
			creep.transfer(structure, resource);
		}
	}
}

module.exports = roleManager;
export default roleManager;
