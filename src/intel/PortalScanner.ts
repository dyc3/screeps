import { JobRunner } from "jobs";
import { ObserveQueue } from "../observequeue";
import util from "../util";

/**
 * Scans highway rooms for portals, and stores the information in memory for later pathfinding.
 */
export default class PortalScanner {
	/** Have the maps been loaded from memory? */
	private static loaded = false;
	/** Have the maps been modified since they've been loaded? If so, they need to be saved to memory. */
	private static dirty = false;
	private static intershardPortals: Map<string, { shard: string; room: string }> = new Map();
	private static interroomPortals: Map<string, string> = new Map();

	public static initialize(): void {
		if (!Memory.portals) {
			Memory.portals = {
				intershard: [],
				interroom: [],
			};
		}
	}

	public static finalize(): void {
		PortalScanner.saveMaps();
	}

	private static loadMaps() {
		if (PortalScanner.loaded) {
			return;
		}

		PortalScanner.intershardPortals = new Map(Memory.portals.intershard);
		PortalScanner.interroomPortals = new Map(Memory.portals.interroom);

		PortalScanner.loaded = true;
	}

	private static saveMaps() {
		if (!PortalScanner.dirty) {
			return;
		}

		Memory.portals.intershard = Array.from(PortalScanner.intershardPortals.entries());
		Memory.portals.interroom = Array.from(PortalScanner.interroomPortals.entries());

		PortalScanner.dirty = false;
	}

	/** Called a tick before `scanVisibleRooms()` is run. */
	public static requestObservations() {
		// TODO: determine rooms to observe based on the portals we know about, and the rooms we already know are closed
	}

	public static scanVisibleRooms(this: void, doScanning: boolean) {
		if (!doScanning) {
			PortalScanner.requestObservations();
			JobRunner.getInstance().forceRunNextTick("portal-scan", true);
			return;
		}

		const rooms = _.filter(Game.rooms, r => util.isHighwayRoom(r.name));
		if (rooms.length === 0) {
			return;
		}
		const intershardDestinations: typeof PortalScanner.intershardPortals = new Map();
		const interroomDestinations: typeof PortalScanner.interroomPortals = new Map();
		for (const room of rooms) {
			const portals: StructurePortal[] = room.find(FIND_STRUCTURES, {
				filter: s => s.structureType === STRUCTURE_PORTAL,
			});
			if (portals.length === 0) {
				continue;
			}

			for (const portal of portals) {
				if (portal.destination instanceof RoomPosition) {
					interroomDestinations.set(room.name, portal.destination.roomName);
				} else {
					intershardDestinations.set(room.name, portal.destination);
				}
			}
		}

		if (intershardDestinations.size === 0 && interroomDestinations.size === 0) {
			return;
		}

		PortalScanner.loadMaps();
		for (const [roomName, dst] of intershardDestinations.entries()) {
			PortalScanner.intershardPortals.set(roomName, dst);
		}
		for (const [entry, exit] of interroomDestinations.entries()) {
			PortalScanner.interroomPortals.set(entry, exit);
		}
		PortalScanner.dirty = true;
	}
}
