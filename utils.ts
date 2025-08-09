import Anthropic from "@anthropic-ai/sdk";
import dotenv from 'dotenv';

dotenv.config();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const getAiResponse = async(message: string) => {
    const msg = await anthropic.messages.create({
        model: "claude-3-haiku-20240307",
        max_tokens: 1000,
        temperature: 0,
        system: "You are a web scraping expert. Analyze HTML and identify CSS class names for product information extraction. Respond only with valid JSON.",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: message
              }
            ]
          }
        ],
    });
    return msg.content![0];
}