const taskDismantle = {
	run(creep: Creep): boolean {
		const dismantleFlags = _.filter(Game.flags, flag => {
			return flag.name.includes("dismantle");
		});
		if (dismantleFlags.length > 0) {
			const closestFlag = creep.pos.findClosestByRange(dismantleFlags);
			if (closestFlag) {
				const structure = closestFlag.pos.lookFor(LOOK_STRUCTURES)[0];
				if (structure) {
					console.log("DISMANTLING", structure);
					if (creep.dismantle(structure) === ERR_NOT_IN_RANGE) {
						creep.moveTo(structure);
					}
					return true;
				}
			}
		}
		return false;
	},
};

module.exports = taskDismantle;
export default taskDismantle;
