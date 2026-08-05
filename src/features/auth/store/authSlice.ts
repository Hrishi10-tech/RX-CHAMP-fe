import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import { normalizeRole } from "@/constants/roles";
import type { AuthState } from "@/features/auth/types";
import type { AuthSession } from "@/lib/auth/types";

const initialState: AuthState = {
  user: null,
  role: null,
  ready: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    sessionLoaded(state, action: PayloadAction<AuthSession | null>) {
      const session = action.payload;
      state.user = session?.user ?? null;
      state.role = normalizeRole(session?.user?.role);
      state.ready = true;
    },
    sessionCleared(state) {
      state.user = null;
      state.role = null;
      state.ready = true;
    },
  },
});

export const { sessionLoaded, sessionCleared } = authSlice.actions;
export const authReducer = authSlice.reducer;
