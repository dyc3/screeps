var taskDismantle = {
	run: function(creep) {
		//if (creep.carry[RESOURCE_ENERGY] == creep.carryCapacity) {
		//	return false;
		//}
		var dismantleFlags = _.filter(Game.flags, (flag) => { return flag.name.includes("dismantle"); });
		if (dismantleFlags.length > 0) {
			var closestFlag = creep.pos.findClosestByRange(dismantleFlags);
			if (closestFlag) {
				var structure = closestFlag.pos.lookFor(LOOK_STRUCTURES)[0];
				if (structure) {
					console.log("DISMANTLING", structure);
					if (creep.dismantle(structure) == ERR_NOT_IN_RANGE) {
						creep.moveTo(structure);
					}
					return true;
				}
			}
		}
		return false;
	}
}

module.exports = taskDismantle;
