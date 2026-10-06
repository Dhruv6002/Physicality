# Google Sign-In Testing

Google Sign-In uses Google Identity Services in the frontend and verifies the returned ID token in the backend. It does not use an Emergent OAuth session.

## Required configuration

- Set `GOOGLE_CLIENT_ID` in the backend environment to your Google OAuth Web client ID. The frontend reads this public client ID from `/api/auth/google/config`, keeping its audience matched to backend verification.
- In Google Cloud Console, add every deployed frontend origin under Authorized JavaScript origins, including scheme and host (for example `https://physicality.in` and `https://www.physicality.in`). Add `http://localhost:3000` for local development.
- Install backend dependencies with `python -m pip install -r backend/requirements.txt`.

## Browser flow

1. Open `/auth` on a configured origin and click the Google sign-in button.
2. Complete Google's account chooser if prompted.
3. Confirm the browser sends `POST /api/auth/google` and receives a user and app token. Do not copy or log the credential token.
4. Confirm the account page loads and remains signed in after a refresh.
5. Confirm `GET /api/auth/me` succeeds with the stored bearer token.

## Common failures

- Google reports `origin_mismatch`: the exact frontend origin is missing from the OAuth client's Authorized JavaScript origins.
- Backend reports Google auth is not configured: `GOOGLE_CLIENT_ID` is missing from the backend environment.
- Backend reports an invalid credential: frontend and backend client IDs differ, the credential is expired, or the request reached the wrong backend.
- Google button does not render: check `GOOGLE_CLIENT_ID`, script/network blocking, and the backend's `/api/auth/google/config` response.
