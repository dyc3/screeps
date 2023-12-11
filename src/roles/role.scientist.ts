import * as cartographer from "screeps-cartographer";

import brainLogistics, { ResourceSink, ResourceSource } from "../brain.logistics";
import brainAutoPlanner from "../brain.autoplanner.js";

export interface Route {
	resource: ResourceConstant;
	depositTargetId: Id<AnyStoreStructure>;
	withdrawTargetId?: Id<AnyStoreStructure | Tombstone | Ruin | Resource>;
}

const roleScientist = {
	/**
	 * Gets a new delivery route for the scientist creep
	 */
	getDeliveryRoute(creep: Creep): Route | undefined {
		if (creep.store.getUsedCapacity() > 0) {
			creep.log("Carrying resource, finding a sink");

			for (const r in creep.store) {
				const resource = r as ResourceConstant;
				let sinks = brainLogistics.findSinks({ resource });
				sinks = _.sortByOrder(
					sinks,
					[
						(s: ResourceSink) => s.roomName === creep.memory.targetRoom,
						(s: ResourceSink) => (s.object ? creep.pos.getRangeTo(s.object) : Infinity),
					],
					["desc", "asc"]
				);

				if (sinks.length === 0) {
					creep.log(`WARN: Can't find any sinks for ${resource}`);
					if (creep.room.storage) {
						creep.log("WARN: falling back to storing in storage");
						return {
							resource,
							depositTargetId: creep.room.storage.id,
						};
					} else {
						continue;
					}
				}

				const depositSink = _.first(sinks);
				const depositTarget = depositSink.object;
				if (!depositTarget) {
					creep.log(`WARN: Can't find any sinks for ${resource}`);
					continue;
				}
				return {
					resource,
					depositTargetId: depositTarget.id,
				};
			}
		} else {
			creep.log("Finding source and sink");
			let sinks = brainLogistics.findSinks();
			sinks = _.sortByOrder(
				sinks,
				[
					(s: ResourceSink) => s.roomName === creep.memory.targetRoom,
					(s: ResourceSink) => s.resource !== RESOURCE_ENERGY,
					(s: ResourceSink) => (s.object ? creep.pos.getRangeTo(s.object) : Infinity),
				],
				["desc", "desc", "asc"]
			);

			for (const depositSink of sinks) {
				const depositTarget = depositSink.object;
				if (!depositTarget) {
					continue;
				}
				const targetResource = depositSink.resource;
				let sources = brainLogistics.findSources({
					resource: targetResource,
					filter: s => {
						if (!s.object) {
							return false;
						}
						if (targetResource === RESOURCE_ENERGY) {
							if (
								((s.object instanceof Structure && brainAutoPlanner.isInRootModule(s.object)) ||
									(s.object instanceof Structure && s.object.structureType === STRUCTURE_STORAGE)) &&
								((depositSink.object instanceof Structure &&
									brainAutoPlanner.isInRootModule(depositSink.object)) ||
									(depositSink.object instanceof Structure &&
										depositSink.object.structureType === STRUCTURE_STORAGE))
							) {
								return false;
							}
							if (depositSink.roomName !== s.roomName) {
								return false;
							}
						}
						return s.objectId !== depositSink.objectId;
					},
				});
				sources = _.sortByOrder(
					sources,
					[
						(s: ResourceSource) => s.roomName === depositSink.roomName,
						(s: ResourceSource) => (s.object ? s.amount : 0),
						(s: ResourceSource) => (s.object ? creep.pos.getRangeTo(s.object) : Infinity),
						(s: ResourceSource) => (s.object ? depositTarget.pos.getRangeTo(s.object) : Infinity),
					],
					["desc", "desc", "asc", "asc"]
				);

				if (sources.length === 0) {
					continue;
				}
				// kinda sorta avoid doing a bunch of small transfers
				const sourcesTotal = _.sum(sources, s => s.amount);
				// HACK: adding the random chance to sometimes not do this is faster than aggregating and sorting all the possible routes
				if (sourcesTotal <= 20 && Math.random() < 0.2) {
					continue;
				}

				return {
					resource: targetResource,
					depositTargetId: depositTarget.id,
					withdrawTargetId: _.first(sources).object?.id,
				};
			}
		}
		return undefined;
	},

	run(creep: Creep): void {
		if (creep.memory.route) {
			if (creep.memory.route.depositTargetId === creep.memory.route.withdrawTargetId) {
				creep.log("withdraw and deposit targets are the same, removing route");
				delete creep.memory.route;
			} else if (creep.memory.transporting && creep.store.getUsedCapacity(creep.memory.route.resource) === 0) {
				creep.log("currently transporting 0 of the resource, deleting route");
				delete creep.memory.route;
			}
			// THIS SHOULD NEVER HAPPEN, so commenting out for performance
			// else if (_.isEmpty(creep.memory.route)) {
			// 	creep.log("Route is empty, removing");
			// 	delete creep.memory.route;
			// }
		}

		if (creep.memory.route === undefined) {
			creep.memory.route = this.getDeliveryRoute(creep);
			creep.memory.transporting = false;
		} else {
			if (!creep.memory.transporting && creep.store.getUsedCapacity() > 0) {
				creep.memory.transporting = true;
				creep.say("transport");
			} else if (creep.memory.transporting && creep.store.getUsedCapacity() === 0) {
				creep.memory.transporting = false;
				creep.say("aquiring");
			}
		}

		if (creep.memory.route && !creep.memory.route.withdrawTargetId) {
			creep.memory.transporting = true;
		}

		if (creep.memory.route === undefined) {
			creep.log("No route found");
			return;
		} else {
			// visualize route
			const depositColor = "#00ff00";
			const withdrawColor = "#ff0000";
			const depositTarget = Game.getObjectById(creep.memory.route.depositTargetId);
			if (depositTarget) {
				if (creep.room.name === depositTarget.room.name) {
					creep.room.visual.line(creep.pos, depositTarget.pos, {
						color: depositColor,
						lineStyle: "dotted",
					});
				} else {
					depositTarget.room.visual.circle(depositTarget.pos, {
						stroke: depositColor,
						fill: "transparent",
						radius: 0.8,
						lineStyle: "dotted",
					});
				}
			}

			if (creep.memory.route && creep.memory.route.withdrawTargetId) {
				const withdrawTarget = Game.getObjectById(creep.memory.route.withdrawTargetId);
				if (withdrawTarget) {
					if (creep.room.name === withdrawTarget.pos.roomName) {
						creep.room.visual.line(creep.pos, withdrawTarget.pos, {
							color: withdrawColor,
							lineStyle: "dotted",
						});
					} else {
						withdrawTarget.room?.visual.circle(withdrawTarget.pos, {
							stroke: withdrawColor,
							fill: "transparent",
							radius: 0.8,
							lineStyle: "dotted",
						});
					}

					if (depositTarget && depositTarget.room.name === withdrawTarget.pos.roomName) {
						creep.room.visual.line(withdrawTarget.pos, depositTarget.pos, {
							color: "#ffff00",
							lineStyle: "dotted",
						});
					}
				}
			}
		}

		if (creep.memory.route.withdrawTargetId) {
			creep.log(
				`${
					creep.memory.transporting
						? `transporting ${creep.memory.route.resource} to ${Game.getObjectById(
								creep.memory.route.depositTargetId
						  )}`
						: `aquiring ${creep.memory.route.resource} from ${Game.getObjectById(
								creep.memory.route.withdrawTargetId
						  )}`
				}`
			);
		} else {
			creep.log(
				`${
					creep.memory.transporting
						? `transporting ${creep.memory.route.resource} to ${Game.getObjectById(
								creep.memory.route.depositTargetId
						  )}`
						: `aquiring ${creep.memory.route.resource}`
				}`
			);
		}

		if (creep.memory.transporting) {
			const depositTarget = Game.getObjectById(creep.memory.route.depositTargetId);
			if (!depositTarget) {
				creep.log("deposit target does not exist, removing route");
				delete creep.memory.route;
				return;
			}
			if ((depositTarget.store.getFreeCapacity(creep.memory.route.resource) ?? 0) > 0) {
				if (creep.pos.isNearTo(depositTarget)) {
					const result = creep.transfer(depositTarget, creep.memory.route.resource);
					if (result === ERR_FULL) {
						creep.log("deposit target is full, deleting route");
						delete creep.memory.route;
					}
				} else {
					cartographer.moveTo(creep, depositTarget);
				}
			} else {
				creep.log("deposit target is full, deleting route");
				delete creep.memory.route;
			}
		} else {
			if (!creep.memory.route.withdrawTargetId) {
				creep.log("no withdraw target, deleting route");
				delete creep.memory.route;
				return;
			}
			const withdrawTarget = Game.getObjectById(creep.memory.route.withdrawTargetId);
			if (!withdrawTarget) {
				creep.log("withdraw target does not exist, removing route");
				delete creep.memory.route;
				return;
			}
			const resourceAmount =
				withdrawTarget instanceof Resource
					? withdrawTarget.amount
					: withdrawTarget.store.getUsedCapacity(creep.memory.route.resource) ?? 0;
			if (withdrawTarget && resourceAmount > 0) {
				if (creep.pos.isNearTo(withdrawTarget)) {
					if (withdrawTarget instanceof Resource) {
						creep.pickup(withdrawTarget);
					} else {
						creep.withdraw(withdrawTarget, creep.memory.route.resource);
						if (resourceAmount <= creep.store.getCapacity()) {
							creep.log("withdraw target is empty, deleting withdraw target");
							delete creep.memory.withdrawTargetId;
						}
					}
				} else {
					cartographer.moveTo(creep, withdrawTarget);
				}
			} else {
				creep.log("withdraw target is empty, deleting route");
				delete creep.memory.route;
			}
		}
	},
};

module.exports = roleScientist;
export default roleScientist;
