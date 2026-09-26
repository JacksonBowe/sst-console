import type { Session } from "@sst-console/sdk";
import { defineStore } from "pinia";

import { clearPersisted, loadPersisted, savePersisted } from "@/util/storage";

const SESSION_KEY = "session";

export const useAuthStore = defineStore("auth", {
	state: () => ({
		session: null as Session | null,
		hydrated: false
	}),
	getters: {
		isAuthenticated: state => !!state.session
	},
	actions: {
		hydrate() {
			if (this.hydrated) return;
			this.session = loadPersisted<Session>(SESSION_KEY);
			this.hydrated = true;
		},
		setSession(session: Session) {
			this.session = session;
			savePersisted(SESSION_KEY, session);
		},
		updateSession(session: Session) {
			const merged: Session = {
				...session,
				...(this.session?.refreshToken && !session.refreshToken
					? { refreshToken: this.session.refreshToken }
					: {})
			};
			this.setSession(merged);
		},
		clearSession() {
			this.session = null;
			this.hydrated = true;
			clearPersisted(SESSION_KEY);
		}
	}
});
