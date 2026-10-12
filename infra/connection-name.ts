import { createHash } from "node:crypto";

function stageHash(stage: string) {
	return createHash("sha256").update(stage).digest("hex").slice(0, 16);
}

export function connectionStackName(controlAccountId: string, stage: string) {
	return `SSTConsoleConnection-${controlAccountId}-${stageHash(stage)}`;
}

export function connectionRoleName(controlAccountId: string, stage: string) {
	return `SSTConsoleRole-${controlAccountId}-${stageHash(stage)}`;
}
