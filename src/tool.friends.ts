const toolFriends = {
	friends: ["Segmentation_Fault", "Azrules", "ragingblizzard", "choudama", "KennsworthS", "Mototroller"],

	/**
	 * @deprecated Use isFriendly instead
	 * @returns
	 */
	isCreepFriendly(creep: AnyCreep): boolean {
		return this.isFriendly(creep);
	},

	/**
	 * @deprecated Use isFriendly instead
	 * @returns
	 */
	isStructureFriendly(struct: OwnedStructure): boolean {
		return this.isFriendly(struct);
	},

	isFriendly(obj: OwnedStructure | AnyCreep): boolean {
		if (obj.owner) {
			return obj.my || this.friends.includes(obj.owner.username);
		}
		return true;
	},
};

module.exports = toolFriends;
export default toolFriends;
