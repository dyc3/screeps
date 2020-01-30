var taskRepairCreep = {
	needsRepair: function(creep) {
		if (creep.memory.role == "scout") {
			return false;
		}

		switch (creep.memory.role) {
			case "attacker":
			case "healer":
			case "builder":
				break;
			case "scout":
				return false;
			default:
				if (creep.hits < hitsMax) {
					return true;
				}
				return false;
		}
	}
}

module.exports = taskRepairCreep;
