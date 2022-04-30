/** Represents a single source that is being mined remotely. */
export interface RemoteMiningTarget {
	id: Id<Source>;
	x: number;
	y: number;
	/** The room that the source is in. */
	roomName: string;
	harvestPos: { x: number, y: number };
	/** Creep name of the harvester. */
	creepHarvester: string | undefined;
	/** Creep names of the carriers. */
	creepCarriers: string[];
	neededCarriers: number;
	danger: number;
	dangerPos: { [danger: number]: RoomPosition } | undefined;
	keeperLairId: Id<StructureKeeperLair> | undefined;
}
