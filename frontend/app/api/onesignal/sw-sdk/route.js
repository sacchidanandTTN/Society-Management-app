import axios from "axios";

export async function GET() {
  try {
    const response = await axios.get(
      "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js",
      {
        responseType: "text",
        validateStatus: () => true,
      }
    );

    if (response.status < 200 || response.status >= 300) {
      return new Response("// Failed to fetch OneSignal SW SDK", {
        status: 502,
        headers: {
          "Content-Type": "application/javascript; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
    }

    const script = typeof response.data === "string" ? response.data : "";
    return new Response(script, {
      status: 200,
      headers: {
        "Content-Type": "application/javascript; charset=utf-8",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch {
    return new Response("// Error loading OneSignal SW SDK", {
      status: 502,
      headers: {
        "Content-Type": "application/javascript; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }
}
