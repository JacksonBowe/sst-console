import * as Document from "@sigil/core/document";
import { materializeDocumentVersionAccess } from "@sigil/core/document/access";
import { bus } from "sst/aws/bus";

export const handler = bus.subscriber(
	[Document.Events.VersionCreated],
	async evt => {
		switch (evt.type) {
			case Document.Events.VersionCreated.type: {
				const { organisationId, documentId, versionId, version } =
					evt.properties;

				await materializeDocumentVersionAccess({
					documentId,
					documentVersionId: versionId,
					ownerOrgId: organisationId,
					version
				});
			}
		}
	}
);
