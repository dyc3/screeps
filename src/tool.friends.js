const toolFriends = {
	friends: ["Segmentation_Fault", "Azrules", "ragingblizzard", "choudama", "KennsworthS", "Mototroller"],

	// TODO: condense isCreepFriendly and isStructureFriendly into one function
	isCreepFriendly(creep) {
		if (creep.my) {
			return true;
		}
		for (let friend in this.friends) {
			if (creep.owner.username == friend) {
				return true;
			}
		}
		return false;
	},

	isStructureFriendly(struct) {
		if (struct.my) {
			return true;
		}
		for (let friend in this.friends) {
			if (struct.owner.username == friend) {
				return true;
			}
		}
		return false;
	},
};

module.exports = toolFriends;
export default toolFriends;
