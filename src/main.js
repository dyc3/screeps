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

## Misc

* To force the rootPos of a room to be set somewhere, place a flag with the name "setRootPos"
* To manually create short roads quickly, you can place 2 flags: "planStart" and "planEnd".
* To harvest a remote room (only 1 at a time), place a flag "harvestme" on target energy source (needs room vision to work)
* To move around different chemicals, place flags on desination structures with the format "fill:MINERAL". Examples: "fill:U", "fill2:UH"
* To set a rampart's public status quickly, place a flag with the name "setPublic" and set the color to green for true, and red for false. Other colors will be ignored.

## Testing

* To manually test brainAutoPlanner.planWalls(), place a flag named "planWalls" in the room you want to test.

*/

require("tools");
let util = require('util');

let roleHarvester = require('role.harvester');
let roleUpgrader = require('role.upgrader');
let roleManager = require('role.manager');
let roleBuilder = require('role.builder');
let roleRepairer = require('role.repairer');
let roleAttacker = require('role.attacker');
let roleClaimer = require('role.claimer');
let roleHealer = require('role.healer');
let roleRemoteHarvester = require('role.remoteharvester');
let roleCarrier = require('role.carrier');
let roleScout = require('role.scout');
let roleNextRoomer = require('role.nextroomer');
let roleMiner = require('role.miner');
let roleScientist = require('role.scientist');
let roleRelay = require('role.relay');
let roleTmpDeliver = require('role.tmpdeliver');

let roleTower = require('role.tower');

let taskRenew = require('task.renew');
let taskDepositMaterials = require('task.depositmaterials');

let toolEnergySource = require('tool.energysource');
let toolCreepUpgrader = require('tool.creepupgrader');
let toolRoadPlanner = require('tool.roadplanner');

let brainAutoPlanner = require('brain.autoplanner');
let brainGuard = require("brain.guard");
let brainLogistics = require("brain.logistics");
let brainHighwayHarvesting = require("brain.highwayharvesting");

let errorMild = '<audio src="http://trekcore.com/audio/computer/alarm01.mp3" autoplay />';

global.WHOAMI = _.find(Game.structures).owner.username;
global.CONTROLLER_UPGRADE_RANGE = 3;
global.DROPPED_ENERGY_GATHER_MINIMUM = 100;

function printException(e, creep=undefined) {
	let msg = errorMild + '<span style="color: red">ERROR: ' + e.name + ": "+e.message+"\n"+e.stack + "</span>";
	if (creep) {
		console.log(creep.name, msg);
	}
	else {
		console.log(msg);
	}
	Game.notify(msg);
}

function printStatus() {
	let rooms = util.getOwnedRooms();

	// print misc info
	let infoText = "";
	infoText += "tick: "+Game.time + "  |  ";
	if (Game.cpu.tickLimit != Infinity) {
		infoText += "CPU: " + Game.cpu.getUsed().toPrecision(3) + "/" + Game.cpu.tickLimit + " - " + Game.cpu.bucket.toPrecision(5)+"  |  ";
	}
	infoText += "GCL " + Game.gcl.level + ", " + ((Game.gcl.progress / Game.gcl.progressTotal * 100).toPrecision(4)) + "% " + Math.round(Game.gcl.progress) + "/" + Math.round(Game.gcl.progressTotal) + "  |  ";
	if (rooms.length > 1) {
		infoText += "rooms: "+rooms.length + "  |  ";
	}
	for (let i = 0; i < rooms.length; i++) {
		let room = rooms[i];
		infoText += room.name + " (defcon " + room.memory.defcon + ") energy: "+room.energyAvailable+"/"+room.energyCapacityAvailable+"  ";
	}
	infoText += "  |  ";
	if (Memory.expansionTarget) {
		infoText += "expansionTarget: "+Memory.expansionTarget;
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
 * @param {Room} room The target room
 *
 */
function calculateDefcon(room) {
	console.log("calculating defcon:", room.name);

	let defcon = 0;
	if (room.controller.safeMode > 650) {
		console.log("safe mode is active, defcon 0");
		return 0;
	}
	let towers = util.getStructures(room, STRUCTURE_TOWER);
	if (towers.length > 0) {
		let hostileCreeps = room.find(FIND_HOSTILE_CREEPS, {
			filter: function(creep) {
				return creep.getActiveBodyparts(ATTACK) + creep.getActiveBodyparts(HEAL) + creep.getActiveBodyparts(TOUGH) + creep.getActiveBodyparts(RANGED_ATTACK) > 0;
			}
		});
		if (hostileCreeps.length > 0) {
			console.log(room.name, "hostile creeps: ", hostileCreeps.length);
			defcon = 2;
		}
	}
	else {
		let hostileCreeps = room.find(FIND_HOSTILE_CREEPS);
		if (hostileCreeps.length > 0) {
			console.log(room.name, "hostile creeps: ", hostileCreeps.length);
			defcon = 1;
		}
		else {
			defcon = 0;
		}
	}

	if (defcon === 2)
	{
		// TODO: decide if a safe mode is needed or not

		// determine hostile heal/tick
		// determine our damage/tick
		// determine hostile ETA to our closest asset
		// if hostile ETA < enemy HP / (our damage per tick - enemy heal per tick), activate safe mode
		// otherwise, defend

		// https://screeps.com/forum/topic/922/tower-damage/6
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
	let rooms = util.getOwnedRooms();
	let highestDefcon = 0;
	for (var r = 0; r < rooms.length; r++) {
		let room = rooms[r];
		let defcon = calculateDefcon(room);
		highestDefcon = Math.max(defcon, highestDefcon);
		room.memory.defcon = defcon;
	}
	return highestDefcon;
}

function doLinkTransfers() {
	const LINK_ENERGY_CAPACITY_THRESHOLD = 5;
	let rooms = util.getOwnedRooms();

	/**
	 * Shuffles array in place. ES6 version
	 * @param {Array} a items An array containing the items.
	 */
	function shuffle(a) {
		for (let i = a.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[a[i], a[j]] = [a[j], a[i]];
		}
		return a;
	}

	for (let r = 0; r < rooms.length; r++) {
		let room = rooms[r];
		let links = shuffle(util.getStructures(room, STRUCTURE_LINK));
		if (links.length > 0) {
			if (!room.memory.rootLink) {
				try {
					let rootLinkPos = room.getPositionAt(room.memory.rootPos.x, room.memory.rootPos.y - 2);
					room.memory.rootLink = rootLinkPos.lookFor(LOOK_STRUCTURES, rootLinkPos)[0].id;
				}
				catch(e) {
					console.log("WARN: no root link found in room", room.name);
					continue;
				}
			}
			let rootLink = Game.getObjectById(room.memory.rootLink);
			if (!rootLink) {
				console.log("can't find root link id:", room.memory.rootLink);
				delete room.memory.rootLink;
				continue;
			}

			if (rootLink.energy < rootLink.energyCapacity - LINK_ENERGY_CAPACITY_THRESHOLD) {
				console.log(room.name, "[link-transfer] rootLink below threshold");
				for (let i = 0; i < links.length; i++) {
					let link = links[i];
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
				let found = links.filter(link => link.pos.inRangeTo(link.room.storage, 2));
				if (found.length > 0) {
					room.memory.storageLink = found[0].id;
				}
				else {
					console.log("No storage link found");
					continue;
				}
			}
			let storageLink = Game.getObjectById(room.memory.storageLink);
			if (!storageLink) {
				console.log("can't find storage link id:", room.memory.storageLink);
				delete room.memory.storageLink;
				continue;
			}

			if (storageLink.energy < storageLink.energyCapacity - LINK_ENERGY_CAPACITY_THRESHOLD) {
				for (let i = 0; i < links.length; i++) {
					let link = links[i];
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

/**
 * Draw the room scores in each room for easy viewing
 */
function drawRoomScores() {
	for (let roomName in Memory.roomInfo) {
		let scoretext = "Score: " + Memory.roomInfo[roomName].score;
		new RoomVisual(roomName).text(scoretext, 0, 0, {
			align: "left",
			font: 0.4,
		});
	}
}

// giving orders via flags and stuff
// it's kinda messy
function doFlagCommandsAndStuff() {

	// make roads quickly
	if (Game.flags["planStart"] && Game.flags["planEnd"] && (Game.cpu.getUsed() < Game.cpu.limit || Game.cpu.bucket == 10000)) {
		toolRoadPlanner.planPath(Game.flags["planStart"].pos, Game.flags["planEnd"].pos);
		toolRoadPlanner.clearAllPlanFlags();
	}

	if (Game.flags["attack"] && !Memory.attackTarget) {
		try {
			let lookStruct = Game.flags["attack"].pos.lookFor(LOOK_STRUCTURES);
			if (lookStruct.length > 0) {
				Memory.attackTarget = lookStruct[0].id;
			}
			else {
				let closestCreep = Game.flags["attack"].pos.findClosestByRange(FIND_HOSTILE_CREEPS);
				if (closestCreep) {
					Memory.attackTarget = closestCreep.id;
				}
				else {
					delete Memory.attackTarget;
				}
			}
		} catch (e) {
// 			printException(e);
		} finally {

		}
	}

	if (Game.flags["nextroom"]) {
		Memory.expansionTarget = Game.flags["nextroom"].pos.roomName;
		Game.flags["nextroom"].remove();
		console.log("expansionTarget set:",Memory.expansionTarget);
	}

	if (Game.flags["setRootPos"]) {
		let pos = Game.flags["setRootPos"].pos;
		console.log("force set root pos in", pos.roomName, ":", pos.x, ",", pos.y);
		new Room(pos.roomName).memory.rootPos = pos;
		Game.flags["setRootPos"].remove();
	}

	if (Game.flags["harvestme"]) {
		let pos = Game.flags["harvestme"].pos;
		let newTarget = {
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
			Game.flags["harvestme"].remove();
			return;
		}

		try {
			let lookResult = pos.lookFor(LOOK_SOURCES);
			if (lookResult.length > 0) {
				newTarget.id = lookResult[0].id;

				// set harvestPos
				let adj = util.getAdjacent(pos);
				for (let i = 0; i < adj.length; i++) {
					// look for structures
					let lookResult = adj[i].look();
					let isValid = true;
					for (let l = 0; l < lookResult.length; l++) {
						let look = lookResult[l];
						if (look.type !== LOOK_STRUCTURES && look.type !== LOOK_TERRAIN) {
							continue;
						}

						if (look.type === LOOK_TERRAIN) {
							if (look.terrain === 'wall') {
								isValid = false;
								break;
							}
						}
						else if (look.type === LOOK_STRUCTURES) {
							if (look.structure.structureType !== STRUCTURE_ROAD && look.structure.structureType !== STRUCTURE_CONTAINER) {
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
			}
			else {
				console.log("no source found");
				Game.flags["harvestme"].remove();
				return;
			}
		}
		catch (e) {
			// need vision
			let observer = Game.getObjectById("5c4fa9d5fd6e624365ff19fc"); // TODO: make dynamic
			observer.observeRoom(pos.roomName);
			throw new Error("need vision of room to complete job");
		}
		console.log("adding new target to remote mining:", newTarget.id);
		Memory.remoteMining.targets.push(newTarget);
		Game.flags["harvestme"].remove();
	}

	if (Game.flags["setPublic"]) {
		let lookResult = _.filter(Game.flags["setPublic"].pos.lookFor(LOOK_STRUCTURES), struct => struct.structureType === STRUCTURE_RAMPART);
		if (lookResult.length > 0) {
			let rampart = lookResult[0];
			if (Game.flags["setPublic"].color === COLOR_GREEN || Game.flags["setPublic"].color === COLOR_RED) {
				rampart.setPublic(Game.flags["setPublic"].color === COLOR_GREEN);
			}
			Game.flags["setPublic"].remove();
		}
		else {
			Game.flags["setPublic"].remove();
		}
	}

	for (let f in Game.flags) {
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
	let rooms = util.getOwnedRooms();

	let relayCreeps = util.getCreeps("relay");
	// console.log("# of relay creeps:", relayCreeps.length);
	if (relayCreeps.length === 0) {
		return;
	}

	for (let r = 0; r < rooms.length; r++) {
		const room = rooms[r];

		// skip room if it's not supposed to have relays
		if (toolCreepUpgrader.roles["relay"].quota(room) === 0) {
			continue;
		}

		// check if there are any available relay positions
		if (_.filter(relayCreeps, (creep) => { return !creep.memory.assignedPos; }).length == 0) {
			// all relay creeps have positions
			continue;
		}

		let rootLinkPos = room.getPositionAt(room.memory.rootPos.x, room.memory.rootPos.y - 2);
		let storagePos = room.getPositionAt(room.memory.storagePos.x, room.memory.storagePos.y);
		// HACK: because the way the storage module is placed is STILL jank af, rooms can opt in to change the relay position for the storage
		let storagePosRelayDirection = room.memory.storagePosDirection !== undefined ? room.memory.storagePosDirection : RIGHT;
		let relayPositions = [
			util.getPositionInDirection(rootLinkPos, TOP_LEFT),
			util.getPositionInDirection(storagePos, storagePosRelayDirection),
			util.getPositionInDirection(rootLinkPos, TOP_RIGHT),
			util.getPositionInDirection(rootLinkPos, BOTTOM_LEFT),
			util.getPositionInDirection(rootLinkPos, BOTTOM_RIGHT),
		];
		relayPositions.splice(toolCreepUpgrader.roles["relay"].quota(room));
		let availableRelayPos = _.filter(relayPositions, (pos) => {
			for (let i = 0; i < relayCreeps.length; i++) {
				const creep = relayCreeps[i];
				if (!creep.memory.assignedPos) {
					continue;
				}
				let assignedPos = new RoomPosition(creep.memory.assignedPos.x, creep.memory.assignedPos.y, creep.memory.assignedPos.roomName);
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
	function spawnCreepOfRole(role, spawns, room=undefined) {
		let target_spawn = spawns[Math.floor(Math.random() * spawns.length)];

		let newCreepName = role.name + "_" + Game.time.toString(16);
		let hiStage = toolCreepUpgrader.getHighestStage(role.name, target_spawn.room);
		let newCreepMemory = { role: role.name, keepAlive: true, stage: hiStage };
		if (role.quota_per_room) {
			newCreepMemory.targetRoom = room.name;
		}
		if (role.name == "attacker") {
			newCreepMemory.mode = "defend";
		}
		else if (role.name == "claimer" || role.name == "scout") {
			newCreepMemory.keepAlive = false;
		}

		if (hiStage >= 0) {
			console.log("Spawn new creep", newCreepName);
			let body = toolCreepUpgrader.roles[role.name].stages[hiStage];
			if (role === "upgrader" && room.controller.rcl <= 5 && hiStage > 2) {
				// HACK: make sure the upgraders aren't getting fatigued, which would slow down upgrading new rooms
				let result = target_spawn.spawnCreep(body.concat([MOVE, MOVE]), newCreepName, { memory: newCreepMemory });
				if (result === ERR_NOT_ENOUGH_ENERGY) {
					// fall back just in case
					target_spawn.spawnCreep(body, newCreepName, { memory: newCreepMemory });
				}
			}
			else {
				target_spawn.spawnCreep(body, newCreepName, { memory: newCreepMemory });
			}
			return true;
		}
		return false;
	}

	function doMarkForDeath(role, creeps, quota, room) {
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

		creeps.sort((a,b) => a.memory.stage - b.memory.stage);
		if (creeps.length > quota) {
			console.log("marking", creeps[0].name, "for death (above quota)");
			creeps[0].memory.keepAlive = false;
			return true;
		}

		let hiStage = toolCreepUpgrader.getHighestStage(role.name, room=room);
		if (hiStage < 0) {
			return false;
		}

		if (hiStage > creeps[0].memory.stage) {
			console.log("marking", creeps[0].name, "for death (upgrading)");
			creeps[0].memory.keepAlive = false;
			return true;
		}
	}

	console.log("Spawning/upgrading creeps...");

	let rooms = util.getOwnedRooms();
	for (let role_name in toolCreepUpgrader.roles) {
		let role = toolCreepUpgrader.roles[role_name];
		let creeps_of_role = util.getCreeps(role.name);
		if (role.quota_per_room) {
			for (let r = 0; r < rooms.length; r++) {
				let room = rooms[r];
				let creeps_of_room = _.filter(creeps_of_role, (creep) => creep.memory.targetRoom === room.name);
				let role_quota = role.quota(room);
				console.log(room.name, role.name, creeps_of_room.length + "/" + role_quota);

				if (creeps_of_room.length >= role_quota) {
					if (doMarkForDeath(role, creeps_of_room, role_quota, room)) {
						return;
					}
					continue;
				}

				let needOtherRoomSpawns = false;
				let spawns = util.getStructures(room, STRUCTURE_SPAWN).filter(s => !s.spawning);
				if (spawns.length === 0) {
					console.log("WARN: There are no available spawns in this room to spawn creeps");
					needOtherRoomSpawns = true;
				}

				if (room.energyAvailable < room.energyCapacityAvailable * 0.8) {
					console.log("WARN: This room does not have enough energy to spawn creeps");
					needOtherRoomSpawns = true;
				}

				if (needOtherRoomSpawns) {
					console.log(`Using spawns from another room to spawn ${role.name} creep for${room.name}`);
					let otherRooms = util.findClosestOwnedRooms(new RoomPosition(25, 25, room.name), r => r.energyAvailable >= r.energyCapacityAvailable * 0.8 && room.name !== r.name);
					if (otherRooms.length === 0) {
						console.log("WARN: No rooms are above energy threshold. Falling back to use any energy available.");
						otherRooms = _.filter(util.getOwnedRooms(), room => room.energyAvailable >= 200); // TODO: get minimum possible energy to spawn creep of this role
						if (otherRooms.length === 0) {
							console.log("CRITICAL: Unable to spawn creeps! We are all gonna die!");
							Game.notify("CRITICAL: Unable to spawn creeps! We are all gonna die!");
						}
						otherRooms = [_.max(otherRooms, room => room.energyAvailable)];
					}
				// 	let target_room = rooms[Math.floor(Math.random() * rooms.length)];
					let target_room = otherRooms[0];
					spawns = util.getStructures(target_room, STRUCTURE_SPAWN).filter(s => !s.spawning);
					if (spawns.length === 0) {
						console.log("WARN: There are no available spawns in the other selected room to spawn creeps");
						continue;
					}
				}

				// spawn new creeps to fill up the quota
				if (spawnCreepOfRole(role, spawns, room)) { // if successful
					return;
				}
			}
		}
		else {
			let role_quota = role.quota();
			console.log(role.name, creeps_of_role.length + "/" + role_quota);

			rooms = _.filter(rooms, room => room.energyAvailable >= room.energyCapacityAvailable * 0.8);
			if (rooms.length === 0) {
				console.log("WARN: There are no rooms available with enough energy to spawn creeps");
				continue;
			}
			target_room = rooms[Math.floor(Math.random() * rooms.length)];

			if (creeps_of_role.length >= role_quota) {
				if (doMarkForDeath(role, creeps_of_role, role_quota, target_room)) {
					return;
				}
				continue;
			}

			let spawns = util.getStructures(target_room, STRUCTURE_SPAWN).filter(s => !s.spawning);
			if (spawns.length === 0) {
				continue;
			}

			// spawn new creeps to fill up the quota
			if (spawnCreepOfRole(role, spawns)) { // if successful
				return;
			}
		}
	}
}

function doAutoTrading() {
	// HACK: hardcoded logistics things
	Game.rooms["W13N11"].terminal.send(RESOURCE_ZYNTHIUM, Game.rooms["W13N11"].terminal.store[RESOURCE_ZYNTHIUM], "W16N9");
	Game.rooms["W16N7"].terminal.send(RESOURCE_UTRIUM, Game.rooms["W16N7"].terminal.store[RESOURCE_UTRIUM], "W15N8");

	let rooms = util.getOwnedRooms();

	let minimumPrice = {};
	minimumPrice[RESOURCE_ENERGY] = 0.08;
	minimumPrice[RESOURCE_OXYGEN] = 0.08;
	minimumPrice[RESOURCE_HYDROGEN] = 0.08;

	minimumPrice[RESOURCE_UTRIUM] = 0.08;
	minimumPrice[RESOURCE_LEMERGIUM] = 0.35;
	minimumPrice[RESOURCE_KEANIUM] = 0.35;
	minimumPrice[RESOURCE_ZYNTHIUM] = 0.35;
	minimumPrice[RESOURCE_CATALYST] = 0.5;

	minimumPrice[RESOURCE_GHODIUM] = 5;

	minimumPrice[RESOURCE_UTRIUM_BAR] = 0.45;
	minimumPrice[RESOURCE_ZYNTHIUM_BAR] = 0.45;
	minimumPrice[RESOURCE_REDUCTANT] = 0.45;
	minimumPrice[RESOURCE_BATTERY] = 0.05;

	minimumPrice[RESOURCE_ESSENCE] = 100000;
	minimumPrice[RESOURCE_EMANATION] = 30000;
	minimumPrice[RESOURCE_SPIRIT] = 10000;
	minimumPrice[RESOURCE_EXTRACT] = 1500;
	minimumPrice[RESOURCE_CONCENTRATE] = 300;

	minimumPrice[RESOURCE_OPS] = 4.7;

	for (let r = 0; r < rooms.length; r++) {
		let room = rooms[r];
		if (!room.terminal) {
			continue;
		}
		if (!Memory.mineralsToSell || Memory.mineralsToSell.length === 0) {
			continue;
		}

		for (let m = 0; m < Memory.mineralsToSell.length; m++) {
			let mineral = Memory.mineralsToSell[m];
			if (!minimumPrice[mineral]) {
				console.log("WARN: could not find", mineral, "in minimumPrice");
				continue;
			}
			if (room.terminal.cooldown > 0 || room.terminal.owner.username !== global.WHOAMI) {
				continue;
			}
			if (room.storage && room.storage.store[RESOURCE_ENERGY] < 10000 || !room.storage) {
				// ensure we have some energy in reserve
				continue;
			}
			if (mineral === RESOURCE_UTRIUM_BAR || mineral === RESOURCE_ZYNTHIUM_BAR || mineral === RESOURCE_REDUCTANT) {
				if (room.terminal.store[mineral] < 3000) {
					continue;
				}
			}
			else {
				if (room.terminal.store[mineral] < 10000) {
					continue;
				}
			}

			let buyOrders = Game.market.getAllOrders(function(order){
				return order.type === ORDER_BUY && order.resourceType === mineral && order.price >= minimumPrice[mineral] && order.remainingAmount > 0;
			});
			if (buyOrders.length === 0) {
				continue;
			}

			let amount = Math.min(room.terminal.store[mineral], 20000);
			// TODO: sort orders by order of credit price and energy price
			let buy = buyOrders[0];
			let cost = Game.market.calcTransactionCost(amount, room.name, buy.roomName);
			console.log(buy.id, buy.roomName, buy.type, "amount:", buy.remainingAmount, "/", buy.amount, buy.resourceType, "cost:", cost);
			if (cost <= room.terminal.store[RESOURCE_ENERGY]) {
				let result = Game.market.deal(buy.id, amount, room.name);
				console.log("deal result:", result);
			}
			else {
				console.log("WARN: Not enough energy to make deal.")
			}
		}
	}
}

function doAutoPlanning() {
	let rooms = util.getOwnedRooms();

	try {
		console.log("Planning rooms...");
		brainAutoPlanner.run();
	} catch (e) {
		printException(e);
	}

	// place extractors when able
	for (let r = 0; r < rooms.length; r++) {
		let room = rooms[r];
		if (room.controller.level >= 6) {
			let minerals = room.find(FIND_MINERALS);
			for (let m in minerals) {
				let mineral = minerals[m];
				if (mineral.pos.lookFor(LOOK_STRUCTURES, { filter: struct => struct.structureType === STRUCTURE_EXTRACTOR }).length == 0) {
					if (mineral.pos.lookFor(LOOK_CONSTRUCTION_SITES, { filter: site => site.structureType === STRUCTURE_EXTRACTOR }).length == 0) {
						mineral.pos.createConstructionSite(STRUCTURE_EXTRACTOR);
					}
				}
			}
		}
	}
}

function doWorkLabs() {
	let rooms = util.getOwnedRooms();
	for (let r = 0; r < rooms.length; r++) {
		let room = rooms[r];
		if (room.controller.level < 6) {
			continue;
		}
		let labs = util.getStructures(room, STRUCTURE_LAB);

		for (let l = 0; l < labs.length; l++) {
			let workFlag = util.getWorkFlag(labs[l].pos);
			if (!workFlag || workFlag.secondaryColor != COLOR_GREEN) {
				continue;
			}
			// console.log(workFlag)
			let isMakingWhat = workFlag.name.split(":")[1];
			let needsMinerals = [];
			switch (isMakingWhat) {
				case "G":
					needsMinerals = ["UL", "ZK"];
					break;
				default:
					if (isMakingWhat.startsWith("X")) {
						needsMinerals = ["X",isMakingWhat.slice(1)]; // untested
					}
					else {
						needsMinerals = isMakingWhat.split("");
					}
			}
			let sourceLabs = labs[l].pos.findInRange(FIND_STRUCTURES, 2, {
				filter: (lab) => { return _.contains(needsMinerals, lab.mineralType); }
			});
			// console.log(labs[l], "is making", isMakingWhat, "using", needsMinerals, "from", sourceLabs)
			try {
				new RoomVisual(labs[l].room.name).line(labs[l].pos, sourceLabs[0].pos);
				new RoomVisual(labs[l].room.name).line(labs[l].pos, sourceLabs[1].pos);
			} catch (e) {

			}
			if (sourceLabs.length == 2) {
				labs[l].runReaction(sourceLabs[0], sourceLabs[1]);
			}
			else {
				// console.log("Too many/little source labs for", labs[l], ": ", sourceLabs);
			}
		}
	}
}

function commandRemoteMining() {
	// Force job to run: Memory.job_last_run["command-remote-mining"] = 0
	let neededHarvesters = 0, neededCarriers = 0;
	for (let t = 0; t < Memory.remoteMining.targets.length; t++) {
		let target = Memory.remoteMining.targets[t];
		// remove invalid creep references, and initialize potentially missing or invalid memory
		if (!Game.creeps[target.creepHarvester] || !Game.creeps[target.creepHarvester].memory.harvestTarget || Game.creeps[target.creepHarvester].memory.harvestTarget.id !== target.id) {
			delete target.creepHarvester;
		}
		if (target.creepCarriers) {
			for (let i = 0; i < target.creepCarriers.length; i++) {
				let carrierName = target.creepCarriers[i];
				if (!Game.creeps[carrierName] || !Game.creeps[carrierName].memory.harvestTarget || Game.creeps[carrierName].memory.harvestTarget.id !== target.id) {
					target.creepCarriers.splice(i, 1);
					i--;
				}
			}
		}
		else {
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
			let remoteHarvesters = util.getCreeps("remoteharvester").filter(creep => !creep.memory.harvestTarget || creep.memory.harvestTarget.id === target.id);
			let didAssign = false;
			for (let creep of remoteHarvesters) {
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
			let carriers = util.getCreeps("carrier").filter(creep => !creep.memory.harvestTarget || creep.memory.harvestTarget.id === target.id);
			let countAssigned = 0;
			for (let creep of carriers) {
				if (creep.memory.harvestTarget && creep.memory.harvestTarget.id === target.id) {
					creep.memory.harvestTarget = target;
					countAssigned++;
				}
				else if (!creep.memory.harvestTarget && !target.creepCarriers.includes(creep.name)) {
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
		let room = Game.rooms[target.roomName];
		if (!room) {
			// FIXME: don't have vision
			continue;
		}
		let source = Game.getObjectById(target.id);
		let hostiles = room.find(FIND_HOSTILE_CREEPS);
		let keeperLair;
		if (hostiles.filter(hostile => hostile.owner.username !== "Source Keeper").length > 0) {
			target.danger = 2;
		}
		else if (util.isTreasureRoom(target.roomName)) {
			// at this point, all hostiles must be source keepers
			if (!target.keeperLairId) {
				keeperLair = source.pos.findClosestByRange(FIND_HOSTILE_STRUCTURES, {
					filter: struct => struct.structureType === STRUCTURE_KEEPER_LAIR,
				});
				target.keeperLairId = keeperLair.id;
			}
			else {
				keeperLair = Game.getObjectById(target.keeperLairId);
			}

			if (hostiles.filter(hostile => hostile.pos.getRangeTo(source) <= 8).length > 0) {
				target.danger = 1;
			}
			else if (keeperLair.ticksToSpawn <= jobs["command-remote-mining"].interval + 5) {
				target.danger = 1;
			}
			else {
				target.danger = 0;
			}
		}
		else {
			target.danger = 0;
		}

		// determine ideal creep positions for increased danger levels
		if (!target.dangerPos) {
			let harvestPos = new RoomPosition(target.harvestPos.x, target.harvestPos.y, target.roomName);
			let keepAwayFrom = keeperLair ? [
				{ pos: source.pos, range: 6 },
				{ pos: keeperLair.pos, range: 5 },
			] : { pos: source.pos, range: 6 };
			target.dangerPos = {
				1: _.last(PathFinder.search(
					harvestPos,
					keepAwayFrom,
					{
						flee: true,
					}
				).path),
				2: _.filter(PathFinder.search(
					harvestPos,
					{ pos: _.filter(util.findClosestOwnedRooms(harvestPos), r => r.storage)[0].storage.pos, range: 4 },
					{}
				).path, pos => pos.roomName !== target.roomName && !util.isDistFromEdge(pos, 3))[0],
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
	let targetRooms = _.uniq(_.filter(Memory.remoteMining.targets, target => Game.getObjectById(target.id)).map(target => Game.getObjectById(target.id).room.name));
	targetRooms = _.reject(targetRooms, roomName => util.isTreasureRoom(roomName) || util.isHighwayRoom(roomName));
	for (let room of targetRooms) {
		let controller = util.getStructures(new Room(room), STRUCTURE_CONTROLLER)[0];
		if (!controller) {
			console.log("[remote mining] ERR: can't find controller");
		}
		if (controller && controller.reservation && controller.reservation.username === global.WHOAMI && controller.reservation.ticksToEnd > 400) {
			continue;
		}

		let alreadyTargeted = false;
		for (let claimTarget of Memory.claimTargets) {
			if (claimTarget.room === room) {
				alreadyTargeted = true;
				break;
			}
		}

		if (!alreadyTargeted) {
			Memory.claimTargets.push({
				room,
				mode: "reserve"
			});
		}
	}
}

function satisfyClaimTargets() {
	let claimers = util.getCreeps("claimer");
	for (let t = 0; t < Memory.claimTargets.length; t++) {
		let satisfied = false;
		if (util.isTreasureRoom(Memory.claimTargets[t].room) || util.isHighwayRoom(Memory.claimTargets[t].room)) {
			console.log("[satisfy-claim-targets] WARN: Can't satisfy target without a controller. (Treasure/Highway room detected)");
			satisfied = true;
		}
		else if (Memory.claimTargets[t].mode === "reserve" && Game.rooms[Memory.claimTargets[t].room]) {
			if (Game.rooms[Memory.claimTargets[t].room] && (foundInvaderCore = _.first(Game.rooms[Memory.claimTargets[t].room].find(FIND_HOSTILE_STRUCTURES, { filter: struct => struct.structureType === STRUCTURE_INVADER_CORE })))) {
				console.log(`[satisfy-claim-targets] WARN: Can't satisfy target if there's an invader core (${Memory.claimTargets[t].room})`);
				satisfied = true;
			}
			else if ((reserv = Game.rooms[Memory.claimTargets[t].room].controller.reservation) && reserv.username !== global.WHOAMI && Game.rooms[Memory.claimTargets[t].room].controller.upgradeBlocked > 20) {
				console.log(`[satisfy-claim-targets] WARN: Can't satisfy target if we can't attack the controller (${Memory.claimTargets[t].room})`);
				satisfied = true;
			}
		}
		for (let creep of claimers) {
			if (creep.memory.targetRoom === Memory.claimTargets[t].room) {
				satisfied = true;
				break;
			}
		}

		if (satisfied) {
			Memory.claimTargets.splice(t, 1);
			t--;
		}
		else {
			// spawn new claimer
			let spawnRoom = _.first(util.findClosestOwnedRooms(new RoomPosition(25, 25, Memory.claimTargets[t].room), r => r.energyCapacityAvailable > 2600 && r.energyAvailable >= r.energyCapacityAvailable * 0.8))
			if (!spawnRoom) {
				console.log("WARN: All rooms don't have enough energy to spawn creeps");
				continue;
			}
			console.log("Spawning claimer in room", spawnRoom.name, "targetting room", Memory.claimTargets[t].room);
			let spawns = util.getStructures(spawnRoom, STRUCTURE_SPAWN).filter(s => !s.spawning);
			if (spawns.length === 0) {
				console.log("WARN: no spawns available in spawnRoom", spawnRoom.name);
				continue;
			}
			let targetSpawn = spawns[Math.floor(Math.random() * spawns.length)];
			let claimerBody = [CLAIM, CLAIM, CLAIM, CLAIM, CLAIM, CLAIM, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE];
			if (Memory.claimTargets[t].mode === "claim") {
				claimerBody = [TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, MOVE, MOVE, MOVE, CLAIM, MOVE, MOVE, MOVE, MOVE]
			}
			targetSpawn.spawnCreep(claimerBody, 'claimer_' + Game.time.toString(16), {
				memory: {
					role: 'claimer',
					targetRoom: Memory.claimTargets[t].room,
					mode: Memory.claimTargets[t].mode,
				}
			});
		}
	}
}

function doWorkFactories() {
	let rooms = util.getOwnedRooms();
	for (let room of rooms) {
		let factory = util.getStructures(room, STRUCTURE_FACTORY)[0];

		if (!factory || factory.cooldown > 0) {
			continue;
		}

		// FIXME: make this more dynamic
		// right now, everything is hard coded

		let productionTargets = [
			RESOURCE_UTRIUM_BAR,
			RESOURCE_ZYNTHIUM_BAR,
			RESOURCE_REDUCTANT,
			RESOURCE_OXIDANT,

			RESOURCE_ESSENCE,
			RESOURCE_EMANATION,
			RESOURCE_SPIRIT,
			RESOURCE_EXTRACT,
			RESOURCE_CONCENTRATE,

			RESOURCE_KEANIUM_BAR,
			RESOURCE_PURIFIER,
		];

		if (room.storage) {
			if (room.storage.store[RESOURCE_ENERGY] > 800000 && factory.store[RESOURCE_BATTERY] < 10000) {
				productionTargets.push(RESOURCE_BATTERY);
			}
			else if (room.storage.store[RESOURCE_ENERGY] < 600000) {
				productionTargets.push(RESOURCE_ENERGY);
			}
		}


		for (let productionTarget of productionTargets) {
			console.log(`[work-factories] production target: ${productionTarget}`);
			let canProduce = true;
			if (COMMODITIES[productionTarget].level > factory.level) {
				console.log(`[work-factories] factory is level ${factory.level}, but level ${COMMODITIES[productionTarget].level} is required`);
				canProduce = false;
				break;
			}

			for (let component in COMMODITIES[productionTarget].components) {
				// console.log(`[work-factories] factory has component ${component}?`);
				if (!factory.store.hasOwnProperty(component)) {
					console.log(`[work-factories] no ${component} found`);
					canProduce = false;
					break;
				}
				// console.log(`[work-factories] found ${factory.store[component]} ${component}`);
				if (factory.store[component] < COMMODITIES[productionTarget].components[component]) {
					console.log(`[work-factories] not enough ${component}, found ${factory.store[component]} need ${COMMODITIES[productionTarget].components[component]}`);
					canProduce = false;
					break;
				}
			}

			console.log(`[work-factories] production target: ${productionTarget}, can produce: ${canProduce}`);
			if (canProduce) {
				let productionResult = factory.produce(productionTarget);
				if (productionResult !== OK) {
					console.log(`[work-factories] unable to produce ${productionTarget} => ${productionResult}`);
				}
				else {
					break;
				}
			}
		}
	}
}

let jobs = {
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
		interval: 40,
	},
	"op-guard": {
		name: "op-guard",
		run() {
			brainGuard.updateGuardTasks();
		},
		interval: 5,
	},
};

function queueJob(job) {
	for (let i = 0; i < Memory.job_queue.length; i++) {
		if (Memory.job_queue[i].startsWith(job.name)) {
			return;
		}
	}
	console.log("Adding", job.name, "to queue");
	Memory.job_queue.push(job.name);
}

function main() {
	if (Game.cpu.bucket > 9500) {
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
	for (let j in jobs) {
		let job = jobs[j];
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

	let rooms = util.getOwnedRooms();

	// do tower stuff and process power
	for (let room of rooms) {
		let rcl = room.controller.level;
		if (CONTROLLER_STRUCTURES[STRUCTURE_TOWER][rcl] > 0) {
			try {
				roleTower.run(room);
			} catch (e) {
				printException(e);
			}
		}

		// TODO: make something a little more robust/dynamic for limiting the amount of energy spent on power.
		if (CONTROLLER_STRUCTURES[STRUCTURE_POWER_SPAWN][rcl] > 0) {
			if (room.storage.store[RESOURCE_ENERGY] >= 500000) {
				let powerspawn = room.find(FIND_STRUCTURES, { filter: s => s.structureType === STRUCTURE_POWER_SPAWN })[0];
				if (powerspawn) {
					powerspawn.processPower();
				}
			}
		}
	}

	// do creep stuff
	for (let name in Memory.creeps) {
		if(!Game.creeps[name]) {
			console.log('Clearing non-existing creep memory:',name);
			delete Memory.creeps[name];
		}
	}

	for (let name in Game.creeps) {
		let creep = Game.creeps[name];
		if (creep.spawning) {
			continue;
		}

		if (creep.memory.renewing) {
			creep.say("renewing");
			continue;
		}

		if (creep.memory.role !== "guardian" && creep.memory.stage < 0) {
			creep.memory.stage = toolCreepUpgrader.getCreepStage(creep);
			console.log("set creep", creep.name, "stage:", creep.memory.stage);
		}

		try {
			if (taskRenew.checkRenew(creep)) {
				creep.memory.renewing = true;
				if (creep.memory.role === "harvester" && creep.memory.depositMode !== "recovery" && creep.store[RESOURCE_ENERGY] > 0) {
					creep.drop(RESOURCE_ENERGY);
				}
				continue;
			}
			if (!["miner", "scientist", "builder", "carrier", "manager"].includes(creep.memory.role) && taskDepositMaterials.checkForMaterials(creep, true)) {
				creep.say("deposit");
				taskDepositMaterials.run(creep, true);
				continue;
			}
		}
		catch (e) {
			printException(e);
		}

		if (creep.memory.role === "guardian") {
			continue;
		}

		try {
			switch (creep.memory.role) {
				case 'harvester':
					roleHarvester.run(creep);
					break;
				case 'upgrader':
					roleUpgrader.run(creep);
					break;
				case 'builder':
					// If there is something to build, go build it
					// otherwise, do repairs
					if (roleBuilder.findTargets(creep).length > 0) {
						if (taskDepositMaterials.checkForMaterials(creep, true)) {
							creep.say("deposit");
							taskDepositMaterials.run(creep, true);
						}
						else {
							roleBuilder.run(creep);
						}
					}
					else {
						if (Game.time % 600 < 250) {
							roleRepairer.run(creep);
						}
						else {
							if (taskDepositMaterials.checkForMaterials(creep, true)) {
								creep.say("deposit");
								taskDepositMaterials.run(creep, true);
							}
							else {
								roleUpgrader.run(creep);
							}
						}
						// roleRepairer.run(creep);
						// roleScientist.run(creep);
						// roleUpgrader.run(creep);
						// roleManager.run(creep);
						// roleMiner.run(creep);
					}
					break;
				case 'repairer':
					roleRepairer.run(creep);
					// roleBuilder.run(creep);
					// roleUpgrader.run(creep);
					// roleMiner.run(creep);
					break;
				case 'attacker':
					roleAttacker.run(creep);
					break;
				case 'healer':
					roleHealer.run(creep);
					break;
				case 'claimer':
					roleClaimer.run(creep);
					break;
				case 'manager':
					if (Memory.USE_ADV_LOGISTICS) {
						require("role.testlogistics").run(creep);
					}
					else {
						roleManager.run(creep);
					}
					break;
				case 'remoteharvester':
					roleRemoteHarvester.run(creep);
					break;
				case 'carrier':
					roleCarrier.run(creep);
					break;
				case 'scout':
					roleScout.run(creep);
					break;
				case 'nextroomer':
					roleNextRoomer.run(creep);
					break;
				case 'miner':
					roleMiner.run(creep);
					break;
				case 'scientist':
					if (Memory.USE_ADV_LOGISTICS) {
						require("role.testlogistics").run(creep);
					}
					else {
						roleScientist.run(creep);
					}
					break;
				case 'relay':
					roleRelay.run(creep);
					break;
				case 'tmpdeliver':
					roleTmpDeliver.run(creep);
					break;
				case 'invaderdestroyer':
					require("role.invaderdestroyer").run(creep);
					break;
				case 'testlogistics':
					require("role.testlogistics").run(creep);
					break;
				default:
					console.log(creep.name, "Err: No",creep.memory.role,"role to execute");
					console.log("Parsing role from name...");
					let role = creep.name.split("_")[0];
					console.log("Found role:", role);
					creep.memory.role = role;
					if (!creep.memory.stage) {
						creep.memory.stage = -1;
					}
			}
		}
		catch (e) {
			printException(e, creep=creep);
		}
	}

	// powercreeps
	try {
		require("powercreep.ligma").run(Game.powerCreeps["Ligma"]);
	}
	catch (e) {
		console.log("failed to run power creeps");
		printException(e);
	}

	let renewingCreeps = _.filter(_.values(Game.creeps), c => c.memory.renewing);
	const CREEP_RENEW_PRIORITY = {
		"_default": 5,
		"harvester": 1,
		"manager": 1,
		"remoteharvester": 8,
		"carrier": 8,
		"scientist": 9,
		"guardian": 9,
	}
	renewingCreeps.sort((a, b) => {
		// sort in descending order, so that the creeps with the least time to live get renewed first, but only if they are about to die
		if (a.ticksToLive <= 100) {
			return b.ticksToLive - a.ticksToLive;
		}
		// priortize creeps based on role, lowest number has highest priority
		let pA = Object.hasOwnProperty(CREEP_RENEW_PRIORITY, a.memory.role) ? CREEP_RENEW_PRIORITY[a.memory.role] : CREEP_RENEW_PRIORITY["_default"];
		let pB = Object.hasOwnProperty(CREEP_RENEW_PRIORITY, b.memory.role) ? CREEP_RENEW_PRIORITY[b.memory.role] : CREEP_RENEW_PRIORITY["_default"];
		return pB - pA;
	});
	for (let creep of renewingCreeps) {
		try {
			taskRenew.run(creep);
		}
		catch (e) {
			printException(e, creep=creep);
		}
	}

	// process jobs
	while (Memory.job_queue.length > 0 && Game.cpu.getUsed() < Game.cpu.limit * 0.7) {
		let job_to_do = Memory.job_queue[0];
		console.log("Running job:", job_to_do);
		let job = jobs[job_to_do];
		try {
			job.run();
			Memory.job_queue.shift();
			Memory.job_last_run[job.name] = Game.time;
		}
		catch (e) {
			console.log("ERR: Job failed", job.name);
			printException(e);
			break;
		}
	}

	// force spawning
	if (Object.keys(Game.creeps).length === 0 || Memory.forceCreepSpawn || Game.flags["forceSpawn"]) {
		queueJob(jobs["creep-spawning"]);
		if (Memory.forceCreepSpawn) {
			delete Memory.forceCreepSpawn;
		}
	}

	// manual testing for room planning
	if (Game.flags["planWalls"]) {
		if (Game.cpu.bucket > 9000) {
			try {
				brainAutoPlanner.planWalls(Game.flags["planWalls"].room);
			} catch (e) {
				printException(e);
			}
		}
		else {
			console.log("Not enough CPU bucket to manually plan walls, waiting until at least 9000");
		}
	}

	if (Game.flags["forcePlan"] && Game.flags["forcePlan"].color === COLOR_WHITE) {
		try {
			brainAutoPlanner.planRoom(Game.flags["forcePlan"].room, true);
			brainAutoPlanner.drawRoomPlans(Game.flags["forcePlan"].room);
		}
		catch (e) {
			printException(e);
		}
		if (Game.cpu.bucket < 9700) {
			Game.flags["forcePlan"].setColor(COLOR_GREY);
		}
	}

	if (Game.flags["showPlans"] && Game.flags["showPlans"].color === COLOR_WHITE) {
		try {
			brainAutoPlanner.drawRoomPlans(Game.flags["showPlans"].room);
		}
		catch (e) {
			printException(e);
		}
		if (Game.cpu.bucket < 9700) {
			Game.flags["forcePlan"].setColor(COLOR_GREY);
		}
		if (Game.cpu.bucket < 9700) {
			Game.flags["showPlans"].setColor(COLOR_GREY);
		}
	}

	try {
		brainGuard.assignGuardTasks();
		brainGuard.runTasks();
	}
	catch (e) {
		console.log("ERR: brain.guard tasks failed");
		printException(e);
	}
	brainGuard.finalize();

	try {
		// TODO: run creeps assigned to these tasks
	} catch (e) {
		console.log("ERR: brain.highwayHarvesting tasks failed");
		printException(e);
	}
	brainHighwayHarvesting.finalize();

	brainLogistics.finalize();

	printStatus();

	// HACK: some hard coded lab stuff
	let lab = Game.getObjectById("5bd6ad0a73cd123941da20b7");
	if (lab.cooldown === 0) {
		lab.reverseReaction(Game.getObjectById("5bd286b0e5f5d125150e170e"), Game.getObjectById("5bd6388f0f472220a4ad5a18"));
	}
	lab = Game.getObjectById("5f551a96aa0ade59d1cbaa6a");
	if (lab.cooldown === 0) {
		lab.reverseReaction(Game.getObjectById("5f54faae9f32eef3fc3152e0"), Game.getObjectById("5f5159d6d4a34b200c26c418"));
	}

	// draw some extra eye candy, if we can spare the resources
	if (Game.cpu.bucket > 500 && Game.cpu.getUsed() < Game.cpu.limit * 0.85) {
		toolEnergySource.drawAssignedCounts();

		let rooms = util.getOwnedRooms();
		for (let r = 0; r < rooms.length; r++) {
			let room = rooms[r];

			// draw upgrader quotas on controllers
			let count = util.getCreeps("upgrader").filter((creep) => creep.memory.targetRoom === room.name).length;
			let max = toolCreepUpgrader.getUpgraderQuota(room);
			let text = count + "/" + max;
			let color = count <= max ? "#11dd11" : "#dd1111";
			room.visual.text(text, room.controller.pos, { "color": color, "font": 0.4, "stroke": "#000" });

			// mark the room's rootPos, assists autoplanner debugging
			let root = room.memory.rootPos;
			if (root) {
				room.visual.rect(root.x - .45, root.y - .45, .9, .9, { "fill": "#44dd44" });
			}

			// draw relay status
			let relays = util.getCreeps("relay").filter(creep => creep.memory.targetRoom === room.name);
			for (let relay of relays) {
				if (!relay.memory.assignedPos) {
					continue;
				}
				let pos = new RoomPosition(relay.memory.assignedPos.x, relay.memory.assignedPos.y, relay.memory.targetRoom);
				let stroke;
				if (relay.pos.isEqualTo(pos)) {
					stroke = "#44dd44";
				}
				else {
					stroke = "#ddbb44";
					if (relay.room.name === relay.memory.targetRoom) {
						room.visual.text(`${relay.pos.getRangeTo(pos)}`, pos, {
							font: 0.4,
						})
					}
					else {
						room.visual.text(relay.room.name, pos, {
							font: 0.4,
						})
					}
				}
				room.visual.circle(pos, {
					stroke,
					fill: "transparent",
					radius: 0.4,
					opacity: 0.5,
				});
			}
		}

		const vis = new RoomVisual();

		// draw information about creep quotas
		let bottomRowCreepInfo;
		try {
			let baseX = 2;
			let baseY = 2;
			let row = 0;
			for (let role of _.values(toolCreepUpgrader.roles)) {
				let count = util.getCreeps(role.name).length;
				let quota = !role.quota_per_room ? role.quota() : 0;
				if (role.quota_per_room) {
					for (let room of rooms) {
						quota += role.quota(room);
					}
				}
				let percentQuota = util.clamp(count / quota, 0, 1);

				vis.text(role.name, baseX, baseY + row, {
					align: "left",
					font: 0.5,
				});
				vis.rect(baseX + 4, baseY - .4 + row, 5 * percentQuota, 0.6, {
					fill: count <= quota ? "#0084f0" : "#f02800",
				});
				vis.rect(baseX + 4, baseY - .4 + row, 5, 0.6, {
					fill: "transparent",
					stroke: "#ffffff",
					strokeWidth: 0.08,
					opacity: 1,
				});

				vis.text(`${count}/${quota}`, baseX + 4 + 5/2, baseY + row + 0.1, {
					align: "center",
					font: 0.5,
					color: count <= quota ? "#fff" : "#ff8888",
				});

				row++;
			}
			bottomRowCreepInfo = baseY + row;
		}
		catch (e) {
			printException(e);
		}

		// draw info about spawns
		try {
			let baseX = 14;
			let baseY = 2;
			let rooms = util.getOwnedRooms();
			for (let r = 0; r < rooms.length; r++) {
				let room = rooms[r];

				let ySpacing = 2.2;

				vis.text(`${room.name}`, baseX - 0.25, baseY + (ySpacing * r), {
					align: "left",
					font: 0.5,
					color: "#fff",
				});

				let spawns = util.getStructures(room, STRUCTURE_SPAWN);
				for (let s = 0; s < spawns.length; s++) {
					let xOffset = 0.3;
					let yOffset = 1;
					let spawnRadius = 0.5;
					let xSpacing = 1.4;
					let spawn = spawns[s];
					vis.circle(baseX + xSpacing * s + xOffset, baseY + (ySpacing * r) + yOffset, {
						radius: spawnRadius,
						fill: "#0084f0",
					});
					vis.circle(baseX + xSpacing * s + xOffset, baseY + (ySpacing * r) + yOffset, {
						radius: spawnRadius,
						fill: "transparent",
						stroke: "#ffffff",
						strokeWidth: 0.08,
						opacity: 1,
					});
					if (spawn.spawning) {
						vis.text(`${Math.round(((spawn.spawning.needTime - spawn.spawning.remainingTime) / spawn.spawning.needTime) * 100)}%`, baseX + xSpacing * s + xOffset, baseY + (ySpacing * r) + yOffset + 0.1, {
							align: "center",
							font: 0.3,
							color: "#fff",
						});
					}
				}
			}
		}
		catch (e) {
			printException(e);
		}

		// draw info about remote mining
		try {
			let baseX = 8;
			let baseY = bottomRowCreepInfo + 1;
			let row = 0;
			for (let source of Memory.remoteMining.targets) {
				vis.text(`${source.roomName}: harvester: ${source.creepHarvester} carriers: ${source.creepCarriers ? source.creepCarriers.length : 0}/${source.neededCarriers} danger: ${source.danger}`, baseX, baseY + row * 0.6, {
					align: "left",
					font: 0.5,
					color: "#fff",
				});
				row++;
			}
		}
		catch (e) {
			printException(e);
		}

		// draw info about guard tasks
		try {
			let baseX = 27;
			let baseY = bottomRowCreepInfo + 1;
			let row = 0;
			for (let task of Memory.guard.tasks) {
				vis.text(`${task.targetRoom}: ${task.guardType} creeps: ${task.assignedCreeps ? task.assignedCreeps.length : 0}/${task.neededCreeps}`, baseX, baseY + row * 0.6, {
					align: "left",
					font: 0.5,
					color: "#fff",
				});
				row++;
			}
		} catch (e) {
			printException(e);
		}

		// draw creeps marked for deatch
		try {
			for (let c in Game.creeps) {
				let creep = Game.creeps[c];
				if (creep.memory.keepAlive) {
					continue;
				}
				creep.room.visual.circle(creep.pos, {
					stroke: "#f00",
					fill: "transparent",
					opacity: 0.6,
					radius: 0.5,
					lineStyle: "dotted",
				})
			}
		} catch (e) {
			printException(e);
		}

		drawRoomScores();
	}
}

// https://github.com/screepers/screeps-profiler
// const profiler = require('profiler');
// profiler.registerClass(util, 'util');
// profiler.registerClass(roleHarvester, 'role.harvester');
// profiler.registerClass(roleUpgrader, 'role.upgrader');
// profiler.registerClass(roleBuilder, 'role.builder');
// profiler.registerClass(roleRepairer, 'role.repairer');
// profiler.registerClass(roleManager, 'role.manager');
// profiler.registerClass(roleScientist, 'role.scientist');
// profiler.registerClass(roleTower, 'role.tower');
// profiler.registerClass(roleRelay, 'role.relay');
// profiler.registerClass(roleTmpDeliver, 'role.tmpdeliver');
// profiler.registerClass(roleRemoteHarvester, 'role.remoteharvester');
// profiler.registerClass(roleCarrier, 'role.carrier');
// profiler.registerClass(taskRenew, 'task.renew');
// profiler.registerClass(require('task.gather'), 'task.gather');
// profiler.registerClass(brainAutoPlanner, 'brain.autoplanner');
// profiler.registerClass(brainGuard, 'brain.guard');
// profiler.registerClass(brainLogistics, 'brain.logistics');
// profiler.registerClass(brainHighwayHarvesting, 'brain.highwayharvesting');
// profiler.enable();

module.exports = {
	loop() {
// 		profiler.wrap(function() {
			main();
// 		});
	},
}
