// Enemies: Quadrat1c, BarryOSeven

// https://wiki.screepspl.us/index.php/Private_Server_Common_Tasks
// https://lodash.com/

// Game.market.deal("871ef5078aaeb4c", 50, "W9N7") // buy L
// Game.market.deal("fc07f2fc9b05219", 50, "W9N7") // buy Z
// Game.market.deal("c12df6fc3647a67", 300, "W9N7") // sell U
// Game.getObjectById("20d85648a0e1570") // storage in room W9N7
// Game.getObjectById("79b4eab8d806a4c") // terminal in room W9N7

// var sci = Game.creeps["scientist1"]; sci.withdraw(sci.room.storage, "U"); sci.transfer(sci.room.terminal, "U")

// Game.spawns["Spawn1"].createCreep([CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE], "scientist1", {role:"scientist", keepAlive:true})
// Game.spawns["Spawn1"].createCreep([WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE], "miner1", {role:"miner", keepAlive:true, stage:3})
// Scouts:
// Game.spawns["Spawn1"].createCreep([MOVE], "scout_1", {role:"scout", keepAlive:false})
// Game.spawns["Spawn1"].createCreep([WORK,WORK,WORK,MOVE,MOVE,MOVE], "scout_1", {role:"scout", keepAlive:false}) // use to dismantle with flag "scoutdismantle"

// Memory.mineralsToSell

// Game.creeps["upgrader_801392"].signController(Game.getObjectById("59f1a21c82100e1594f39717"), "")

/*
# SOME NOTES

## Misc

* To manually create short roads quickly, you can place 2 flags: "planStart" and "planEnd".
* To harvest a remote room (only 1 at a time), place a flag "harvestme" on target energy source.

## Testing

* To manually test brainAutoPlanner.planWalls(), place a flag named "planWalls" in the room you want to test.

*/

let util = require('util');

let roleHarvester = require('role.harvester');
let roleUpgrader = require('role.upgrader');
let roleManager = require('role.manager');
let roleBuilder = require('role.builder');
let roleRepairer = require('role.repairer');
let roleAttacker = require('role.attacker');
let roleClaimer = require('role.claimer');
let roleHealer = require('role.healer');
// let roleMultiroomHarvester = require('role.multiroom-harvester');
// let roleCarrier = require('role.carrier');
let roleScout = require('role.scout');
let roleNextRoomer = require('role.nextroomer');
let roleMiner = require('role.miner');
let roleScientist = require('role.scientist');

let roleTower = require('role.tower');

let taskRenew = require('task.renew');
let taskDepositMaterials = require('task.depositmaterials');

let toolEnergySource = require('tool.energysource');
let toolCreepUpgrader = require('tool.creepupgrader');
let toolRoadPlanner = require('tool.roadplanner');

let brainAutoPlanner = require('brain.autoplanner');

let errorMild = '<audio src="http://trekcore.com/audio/computer/alarm01.mp3" autoplay />';

function printException(e, creep=undefined) {
	let msg = errorMild + '<span style="color: red">ERROR: ' + e.name + ": "+e.message+"\n"+e.stack + "</span>";
	if (creep) {
		console.log(creep.name, msg);
	}
	else {
		console.log(msg);
	}
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

function calculateDefcon(room) {
	console.log("calculating defcon:", room.name);
	/* This determines if there is a threat to the colony, and sets defcon levels per room.
	If we have no towers, and a foriegn player enters a room, defcon 1.
	If we have towers, and a foriegn player enters a room with a scouting creep, defcon 0.
	If we have towers, and foriegn creeps with attack/tough/heal/ranged attack, defcon 2.
	*/

	/*
	Defcon levels:
	0 - Safe, No threat
	1 - Warning, spawn a little defense (if no towers yet).
	2 - Under attack, determine if current defense can handle attack.
	*/
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
		console.log(room.name, "hostile creeps: ", hostileCreeps.length);
		if (hostileCreeps.length > 0) {
			defcon = 2;
		}
	}
	else {
		let hostileCreeps = room.find(FIND_HOSTILE_CREEPS);
		console.log(room.name, "hostile creeps: ", hostileCreeps.length);
		if (hostileCreeps.length > 0) {
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

// returns highest defcon level
function determineDefconLevels() {
	// NOTE: I don't think all this defcon stuff actually works. Redo it in a module called brain.defense
	let rooms = util.getOwnedRooms();
	let highestDefcon = 0;
	for (var r = 0; r < rooms.length; r++) {
		let room = rooms[r];
		let defcon = calculateDefcon(room);
		highestDefcon = Math.max(defcon, highestDefcon);
		room.memory.defcon = defcon;
	}
}

function doLinkTransfers(rooms) {
	for (var r = 0; r < rooms.length; r++) {
		var room = rooms[r];
		var links = util.getStructures(room, STRUCTURE_LINK);
		if (links.length > 0) {
			if (!room.memory.destinationLink) {
				room.memory.destinationLink = links.filter((link) => { return link.pos.inRangeTo(link.room.storage, 2); })[0].id;
			}
			var destinationLink = Game.getObjectById(room.memory.destinationLink);
			if (!destinationLink) {
				console.log("can't find destination link id: " + room.memory.destinationLink);
				delete room.memory.destinationLink;
				break;
			}
			if (destinationLink.energy < destinationLink.energyCapacity - 1) {
				for (var i = 0; i < links.length; i++) {
					var link = links[i];
					if (link.id == destinationLink.id) {
						continue;
					}
					if (link.cooldown > 0 || link.energy == 0) {
						continue;
					}
					link.transferEnergy(destinationLink);
				}
			}
		}
	}
}

function doTowers() {
	let towers = _.filter(Game.structures, (struct) => struct.structureType === STRUCTURE_TOWER);
	for (let i = 0; i < towers.length; i++) { roleTower.run(towers[i]); }
}

// draw the room scores in each room for easy viewing
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

	if (Game.flags["attack"]) {
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
			printException(e);
		} finally {

		}
	}
	if (Game.time % 4 == 0 && (Game.cpu.getUsed() < Game.cpu.limit || Game.cpu.bucket === 10000)) {
		for (let f in Game.flags) {
			let flag = Game.flags[f];
			// check if dismantle and norepair flags have structures under them
			if (flag.name.startsWith("dismantle") || flag.name.includes("norepair")) {
				if (flag.pos.lookFor(LOOK_STRUCTURES).length == 0) {
					flag.remove();
				}
			}
		}
		if (Game.flags["nextroom"]) {
			Memory.expansionTarget = Game.flags["nextroom"].pos.roomName;
			Game.flags["nextroom"].remove();
			console.log("expansionTarget set:",Memory.expansionTarget);
		}
	}
	if (Game.time % 100 == 0 && (Game.cpu.getUsed() < Game.cpu.limit || Game.cpu.bucket === 10000)) {
		// NOTE: this is probably unecessary right? considering RoomVisual exists now.
		util.clearAllDebugFlags();
	}
}

function main() {
	if (Game.time % 5 === 0) {
		delete Memory.disable_repair_search;
	}
	let rooms = util.getOwnedRooms();

	// handle defcons
	if (Game.time % 3 == 0) {
		try {
			let highestDefcon = determineDefconLevels();
			if (highestDefcon > 0) {
				Memory.forceCreepSpawn = true;
			}
		}
		catch (e) {
			printException(e);
		}
	}

	// do tower stuff
	doTowers();

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

		if (creep.memory.stage < 0) {
			creep.memory.stage = toolCreepUpgrader.getCreepStage(creep);
			console.log("set creep", creep.name, "stage:", creep.memory.stage);
		}

		//  && creep.memory.role != "multiroom-harvester"
		try {
			if (taskRenew.checkRenew(creep)) {
				creep.memory.renewing = true;
				taskRenew.run(creep);
				if (creep.memory.renewing) {
					creep.say("renewing");
				}
			}
			if ((creep.memory.role != "miner" && creep.memory.role != "scientist" && creep.memory.role != "builder") && taskDepositMaterials.checkForMaterials(creep, true)) {
				creep.say("deposit");
				taskDepositMaterials.run(creep, true);
			}
		}
		catch (e) {
			printException(e);
		}

		if (!creep.memory.renewing) {
			try {
				switch (creep.memory.role) {
					case 'harvester':
						// FIXME: really hacky way to speed up early game. THIS NEEDS TO BE CHANGED LATER.
						// if (creep.room.controller.level <= 1) {
						//     roleUpgrader.run(creep)
						// }
						// else {
						  //  roleHarvester.run(creep);
						// }
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
								if (creep.room.controller.level >= 6) {
									roleMiner.run(creep);
								}
								else {
									roleRepairer.run(creep);
								}
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
						roleManager.run(creep);
						break;
					case 'multiroom-harvester':
						roleMultiroomHarvester.run(creep);
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
						roleScientist.run(creep);
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
	}

	// do link transfers
	try {
		doLinkTransfers(rooms);
	}
	catch (e) {
		printException(e);
	}

	// auto spawning
	if (Object.keys(Game.creeps).length === 0) {
		Memory.forceCreepSpawn = true;
	}
	if ((Game.time % 10 === 7 && Game.cpu.bucket > 6000) || Memory.forceCreepSpawn) {
		spawning:
		for (let s = 0; s < _.values(Game.spawns).length; s++) {
			let spawn = _.values(Game.spawns)[s];
			// let spawn = Game.spawns["Spawn1"];
			let countHarvester = _.filter(Game.creeps, (creep) => creep.memory.role == "harvester");
			if (spawn.room.energyAvailable >= spawn.room.energyCapacityAvailable * 0.8 || countHarvester <= 1) {
				let inventoryString = spawn.room + ": ";
				//let haveContainer = spawn.room.find(FIND_STRUCTURES, {
				//		filter: (structure) => {
				//			return (structure.structureType == STRUCTURE_CONTAINER || structure.structureType == STRUCTURE_STORAGE);
				//		}
				//	}).length > 0;
				//let extensionCount = spawn.room.find(FIND_STRUCTURES, {
				//		filter: (structure) => {
				//			return (structure.structureType == STRUCTURE_EXTENSION);
				//		}
				//	}).length;

				let alreadySetKeepAlive = false; // indicates if we have already marked a creep for death this time around
				let r = 0;
				for (let role in toolCreepUpgrader.roles) {
					let creepsOfType = _.filter(Game.creeps, (creep) => creep.memory.role == role);
					inventoryString += role+': ' + creepsOfType.length+'/'+toolCreepUpgrader.roles[role].quota;
					let m = 12; // max roles to put on one line
					inventoryString += ((r % m == m - 1) ? "\n			 " : "  ");

					if(creepsOfType.length < toolCreepUpgrader.roles[role].quota && !spawn.spawning) {
						for(let name in Memory.creeps) {
							if(!Game.creeps[name]) {
								console.log('Clearing non-existing creep memory:',name);
								delete Memory.creeps[name];
							}
						}

						let newCreepMemory = {role: role, keepAlive: true};
						if (role == "attacker") {
							newCreepMemory.mode = "defend";
						}
						else if (role == "claimer" || role == "scout") {
							newCreepMemory.keepAlive = false;
						}
						let newCreepName = role + "_" + Game.time.toString(16);
						let hiStage = toolCreepUpgrader.getHighestStage(role, spawn);
						newCreepMemory.stage = hiStage;
						if (hiStage >= 0) {
							let newName = spawn.createCreep(toolCreepUpgrader.roles[role].stages[hiStage], newCreepName, newCreepMemory);
							console.log('Spawning new stage',hiStage,role+':',newName);
							break spawning; // spawn one creep per tick
						}
					}
					else {
						if (alreadySetKeepAlive == false && !creepsOfType.some((c) => !c.memory.keepAlive )) {
							for (let c in creepsOfType) {
								if (creepsOfType[c].memory.keepAlive == false) {
									alreadySetKeepAlive = true;
									break;
								}
								let cStage = creepsOfType[c].memory.stage;
								//let cStage = toolCreepUpgrader.getCreepStage(creepsOfType[c]);
								if (cStage < toolCreepUpgrader.getHighestStage(creepsOfType[c].memory.role, spawn))
								{
									console.log("Setting",creepsOfType[c].memory.role,creepsOfType[c].name,"keepAlive = false");
									creepsOfType[c].memory.keepAlive = false;
									alreadySetKeepAlive = true;
									break;
								}
							}
						}
						else if (creepsOfType.length > 0) {
							let markedCreeps = _.filter(creepsOfType, {
								filter: (c) => {
									return !c.memory.keepAlive;
								}
							});
							if (markedCreeps.length > 0) {
								for (let c in markedCreeps) {
									let cStage = markedCreeps[c].memory.stage;
									//let cStage = toolCreepUpgrader.getCreepStage(markedCreeps[c]);
									if (cStage >= toolCreepUpgrader.getHighestStage(markedCreeps[c].memory.role, spawn)) {
										console.log("Setting",markedCreeps[c].memory.role,markedCreeps[c].name,"keepAlive = true");
										markedCreeps[c].memory.keepAlive = true;
									}
								}
							}
						}
					}

					if (role == "harvester" && creepsOfType.length < 1) {
						console.log("Not enough harvesters alive, harvester construction is prioritized");
						break;
					}
					r++;
				}
				console.log(inventoryString);
			}
		}

		if (Memory.forceCreepSpawn) {
			delete Memory.forceCreepSpawn;
		}
	}

	doFlagCommandsAndStuff();

	// auto planning
	// place extractors when able
	for (let r = 0; r < rooms.length; r++) {
		let room = rooms[r];
		if (room.controller.level >= 6) {
			let minerals = room.find(FIND_MINERALS);
			for (let m in minerals) {
				let mineral = minerals[m];
				if (mineral.pos.lookFor(LOOK_STRUCTURES, { filter: (struct) => {return struct.structureType == STRUCTURE_EXTRACTOR}}).length == 0) {
					if (mineral.pos.lookFor(LOOK_CONSTRUCTION_SITES, { filter: (site) => {return site.structureType == STRUCTURE_EXTRACTOR}}).length == 0) {
						mineral.pos.createConstructionSite(STRUCTURE_EXTRACTOR);
					}
				}
			}
		}
	}
	if (Game.time % 10 === 4 && (Game.cpu.getUsed() < Game.cpu.limit || Game.cpu.bucket === 10000)) {
		try {
			console.log("Planning rooms...");
			brainAutoPlanner.run();
		} catch (e) {
			printException(e);
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
		brainAutoPlanner.planRoom(Game.flags["forcePlan"].room, true);
		brainAutoPlanner.drawRoomPlans(Game.flags["forcePlan"].room);
		if (Game.cpu.bucket < 9700) {
			Game.flags["forcePlan"].setColor(COLOR_GREY);
		}
	}

	if (Game.flags["showPlans"] && Game.flags["showPlans"].color === COLOR_WHITE) {
		brainAutoPlanner.drawRoomPlans(Game.flags["showPlans"].room);
		if (Game.cpu.bucket < 9700) {
			Game.flags["showPlans"].setColor(COLOR_GREY);
		}
	}

	// auto market
	let minimumPrice = {};
	minimumPrice[RESOURCE_OXYGEN] = 0.06;
	minimumPrice[RESOURCE_HYDROGEN] = 0.1;

	minimumPrice[RESOURCE_UTRIUM] = 0.05;
	minimumPrice[RESOURCE_LEMERGIUM] = 0.35;
	minimumPrice[RESOURCE_KEANIUM] = 0.35;
	minimumPrice[RESOURCE_ZYNTHIUM] = 0.35;
	minimumPrice[RESOURCE_CATALYST] = 0.5;

	minimumPrice[RESOURCE_GHODIUM] = 5;

	if (Game.cpu.getUsed() < Game.cpu.limit || Game.cpu.bucket === 10000) {
		console.log("Auto market...");
		for (let r = 0; r < rooms.length; r++) {
			let room = rooms[r];
			if (!room.terminal) {
				continue;
			}
			if (Memory.mineralsToSell && Memory.mineralsToSell.length > 0) {
				for (let m = 0; m < Memory.mineralsToSell.length; m++) {
					let mineral = Memory.mineralsToSell[m];
					if (!minimumPrice[mineral]) {
						console.log("WARN: could not find", mineral, "in minimumPrice");
						continue;
					}
					if (room.terminal.cooldown > 0) {
						continue;
					}
					if (room.storage.store[RESOURCE_ENERGY] < 10000) {
						// ensure we have some energy in reserve
						continue;
					}
					if (room.terminal.store[mineral] >= 10000 && room.terminal.store[RESOURCE_ENERGY] > 0) {
						let buyOrders = Game.market.getAllOrders(function(order){
							return order.type == ORDER_BUY && order.resourceType == mineral && order.price >= minimumPrice[mineral] && order.remainingAmount > 0;
						});
						if (buyOrders.length > 0) {
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
			}
		}
	}

	if (Game.time % 30 === 6) {
		// auto science
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

	printStatus();

	// draw some extra eye candy, if we can spare the resources
	if (Game.cpu.bucket > 9950 && Game.cpu.getUsed() < Game.cpu.limit * 0.85) {
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
		}

		drawRoomScores();
	}
}


// https://github.com/screepers/screeps-profiler
// const profiler = require('profiler');
// profiler.registerClass(roleHarvester, 'role.harvester');
// profiler.registerClass(roleUpgrader, 'role.upgrader');
// profiler.registerClass(roleBuilder, 'role.builder');
// profiler.registerClass(roleRepairer, 'role.repairer');
// profiler.registerClass(roleManager, 'role.manager');
// profiler.registerClass(roleScientist, 'role.scientist');
// profiler.enable();

module.exports.loop = function() {
// 	profiler.wrap(function() {
		main();
// 	});
}
