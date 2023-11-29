import { JobRunner } from "jobs";
import { ObserveQueue } from "observequeue";
import { Role } from "roles/meta";
import util from "./util";

/** Represents a single source that is being mined remotely. */
export interface RemoteMiningTarget {
	id: Id<Source>;
	x: number;
	y: number;
	/** The room that the source is in. */
	roomName: string;
	harvestPos: { x: number; y: number };
	/** Creep name of the harvester. */
	creepHarvester: string | undefined;
	/** Creep names of the carriers. */
	creepCarriers: string[];
	neededCarriers: number;
	danger: number;
	dangerPos: { [danger: number]: RoomPosition } | undefined;
	keeperLairId: Id<StructureKeeperLair> | undefined;
	/** Indicates that the target should not be operated on. */
	paused: boolean;
}

export function commandRemoteMining(): void {
	// Force job to run: Memory.jobLastRun["command-remote-mining"] = 0
	const creepAllocation = allocateCreeps();

	for (let t = 0; t < Memory.remoteMining.targets.length; t++) {
		const target = Memory.remoteMining.targets[t];
		if (target.paused) {
			continue;
		}

		// Determine the danger level for this source
		const room = Game.rooms[target.roomName];
		if (!room) {
			Memory.remoteMining.targets[t] = target;
			ObserveQueue.queue(target.roomName);
			continue;
		}
		const source = Game.getObjectById(target.id);
		if (!source) {
			console.log("[remote mining]", target.id, "ERR: can't find source");
			continue;
		}
		const hostiles = room.find(FIND_HOSTILE_CREEPS);
		let keeperLair: StructureKeeperLair | undefined;
		if (
			hostiles
				.filter(
					creep =>
						creep.getActiveBodyparts(ATTACK) +
							creep.getActiveBodyparts(RANGED_ATTACK) +
							creep.getActiveBodyparts(HEAL) >
						0
				)
				.filter(hostile => hostile.owner.username !== "Source Keeper").length > 0
		) {
			target.danger = 2;
		} else if (util.isTreasureRoom(target.roomName)) {
			// at this point, all hostiles must be source keepers
			if (!target.keeperLairId) {
				keeperLair = (source.pos.findClosestByRange(FIND_HOSTILE_STRUCTURES, {
					filter: struct => struct.structureType === STRUCTURE_KEEPER_LAIR,
				}) ?? undefined) as StructureKeeperLair | undefined;
				target.keeperLairId = keeperLair?.id;
			} else {
				keeperLair = Game.getObjectById(target.keeperLairId) ?? undefined;
			}

			const hostileStructures = room.find(FIND_HOSTILE_STRUCTURES);
			const foundInvaderCore = _.first(
				hostileStructures.filter(struct => struct.structureType === STRUCTURE_INVADER_CORE)
			);
			if (
				foundInvaderCore &&
				hostileStructures.filter(struct => struct.structureType === STRUCTURE_TOWER).length > 0
			) {
				target.danger = 2;
			} else if (
				hostiles
					.filter(
						creep =>
							creep.getActiveBodyparts(ATTACK) +
								creep.getActiveBodyparts(RANGED_ATTACK) +
								creep.getActiveBodyparts(HEAL) >
							0
					)
					.filter(hostile => hostile.pos.getRangeTo(source) <= 8).length > 0
			) {
				target.danger = 1;
			} else if (
				keeperLair &&
				keeperLair.ticksToSpawn &&
				keeperLair.ticksToSpawn <= (JobRunner.getInstance().getInterval("command-remote-mining") ?? 0) + 5
			) {
				target.danger = 1;
			} else {
				target.danger = 0;
			}
		} else {
			target.danger = 0;
		}

		// determine ideal creep positions for increased danger levels
		if (!target.dangerPos) {
			target.dangerPos = determineDangerPos(target.harvestPos, target.roomName, source, keeperLair);
		}

		Memory.remoteMining.targets[t] = target;
	}

	if (creepAllocation.neededHarvesters > 0) {
		console.log(`[remote mining] need to spawn ${creepAllocation.neededHarvesters} remote harvesters`);
	}

	if (creepAllocation.neededCarriers > 0) {
		console.log(`[remote mining] need to spawn ${creepAllocation.neededCarriers} carriers`);
	}

	const unpausedTargets = Memory.remoteMining.targets.filter(t => !t.paused);
	Memory.remoteMining.needHarvesterCount = unpausedTargets.length;
	Memory.remoteMining.needCarrierCount = _.sum(unpausedTargets, "neededCarriers");

	// handle spawning claimers
	let targetRooms = _.uniq(
		_.filter(Memory.remoteMining.targets, target => target.danger === 0 && Game.getObjectById(target.id)).map(
			// this is safe because we filter out targets with no source
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			target => Game.getObjectById(target.id)!.room.name
		)
	);
	targetRooms = _.reject(targetRooms, roomName => util.isTreasureRoom(roomName) || util.isHighwayRoom(roomName));
	for (const room of targetRooms) {
		const controller = new Room(room).controller;
		if (!controller) {
			console.log("[remote mining] ERR: can't find controller");
		}
		if (
			controller &&
			controller.reservation &&
			controller.reservation.username === global.WHOAMI &&
			controller.reservation.ticksToEnd > 400
		) {
			continue;
		}

		let alreadyTargeted = false;
		for (const claimTarget of Memory.claimTargets) {
			if (claimTarget.room === room) {
				alreadyTargeted = true;
				break;
			}
		}

		if (!alreadyTargeted) {
			Memory.claimTargets.push({
				room,
				mode: "reserve",
			});
		}
	}
}

function getHarvestTarget(id: Id<Source>): RemoteMiningTarget | undefined {
	return _.find(Memory.remoteMining.targets, target => target.id === id);
}

interface AllocateResult {
	neededHarvesters: number;
	neededCarriers: number;
}

/**
 * Allocate creeps to remote mining targets.
 */
function allocateCreeps(): AllocateResult {
	cleanUpInvalidAllocations();
	cleanUpAllocationInconsistencies();

	let neededHarvesters = 0;
	let neededCarriers = 0;

	for (const target of Memory.remoteMining.targets) {
		if (target.paused) {
			continue;
		}
		if (target.creepHarvester) {
			const creep = Game.creeps[target.creepHarvester];
			if (!creep) {
				console.log("[remote mining]", target.id, "ERR: can't find creep");
				continue;
			}
			if (creep.memory.role !== Role.RemoteHarvester) {
				console.log("[remote mining]", target.id, "ERR: creep is not a remote harvester");
				continue;
			}
			creep.memory.harvestTarget = target.id;
		}
		if (target.creepCarriers) {
			for (const carrierName of target.creepCarriers) {
				const creep = Game.creeps[carrierName];
				if (!creep) {
					console.log("[remote mining]", target.id, "ERR: can't find creep");
					continue;
				}
				if (creep.memory.role !== Role.Carrier) {
					console.log("[remote mining]", target.id, "ERR: creep is not a carrier");
					continue;
				}
				creep.memory.harvestTarget = target.id;
			}
		}

		if (!target.neededCarriers || target.neededCarriers < 1) {
			target.neededCarriers = 1;
		}

		if (!target.creepHarvester || !target.creepCarriers) {
			console.log("[remote mining]", target.id, "needs harvester or carriers");
		}

		// assign harvester
		if (!target.creepHarvester) {
			const remoteHarvesters = util
				.getCreeps(Role.RemoteHarvester)
				.filter((creep: Creep) => !creep.memory.harvestTarget || creep.memory.harvestTarget === target.id);
			let didAssign = false;
			for (const creep of remoteHarvesters) {
				if (!creep.memory.harvestTarget || creep.memory.harvestTarget === target.id) {
					target.creepHarvester = creep.name;
					creep.memory.harvestTarget = target.id;
					didAssign = true;
					break;
				}
			}
			if (!didAssign) {
				neededHarvesters++;
			}
		}

		// assign carriers that need to be assigned
		if (target.creepCarriers.length < target.neededCarriers) {
			const carriers = util
				.getCreeps(Role.Carrier)
				.filter((creep: Creep) => !creep.memory.harvestTarget || creep.memory.harvestTarget === target.id);
			let countAssigned = 0;
			for (const creep of carriers) {
				if (creep.memory.harvestTarget && creep.memory.harvestTarget === target.id) {
					creep.memory.harvestTarget = target.id;
					countAssigned++;
				} else if (!creep.memory.harvestTarget && !target.creepCarriers.includes(creep.name)) {
					target.creepCarriers.push(creep.name);
					creep.memory.harvestTarget = target.id;
					countAssigned++;
				}
				if (countAssigned >= target.neededCarriers) {
					break;
				}
			}
			neededCarriers += target.neededCarriers - countAssigned;
		}
	}

	return { neededHarvesters, neededCarriers };
}

export function cleanUpInvalidAllocations(): void {
	// clean up invalid references in creep memory
	for (const creep of util.getCreeps(Role.RemoteHarvester, Role.Carrier)) {
		if (!creep.memory.harvestTarget) {
			continue;
		}
		const target = getHarvestTarget(creep.memory.harvestTarget);
		if (!target) {
			delete creep.memory.harvestTarget;
		}
	}

	// clean up invalid references in targets
	for (const target of Memory.remoteMining.targets) {
		if (!target.creepHarvester) {
			continue;
		}
		const creep = Game.creeps[target.creepHarvester];
		if (!creep) {
			target.creepHarvester = undefined;
		}
		for (const carrier of target.creepCarriers) {
			const creepCarrier = Game.creeps[carrier];
			if (!creepCarrier) {
				target.creepCarriers = _.without(target.creepCarriers, carrier);
			}
		}
	}
}

export function cleanUpAllocationInconsistencies(): void {
	for (const creep of util.getCreeps(Role.RemoteHarvester, Role.Carrier)) {
		if (!creep.memory.harvestTarget) {
			continue;
		}
		const target = getHarvestTarget(creep.memory.harvestTarget);
		if (!target) {
			continue;
		}

		if (creep.memory.role === Role.RemoteHarvester) {
			if (creep.name !== target.creepHarvester) {
				delete creep.memory.harvestTarget;
			}
		} else if (creep.memory.role === Role.Carrier) {
			if (!target.creepCarriers.includes(creep.name)) {
				delete creep.memory.harvestTarget;
			}
		}
	}
}

function determineDangerPos(
	harvestPosition: { x: number; y: number },
	roomName: string,
	source: Source,
	keeperLair: StructureKeeperLair | undefined
): { [danger: number]: RoomPosition } {
	const harvestPos = new RoomPosition(harvestPosition.x, harvestPosition.y, roomName);
	const keepAwayFrom = keeperLair
		? [
				{ pos: source.pos, range: 6 },
				{ pos: keeperLair.pos, range: 5 },
		  ]
		: { pos: source.pos, range: 6 };
	return {
		1: _.last(
			PathFinder.search(harvestPos, keepAwayFrom, {
				flee: true,
			}).path
		),
		2: _.filter(
			PathFinder.search(
				harvestPos,
				{
					// @ts-expect-error FIXME: this could use a refactor probably
					pos: _.filter(util.findClosestOwnedRooms(harvestPos), r => r.storage)[0].storage.pos,
					range: 4,
				},
				{}
			).path,
			pos => pos.roomName !== roomName && !util.isDistFromEdge(pos, 3)
		)[0],
	};
}
