const fs = require('fs');
const path = require('path');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

async function createSearchIndex(directoryPath) {
    const searchIndex = [];
    let processedFiles = 0;
    let skippedFiles = 0;
    
    // Function to clean text content
    function cleanText(text) {
        return text
            .trim()
            .replace(/\s+/g, ' ')    // Collapse multiple spaces
            .replace(/\s+/g, ' ')    // Collapse spaces again after special chars
            .trim();
    }
    
    // Function to read HTML files recursively
    async function processDirectory(dirPath) {
        try {
            const items = fs.readdirSync(dirPath);
            
            for (const item of items) {
                const fullPath = path.join(dirPath, item);
                
                try {
                    const stat = fs.statSync(fullPath);
                    
                    if (stat.isDirectory()) {
                        await processDirectory(fullPath);
                    } else if (path.extname(fullPath) === '.html') {
                        try {
                            const content = fs.readFileSync(fullPath, 'utf8');
                            const dom = new JSDOM(content);
                            const document = dom.window.document;
                            
                            // Extract text content
                            const textContent = cleanText(document.body.textContent);
                            
                            // Get relative path for URL
                            const relativePath = path.relative(directoryPath, fullPath)
                                .replace(/\\/g, '/');
                            
                            // Try to extract title from multiple sources
                            let title = '';
                            const titleElement = document.querySelector('title');
                            const h1Element = document.querySelector('h1');
                            
                            if (titleElement && titleElement.textContent) {
                                title = cleanText(titleElement.textContent);
                            } else if (h1Element && h1Element.textContent) {
                                title = cleanText(h1Element.textContent);
                            } else {
                                title = relativePath;
                            }
                            
                            // Create preview text
                            const preview = textContent.substring(0, 200) + '...';
                            
                            searchIndex.push({
                                url: '/' + relativePath,
                                title: title,
                                content: textContent,
                                preview: preview
                            });
                            
                            processedFiles++;
                            
                        } catch (error) {
                            console.error(`Error processing file ${fullPath}:`, error);
                            skippedFiles++;
                            continue;
                        }
                    }
                } catch (error) {
                    console.error(`Error accessing ${fullPath}:`, error);
                    skippedFiles++;
                    continue;
                }
            }
        } catch (error) {
            console.error(`Error reading directory ${dirPath}:`, error);
            throw error;
        }
    }
    
    console.log('Starting search index creation...');
    console.time('Index Creation Time');
    
    // Backup existing index if it exists
    const indexPath = path.join(directoryPath, 'search-index.json');
    if (fs.existsSync(indexPath)) {
        console.log('Creating backup of existing index...');
        const backupPath = path.join(
            directoryPath, 
            `search-index.backup.${new Date().toISOString().replace(/[:.]/g, '-')}.json`
        );
        fs.copyFileSync(indexPath, backupPath);
    }
    
    try {
        await processDirectory(directoryPath);
        
        // Save the index
        fs.writeFileSync(
            indexPath,
            JSON.stringify(searchIndex, null, 2)
        );
        
        console.timeEnd('Index Creation Time');
        console.log(`
Index creation completed:
- Processed files: ${processedFiles}
- Skipped files: ${skippedFiles}
- Total entries: ${searchIndex.length}
        `);
        
    } catch (error) {
        console.error('Fatal error during index creation:', error);
        process.exit(1);
    }
}

// Call the function with your site directory
createSearchIndex('./');