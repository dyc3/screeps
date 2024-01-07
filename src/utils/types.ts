export type AnyDestructibleStructure = Exclude<
	AnyOwnedStructure | StructureContainer | StructureRoad | StructureWall,
	StructureController | StructureKeeperLair | StructurePortal
>;
