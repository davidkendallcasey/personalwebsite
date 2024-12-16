const fs = require('fs');
const path = require('path');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

async function createSearchIndex(directoryPath) {
    const searchIndex = [];
    
    // Function to read HTML files recursively
    async function processDirectory(dirPath) {
        const items = fs.readdirSync(dirPath);
        
        for (const item of items) {
            const fullPath = path.join(dirPath, item);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                await processDirectory(fullPath);
            } else if (path.extname(fullPath) === '.html') {
                const content = fs.readFileSync(fullPath, 'utf8');
                const dom = new JSDOM(content);
                
                // Extract text content properly using jsdom
                const textContent = dom.window.document.body.textContent.trim();
                
                // Get relative path for URL
                const relativePath = path.relative(directoryPath, fullPath)
                    .replace(/\\/g, '/');
                
                // Extract title
                const titleElement = dom.window.document.querySelector('title');
                const title = titleElement ? titleElement.textContent.trim() : relativePath;
                
                // Create preview text
                const preview = textContent.substring(0, 200) + '...';
                
                searchIndex.push({
                    url: '/' + relativePath,
                    title: title,
                    content: textContent,
                    preview: preview
                });
            }
        }
    }
    
    await processDirectory(directoryPath);
    
    // Save the index
    fs.writeFileSync(
        path.join(directoryPath, 'search-index.json'),
        JSON.stringify(searchIndex, null, 2)
    );
    
    console.log(`Created search index with ${searchIndex.length} pages`);
}

// Call the function with your site directory
createSearchIndex('./');