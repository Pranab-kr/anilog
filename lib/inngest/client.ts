import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "anilog",
  name: "AniLog",
});

export async function sendInngestEvent(
  event: Parameters<typeof inngest.send>[0],
): Promise<void> {
  try {
    await inngest.send(event);
  } catch (error) {
    console.error("Failed to enqueue Inngest event:", error);
  }
}
