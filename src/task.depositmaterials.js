var taskDepositMaterials = {

	// NOTE: excludes energy by default
	checkForMaterials: function(creep, exclude_energy=true) {
		var carry = _.sum(creep.carry);
		carry -= exclude_energy ? creep.carry[RESOURCE_ENERGY] : 0;
		return carry > 0;
	},

	// NOTE: excludes energy by default
	run: function(creep, exclude_energy=true) {
		var storage = creep.pos.findClosestByRange(FIND_STRUCTURES, {
			filter: function(struct) {
				if (struct.structureType == STRUCTURE_CONTAINER) {
					if (struct.pos.findInRange(FIND_SOURCES, 2).length > 0) {
						return false;
					}
					if (struct.pos.findInRange(FIND_STRUCTURES, 3, { filter: function(struct) { return struct.structureType == STRUCTURE_CONTROLLER || struct.structureType == STRUCTURE_SPAWN } }).length > 0) {
						return false;
					}
					return true;
				}

				return struct.structureType == STRUCTURE_STORAGE;
			}
		});
		if (storage) {
			if (creep.pos.isNearTo(storage)) {
				for (var r in RESOURCES_ALL) {
					var resource = RESOURCES_ALL[r];
					if (exclude_energy && resource == RESOURCE_ENERGY) {
						continue;
					}
					if (creep.carry[resource] > 0) {
						creep.transfer(storage, resource);
					}
				}
			}
			else {
				creep.moveTo(storage);
			}
		}
		else {
			console.log("Err: no storage to deposit materials");
		}
	}
}

module.exports = taskDepositMaterials;