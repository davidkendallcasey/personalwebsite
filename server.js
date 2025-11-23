const http = require('http');
const fs = require('fs');
const path = require('path');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const PORT = 5000;
const HOST = '0.0.0.0';

const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// --- Indexing Logic ---
function cleanText(text) {
    if (!text) return '';
    return text
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/[^\w\s\-'".,;:!?]/g, ' ') // Keep basic punctuation
        .trim();
}

function buildSearchIndex() {
    const directoryPath = './';
    const searchIndex = [];
    
    // Recursive function to find HTML files
    function readDir(dir) {
        let results = [];
        const list = fs.readdirSync(dir);
        list.forEach(file => {
            file = path.join(dir, file);
            const stat = fs.statSync(file);
            if (stat && stat.isDirectory()) {
                if (!file.includes('node_modules') && !file.includes('.git')) {
                    results = results.concat(readDir(file));
                }
            } else {
                if (file.endsWith('.html') && path.basename(file).startsWith('on-')) {
                    results.push(file);
                }
            }
        });
        return results;
    }

    try {
        const files = readDir(directoryPath);
        
        files.forEach(fullPath => {
            const relativePath = path.relative(directoryPath, fullPath).replace(/\\/g, '/');
            const content = fs.readFileSync(fullPath, 'utf8');
            const dom = new JSDOM(content);
            const document = dom.window.document;

            // Get page title
            let pageTitle = relativePath;
            const h2 = document.querySelector('h2');
            const title = document.querySelector('title');
            if (h2) pageTitle = h2.textContent.trim();
            else if (title) pageTitle = title.textContent.split('-')[0].trim();

            // Process quotes
            const quoteEntries = document.querySelectorAll('.quote-entry');
            quoteEntries.forEach((entry, index) => {
                const blockquote = entry.querySelector('blockquote');
                const source = entry.querySelector('.source');
                
                if (blockquote) {
                    const quoteText = cleanText(blockquote.textContent);
                    const sourceText = source ? cleanText(source.textContent) : '';
                    const fullText = `${quoteText} ${sourceText} ${pageTitle}`.toLowerCase();
                    
                    let preview = quoteText;
                    if (preview.length > 150) {
                        preview = preview.substring(0, 150).trim() + '...';
                    }

                    searchIndex.push({
                        url: `${relativePath}#quote-${index}`,
                        pageTitle: pageTitle,
                        quoteText: quoteText,
                        sourceText: sourceText,
                        fullText: fullText,
                        preview: preview
                    });
                }
            });
        });
        
        console.log(`Auto-generated index with ${searchIndex.length} quotes`);
        return searchIndex;

    } catch (error) {
        console.error('Index generation error:', error);
        return [];
    }
}

// --- Server ---
const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);

  // Intercept request for search index
  if (req.url === '/search-index.json') {
      const indexData = buildSearchIndex();
      res.writeHead(200, { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache' // Always get fresh index
      });
      res.end(JSON.stringify(indexData));
      return;
  }

  // Standard Static File Serving
  let filePath = '.' + req.url;
  if (filePath === './') {
    filePath = './index.html';
  }

  // Remove query strings
  filePath = filePath.split('?')[0];

  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 - File Not Found</h1>', 'utf-8');
      } else {
        res.writeHead(500);
        res.end('Server Error: ' + error.code, 'utf-8');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Server running at http://${HOST}:${PORT}/`);
});