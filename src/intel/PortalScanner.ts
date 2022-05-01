import { ObserveQueue } from "../observequeue";
import util from "../util";

/**
 * Scans highway rooms for portals, and stores the information in memory for later pathfinding.
 */
export default class PortalScanner {

	/** Have the maps been loaded from memory? */
	static loaded = false;
	/** Have the maps been modified since they've been loaded? If so, they need to be saved to memory. */
	static dirty = false;
	static intershardPortals: Map<string, { shard: string, room: string }> = new Map();
	static interroomPortals: Map<string, string> = new Map();

	public static initialize() {
		if (!Memory.portals) {
			Memory.portals = {
				intershard: [],
				interroom: []
			};
		}
	}

	public static finalize() {
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

	public static scanVisibleRooms() {
		const rooms = _.filter(Game.rooms, r => util.isHighwayRoom(r.name));
		if (rooms.length === 0) {
			return;
		}
		let intershardDestinations: typeof PortalScanner.intershardPortals = new Map();
		let interroomDestinations: typeof PortalScanner.interroomPortals = new Map();
		for (let room of rooms) {
			let portals: StructurePortal[] = room.find(FIND_STRUCTURES, { filter: s => s.structureType === STRUCTURE_PORTAL });
			if (portals.length === 0) {
				continue;
			}

			for (let portal of portals) {
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
		for (let [roomName, dst] of intershardDestinations.entries()) {
			PortalScanner.intershardPortals.set(roomName, dst);
		}
		for (let [entry, exit] of interroomDestinations.entries()) {
			PortalScanner.interroomPortals.set(entry, exit);
		}
		PortalScanner.dirty = true;
	}
}
