from google_auth_oauthlib.flow import InstalledAppFlow

SCOPES = ["https://www.googleapis.com/auth/calendar"]

flow = InstalledAppFlow.from_client_secrets_file(
    "client_secret_411148586126-chlpdarqb8jtoaqiie47vj7kd599l3v9.apps.googleusercontent.com.json", SCOPES
)
creds = flow.run_local_server(port=0)

print("Access token:", creds.token)
print("Refresh token:", creds.refresh_token)