import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import { normalizeRole } from "@/constants/roles";
import type { AuthState, MeView } from "@/features/auth/types";
import type { AuthSession } from "@/lib/auth/types";

const initialState: AuthState = {
  user: null,
  role: null,
  ready: false,
  me: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    /** The cookie, read on first load: enough to know someone is signed in. */
    sessionLoaded(state, action: PayloadAction<AuthSession | null>) {
      const session = action.payload;
      state.user = session?.user ?? null;
      state.role = normalizeRole(session?.user?.role);
      state.ready = true;
      state.me = null;
    },
    /** GET /me answered: the role, organisation and grants come from here on. */
    meLoaded(state, action: PayloadAction<MeView>) {
      const me = action.payload;
      state.me = me;
      state.role = me.role;
      state.user = {
        ...(state.user ?? { id: me.id, email: me.email }),
        id: me.id,
        email: me.email,
        name: me.name,
        role: me.role,
        grants: me.grants,
      };
      state.ready = true;
    },
    sessionCleared(state) {
      state.user = null;
      state.role = null;
      state.me = null;
      state.ready = true;
    },
  },
});

export const { sessionLoaded, meLoaded, sessionCleared } = authSlice.actions;
export const authReducer = authSlice.reducer;
