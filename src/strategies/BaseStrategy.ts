export class OffenseStrategy {
	public static get strategyName(): string {
		throw new Error("Not implemented");
	}

	public get strategyName(): string {
		// @ts-expect-error this gets the static property
		return this.constructor.strategyName as string;
	}

	public get neededCreeps(): { [creepType: string]: number } {
		throw new Error("Not implemented");
	}

	public constructor(mem: any) {
		Object.assign(this, mem);
	}

	public areCreepRequirementsMet(creeps: Creep[]): boolean {
		const grouped = _.groupBy(creeps, c => c.memory.type);
		for (const type of _.keys(this.neededCreeps)) {
			const haveCount = grouped[type] ? grouped[type].length : 0;
			if (haveCount < this.neededCreeps[type]) {
				return false;
			}
		}
		return true;
	}

	public act(creeps: Creep[]): void {
		throw new Error("Not implemented");
	}
}
