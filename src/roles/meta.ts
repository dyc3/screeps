export enum Role {
	Harvester = "harvester",
	Upgrader = "upgrader",
	Manager = "manager",
	Builder = "builder",
	Repairer = "repairer",
	Claimer = "claimer",
	RemoteHarvester = "remoteharvester",
	Carrier = "carrier",
	Miner = "miner",
	Scientist = "scientist",
	Relay = "relay",
	TmpDeliver = "tmpdeliver",
	Guardian = "guardian",
	HighwayHarvesting = "highwayharvesting",
	Offense = "offense",
	InvaderDestroyer = "invaderdestroyer",
	TestLogistics = "testlogistics",
	/** @deprecated */
	NextRoomer = "nextroomer",
	/** @deprecated */
	Attacker = "attacker",
	/** @deprecated */
	Healer = "healer",
	TmpDefense = "tmpdefense",
	Scout = "scout",
	Worker = "worker",
}

export abstract class CreepRole {
	public creep: Creep;

	public constructor(creep: Creep) {
		this.creep = creep;
	}

	protected log(message: string): void {
		this.creep.log(message);
	}

	public abstract run(): void;
}
