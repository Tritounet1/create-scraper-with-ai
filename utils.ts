import Anthropic from "@anthropic-ai/sdk";
import dotenv from 'dotenv';
import axios from 'axios';
import * as cheerio from 'cheerio';

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

export const getHtmlPage = async(url: string): Promise<string> => {
    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1',
                'Cache-Control': 'max-age=0'
            }
        });
        return response.data;
    } catch (error) {
        console.error('Erreur lors de la récupération de la page:', (error as Error).message);
        throw error;
    }
}

export const cleanHtml = (html: string) => {
    const $ = cheerio.load(html);

    console.log('Characters before cleaning:', html.length);

    // Clean the HTML by removing unwanted elements
    $('style').remove();
    $('script').remove();
    $('head').remove();
    $('meta').remove();
    $('link').remove();
    $('picture').remove();
    $('img').remove();
    $('i').remove();

    // Remove more unnecessary elements
    $('nav').remove();
    $('header').remove();
    $('footer').remove();
    $('aside').remove();
    $('form').remove();
    $('button').remove();
    $('input').remove();
    $('textarea').remove();
    $('select').remove();
    $('svg').remove();
    $('noscript').remove();

    // Unwrap structural elements to keep only content
    $('a').contents().unwrap();
    $('div').contents().unwrap();
    $('strong').contents().unwrap();
    // $('span').contents().unwrap();
    $('b').contents().unwrap();
    $('em').contents().unwrap();
    $('small').contents().unwrap();
    $('html').contents().unwrap();
    $('body').contents().unwrap();
    $('main').contents().unwrap();
    $('section').contents().unwrap();
    $('article').contents().unwrap();

    // Remove all attributes except id and class/className
    $('*').each(function() {
    const element = $(this);
    
    // Get current id and class values before removing attributes
    const id = element.attr('id');
    const className = element.attr('class');
    
    // Get all attribute names from the element
    const node = element.get(0) as any;
    const attributeNames = Object.keys(node?.attribs || {});
    
    // Remove all attributes
    attributeNames.forEach(attr => {
        element.removeAttr(attr);
    });
    
    // Re-add only id and class if they existed
    if (id) element.attr('id', id);
    if (className) element.attr('class', className);
    });

    // Remove empty elements and elements with only whitespace
    $('*').each(function() {
    const element = $(this);
    const text = element.text().trim();
    const hasChildren = element.children().length > 0;
    
    // Remove if element is empty and has no children
    if (!text && !hasChildren) {
        element.remove();
    }
    });

    // Remove elements with only very short or repetitive text (likely not useful data)
    $('*').each(function() {
    const element = $(this);
    const text = element.text().trim();
    
    // Remove elements with very short text that are likely not useful
    if (text.length > 0 && text.length < 3 && !/\d/.test(text)) {
        // Keep if it contains numbers (might be price, quantity, etc.)
        element.remove();
    }
    });

    return $.html();
}