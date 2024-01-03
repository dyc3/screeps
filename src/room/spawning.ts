import * as cartographer from "screeps-cartographer";
import { util } from "../util";

/**
 * Tell the traffic manager to move renewing creeps out of the way if there is a creep trying to spawn.
 */
export function blockSpawnAdjacentsIfSpawning(): void {
	for (const spawn of Object.values(Game.spawns)) {
		if (!spawn.spawning || spawn.spawning.remainingTime > 1) {
			continue;
		}
		for (const adj of util.getAdjacent(spawn.pos)) {
			cartographer.blockSquare(adj);
		}
	}
}
