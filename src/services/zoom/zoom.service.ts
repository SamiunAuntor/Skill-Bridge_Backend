import { env } from "../../config/env";

type ZoomAccessTokenResponse = {
    access_token: string;
    expires_in: number;
};

type ZoomMeetingResponse = {
    id: number | string;
    password?: string;
    join_url?: string;
    start_url?: string;
};

export type ZoomMeetingDetails = {
    meetingProvider: "zoom";
    meetingId: string;
    meetingJoinUrl: string;
    meetingHostUrl: string | null;
    meetingPassword: string | null;
};

function isZoomConfigured(): boolean {
    return Boolean(
        env.ZOOM_ACCOUNT_ID?.trim() &&
            env.ZOOM_CLIENT_ID?.trim() &&
            env.ZOOM_CLIENT_SECRET?.trim()
    );
}

async function getZoomAccessToken(): Promise<string> {
    const accountId = env.ZOOM_ACCOUNT_ID?.trim();
    const clientId = env.ZOOM_CLIENT_ID?.trim();
    const clientSecret = env.ZOOM_CLIENT_SECRET?.trim();

    if (!accountId || !clientId || !clientSecret) {
        throw new Error("Zoom environment variables are not configured.");
    }

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const tokenUrl = new URL("https://zoom.us/oauth/token");
    tokenUrl.searchParams.set("grant_type", "account_credentials");
    tokenUrl.searchParams.set("account_id", accountId);

    const response = await fetch(tokenUrl.toString(), {
        method: "POST",
        headers: {
            Authorization: `Basic ${credentials}`,
        },
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Unable to get Zoom access token. ${text}`);
    }

    const payload = (await response.json()) as ZoomAccessTokenResponse;
    return payload.access_token;
}

export async function createZoomMeeting(input: {
    topic: string;
    startAt: Date;
    endAt: Date;
}): Promise<ZoomMeetingDetails | null> {
    if (!isZoomConfigured()) {
        return null;
    }

    const accessToken = await getZoomAccessToken();
    const durationMinutes = Math.max(
        1,
        Math.round((input.endAt.getTime() - input.startAt.getTime()) / (1000 * 60))
    );

    const response = await fetch("https://api.zoom.us/v2/users/me/meetings", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            topic: input.topic,
            type: 2,
            start_time: input.startAt.toISOString(),
            duration: durationMinutes,
            timezone: "Asia/Dhaka",
            settings: {
                join_before_host: true,
                waiting_room: false,
                participant_video: true,
                host_video: true,
                mute_upon_entry: false,
            },
        }),
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Unable to create Zoom meeting. ${text}`);
    }

    const payload = (await response.json()) as ZoomMeetingResponse;

    if (!payload.join_url) {
        throw new Error("Zoom meeting response did not include a join URL.");
    }

    return {
        meetingProvider: "zoom",
        meetingId: String(payload.id),
        meetingJoinUrl: payload.join_url,
        meetingHostUrl: payload.start_url ?? null,
        meetingPassword: payload.password ?? null,
    };
}

export async function deleteZoomMeeting(meetingId: string | null | undefined): Promise<void> {
    if (!meetingId || !isZoomConfigured()) {
        return;
    }

    const accessToken = await getZoomAccessToken();

    const response = await fetch(`https://api.zoom.us/v2/meetings/${meetingId}`, {
        method: "DELETE",
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    if (response.status === 404) {
        return;
    }

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Unable to delete Zoom meeting. ${text}`);
    }
}
