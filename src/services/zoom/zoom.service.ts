import { env } from "../../config/env";
import { HttpError } from "../../utils/http-error";

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
    try {
        const accountId = env.ZOOM_ACCOUNT_ID?.trim();
        const clientId = env.ZOOM_CLIENT_ID?.trim();
        const clientSecret = env.ZOOM_CLIENT_SECRET?.trim();

        if (!accountId || !clientId || !clientSecret) {
            throw new HttpError(
                503,
                "Video meeting setup is not configured right now. Please try again later."
            );
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
            console.error("[zoom] access token request failed:", text);
            throw new HttpError(
                503,
                "Video meeting setup is currently unavailable. Please try again in a moment."
            );
        }

        const payload = (await response.json()) as ZoomAccessTokenResponse;
        return payload.access_token;
    } catch (error) {
        if (error instanceof HttpError) {
            throw error;
        }

        console.error("[zoom] unexpected access token error:", error);
        throw new HttpError(
            503,
            "Video meeting setup is currently unavailable. Please try again in a moment."
        );
    }
}

export async function createZoomMeeting(input: {
    topic: string;
    startAt: Date;
    endAt: Date;
}): Promise<ZoomMeetingDetails | null> {
    if (!isZoomConfigured()) {
        return null;
    }

    try {
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
            console.error("[zoom] create meeting failed:", text);
            throw new HttpError(
                503,
                "We couldn't schedule the video meeting right now. Please try booking again."
            );
        }

        const payload = (await response.json()) as ZoomMeetingResponse;

        if (!payload.join_url) {
            console.error("[zoom] create meeting response missing join_url:", payload);
            throw new HttpError(
                503,
                "We couldn't prepare the session link right now. Please try booking again."
            );
        }

        return {
            meetingProvider: "zoom",
            meetingId: String(payload.id),
            meetingJoinUrl: payload.join_url,
            meetingHostUrl: payload.start_url ?? null,
            meetingPassword: payload.password ?? null,
        };
    } catch (error) {
        if (error instanceof HttpError) {
            throw error;
        }

        console.error("[zoom] unexpected create meeting error:", error);
        throw new HttpError(
            503,
            "We couldn't schedule the video meeting right now. Please try booking again."
        );
    }
}

export async function deleteZoomMeeting(meetingId: string | null | undefined): Promise<void> {
    if (!meetingId || !isZoomConfigured()) {
        return;
    }

    try {
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
            console.error("[zoom] delete meeting failed:", text);
        }
    } catch (error) {
        console.error("[zoom] unexpected delete meeting error:", error);
    }
}
