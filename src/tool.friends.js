const toolFriends = {
	friends: [
		"Segmentation_Fault",
		"Azrules",
		"ragingblizzard",
		"choudama",
	],

	// TODO: condense isCreepFriendly and isStructureFriendly into one function
	isCreepFriendly: function (creep) {
		if (creep.my) {
			return true;
		}
		for (var friend in this.friends) {
			if (creep.owner.username == friend) {
				return true;
			}
		}
		return false;
	},

	isStructureFriendly: function (struct) {
		if (struct.my) {
			return true;
		}
		for (var friend in this.friends) {
			if (struct.owner.username == friend) {
				return true;
			}
		}
		return false;
	}
}

module.exports = toolFriends;
export default toolFriends;
