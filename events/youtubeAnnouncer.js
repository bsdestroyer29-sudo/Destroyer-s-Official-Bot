import { EmbedBuilder } from "discord.js";
import { XMLParser } from "fast-xml-parser";
import YouTubeState from "../models/YouTubeState.js";

/**
 * REQUIRED ENV:
 * - YOUTUBE_CHANNEL_ID
 * - YOUTUBE_ANNOUNCE_CHANNEL_ID
 * - YOUTUBE_PING_ROLE_ID
 *
 * Optional:
 * - YOUTUBE_POLL_SECONDS (default 120)
 */

const DEFAULT_POLL_SECONDS = 120;

function getEnv(name) {
  return (process.env[name] || "").trim();
}

function extractVideoId(entry) {
  // Atom <yt:videoId>
  const ytVideoId = entry?.["yt:videoId"];
  if (typeof ytVideoId === "string" && ytVideoId.length) return ytVideoId;

  // fallback from link like https://www.youtube.com/watch?v=VIDEOID
  const link = entry?.link?.["@_href"] || entry?.link?.href;
  if (typeof link === "string" && link.includes("watch?v=")) {
    return link.split("watch?v=")[1]?.split("&")[0] || "";
  }

  return "";
}

function extractVideoUrl(entry) {
  const link = entry?.link?.["@_href"] || entry?.link?.href;
  if (typeof link === "string" && link.startsWith("http")) return link;

  const id = extractVideoId(entry);
  return id ? `https://www.youtube.com/watch?v=${id}` : "";
}

function extractPublished(entry) {
  const published = entry?.published || entry?.updated;
  const d = published ? new Date(published) : null;
  return d && !Number.isNaN(d.getTime()) ? d : null;
}

async function fetchLatestUpload(channelId) {
  const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`;

  const res = await fetch(url, {
    headers: { "User-Agent": "DestroyerBot-YouTubeAnnouncer/1.0" }
  });

  if (!res.ok) throw new Error(`YouTube feed fetch failed: ${res.status}`);

  const xml = await res.text();

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_"
  });

  const data = parser.parse(xml);
  const feed = data?.feed;
  let entries = feed?.entry;

  if (!entries) return null;
  if (!Array.isArray(entries)) entries = [entries];

  // newest is usually first
  const entry = entries[0];
  const videoId = extractVideoId(entry);
  const videoUrl = extractVideoUrl(entry);
  const title = entry?.title || "New Upload";
  const author = entry?.author?.name || feed?.author?.name || "YouTube";
  const publishedAt = extractPublished(entry);

  if (!videoId || !videoUrl) return null;

  return { videoId, videoUrl, title, author, publishedAt };
}

export default {
  name: "ready",
  once: true,

  async execute(client) {
    const youtubeChannelId = getEnv("YOUTUBE_CHANNEL_ID");
    const announceChannelId = getEnv("YOUTUBE_ANNOUNCE_CHANNEL_ID");
    const pingRoleId = getEnv("YOUTUBE_PING_ROLE_ID");

    if (!youtubeChannelId || !announceChannelId || !pingRoleId) {
      console.log("⚠️ YouTube announcer not started (missing env vars).");
      return;
    }

    const pollSeconds = parseInt(getEnv("YOUTUBE_POLL_SECONDS") || "", 10);
    const intervalMs = (Number.isFinite(pollSeconds) ? pollSeconds : DEFAULT_POLL_SECONDS) * 1000;

    // Use first guild the bot is in (or adapt if you want multi-guild)
    const guild = client.guilds.cache.first();
    if (!guild) {
      console.log("⚠️ YouTube announcer: no guild found.");
      return;
    }

    // Upsert state in Mongo
    await YouTubeState.findOneAndUpdate(
      { guildId: guild.id },
      {
        guildId: guild.id,
        youtubeChannelId,
        announceChannelId,
        pingRoleId
      },
      { upsert: true, new: true }
    );

    console.log(`📺 YouTube announcer running (poll every ${Math.round(intervalMs / 1000)}s).`);

    const tick = async () => {
      try {
        const state = await YouTubeState.findOne({ guildId: guild.id });
        if (!state) return;

        const latest = await fetchLatestUpload(state.youtubeChannelId);
        if (!latest) return;

        // Already posted?
        if (state.lastVideoId && state.lastVideoId === latest.videoId) return;

        const channel = await client.channels.fetch(state.announceChannelId).catch(() => null);
        if (!channel || !channel.isTextBased()) return;

        const roleMention = `<@&${state.pingRoleId}>`;

        const embed = new EmbedBuilder()
          .setColor("#FF0000")
          .setTitle("📺 New YouTube Upload!")
          .setDescription(`**${latest.title}**\n\n${latest.videoUrl}`)
          .setFooter({ text: `${latest.author}` })
          .setTimestamp(latest.publishedAt || new Date());

        await channel.send({
          content: `${roleMention} **New video just dropped!**`,
          embeds: [embed],
          allowedMentions: { roles: [state.pingRoleId] } // ✅ forces real ping
        });

        state.lastVideoId = latest.videoId;
        state.lastVideoUrl = latest.videoUrl;
        state.lastPublishedAt = latest.publishedAt || new Date();
        await state.save();

      } catch (err) {
        console.log("⚠️ YouTube announcer tick error:", err?.message || err);
      }
    };

    // First run + interval
    await tick();
    setInterval(tick, intervalMs);
  }
};
