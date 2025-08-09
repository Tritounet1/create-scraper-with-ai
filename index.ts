import axios from 'axios';
import * as cheerio from 'cheerio';
import { writeFileSync } from 'fs';
import { getAiResponse } from './utils.js';

const url = "https://www.cultura.com/p-mademoiselle-spencer-9782226501882.html";

async function getPageHtml(url: string): Promise<string> {
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

const html = await getPageHtml(url);
writeFileSync('html.html', html);
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

const cleanedHtml = $.html();
console.log('Characters after cleaning:', cleanedHtml.length);

// Convert to string and remove whitespace and comments
const finalHtml = cleanedHtml
  .replace(/<!--[\s\S]*?-->/g, '') // Remove HTML comments
  .replace(/\s+/g, ' ') // Replace multiple whitespaces with single space
  .trim(); // Remove leading/trailing whitespace

console.log('Characters after removing whitespace and comments:', finalHtml.length);

// Save the cleaned HTML to file
writeFileSync('htmlclean.html', finalHtml);

// Check if HTML is small enough to send to AI
if (finalHtml.length < 10000) {
  console.log('HTML is small enough, sending to AI for analysis...');
  
  const prompt = `Analyze this cleaned HTML from an e-commerce page and return ONLY a JSON object with the CSS class names needed to extract important product information.

Return format:
{
  "productName": "class-name-for-product-title",
  "price": "class-name-for-price",
  "description": "class-name-for-description",
  "availability": "class-name-for-stock-status",
  "images": "class-name-for-product-images",
  "rating": "class-name-for-rating",
  "reviews": "class-name-for-reviews"
}

Only include classes that actually exist in the HTML. If a field cannot be found, use null.

HTML to analyze:
${finalHtml}`;

  try {
    const aiResponse = await getAiResponse(prompt);
    console.log('AI Response:', aiResponse);
    
    // Parse the JSON response from AI
    let classNames;
    try {
      const responseText = (aiResponse as any).text;
      classNames = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Error parsing AI response as JSON:', (parseError as Error).message);
    }
    
    // Save AI response to file
    writeFileSync('scraper-classes.json', JSON.stringify(classNames, null, 2));
    
    // Now try to extract data using the class names on the original HTML
    console.log('\n=== Extracting product data ===');
    const originalDoc = cheerio.load(html); // Use original HTML
    
    const extractedData: any = {};
    
    // Extract product name
    if (classNames.productName) {
      const productName = originalDoc(`.${classNames.productName}`).first().text().trim();
      extractedData.productName = productName;
      console.log('Product Name:', productName);
    }
    
    // Extract price
    if (classNames.price) {
      const price = originalDoc(`.${classNames.price}`).first().text().trim();
      extractedData.price = price;
      console.log('Price:', price);
    }
    
    // Extract description
    if (classNames.description) {
      const description = originalDoc(`.${classNames.description}`).first().text().trim();
      extractedData.description = description;
      console.log('Description:', description);
    }
    
    // Extract availability
    if (classNames.availability) {
      const availability = originalDoc(`.${classNames.availability}`).first().text().trim();
      extractedData.availability = availability;
      console.log('Availability:', availability);
    }
    
    // Extract reviews
    if (classNames.reviews) {
      const reviews = originalDoc(`.${classNames.reviews}`).first().text().trim();
      extractedData.reviews = reviews;
      console.log('Reviews:', reviews);
    }
    
    // Save extracted data to file
    writeFileSync('extracted-data.json', JSON.stringify(extractedData, null, 2));
    console.log('\nExtracted data saved to extracted-data.json');
    
  } catch (error) {
    console.error('Error calling AI:', (error as Error).message);
  }
} else {
  console.log(`HTML still too large (${finalHtml.length} characters). Need to reduce further.`);
}