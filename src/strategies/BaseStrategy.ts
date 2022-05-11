import { type } from "os";

export class OffenseStrategy {
	static get strategyName(): string {
		throw new Error("Not implemented");
	}

	get strategyName(): string {
		// @ts-ignore
		return this.constructor.strategyName;
	}

	get neededCreeps(): { [creepType: string]: number } {
		throw new Error("Not implemented");
	}

	constructor(mem: any) {
		Object.assign(this, mem);
	}

	areCreepRequirementsMet(creeps: Creep[]) {
		// @ts-expect-error FIXME: need to add `c.memory.type` to creep memory to CreepMemory
		const grouped = _.groupBy(creeps, c => c.memory.type);
		for (const type of _.keys(this.neededCreeps)) {
			const haveCount = grouped[type] ? grouped[type].length : 0;
			if (haveCount < this.neededCreeps[type]) {
				return false;
			}
		}
		return true;
	}

	act(creeps: Creep[]): void {
		throw new Error("Not implemented");
	}
}
