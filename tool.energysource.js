var util = require('util');

var toolEnergySource = {
	// adjusted: adjust harvester count for if containers/storage/links are nearby
	getMaxHarvesters: function(energySource, adjusted=false) {
		var count = 0;
		for (var y = energySource.pos.y - 1; y <= energySource.pos.y + 1; y++) {
			for (var x = energySource.pos.x - 1; x <= energySource.pos.x + 1; x++) {
				var thispos = new RoomPosition(x, y, energySource.room.name);
				var thisterrain = thispos.lookFor("terrain");
				if (thisterrain == "plain" || thisterrain == "swamp") {
					count++;
				}
			}
		}
		if (adjusted) {
			if (energySource.pos.findInRange(FIND_STRUCTURES, 2, { filter: function(struct) {return struct.structureType == STRUCTURE_CONTAINER}}).length > 0) {
				count = 1;
			}
			else if (energySource.pos.findInRange(FIND_STRUCTURES, 2, { filter: function(struct) {return struct.structureType == STRUCTURE_LINK}}).length > 0) {
				count = 1;
			}
			else if (energySource.pos.findInRange(FIND_STRUCTURES, 2, { filter: function(struct) {return struct.structureType == STRUCTURE_STORAGE}}).length > 0) {
				count = 1;
			}
		}
		return (count > 2) ? 2 : count;
	},

	getHarvesters: function(energySource) {
		var count = 0;
		var harvesters = _.filter(Game.creeps, (creep) => creep.memory.role == "harvester");
		for (var i = 0; i < harvesters.length; i++) {
			if (harvesters[i].memory.harvestTarget == energySource.id) {
				count++;
			}
		}
		return count;
	},

	canAssignSource: function(energySource) {
		var maxHarvestersOnSource = this.getMaxHarvesters(energySource, true);
		var harvestersOnSource = this.getHarvesters(energySource);
		return harvestersOnSource < maxHarvestersOnSource;
	},

	getHarvesterQuota: function() {
		var count = 0;
		var rooms = util.getOwnedRooms();
		for (var r = 0; r < rooms.length; r++) {
			var room = rooms[r];
// 			var spawn = util.getSpawn(room);
			var sources = room.find(FIND_SOURCES);
			for (var i = 0; i < sources.length; i++) {
				var c = this.getMaxHarvesters(sources[i], true);
				count += c;
			}
		}
		return count;
	},

    drawAssignedCounts: function() {
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
