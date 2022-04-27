export class OffenseStrategy {
	get neededCreeps(): { [creepType: string]: number } {
		throw new Error("Not implemented")
	}

	constructor(mem: any) {
		Object.assign(this, mem)
	}

	areCreepRequirementsMet(creeps: Creep[]) {
		// @ts-expect-error FIXME: need to add `c.memory.type` to creep memory to CreepMemory
		let grouped = _.groupBy(creeps, c => c.memory.type)
		for (let creepType of _.keys(this.neededCreeps)) {
			if (grouped[creepType].length < this.neededCreeps[creepType]) {
				return false
			}
		}
		return true
	}

	act() {
		throw new Error("Not implemented")
	}
}
