import { writeFileSync } from 'fs';
import { getAiResponse, getHtmlPage, cleanHtml } from './utils.js';
import * as cheerio from 'cheerio';

const url = "https://www.cultura.com/p-mademoiselle-spencer-9782226501882.html";

const html = await getHtmlPage(url);
writeFileSync('html.html', html);


const cleanedHtml = cleanHtml(html);
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
// TODO Change the prompt for all type of website
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