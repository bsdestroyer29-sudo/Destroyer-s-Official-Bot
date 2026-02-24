import {
  SlashCommandBuilder,
  AttachmentBuilder
} from "discord.js";

import { createCanvas, loadImage } from "canvas";

export default {
  data: new SlashCommandBuilder()
    .setName("meme")
    .setDescription("Create a custom meme")
    .addStringOption(o =>
      o.setName("template")
        .setDescription("Meme template")
        .addChoices(
          { name: "Drake", value: "drake" }
        )
        .setRequired(true)
    )
    .addStringOption(o =>
      o.setName("top")
        .setDescription("Top text")
        .setRequired(true)
    )
    .addStringOption(o =>
      o.setName("bottom")
        .setDescription("Bottom text")
        .setRequired(true)
    ),

  async execute(interaction) {

    await interaction.deferReply();

    const template = interaction.options.getString("template");
    const topText = interaction.options.getString("top");
    const bottomText = interaction.options.getString("bottom");

    try {

      let imageUrl;

      if (template === "drake") {
        imageUrl = "https://i.imgflip.com/30b1gx.jpg";
      }

      const image = await loadImage(imageUrl);

      const canvas = createCanvas(image.width, image.height);
      const ctx = canvas.getContext("2d");

      ctx.drawImage(image, 0, 0);

      // Text styling
      ctx.font = "bold 60px Impact";
      ctx.fillStyle = "white";
      ctx.strokeStyle = "black";
      ctx.lineWidth = 6;
      ctx.textAlign = "center";

      // TOP TEXT
      ctx.strokeText(topText.toUpperCase(), canvas.width / 2, 80);
      ctx.fillText(topText.toUpperCase(), canvas.width / 2, 80);

      // BOTTOM TEXT
      ctx.strokeText(
        bottomText.toUpperCase(),
        canvas.width / 2,
        canvas.height - 40
      );
      ctx.fillText(
        bottomText.toUpperCase(),
        canvas.width / 2,
        canvas.height - 40
      );

      const attachment = new AttachmentBuilder(
        canvas.toBuffer("image/png"),
        { name: "meme.png" }
      );

      return interaction.editReply({ files: [attachment] });

    } catch (err) {
      console.error(err);
      return interaction.editReply("❌ Failed to generate meme.");
    }
  }
};