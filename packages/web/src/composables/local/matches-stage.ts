import type { LocalConnectionStatus, LocalIdentity } from "./types";

export type StageIdentity = {
	appName: string;
	stageName: string;
	region?: string;
};

export function localSessionMatchesStage(
	identity: LocalIdentity | undefined,
	stage: StageIdentity | undefined
): boolean {
	if (!identity || !stage) return false;

	return (
		identity.app === stage.appName &&
		identity.stage === stage.stageName &&
		(!identity.region || !stage.region || identity.region === stage.region)
	);
}

export function localSessionIsLiveForStage(
	status: LocalConnectionStatus,
	identity: LocalIdentity | undefined,
	stage: StageIdentity | undefined
): boolean {
	return status === "connected" && localSessionMatchesStage(identity, stage);
}
