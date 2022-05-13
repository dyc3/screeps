import {
	OffenseStrategyBreakAltPath,
	OffenseStrategyLureHarrass,
	OffenseStrategySimpleManual,
	// @ts-expect-error TODO: convert to typescript
} from "../strategies/Strategies.js";
import { OffenseStrategyOvermindRemoteMinerBait } from "../strategies/Overmind";

export const Strategies = [
	OffenseStrategySimpleManual,
	OffenseStrategyLureHarrass,
	OffenseStrategyBreakAltPath,
	OffenseStrategyOvermindRemoteMinerBait,
];
