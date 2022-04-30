export class ObserveQueue {
	static initialize(): void {
		if (!Memory.observe) {
			Memory.observe = {
				observers: [],
				queue: [],
			};
		}
	}

	private static getObservers(): StructureObserver[] {
		return Memory.observe.observers.map(id => Game.getObjectById(id)).filter(o => !!o) as StructureObserver[]
	}

	public static updateCachedObserverIds(): void {
		Memory.observe.observers =  (_.filter(Game.structures, s => s.structureType === STRUCTURE_OBSERVER) as StructureObserver[]).map(o => o.id);
	}

	public static queue(roomName: string): void {
		if (Memory.observe.queue.indexOf(roomName) === -1) {
			Memory.observe.queue.push(roomName);
		}
	}

	public static consumeObservations(): void {
		for (let observer of this.getObservers()) {
			if (Memory.observe.queue.length === 0) {
				break;
			}
			let target = Memory.observe.queue[0];
			let result = observer.observeRoom(target);
			if (result !== OK) {
				console.log(`Observer ${observer.id} in ${observer.room} failed to observe ${target}`);
				continue;
			}
			Memory.observe.queue.shift();
		}
	}
}

global.ObserveQueue = ObserveQueue;