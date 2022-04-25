let util = require('./util');

let toolEnergySource = {
	// adjusted: adjust harvester count for if containers/storage/links are nearby
	getMaxHarvesters(energySource, adjusted=false) {
		if (util.getOwnedRooms().length > 1) {
			return 1;
		}
		let count = 0;
		for (let y = energySource.pos.y - 1; y <= energySource.pos.y + 1; y++) {
			for (let x = energySource.pos.x - 1; x <= energySource.pos.x + 1; x++) {
				let thispos = new RoomPosition(x, y, energySource.room.name);
				let thisterrain = thispos.lookFor("terrain");
				if (thisterrain == "plain" || thisterrain == "swamp") {
					count++;
				}
			}
		}
		if (adjusted) {
			if (energySource.pos.findInRange(FIND_STRUCTURES, 2, { filter: struct =>  struct.structureType == STRUCTURE_CONTAINER }).length > 0) {
				count = 1;
			}
			else if (energySource.pos.findInRange(FIND_STRUCTURES, 2, { filter: struct => struct.structureType == STRUCTURE_LINK }).length > 0) {
				count = 1;
			}
			else if (energySource.pos.findInRange(FIND_STRUCTURES, 2, { filter: struct => struct.structureType == STRUCTURE_STORAGE }).length > 0) {
				count = 1;
			}
		}
		return (count > 2) ? 2 : count;
	},

	getHarvesters(energySource) {
		let count = 0;
		let harvesters = util.getCreeps("harvester");
		for (let harvester of harvesters) {
			if (harvester.memory.harvestTarget == energySource.id) {
				count++;
			}
		}
		return count;
	},

	canAssignSource(energySource) {
		let maxHarvestersOnSource = this.getMaxHarvesters(energySource, true);
		let harvestersOnSource = this.getHarvesters(energySource);
		return harvestersOnSource < maxHarvestersOnSource;
	},

	getHarvesterQuota(room) {
		if (util.getOwnedRooms().length === 1 && room.controller.level < 4) {
			return 3;
		}
		else {
			return room.find(FIND_SOURCES).length;
		}
	},

	drawAssignedCounts() {
		let rooms = util.getOwnedRooms();
		for (let r = 0; r < rooms.length; r++) {
			let room = rooms[r];
			let sources = room.find(FIND_SOURCES);
			for (let i = 0; i < sources.length; i++) {
				let count = this.getHarvesters(sources[i]);
				let max = this.getMaxHarvesters(sources[i], true);

				let text = count + "/" + max;
				let color = count <= max ? "#11dd11" : "#dd1111";
				room.visual.text(text, sources[i].pos, { "color": color, "font": 0.4, "stroke": "#000" });
			}
		}
	}
}

module.exports = toolEnergySource;
