let taskRepairCreep = {
	needsRepair(creep) {
		switch (creep.memory.role) {
			case "attacker":
			case "healer":
			case "builder":
				break;
			default:
				if (creep.hits < hitsMax) {
					return true;
				}
				return false;
		}
	},
};

module.exports = taskRepairCreep;
