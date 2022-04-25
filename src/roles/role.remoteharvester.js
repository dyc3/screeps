let traveler = require('traveler');
let util = require("../util");

let roleRemoteHarvester = {
	/** @param {Creep} creep **/
	run(creep) {
		// TEMP set harvest target for testing
		// creep.memory.harvestTarget = {
		// 	id: "55c34a6b5be41a0a6e80c5b5",
		// 	x: 29,
		// 	y: 43,
		// 	roomName: "W15N9",
		// 	harvestPos: { x: 30, y: 44 },
		// };

		if (!creep.memory.harvestTarget) {
			console.log(creep.name, "ERR: no harvest target, this needs to be assigned by a job (similar to how relays are assigned)");
			return;
		}
		let harvestTarget = _.find(Memory.remoteMining.targets, target => target.id === creep.memory.harvestTarget.id);

		if (harvestTarget.danger > 0) {
			creep.say("flee");
			let dangerPos = new RoomPosition(harvestTarget.dangerPos[harvestTarget.danger].x, harvestTarget.dangerPos[harvestTarget.danger].y, harvestTarget.dangerPos[harvestTarget.danger].roomName);
			creep.travelTo(dangerPos);
			return;
		}

		// console.log(creep.name, "observe result:", observer.observeRoom(creep.memory.harvestTarget.roomName));
		if (creep.room.name !== harvestTarget.roomName) {
			creep.travelTo(new RoomPosition(harvestTarget.x, harvestTarget.y, harvestTarget.roomName));
			return;
		}

		if (creep.hits < creep.hitsMax) {
			// HACK: go get healed
			creep.memory.renewing = true;
			return;
		}

		let source = Game.getObjectById(harvestTarget.id);
		if (!source) {
			console.log(creep.name, "CRITICAL: Unable to access harvest target");
			return;
		}

		// TODO: cache path to harvest target
		let harvestPos = new RoomPosition(harvestTarget.harvestPos.x, harvestTarget.harvestPos.y, harvestTarget.roomName);
		if (!creep.pos.isEqualTo(harvestPos)) {
			creep.travelTo(harvestPos);
			return;
		}

		if (source.energy > 0) {
			creep.harvest(source);
		}
		else {
			if (source.ticksToRegenerate > 30 && creep.ticksToLive < 300) {
				creep.memory.renewing = true;
			}
		}
	},
}

module.exports = roleRemoteHarvester;
