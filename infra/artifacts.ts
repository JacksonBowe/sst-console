/**
 * Public distribution bucket for artifacts consumed outside Console account.
 *
 * Every object in this bucket must be safe for anonymous download. It currently
 * holds connector CloudFormation templates.
 * Never store Console data, configuration, credentials, or other secrets here.
 */
export const consoleArtifacts = new sst.aws.Bucket("SSTConsoleArtifacts", {
	access: "public"
});
