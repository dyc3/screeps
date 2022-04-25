import { ErrorMapper } from "utils/ErrorMapper";

// https://wiki.screepspl.us/index.php/Private_Server_Common_Tasks
// https://lodash.com/docs/3.10.1

// Game.powerCreeps["Ligma"].renew(Game.getObjectById("5ca9a834279bd66008505768")); Game.powerCreeps["Ligma"].memory.renewing = false
// Game.powerCreeps["Ligma"].transfer(Game.getObjectById("5b9466c81c8bff516101da4d"), RESOURCE_OPS)
// Game.powerCreeps["Ligma"].withdraw(Game.getObjectById("5b9466c81c8bff516101da4d"), RESOURCE_POWER)
// Game.powerCreeps["Ligma"].transfer(Game.getObjectById("5ca9a834279bd66008505768"), RESOURCE_POWER)

// var sci = Game.creeps["scientist1"]; sci.withdraw(sci.room.storage, "U"); sci.transfer(sci.room.terminal, "U")

// Prep attack group for a long journey
// let creeps = ["", "", ""]; for (var i = 0; i < creeps.length; i++) { Game.creeps[creeps[i]].memory.renewing = true; Game.creeps[creeps[i]].memory.renew_force_amount = 1400; }

// Game.spawns["Spawn1"].createCreep([CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE], "scientist_1", {role:"scientist", keepAlive:true})
// Game.spawns["Spawn1"].createCreep([CARRY,MOVE], "scientist_1", {role:"scientist", keepAlive:false})
// Game.spawns["Spawn1"].createCreep([WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE], "miner_1", {role:"miner", keepAlive:true, stage:3})
// Mega builder:
// Game.spawns["Spawn1"].createCreep([WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK, CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE], "builder_1", {role:"builder", keepAlive:true, stage:5})
// Game.spawns["Spawn1"].createCreep([WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK, CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE], "upgrader_1", {role:"upgrader", keepAlive:true, stage:5, targetRoom:"W13N11"})
// Scouts:
// Game.spawns["Spawn1"].createCreep([MOVE], "scout_1", {role:"scout", keepAlive:false})
// Game.spawns["Spawn1"].createCreep([WORK,WORK,WORK,MOVE,MOVE,MOVE], "scout_1", {role:"scout", keepAlive:false}) // use to dismantle with flag "scoutdismantle"
// Game.spawns["Spawn1"].createCreep([CARRY,MOVE], "relay_1", {role:"relay", keepAlive:false})

// Game.spawns["Spawn1"].createCreep([CLAIM,MOVE], "claimer_1", {role:"claimer", keepAlive:false})
// Game.spawns["Spawn5"].createCreep([CLAIM,CLAIM,CLAIM,CLAIM,CLAIM,CLAIM,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,], "claimer_1", {role:"claimer", keepAlive:false, mode:"reserve", claimTarget:""})

// Delivery creep templates
// 500 capacity:
// Game.spawns["Spawn1"].createCreep([CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE], "tmpdeliver_1", {role:"tmpdeliver", keepAlive:true, stage: 0, withdrawTargetId: "", depositTargetId:"" })
// 1000 capacity:
// Game.spawns["Spawn1"].createCreep([CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE], "tmpdeliver_1", {role:"tmpdeliver", keepAlive:true, stage: 0, withdrawTargetId: "", depositTargetId:"" })

// invader harvester carrier:
// Game.spawns["Spawn1"].createCreep([TOUGH,TOUGH,MOVE,MOVE,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE], "carrier_1", {role:"carrier", keepAlive:true, stage: 2, mode: "invader-core-harvesting", targetRoom:"" })

// Memory.mineralsToSell

// Remove all construction sites:
// const sites = Game.rooms[roomName].find(FIND_CONSTRUCTION_SITES); for (const site of sites) { site.remove(); }

// Sell energy:
// let order = ""; [Game.market.deal(order, 50000, "W15N8"), Game.market.deal(order, 50000, "W16N9")]

// Game.creeps["upgrader_801392"].signController(Game.getObjectById("59f1a21c82100e1594f39717"), "")
// Game.rooms["W16N9"].terminal.send(RESOURCE_ENERGY, 48250, "W15N8")
// Game.rooms["W15N8"].terminal.send(RESOURCE_ENERGY, 48250, "W16N9")
// Game.rooms["W16N9"].terminal.send(RESOURCE_ENERGY, 75000, "W13N11")
// Game.rooms["W15N8"].terminal.send(RESOURCE_ENERGY, 75000, "W13N11")
/*
# SOME NOTES

See tools.js for console accessible functions.

## Room auto planning

Room memory: `Memory.rooms.ROOMNAME`
- `rootPos`: root module position
	- `{x: 0, y: 0}`
- `storagePos`: storage module position
	- `{x: 0, y: 0}`
- `storagePosDirection`: number to dictate which direction from `storage` the relay position in the storage module should be

## Flag commands
- `fill:MINERAL` fill the store with the mineral
- `make:MINERAL` make a mineral in a lab
- `unmake:MINERAL` unmake a mineral in a lab

## Misc

* To force the rootPos of a room to be set somewhere, place a flag with the name "setRootPos"
* To manually create short roads quickly, you can place 2 flags: "planStart" and "planEnd".
* To harvest a remote room (only 1 at a time), place a flag "harvestme" on target energy source (needs room vision to work)
* To move around different chemicals, place flags on desination structures with the format "fill:MINERAL". Examples: "fill:U", "fill2:UH"
* To set a rampart's public status quickly, place a flag with the name "setPublic" and set the color to green for true, and red for false. Other colors will be ignored.

## Testing

* To manually test brainAutoPlanner.planWalls(), place a flag named "planWalls" in the room you want to test.

*/

import _ from "lodash";
import "./tools.js";
import util from "./util";
import visualize from "./visualize";
import { Role } from './roles/meta';

// @ts-expect-error hasn't been converted yet
import roleHarvester from "roles/role.harvester.js";
// @ts-expect-error hasn't been converted yet
import roleUpgrader from "roles/role.upgrader.js";
// @ts-expect-error hasn't been converted yet
import roleManager from "roles/role.manager.js";
// @ts-expect-error hasn't been converted yet
import roleBuilder from "roles/role.builder.js";
// @ts-expect-error hasn't been converted yet
import roleRepairer from "roles/role.repairer.js";
// @ts-expect-error hasn't been converted yet
import roleClaimer from "roles/role.claimer.js";
// @ts-expect-error hasn't been converted yet
import roleRemoteHarvester from "roles/role.remoteharvester.js";
// @ts-expect-error hasn't been converted yet
import roleCarrier from "roles/role.carrier.js";
// @ts-expect-error hasn't been converted yet
import roleScout from "roles/role.scout.js";
// @ts-expect-error hasn't been converted yet
import roleMiner from "roles/role.miner.js";
// @ts-expect-error hasn't been converted yet
import roleScientist from "roles/role.scientist.js";
// @ts-expect-error hasn't been converted yet
import roleRelay from "roles/role.relay.js";
// @ts-expect-error hasn't been converted yet
import roleTmpDeliver from "roles/role.tmpdeliver.js";

// @ts-expect-error hasn't been converted yet
import roleTower from "roles/role.tower.js";
// @ts-expect-error hasn't been converted yet
import powercreepLigma from "./powercreep.ligma.js";

// @ts-expect-error hasn't been converted yet
import taskRenew from "./task.renew.js";
// @ts-expect-error hasn't been converted yet
import taskDepositMaterials from "./task.depositmaterials.js";

import toolCreepUpgrader, { RoleMetadata } from "tool.creepupgrader";
// @ts-expect-error hasn't been converted yet
import toolRoadPlanner from "tool.roadplanner.js";

// @ts-expect-error hasn't been converted yet
import brainAutoPlanner from "./brain.autoplanner.js";
// @ts-expect-error hasn't been converted yet
import brainGuard from "./brain.guard.js";
// @ts-expect-error hasn't been converted yet
import brainLogistics from "./brain.logistics.js";
// @ts-expect-error hasn't been converted yet
import brainHighwayHarvesting from "./brain.highwayharvesting.js";
// @ts-expect-error hasn't been converted yet
import brainOffense from "./brain.offense.js";

declare global {
	/*
    Example types, expand on these or remove them and add your own.
    Note: Values, properties defined here do no fully *exist* by this type definiton alone.
          You must also give them an implemention if you would like to use them. (ex. actually setting a `role` property in a Creeps memory)

    Types added in this `global` block are in an ambient, global context. This is needed because `main.ts` is a module file (uses import or export).
    Interfaces matching on name from @types/screeps will be merged. This is how you can extend the 'built-in' interfaces from @types/screeps.
  */
	// Memory extension samples
	interface Memory {
		highlightCreepLog: string[];
		mineralsToSell: ResourceConstant[];
		remoteMining: {
			needHarvesterCount: number;
			needCarrierCount: number;
			targets: any[]; // TODO: define this
		};
		expansionTarget: string; // FIXME: deprecated?
		terminalEnergyTarget: number;
		factoryEnergyTarget: number;
		claimTargets: any[]; // TODO: define this
		job_queue: any[]; // TODO: define this
		job_last_run: any; // TODO: define this
		forceCreepSpawn: boolean; // TODO: deprecate this? maybe there's a better way to implemnt this kind of thing
		creepSpawnLog: string[];
		guard: {
			tasks: any[]; // TODO: define this
		};
		USE_ADV_LOGISTICS: boolean;
		/** @deprecated */
		attackTarget: string;
	}

	interface CreepMemory {
		role: Role;
		room: string;
		keepAlive: boolean;
		stage: number;
		renewing: boolean;
		renewTarget: Id<StructureSpawn>;

		// TODO: make role-specific memory types
		depositMode?: any;
		harvestTarget?: any;
		targetRoom?: any;
		assignedPos?: any;
		mode?: any;
	}

	interface RoomMemory {
		harvestPositions: any; // TODO: define this
		defcon: number;
		rootLink?: Id<StructureLink>;
		storageLink?: Id<StructureLink>;
		rootPos: any; // TODO: define this
		storagePos: any; // TODO: define this
		/** @deprecated not sure if this is actually being used */
		storagePosDirection?: DirectionConstant;
	}

	// Syntax for adding proprties to `global` (ex "global.log")
	namespace NodeJS {
		interface Global {
			log: any;
			WHOAMI: string;
			CONTROLLER_UPGRADE_RANGE: number;
			DROPPED_ENERGY_GATHER_MINIMUM: number;
		}
	}
}

// @ts-expect-error needs to be deprecated for a better solution
global.WHOAMI = _.find(Game.structures).owner.username as string;
global.CONTROLLER_UPGRADE_RANGE = 3;
global.DROPPED_ENERGY_GATHER_MINIMUM = 100;

/** @deprecated: use `util.printException()` instead */
const printException = util.printException;

function printStatus() {
	const rooms = util.getOwnedRooms();

	// print misc info
	let infoText = "";
	infoText += "tick: " + Game.time + "  |  ";
	if (Game.cpu.tickLimit != Infinity) {
		infoText +=
			"CPU: " +
			Game.cpu.getUsed().toPrecision(3) +
			"/" +
			Game.cpu.tickLimit +
			" - " +
			Game.cpu.bucket.toPrecision(5) +
			"  |  ";
	}
	infoText +=
		"GCL " +
		Game.gcl.level +
		", " +
		((Game.gcl.progress / Game.gcl.progressTotal) * 100).toPrecision(4) +
		"% " +
		Math.round(Game.gcl.progress) +
		"/" +
		Math.round(Game.gcl.progressTotal) +
		"  |  ";
	if (rooms.length > 1) {
		infoText += "rooms: " + rooms.length + "  |  ";
	}
	for (let i = 0; i < rooms.length; i++) {
		const room = rooms[i];
		infoText +=
			room.name +
			" (defcon " +
			room.memory.defcon +
			") energy: " +
			room.energyAvailable +
			"/" +
			room.energyCapacityAvailable +
			"  ";
	}
	infoText += "  |  ";
	if (Memory.expansionTarget) {
		infoText += "expansionTarget: " + Memory.expansionTarget;
	}
	console.log(infoText);
}

/**
 * Calculates the defcon level for a given room.
 * If we have no towers, and a foriegn player enters a room, defcon 1.
 * If we have towers, and a foriegn player enters a room with a scouting creep, defcon 0.
 * If we have towers, and foriegn creeps with attack/tough/heal/ranged attack, defcon 2.
 *
 * Defcon levels:
 * 0 - Safe, No threat
 * 1 - Warning, spawn a little defense (if no towers yet).
 * 2 - Under attack, determine if current defense can handle attack.
 *
 */
function calculateDefcon(room: Room) {
	console.log("calculating defcon:", room.name);
	if (!room.controller) {
		// invalid room
		return 0;
	}

	let defcon = 0;
	if (room.controller.safeMode) {
		console.log("safe mode is active, defcon 0");
		return 0;
	}
	const towers = util.getStructures(room, STRUCTURE_TOWER) as StructureTower[];
	const spawns = util.getStructures(room, STRUCTURE_SPAWN) as StructureSpawn[];
	if (towers.length > 0) {
		const hostileCreeps = room.find(FIND_HOSTILE_CREEPS, {
			filter: (creep: Creep) =>
				creep.getActiveBodyparts(ATTACK) +
					creep.getActiveBodyparts(HEAL) +
					creep.getActiveBodyparts(TOUGH) +
					creep.getActiveBodyparts(RANGED_ATTACK) +
					creep.getActiveBodyparts(WORK) >
				0,
		});
		if (hostileCreeps.length > 0) {
			console.log(room.name, "hostile creeps: ", hostileCreeps.length);
			defcon = 2;
		}
	} else {
		const hostileCreeps = room.find(FIND_HOSTILE_CREEPS);
		if (hostileCreeps.length > 0) {
			const dangerous = hostileCreeps.filter(
				(creep: Creep) =>
					creep.getActiveBodyparts(ATTACK) +
						creep.getActiveBodyparts(HEAL) +
						creep.getActiveBodyparts(TOUGH) +
						creep.getActiveBodyparts(RANGED_ATTACK) +
						creep.getActiveBodyparts(WORK) >
					0
			);
			console.log(room.name, "hostile creeps:", hostileCreeps.length, "dangerous:", dangerous.length);
			if (dangerous.length > 0) {
				// HACK: trigger safe mode on known bad things
				if (
					dangerous.filter(
						(c: Creep) =>
							c.getActiveBodyparts(ATTACK) +
								c.getActiveBodyparts(HEAL) +
								c.getActiveBodyparts(TOUGH) +
								c.getActiveBodyparts(RANGED_ATTACK) >
							20
					).length >=
					2 * towers.length
				) {
					defcon = 3;
				} else {
					defcon = 2;
				}
			} else {
				defcon = 1;
			}
		} else {
			defcon = 0;
		}
	}

	if (defcon === 2) {
		// TODO: decide if a safe mode is needed or not

		// determine hostile heal/tick
		// determine our damage/tick
		// determine hostile ETA to our closest asset
		// if hostile ETA < enemy HP / (our damage per tick - enemy heal per tick), activate safe mode
		// otherwise, defend

		// https://screeps.com/forum/topic/922/tower-damage/6

		const safeModeNeeded = _.any(
			spawns.map(s => s.hits < s.hitsMax),
			Boolean
		);
		const safeModePossible = room.controller.safeModeCooldown === 0 && room.controller.safeModeAvailable > 0;

		// FIXME: untested
		if (safeModePossible && safeModeNeeded) {
			console.log("ACTIVATE SAFE MODE");
			room.controller.activateSafeMode();
		}
	} else if (defcon === 3) {
		console.log("ACTIVATE SAFE MODE");
		room.controller.activateSafeMode();
	}

	return defcon;
}

/**
 * Determines defcon levels for all rooms.
 * @returns Number The highest defcon level in all of the rooms
 */
function determineDefconLevels() {
	if (Game.cpu.bucket < 50 && Game.time % 5 != 0) {
		console.log("skipping defcon calculation to save cpu");
		return;
	}

	// NOTE: I don't think all this defcon stuff actually works. Redo it in a module called brain.defense
	const rooms = util.getOwnedRooms();
	let highestDefcon = 0;
	for (let r = 0; r < rooms.length; r++) {
		const room = rooms[r];
		const defcon = calculateDefcon(room);
		highestDefcon = Math.max(defcon, highestDefcon);
		room.memory.defcon = defcon;
	}
	return highestDefcon;
}

function doLinkTransfers() {
	const LINK_ENERGY_CAPACITY_THRESHOLD = 5;
	const rooms = util.getOwnedRooms();

	/**
	 * Shuffles array in place. ES6 version
	 */
	function shuffle(a: any[]) {
		for (let i = a.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[a[i], a[j]] = [a[j], a[i]];
		}
		return a;
	}

	for (let r = 0; r < rooms.length; r++) {
		const room = rooms[r];
		const links = shuffle(util.getStructures(room, STRUCTURE_LINK));
		if (links.length > 0) {
			if (!room.memory.rootLink) {
				try {
					const rootLinkPos = room.getPositionAt(room.memory.rootPos.x, room.memory.rootPos.y - 2);
					if (!rootLinkPos) {
						throw new Error("root link pos invalid");
					}
					// @ts-expect-error idk why tf this isnt working
					room.memory.rootLink = rootLinkPos.lookFor(LOOK_STRUCTURES, rootLinkPos)[0].id;
				} catch (e) {
					console.log("WARN: no root link found in room", room.name);
					continue;
				}
			}
			const rootLink = Game.getObjectById(room.memory.rootLink as Id<StructureLink>);
			if (!rootLink) {
				console.log("can't find root link id:", room.memory.rootLink);
				delete room.memory.rootLink;
				continue;
			}

			if (
				rootLink.store.getUsedCapacity(RESOURCE_ENERGY) <
				rootLink.store.getCapacity(RESOURCE_ENERGY) - LINK_ENERGY_CAPACITY_THRESHOLD
			) {
				console.log(room.name, "[link-transfer] rootLink below threshold");
				for (let i = 0; i < links.length; i++) {
					const link = links[i];
					if (link.id === rootLink.id) {
						continue;
					}
					if (link.cooldown > 0 || link.energy === 0) {
						continue;
					}
					console.log("[link-transfer] transfer from", link.pos, "to rootLink");
					link.transferEnergy(rootLink);
					break; // only transfer energy from one link per tick
				}
				continue;
			}

			if (!room.memory.storageLink) {
				const found = links.filter(link => link.pos.inRangeTo(link.room.storage, 2));
				if (found.length > 0) {
					room.memory.storageLink = found[0].id;
				}
			}
			if (!room.memory.storageLink) {
				console.log("No storage link found");
				continue;
			}
			const storageLink = Game.getObjectById(room.memory.storageLink);
			if (!storageLink) {
				console.log("can't find storage link id:", room.memory.storageLink);
				delete room.memory.storageLink;
				continue;
			}

			if (
				storageLink.store.getUsedCapacity(RESOURCE_ENERGY) <
				storageLink.store.getCapacity(RESOURCE_ENERGY) - LINK_ENERGY_CAPACITY_THRESHOLD
			) {
				for (let i = 0; i < links.length; i++) {
					const link = links[i];
					if (link.id === storageLink.id || link.id === rootLink.id) {
						continue;
					}
					if (link.cooldown > 0 || link.energy === 0) {
						continue;
					}
					link.transferEnergy(storageLink);
					break; // only transfer energy from one link per tick
				}
			}
		}
	}
}

// giving orders via flags and stuff
// it's kinda messy
function doFlagCommandsAndStuff() {
	// make roads quickly
	if (
		Game.flags.planStart &&
		Game.flags.planEnd &&
		(Game.cpu.getUsed() < Game.cpu.limit || Game.cpu.bucket == 10000)
	) {
		toolRoadPlanner.planPath(Game.flags.planStart.pos, Game.flags.planEnd.pos);
		toolRoadPlanner.clearAllPlanFlags();
	}

	if (Game.flags.attack && !Memory.attackTarget) {
		try {
			const lookStruct = Game.flags.attack.pos.lookFor(LOOK_STRUCTURES);
			if (lookStruct.length > 0) {
				Memory.attackTarget = lookStruct[0].id;
			} else {
				const closestCreep = Game.flags.attack.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
				if (closestCreep) {
					Memory.attackTarget = closestCreep.id;
				} else {
					// @ts-expect-error
					delete Memory.attackTarget;
				}
			}
		} catch (e) {
			// 			printException(e);
		} finally {
		}
	}

	if (Game.flags.nextroom) {
		Memory.expansionTarget = Game.flags.nextroom.pos.roomName;
		Game.flags.nextroom.remove();
		console.log("expansionTarget set:", Memory.expansionTarget);
	}

	if (Game.flags.setRootPos) {
		const pos = Game.flags.setRootPos.pos;
		console.log("force set root pos in", pos.roomName, ":", pos.x, ",", pos.y);
		new Room(pos.roomName).memory.rootPos = pos;
		Game.flags.setRootPos.remove();
	}

	if (Game.flags.harvestme) {
		const pos = Game.flags.harvestme.pos;
		const newTarget = {
			x: pos.x,
			y: pos.y,
			roomName: pos.roomName,
			harvestPos: {},
			id: "",
			neededCarriers: 1,
			danger: 0,
		};
		// check if we are already harvesting this target
		if (_.find(Memory.remoteMining.targets, { x: newTarget.x, y: newTarget.y, roomName: newTarget.roomName })) {
			console.log("ERR: already harvesting this target");
			Game.flags.harvestme.remove();
			return;
		}

		try {
			const lookResult = pos.lookFor(LOOK_SOURCES);
			if (lookResult.length > 0) {
				newTarget.id = lookResult[0].id;

				// set harvestPos
				const adj = util.getAdjacent(pos);
				for (let i = 0; i < adj.length; i++) {
					// look for structures
					const lookResult = adj[i].look();
					let isValid = true;
					for (let l = 0; l < lookResult.length; l++) {
						const look = lookResult[l];
						if (look.type !== LOOK_STRUCTURES && look.type !== LOOK_TERRAIN) {
							continue;
						}

						if (look.type === LOOK_TERRAIN) {
							if (look.terrain === "wall") {
								isValid = false;
								break;
							}
						} else if (look.type === LOOK_STRUCTURES) {
							if (
								look.structure &&
								look.structure.structureType !== STRUCTURE_ROAD &&
								look.structure.structureType !== STRUCTURE_CONTAINER
							) {
								isValid = false;
								break;
							}
						}
					}
					if (!isValid) {
						continue;
					}

					newTarget.harvestPos = { x: adj[i].x, y: adj[i].y };
					break;
				}
			} else {
				console.log("no source found");
				Game.flags.harvestme.remove();
				return;
			}
		} catch (e) {
			// need vision
			// @ts-expect-error
			const observer = Game.getObjectById("5c4fa9d5fd6e624365ff19fc") as StructureObserver; // TODO: make dynamic
			observer.observeRoom(pos.roomName);
			throw new Error("need vision of room to complete job");
		}
		console.log("adding new target to remote mining:", newTarget.id);
		Memory.remoteMining.targets.push(newTarget);
		Game.flags.harvestme.remove();
	}

	if (Game.flags.setPublic) {
		const lookResult = _.filter(
			Game.flags.setPublic.pos.lookFor(LOOK_STRUCTURES),
			struct => struct.structureType === STRUCTURE_RAMPART
		);
		if (lookResult.length > 0) {
			const rampart = lookResult[0] as StructureRampart;
			if (Game.flags.setPublic.color === COLOR_GREEN || Game.flags.setPublic.color === COLOR_RED) {
				rampart.setPublic(Game.flags.setPublic.color === COLOR_GREEN);
			}
			Game.flags.setPublic.remove();
		} else {
			Game.flags.setPublic.remove();
		}
	}

	for (const f in Game.flags) {
		const flag = Game.flags[f];
		// check if dismantle and norepair flags have structures under them
		if (flag.name.startsWith("dismantle") || flag.name.includes("norepair")) {
			if (Game.rooms[flag.pos.roomName] && flag.pos.lookFor(LOOK_STRUCTURES).length == 0) {
				flag.remove();
			}
		}
	}
}

function commandEnergyRelays() {
	const rooms = util.getOwnedRooms();

	const relayCreeps = util.getCreeps(Role.Relay);
	// console.log("# of relay creeps:", relayCreeps.length);
	if (relayCreeps.length === 0) {
		return;
	}

	for (let r = 0; r < rooms.length; r++) {
		const room = rooms[r];
		const roleMeta = toolCreepUpgrader.getRoleMetadata(Role.Relay);

		// skip room if it's not supposed to have relays
		if (roleMeta.quota(room) === 0) {
			continue;
		}

		// check if there are any available relay positions
		if (
			_.filter(relayCreeps, creep => {
				return !creep.memory.assignedPos;
			}).length == 0
		) {
			// all relay creeps have positions
			continue;
		}

		const rootLinkPos = room.getPositionAt(room.memory.rootPos.x, room.memory.rootPos.y - 2) as RoomPosition;
		const storagePos = room.getPositionAt(room.memory.storagePos.x, room.memory.storagePos.y) as RoomPosition;
		// HACK: because the way the storage module is placed is STILL jank af, rooms can opt in to change the relay position for the storage
		const storagePosRelayDirection = room.memory.storagePosDirection ?? RIGHT;
		const relayPositions = [
			util.getPositionInDirection(rootLinkPos, TOP_LEFT),
			util.getPositionInDirection(storagePos, storagePosRelayDirection),
			util.getPositionInDirection(rootLinkPos, TOP_RIGHT),
			util.getPositionInDirection(rootLinkPos, BOTTOM_LEFT),
			util.getPositionInDirection(rootLinkPos, BOTTOM_RIGHT),
		];
		relayPositions.splice(roleMeta.quota(room));
		const availableRelayPos = _.filter(relayPositions, pos => {
			for (let i = 0; i < relayCreeps.length; i++) {
				const creep = relayCreeps[i];
				if (!creep.memory.assignedPos) {
					continue;
				}
				const assignedPos = new RoomPosition(
					creep.memory.assignedPos.x,
					creep.memory.assignedPos.y,
					creep.memory.assignedPos.roomName
				);
				if (pos.isEqualTo(assignedPos)) {
					return false;
				}
			}
			return true;
		});
		if (availableRelayPos.length == 0) {
			continue;
		}
		console.log("# of relay positions available:", availableRelayPos.length);

		// assign an available position to a relay creep
		for (let i = 0; i < relayCreeps.length; i++) {
			const creep = relayCreeps[i];
			if (!creep.memory.assignedPos) {
				creep.memory.assignedPos = availableRelayPos[0];
				break;
			}
		}
	}
}

function doCreepSpawning() {
	if (!Memory.creepSpawnLog) {
		Memory.creepSpawnLog = [];
	}

	function spawnCreepOfRole(role: RoleMetadata, spawns: StructureSpawn[], room: Room | undefined = undefined) {
		const target_spawn = spawns[Math.floor(Math.random() * spawns.length)];

		const newCreepName = role.name + "_" + Game.time.toString(16);
		const hiStage = toolCreepUpgrader.getHighestStage(role.name, target_spawn.room);
		const newCreepMemory: {
			role: Role;
			stage: number;
			keepAlive: boolean;
			targetRoom?: string;
			mode?: string;
		} = { role: role.name, keepAlive: true, stage: hiStage };
		if (role.quota_per_room) {
			newCreepMemory.targetRoom = room?.name;
		}
		if (role.name == Role.Attacker) {
			newCreepMemory.mode = "defend";
		} else if (role.name == Role.Claimer || role.name == Role.Scout) {
			newCreepMemory.keepAlive = false;
		}

		if (hiStage >= 0) {
			console.log("Spawn new creep", newCreepName);
			Memory.creepSpawnLog.push(
				`${Game.time} | spawning ${newCreepName} at ${target_spawn.name} (stage ${hiStage}${
					role.quota_per_room ? ", target room:" + room?.name : ""
				})`
			);
			const body = role.stages[hiStage];
			if (role.name === Role.Upgrader && room?.controller && room.controller.level <= 5 && hiStage > 2) {
				// HACK: make sure the upgraders aren't getting fatigued, which would slow down upgrading new rooms
				const result = target_spawn.spawnCreep(body.concat([MOVE, MOVE]), newCreepName, {
					// @ts-expect-error this is valid
					memory: newCreepMemory,
				});
				if (result === ERR_NOT_ENOUGH_ENERGY) {
					// fall back just in case
					// @ts-expect-error this is valid
					target_spawn.spawnCreep(body, newCreepName, { memory: newCreepMemory });
				}
			} else {
				// @ts-expect-error this is valid
				target_spawn.spawnCreep(body, newCreepName, { memory: newCreepMemory });
			}
			return true;
		}
		return false;
	}

	function doMarkForDeath(role: RoleMetadata, creeps: Creep[], quota: number, room: Room) {
		// check if we can upgrade any of the creeps,
		// and if no other creeps are already marked for death,
		// mark 1 creep for death
		// console.log(role.name, creeps.length, "/" , quota, room);

		// Returns true if a creep has keepAlive == false

		if (creeps.length === 0) {
			return false;
		}

		for (let i = 0; i < creeps.length; i++) {
			if (!creeps[i].memory.keepAlive) {
				// already marked for death
				return true;
			}
		}

		creeps.sort((a, b) => a.memory.stage - b.memory.stage);
		if (creeps.length > quota) {
			console.log("marking", creeps[0].name, "for death (above quota)");
			Memory.creepSpawnLog.push(`${Game.time} | marking ${creeps[0].name}, for death (above quota)`);
			creeps[0].memory.keepAlive = false;
			return true;
		}

		const hiStage = toolCreepUpgrader.getHighestStage(role.name, (room = room));
		if (hiStage < 0) {
			return false;
		}

		if (hiStage > creeps[0].memory.stage) {
			console.log("marking", creeps[0].name, "for death (upgrading)");
			Memory.creepSpawnLog.push(
				`${Game.time} | marking ${creeps[0].name}, for death (upgrading stage ${creeps[0].memory.stage} => ${hiStage})`
			);
			creeps[0].memory.keepAlive = false;
			return true;
		}

		return false;
	}

	if (Memory.creepSpawnLog.length >= 100) {
		Memory.creepSpawnLog.shift();
	}

	console.log("Spawning/upgrading creeps...");

	let rooms = util.getOwnedRooms();
	for (const role_name in toolCreepUpgrader.roles) {
		const roleMeta = toolCreepUpgrader.getRoleMetadata(role_name as Role);
		const creeps_of_role = util.getCreeps(roleMeta.name);
		if (roleMeta.quota_per_room) {
			for (let r = 0; r < rooms.length; r++) {
				const room = rooms[r];
				const creeps_of_room = _.filter(creeps_of_role, creep => creep.memory.targetRoom === room.name);
				const role_quota = roleMeta.quota(room);
				console.log(room.name, roleMeta.name, creeps_of_room.length + "/" + role_quota);

				if (creeps_of_room.length >= role_quota) {
					if (doMarkForDeath(roleMeta, creeps_of_room, role_quota, room)) {
						if (room.energyAvailable < room.energyCapacityAvailable) {
							console.log("Waiting for enough energy to safely spawn new creep");
							return;
						}
					}
					continue;
				}

				let needOtherRoomSpawns = false;
				let canUseOtherRooms = !["harvester", "manager", "relay"].includes(roleMeta.name);
				let spawns = util
					.getStructures(room, STRUCTURE_SPAWN)
					.filter(s => !(s as StructureSpawn).spawning)
					.filter(
						s =>
							util
								.getCreeps()
								.filter(
									c =>
										(c.memory.renewing || (c.ticksToLive && c.ticksToLive < 100)) &&
										c.memory.renewTarget === s.id
								).length === 0
					) as StructureSpawn[];
				if (spawns.length === 0) {
					console.log("WARN: There are no available spawns in this room to spawn creeps");
					needOtherRoomSpawns = true;
					canUseOtherRooms = true;
				} else if (canUseOtherRooms && room.energyAvailable < room.energyCapacityAvailable * 0.8) {
					console.log("WARN: This room does not have enough energy to spawn creeps");
					needOtherRoomSpawns = true;
				} else if (!canUseOtherRooms && room.energyAvailable <= 300) {
					console.log(
						`WARN: Room ${room.name} is really starving, and does not have enough energy to spawn creeps. Overriding default behavior to allow spawning ${roleMeta.name} in other rooms`
					);
					canUseOtherRooms = true;
					needOtherRoomSpawns = true;
				}

				if (canUseOtherRooms && needOtherRoomSpawns && rooms.length > 1) {
					console.log(`Using spawns from another room to spawn ${roleMeta.name} creep for ${room.name}`);
					let otherRooms = util.findClosestOwnedRooms(
						new RoomPosition(25, 25, room.name),
						r => r.energyAvailable >= r.energyCapacityAvailable * 0.8 && room.name !== r.name
					);
					if (otherRooms.length === 0) {
						console.log(
							"WARN: No rooms are above energy threshold. Falling back to use any energy available."
						);
						otherRooms = _.filter(util.getOwnedRooms(), room => room.energyAvailable >= 200); // TODO: get minimum possible energy to spawn creep of this role
						if (otherRooms.length === 0) {
							console.log("CRITICAL: Unable to spawn creeps! We are all gonna die!");
							Game.notify("CRITICAL: Unable to spawn creeps! We are all gonna die!");
						}
						otherRooms = [_.max(otherRooms, room => room.energyAvailable)];
					}
					// 	let target_room = rooms[Math.floor(Math.random() * rooms.length)];
					const target_room = otherRooms[0];
					spawns = util
						.getStructures(target_room, STRUCTURE_SPAWN)
						.filter(s => !(s as StructureSpawn).spawning)
						.filter(
							s =>
								util
									.getCreeps()
									.filter(
										(c: Creep) =>
											(c.memory.renewing || (c.ticksToLive && c.ticksToLive < 100)) &&
											c.memory.renewTarget === s.id
									).length === 0
						) as StructureSpawn[];
					if (spawns.length === 0) {
						console.log("WARN: There are no available spawns in the other selected room to spawn creeps");
						continue;
					}
				} else if (canUseOtherRooms && needOtherRoomSpawns && rooms.length === 1) {
					console.log("No other rooms to spawn creeps in.");
					continue;
				}

				// spawn new creeps to fill up the quota
				if (spawnCreepOfRole(roleMeta, spawns, room)) {
					// if successful
					return;
				}
			}
		} else {
			const role_quota = roleMeta.quota();
			console.log(roleMeta.name, creeps_of_role.length + "/" + role_quota);

			rooms = _.filter(rooms, room => room.energyAvailable >= room.energyCapacityAvailable * 0.8);
			if (rooms.length === 0) {
				console.log("WARN: There are no rooms available with enough energy to spawn creeps");
				continue;
			}
			const target_room = rooms[Math.floor(Math.random() * rooms.length)];

			if (creeps_of_role.length >= role_quota) {
				if (doMarkForDeath(roleMeta, creeps_of_role, role_quota, target_room)) {
					if (roleMeta.name !== "scout") {
						return;
					}
				}
				continue;
			}

			const spawns = util
				.getStructures(target_room, STRUCTURE_SPAWN)
				.filter(s => !(s as StructureSpawn).spawning) as StructureSpawn[];
			if (spawns.length === 0) {
				continue;
			}

			// spawn new creeps to fill up the quota
			if (spawnCreepOfRole(roleMeta, spawns)) {
				// if successful
				return;
			}
		}
	}
}

function doAutoTrading() {
	// HACK: hardcoded logistics things
	if (Game.shard.name === "shard0") {
		// @ts-ignore
		Game.rooms.W13N11.terminal.send(
			RESOURCE_ZYNTHIUM,
			// @ts-ignore
			Game.rooms.W13N11.terminal.store[RESOURCE_ZYNTHIUM],
			"W16N9"
		);
		// @ts-ignore
		Game.rooms.W16N7.terminal.send(RESOURCE_UTRIUM, Game.rooms.W16N7.terminal.store[RESOURCE_UTRIUM], "W15N8");
	}

	const rooms = util.getOwnedRooms();

	const minimumPrice = {
		[RESOURCE_ENERGY]: 0.08,
		[RESOURCE_OXYGEN]: 0.08,
		[RESOURCE_HYDROGEN]: 0.08,

		[RESOURCE_UTRIUM]: 0.08,
		[RESOURCE_LEMERGIUM]: 0.35,
		[RESOURCE_KEANIUM]: 0.35,
		[RESOURCE_ZYNTHIUM]: 0.35,
		[RESOURCE_CATALYST]: 0.5,

		[RESOURCE_GHODIUM]: 5,

		[RESOURCE_UTRIUM_BAR]: 0.45,
		[RESOURCE_ZYNTHIUM_BAR]: 0.45,
		[RESOURCE_LEMERGIUM_BAR]: 0.6,
		[RESOURCE_REDUCTANT]: 0.45,
		[RESOURCE_BATTERY]: 0.05,

		[RESOURCE_ESSENCE]: 100000,
		[RESOURCE_EMANATION]: 30000,
		[RESOURCE_SPIRIT]: 10000,
		[RESOURCE_EXTRACT]: 1500,
		[RESOURCE_CONCENTRATE]: 300,

		[RESOURCE_OPS]: 4.7,
	};

	for (let r = 0; r < rooms.length; r++) {
		const room = rooms[r];
		if (!room.terminal) {
			continue;
		}
		if (!Memory.mineralsToSell || Memory.mineralsToSell.length === 0) {
			continue;
		}

		for (let m = 0; m < Memory.mineralsToSell.length; m++) {
			const mineral = Memory.mineralsToSell[m];
			// @ts-expect-error FIXME: this could use a refactor to type check better
			if (!minimumPrice[mineral]) {
				console.log("WARN: could not find", mineral, "in minimumPrice");
				continue;
			}
			if (room.terminal.cooldown > 0 || !room.terminal.my) {
				continue;
			}
			if ((room.storage && room.storage.store[RESOURCE_ENERGY] < 10000) || !room.storage) {
				// ensure we have some energy in reserve
				continue;
			}
			if (
				mineral === RESOURCE_UTRIUM_BAR ||
				mineral === RESOURCE_ZYNTHIUM_BAR ||
				mineral === RESOURCE_LEMERGIUM_BAR ||
				mineral === RESOURCE_REDUCTANT
			) {
				if (room.terminal.store[mineral] < 3000) {
					continue;
				}
			} else {
				if (room.terminal.store[mineral] < 10000) {
					continue;
				}
			}

			const buyOrders = Game.market.getAllOrders(function (order) {
				return (
					order.type === ORDER_BUY &&
					order.resourceType === mineral &&
					// @ts-expect-error FIXME: this could use a refactor to type check better
					order.price >= minimumPrice[mineral] &&
					order.remainingAmount > 0
				);
			});
			if (buyOrders.length === 0) {
				continue;
			}

			const amount = Math.min(room.terminal.store[mineral], 20000);
			// TODO: sort orders by order of credit price and energy price
			const buy = buyOrders[0];
			const cost = Game.market.calcTransactionCost(amount, room.name, buy.roomName ?? "");
			console.log(
				buy.id,
				buy.roomName,
				buy.type,
				"amount:",
				buy.remainingAmount,
				"/",
				buy.amount,
				buy.resourceType,
				"cost:",
				cost
			);
			if (cost <= room.terminal.store[RESOURCE_ENERGY]) {
				const result = Game.market.deal(buy.id, amount, room.name);
				console.log("deal result:", result);
			} else {
				console.log("WARN: Not enough energy to make deal.");
			}
		}
	}
}

function doAutoPlanning() {
	const rooms = util.getOwnedRooms();

	try {
		console.log("Planning rooms...");
		brainAutoPlanner.run();
	} catch (e) {
		printException(e);
	}

	// place extractors when able
	for (let r = 0; r < rooms.length; r++) {
		const room = rooms[r];
		if (room.controller?.level ?? 0 >= 6) {
			const minerals = room.find(FIND_MINERALS);
			for (const m in minerals) {
				const mineral = minerals[m];
				if (
					// @ts-expect-error FIXME: this should work normally, type definitions are wrong?
					mineral.pos.lookFor(LOOK_STRUCTURES, {
						filter: (struct: Structure) => struct.structureType === STRUCTURE_EXTRACTOR,
					}).length == 0
				) {
					if (
						// @ts-expect-error FIXME: this should work normally, type definitions are wrong?
						mineral.pos.lookFor(LOOK_CONSTRUCTION_SITES, {
							filter: (site: ConstructionSite) => site.structureType === STRUCTURE_EXTRACTOR,
						}).length == 0
					) {
						mineral.pos.createConstructionSite(STRUCTURE_EXTRACTOR);
					}
				}
			}
		}
	}
}

function doWorkLabs() {
	const rooms = util.getOwnedRooms();
	for (let r = 0; r < rooms.length; r++) {
		const room = rooms[r];
		if (room.controller?.level ?? 0 < 6) {
			continue;
		}
		const labs = util.getStructures(room, STRUCTURE_LAB) as StructureLab[];

		for (let l = 0; l < labs.length; l++) {
			const workFlag = util.getWorkFlag(labs[l].pos);
			if (!workFlag || workFlag.secondaryColor != COLOR_GREEN) {
				continue;
			}
			// console.log(workFlag)
			let [method, makingWhat] = workFlag.name.split(":");
			if (method.startsWith("make")) {
				method = "make";
			} else if (method.startsWith("unmake")) {
				method = "unmake";
			}

			if (method === "make") {
				let needsMinerals: ResourceConstant[] = [];
				switch (makingWhat) {
					case "G":
						needsMinerals = ["UL", "ZK"];
						break;
					default:
						if (makingWhat.startsWith("X")) {
							needsMinerals = ["X", makingWhat.slice(1) as ResourceConstant]; // untested
						} else {
							needsMinerals = makingWhat.split("") as ResourceConstant[];
						}
				}
				const sourceLabs: StructureLab[] = labs[l].pos.findInRange(FIND_STRUCTURES, 2, {
					filter: (lab: StructureLab) => {
						return lab.structureType === STRUCTURE_LAB && _.contains(needsMinerals, lab.mineralType);
					},
				});
				// console.log(labs[l], "is making", isMakingWhat, "using", needsMinerals, "from", sourceLabs)
				try {
					new RoomVisual(labs[l].room.name).line(labs[l].pos, sourceLabs[0].pos);
					new RoomVisual(labs[l].room.name).line(labs[l].pos, sourceLabs[1].pos);
				} catch (e) {}
				if (sourceLabs.length == 2) {
					labs[l].runReaction(sourceLabs[0], sourceLabs[1]);
				} else {
					// console.log("Too many/little source labs for", labs[l], ": ", sourceLabs);
				}
			} else if (method === "unmake") {
				const splitsInto = labs[l].mineralType?.split("") as ResourceConstant[];
				console.log("[work-labs] unmaking", labs[l].mineralType, "into", splitsInto);
				let destLabs: StructureLab[] = labs[l].pos.findInRange(FIND_STRUCTURES, 2, {
					filter: (lab: StructureLab) => {
						return (
							lab.structureType === STRUCTURE_LAB &&
							(_.contains(splitsInto, lab.mineralType) || lab.mineralType === undefined)
						);
					},
				});
				destLabs = _.sortBy(
					destLabs,
					(lab: StructureLab) => {
						// @ts-expect-error FIXME: this is functional, but doesn't typecheck
						return _.contains(lab.mineralType, splitsInto);
					},
					"desc"
				);
				destLabs = destLabs.slice(0, splitsInto.length);
				console.log(labs[l], "is unmaking", labs[l].mineralType, "into", splitsInto, "into", destLabs);
				try {
					const vis = new RoomVisual(labs[l].room.name);
					destLabs.forEach((lab: StructureLab) => vis.line(labs[l].pos, lab.pos));
				} catch (e) {}

				labs[l].reverseReaction(destLabs[0], destLabs[1]);
			} else {
				console.log("Unknown method:", method);
			}
		}
	}
}

function commandRemoteMining() {
	// Force job to run: Memory.job_last_run["command-remote-mining"] = 0
	let neededHarvesters = 0;
	let neededCarriers = 0;
	for (let t = 0; t < Memory.remoteMining.targets.length; t++) {
		const target = Memory.remoteMining.targets[t];
		// remove invalid creep references, and initialize potentially missing or invalid memory
		if (
			!Game.creeps[target.creepHarvester] ||
			!Game.creeps[target.creepHarvester].memory.harvestTarget ||
			Game.creeps[target.creepHarvester].memory.harvestTarget.id !== target.id
		) {
			delete target.creepHarvester;
		}
		if (target.creepCarriers) {
			for (let i = 0; i < target.creepCarriers.length; i++) {
				const carrierName = target.creepCarriers[i];
				if (
					!Game.creeps[carrierName] ||
					!Game.creeps[carrierName].memory.harvestTarget ||
					Game.creeps[carrierName].memory.harvestTarget.id !== target.id
				) {
					target.creepCarriers.splice(i, 1);
					i--;
				}
			}
		} else {
			target.creepCarriers = [];
		}

		if (!target.neededCarriers || target.neededCarriers < 1) {
			target.neededCarriers = 1;
		}

		// HACK: move memory to the new thing
		if (target.creepCarrier) {
			if (!target.creepCarriers) {
				target.creepCarriers = [];
			}
			target.creepCarriers.push(target.creepCarrier);
			delete target.creepCarrier;
		}

		if (!target.creepHarvester || !target.creepCarriers) {
			console.log("[remote mining]", target.id, "needs harvester or carriers");
		}

		// assign harvester
		if (!target.creepHarvester) {
			const remoteHarvesters = util
				.getCreeps(Role.RemoteHarvester)
				.filter((creep: Creep) => !creep.memory.harvestTarget || creep.memory.harvestTarget.id === target.id);
			let didAssign = false;
			for (const creep of remoteHarvesters) {
				if (!creep.memory.harvestTarget || creep.memory.harvestTarget.id === target.id) {
					target.creepHarvester = creep.name;
					creep.memory.harvestTarget = target;
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
				.filter((creep: Creep) => !creep.memory.harvestTarget || creep.memory.harvestTarget.id === target.id);
			let countAssigned = 0;
			for (const creep of carriers) {
				if (creep.memory.harvestTarget && creep.memory.harvestTarget.id === target.id) {
					creep.memory.harvestTarget = target;
					countAssigned++;
				} else if (!creep.memory.harvestTarget && !target.creepCarriers.includes(creep.name)) {
					target.creepCarriers.push(creep.name);
					creep.memory.harvestTarget = target;
					countAssigned++;
				}
				if (countAssigned >= target.neededCarriers) {
					break;
				}
			}
			neededCarriers += target.neededCarriers - countAssigned;
		}

		// Determine the danger level for this source
		const room = Game.rooms[target.roomName];
		if (!room) {
			Memory.remoteMining.targets[t] = target;
			// FIXME: don't have vision
			continue;
		}
		const source = Game.getObjectById(target.id) as Source;
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
				keeperLair = source.pos.findClosestByRange(FIND_HOSTILE_STRUCTURES, {
					filter: struct => struct.structureType === STRUCTURE_KEEPER_LAIR,
				}) as StructureKeeperLair;
				target.keeperLairId = keeperLair.id;
			} else {
				keeperLair = Game.getObjectById(target.keeperLairId) as StructureKeeperLair;
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
				keeperLair.ticksToSpawn <= jobs["command-remote-mining"].interval + 5
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
			const harvestPos = new RoomPosition(target.harvestPos.x, target.harvestPos.y, target.roomName);
			const keepAwayFrom = keeperLair
				? [
						{ pos: source.pos, range: 6 },
						{ pos: keeperLair.pos, range: 5 },
				  ]
				: { pos: source.pos, range: 6 };
			target.dangerPos = {
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
					pos => pos.roomName !== target.roomName && !util.isDistFromEdge(pos, 3)
				)[0],
			};
		}

		Memory.remoteMining.targets[t] = target;
	}

	if (neededHarvesters > 0) {
		console.log("[remote mining]", "need to spawn", neededHarvesters, "remote harvesters");
	}

	if (neededCarriers > 0) {
		console.log("[remote mining]", "need to spawn", neededCarriers, "carriers");
	}

	Memory.remoteMining.needHarvesterCount = Memory.remoteMining.targets.length;
	Memory.remoteMining.needCarrierCount = _.sum(Memory.remoteMining.targets, "neededCarriers");

	// handle spawning claimers
	let targetRooms = _.uniq(
		_.filter(Memory.remoteMining.targets, target => Game.getObjectById(target.id)).map(
			// @ts-expect-error FIXME: idk what the fuck is going on here
			target => Game.getObjectById(target.id)?.room.name
		)
	);
	targetRooms = _.reject(targetRooms, roomName => util.isTreasureRoom(roomName) || util.isHighwayRoom(roomName));
	for (const room of targetRooms) {
		const controller = util.getStructures(new Room(room), STRUCTURE_CONTROLLER)[0] as StructureController;
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

function satisfyClaimTargets() {
	const claimers = util.getCreeps(Role.Claimer);
	for (let t = 0; t < Memory.claimTargets.length; t++) {
		let satisfied = false;
		if (util.isTreasureRoom(Memory.claimTargets[t].room) || util.isHighwayRoom(Memory.claimTargets[t].room)) {
			console.log(
				"[satisfy-claim-targets] WARN: Can't satisfy target without a controller. (Treasure/Highway room detected)"
			);
			satisfied = true;
		} else if (Memory.claimTargets[t].mode === "reserve" && Game.rooms[Memory.claimTargets[t].room]) {
			if (
				Game.rooms[Memory.claimTargets[t].room] &&
				// @ts-expect-error FIXME: this could use a refactor probably
				(foundInvaderCore = _.first(
					Game.rooms[Memory.claimTargets[t].room].find(FIND_HOSTILE_STRUCTURES, {
						filter: struct => struct.structureType === STRUCTURE_INVADER_CORE,
					})
				))
			) {
				console.log(
					`[satisfy-claim-targets] WARN: Can't satisfy target if there's an invader core (${Memory.claimTargets[t].room})`
				);
				satisfied = true;
			} else if (
				// @ts-expect-error FIXME: define types for claimTargets
				(reserv = Game.rooms[Memory.claimTargets[t].room].controller.reservation) &&
				// @ts-expect-error FIXME: this could use a refactor probably
				reserv.username !== global.WHOAMI &&
				// @ts-expect-error FIXME: define types for claimTargets
				Game.rooms[Memory.claimTargets[t].room].controller.upgradeBlocked > 20
			) {
				console.log(
					`[satisfy-claim-targets] WARN: Can't satisfy target if we can't attack the controller (${Memory.claimTargets[t].room})`
				);
				satisfied = true;
			}
		}
		for (const creep of claimers) {
			if (creep.memory.targetRoom === Memory.claimTargets[t].room) {
				satisfied = true;
				break;
			}
		}

		if (satisfied) {
			Memory.claimTargets.splice(t, 1);
			t--;
		} else {
			// spawn new claimer
			const spawnRoom = _.first(
				util.findClosestOwnedRooms(
					new RoomPosition(25, 25, Memory.claimTargets[t].room),
					r => r.energyCapacityAvailable > 1300 && r.energyAvailable >= r.energyCapacityAvailable * 0.8
				)
			);
			if (!spawnRoom) {
				console.log("WARN: All rooms don't have enough energy to spawn creeps");
				continue;
			}
			console.log("Spawning claimer in room", spawnRoom.name, "targetting room", Memory.claimTargets[t].room);
			const spawns = util
				.getStructures(spawnRoom, STRUCTURE_SPAWN)
				.filter(s => !(s as StructureSpawn).spawning) as StructureSpawn[];
			if (spawns.length === 0) {
				console.log("WARN: no spawns available in spawnRoom", spawnRoom.name);
				continue;
			}
			const targetSpawn = spawns[Math.floor(Math.random() * spawns.length)];
			let claimerBody = [CLAIM, CLAIM, CLAIM, CLAIM, CLAIM, CLAIM, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE];
			// let claimerBody = [CLAIM, CLAIM, MOVE, MOVE];
			if (Memory.claimTargets[t].mode === "claim") {
				// claimerBody = [TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, MOVE, MOVE, MOVE, CLAIM, MOVE, MOVE, MOVE, MOVE]
				claimerBody = [CLAIM, MOVE];
			}
			targetSpawn.spawnCreep(claimerBody, "claimer_" + Game.time.toString(16), {
				// @ts-expect-error this works, its fine
				memory: {
					role: Role.Claimer,
					targetRoom: Memory.claimTargets[t].room,
					mode: Memory.claimTargets[t].mode,
				},
			});
		}
	}
}

function doWorkFactories() {
	const rooms = util.getOwnedRooms();
	for (const room of rooms) {
		const factory = util.getStructures(room, STRUCTURE_FACTORY)[0] as StructureFactory;

		if (!factory || factory.cooldown > 0) {
			continue;
		}

		// FIXME: make this more dynamic
		// right now, everything is hard coded

		const productionTargets: (CommodityConstant | RESOURCE_ENERGY)[] = [
			RESOURCE_UTRIUM_BAR,
			RESOURCE_ZYNTHIUM_BAR,
			RESOURCE_LEMERGIUM_BAR,
			RESOURCE_KEANIUM_BAR,
			RESOURCE_REDUCTANT,
			RESOURCE_OXIDANT,

			RESOURCE_ESSENCE,
			RESOURCE_EMANATION,
			RESOURCE_SPIRIT,
			RESOURCE_EXTRACT,
			RESOURCE_CONCENTRATE,

			RESOURCE_PURIFIER,
		];

		if (room.storage) {
			if (room.storage.store[RESOURCE_ENERGY] > 800000 && factory.store[RESOURCE_BATTERY] < 10000) {
				productionTargets.push(RESOURCE_BATTERY);
			} else if (room.storage.store[RESOURCE_ENERGY] < 600000) {
				productionTargets.push(RESOURCE_ENERGY);
			}
		}

		for (const productionTarget of productionTargets) {
			console.log(`[work-factories] production target: ${productionTarget}`);
			let canProduce = true;
			if (factory.level && (COMMODITIES[productionTarget].level ?? 0 > factory.level)) {
				console.log(
					`[work-factories] factory is level ${factory.level}, but level ${COMMODITIES[productionTarget].level} is required`
				);
				canProduce = false;
				break;
			}

			for (const _component in COMMODITIES[productionTarget].components) {
				const component = _component as CommodityConstant;
				// console.log(`[work-factories] factory has component ${component}?`);
				if (!factory.store.hasOwnProperty(component)) {
					console.log(`[work-factories] no ${component} found`);
					canProduce = false;
					break;
				}
				// console.log(`[work-factories] found ${factory.store[component]} ${component}`);
				if (factory.store.getUsedCapacity(component) < COMMODITIES[productionTarget].components[component]) {
					console.log(
						`[work-factories] not enough ${component}, found ${factory.store[component]} need ${COMMODITIES[productionTarget].components[component]}`
					);
					canProduce = false;
					break;
				}
			}

			console.log(`[work-factories] production target: ${productionTarget}, can produce: ${canProduce}`);
			if (canProduce) {
				const productionResult = factory.produce(productionTarget);
				if (productionResult !== OK) {
					console.log(`[work-factories] unable to produce ${productionTarget} => ${productionResult}`);
				} else {
					break;
				}
			}
		}
	}
}

const jobs = {
	"creep-spawning": {
		name: "creep-spawning",
		run: doCreepSpawning,
		interval: 15,
	},
	"calc-defcons": {
		name: "calc-defcons",
		run: determineDefconLevels,
		interval: 3,
	},
	"flag-commands": {
		name: "flag-commands",
		run: doFlagCommandsAndStuff,
		interval: 4,
	},
	"link-transfers": {
		name: "link-transfers",
		run: doLinkTransfers,
		interval: 4,
	},
	"command-energy-relays": {
		name: "command-energy-relays",
		run: commandEnergyRelays,
		interval: 10,
	},
	"plan-buildings": {
		name: "plan-buildings",
		run: doAutoPlanning,
		interval: 30,
	},
	"auto-trade": {
		name: "auto-trade",
		run: doAutoTrading,
		interval: 30,
	},
	"work-labs": {
		name: "work-labs",
		run: doWorkLabs,
		interval: 30,
	},
	"command-remote-mining": {
		name: "command-remote-mining",
		run: commandRemoteMining,
		interval: 25,
	},
	"satisfy-claim-targets": {
		name: "satisfy-claim-targets",
		run: satisfyClaimTargets,
		interval: 50,
	},
	"work-factories": {
		name: "work-factories",
		run: doWorkFactories,
		interval: 20,
	},
	"op-guard": {
		name: "op-guard",
		run() {
			brainGuard.updateGuardTasks();
		},
		interval: 5,
	},
};

function queueJob(job: any) {
	for (let i = 0; i < Memory.job_queue.length; i++) {
		if (Memory.job_queue[i].startsWith(job.name)) {
			return;
		}
	}
	console.log("Adding", job.name, "to queue");
	Memory.job_queue.push(job.name);
}

function main() {
	if (Game.cpu.bucket > 9500 && !!Game.cpu.generatePixel) {
		Game.cpu.generatePixel();
	}

	if (!Memory.terminalEnergyTarget) {
		Memory.terminalEnergyTarget = 50000;
	}
	if (!Memory.factoryEnergyTarget) {
		Memory.factoryEnergyTarget = 5000;
	}
	if (!Memory.remoteMining) {
		Memory.remoteMining = {
			needCarrierCount: 0,
			needHarvesterCount: 0,
			targets: [],
		};
	}
	if (!Memory.remoteMining.targets) {
		Memory.remoteMining.targets = [];
	}
	if (!Memory.claimTargets) {
		Memory.claimTargets = [];
	}
	if (!Memory.highlightCreepLog) {
		Memory.highlightCreepLog = [];
	}

	// initialize jobs
	if (!Memory.job_last_run) {
		Memory.job_last_run = {};
	}
	if (!Memory.job_queue) {
		Memory.job_queue = [];
	}
	for (const job of Object.values(jobs)) {
		// initialize any new jobs that have not been run yet
		if (!Memory.job_last_run[job.name]) {
			console.log("initialize job", job.name);
			Memory.job_last_run[job.name] = Game.time - job.interval;
		}

		// queue up job if it needs to be run
		if (Game.time - Memory.job_last_run[job.name] > job.interval) {
			queueJob(job);
		}
	}

	brainGuard.init();
	brainHighwayHarvesting.init();

	try {
		brainOffense.run();
	} catch (e) {
		util.printException(e);
	}

	const rooms = util.getOwnedRooms();

	// do tower stuff and process power
	for (const room of rooms) {
		const rcl = room.controller?.level ?? 0;
		if (CONTROLLER_STRUCTURES[STRUCTURE_TOWER][rcl] > 0) {
			try {
				roleTower.run(room);
			} catch (e) {
				util.printException(e);
			}
		}

		// TODO: make something a little more robust/dynamic for limiting the amount of energy spent on power.
		if (CONTROLLER_STRUCTURES[STRUCTURE_POWER_SPAWN][rcl] > 0) {
			if (room.storage && room.storage.store[RESOURCE_ENERGY] >= 500000) {
				const powerspawn = room.find(FIND_STRUCTURES, {
					filter: s => s.structureType === STRUCTURE_POWER_SPAWN,
				})[0] as StructurePowerSpawn;
				if (powerspawn) {
					powerspawn.processPower();
				}
			}
		}
	}

	// do creep stuff
	for (const name in Memory.creeps) {
		if (!Game.creeps[name]) {
			console.log("Clearing non-existing creep memory:", name);
			delete Memory.creeps[name];
		}
	}

	const harvesterCount = util.getCreeps(Role.Harvester).length;
	for (const creep of Object.values(Game.creeps)) {
		if (creep.spawning) {
			continue;
		}

		if (creep.memory.renewing) {
			creep.say("renewing");
			continue;
		}

		if (creep.memory.role === Role.Offense) {
			continue;
		}

		// @ts-expect-error because Role.Offense was somehow not in the enum even though it is?
		if (creep.memory.role !== Role.Guardian && creep.memory.role !== Role.Offense && creep.memory.stage < 0) {
			creep.memory.stage = toolCreepUpgrader.getCreepStage(creep);
			console.log("set creep", creep.name, "stage:", creep.memory.stage);
		}

		try {
			if (taskRenew.checkRenew(creep)) {
				creep.memory.renewing = true;
				if (
					creep.memory.role === "harvester" &&
					creep.memory.depositMode !== "recovery" &&
					creep.store[RESOURCE_ENERGY] > 0
				) {
					creep.drop(RESOURCE_ENERGY);
				}
				continue;
			}
			if (
				!["miner", "scientist", "builder", "carrier", "manager"].includes(creep.memory.role) &&
				taskDepositMaterials.checkForMaterials(creep, true)
			) {
				creep.say("deposit");
				taskDepositMaterials.run(creep, true);
				continue;
			}
		} catch (e) {
			printException(e);
		}

		if (creep.memory.role === Role.Guardian) {
			continue;
		}

		try {
			switch (creep.memory.role) {
				case "harvester":
					roleHarvester.run(creep);
					break;
				case "upgrader":
					if (harvesterCount === 0) {
						// creep.memory.force_mode = "recovery"
						// creep.memory.mode = "recovery"
						roleHarvester.run(creep);
					} else {
						roleUpgrader.run(creep);
					}
					break;
				case "builder":
					// If there is something to build, go build it
					// otherwise, do repairs
					if (harvesterCount === 0) {
						// creep.memory.force_mode = "recovery"
						// creep.memory.mode = "recovery"
						roleHarvester.run(creep);
					} else if (roleBuilder.findTargets(creep).length > 0) {
						if (taskDepositMaterials.checkForMaterials(creep, true)) {
							creep.say("deposit");
							taskDepositMaterials.run(creep, true);
						} else {
							roleBuilder.run(creep);
						}
					} else {
						if (Game.time % 600 < 250) {
							roleRepairer.run(creep);
						} else {
							if (taskDepositMaterials.checkForMaterials(creep, true)) {
								creep.say("deposit");
								taskDepositMaterials.run(creep, true);
							} else {
								if (util.getCreeps(Role.Manager).length === 0) {
									roleManager.run(creep);
								} else {
									roleUpgrader.run(creep);
								}
							}
						}
						// roleRepairer.run(creep);
						// roleScientist.run(creep);
						// roleUpgrader.run(creep);
						// roleManager.run(creep);
						// roleMiner.run(creep);
					}
					break;
				case "repairer":
					roleRepairer.run(creep);
					// roleBuilder.run(creep);
					// roleUpgrader.run(creep);
					// roleMiner.run(creep);
					break;
				case "claimer":
					roleClaimer.run(creep);
					break;
				case "manager":
					if (Memory.USE_ADV_LOGISTICS) {
						require("role.testlogistics").run(creep);
					} else {
						roleManager.run(creep);
					}
					break;
				case "remoteharvester":
					roleRemoteHarvester.run(creep);
					break;
				case "carrier":
					roleCarrier.run(creep);
					break;
				case "scout":
					roleScout.run(creep);
					break;
				case "miner":
					roleMiner.run(creep);
					break;
				case "scientist":
					if (Memory.USE_ADV_LOGISTICS) {
						require("role.testlogistics").run(creep);
					} else {
						roleScientist.run(creep);
					}
					break;
				case "relay":
					roleRelay.run(creep);
					break;
				case "tmpdeliver":
					roleTmpDeliver.run(creep);
					break;
				case "invaderdestroyer":
					require("./role.invaderdestroyer.js").run(creep);
					break;
				case "testlogistics":
					require("./role.testlogistics.js").run(creep);
					break;
				default:
					console.log(creep.name, "Err: No", creep.memory.role, "role to execute");
					console.log("Parsing role from name...");
					const role = creep.name.split("_")[0];
					console.log("Found role:", role);
					creep.memory.role = role as Role;
					if (!creep.memory.stage) {
						creep.memory.stage = -1;
					}
			}
		} catch (e) {
			util.printException(e, creep);
		}
	}

	// powercreeps
	try {
		if (Game.powerCreeps.Ligma) {
			powercreepLigma.run(Game.powerCreeps.Ligma);
		}
	} catch (e) {
		console.log("failed to run power creeps");
		util.printException(e);
	}

	const renewingCreeps: Creep[] = _.filter(_.values(Game.creeps), (c: Creep) => c.memory.renewing);
	const CREEP_RENEW_PRIORITY: Record<any, number> = {
		_default: 5,
		harvester: 1,
		manager: 1,
		remoteharvester: 8,
		carrier: 8,
		scientist: 9,
		guardian: 9,
		offense: 9,
	};
	renewingCreeps.sort((a: Creep, b: Creep) => {
		// sort in descending order, so that the creeps with the least time to live get renewed first, but only if they are about to die
		if (a.ticksToLive && b.ticksToLive && a.ticksToLive <= 100) {
			return b.ticksToLive - a.ticksToLive;
		}
		// priortize creeps based on role, lowest number has highest priority
		// @ts-ignore
		const pA = Object.hasOwnProperty(CREEP_RENEW_PRIORITY, a.memory.role)
			? CREEP_RENEW_PRIORITY[a.memory.role]
			: CREEP_RENEW_PRIORITY._default;
		// @ts-ignore
		const pB = Object.hasOwnProperty(CREEP_RENEW_PRIORITY, b.memory.role)
			? CREEP_RENEW_PRIORITY[b.memory.role]
			: CREEP_RENEW_PRIORITY._default;
		return pB - pA;
	});
	for (const creep of renewingCreeps) {
		try {
			taskRenew.run(creep);
		} catch (e) {
			util.printException(e, creep);
		}
	}

	// process jobs
	while (Memory.job_queue.length > 0 && (Game.cpu.getUsed() < Game.cpu.limit * 0.7 || util.isSimulationMode())) {
		const job_to_do = Memory.job_queue[0];
		console.log("Running job:", job_to_do);
		// @ts-expect-error FIXME: define types for jobs
		const job = jobs[job_to_do];
		try {
			job.run();
			Memory.job_queue.shift();
			Memory.job_last_run[job.name] = Game.time;
		} catch (e) {
			console.log("ERR: Job failed", job.name);
			util.printException(e);
			break;
		}
	}

	// force spawning
	if (Object.keys(Game.creeps).length === 0 || Memory.forceCreepSpawn || Game.flags.forceSpawn) {
		queueJob(jobs["creep-spawning"]);
		if (Memory.forceCreepSpawn) {
			// @ts-ignore
			delete Memory.forceCreepSpawn;
		}
	}

	// manual testing for room planning
	if (Game.flags.planWalls) {
		if (Game.cpu.bucket > 9000) {
			try {
				brainAutoPlanner.planWalls(Game.flags.planWalls.room);
			} catch (e) {
				printException(e);
			}
		} else {
			console.log("Not enough CPU bucket to manually plan walls, waiting until at least 9000");
		}
	}

	if (Game.flags.forcePlan && Game.flags.forcePlan.color === COLOR_WHITE) {
		try {
			brainAutoPlanner.planRoom(Game.flags.forcePlan.room, true);
			brainAutoPlanner.drawRoomPlans(Game.flags.forcePlan.room);
		} catch (e) {
			printException(e);
		}
		if (Game.cpu.bucket < 9700) {
			Game.flags.forcePlan.setColor(COLOR_GREY);
		}
	}

	if (Game.flags.showPlans && Game.flags.showPlans.color === COLOR_WHITE) {
		try {
			brainAutoPlanner.drawRoomPlans(Game.flags.showPlans.room);
		} catch (e) {
			printException(e);
		}
		if (Game.cpu.bucket < 9700) {
			Game.flags.forcePlan.setColor(COLOR_GREY);
		}
		if (Game.cpu.bucket < 9700) {
			Game.flags.showPlans.setColor(COLOR_GREY);
		}
	}

	try {
		brainGuard.assignGuardTasks();
		brainGuard.runTasks();
	} catch (e) {
		console.log("ERR: brain.guard tasks failed");
		util.printException(e);
	}
	brainGuard.finalize();

	try {
		// TODO: run creeps assigned to these tasks
	} catch (e) {
		console.log("ERR: brain.highwayHarvesting tasks failed");
		util.printException(e);
	}
	brainHighwayHarvesting.finalize();

	brainLogistics.finalize();

	printStatus();

	// draw some extra eye candy, if we can spare the resources
	if ((Game.cpu.bucket > 500 && Game.cpu.getUsed() < Game.cpu.limit * 0.85) || util.isSimulationMode()) {
		visualize.drawQuotas();
		visualize.doVisualize();
	}
}

// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
export const loop = ErrorMapper.wrapLoop(() => {
	main();
});
module.exports.loop = loop;
