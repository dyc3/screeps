import { OffenseStrategy } from "./BaseStrategy";

export class OffenseStrategyOvermindRemoteMinerBait extends OffenseStrategy {
	// @ts-expect-error FIXME: should probably be renamed so it vibes better with typescript
	static get name() {
		return "OvermindRemoteMinerBait";
	}

	/** The room the enemy is mining in. */
	miningRoom: string;
	/** The room the enemy is probably spawning the guard creeps from. */
	spawningRoom: string;

	constructor(mem: any) {
		super(mem);
		this.miningRoom = "";
		this.spawningRoom = "";
		Object.assign(this, mem);
	}


	act() {
		// TODO: finish implementation
		// 1. bait overmind into spawning a guard with a 1 ATTACK creep
		// 2. wait for guard to enter room
		// 3. move our creep out of the room
		// 4. remote observe mining room, wait for guard to despawn or leave room
		// 5. move our creep back into the room
		// 6. repeat

		// Success condition, when the adjacent room that is spawning the creeps is out of energy.
	}
}
