const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();

// Middleware for logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - Request to: ${req.path}`);
    next();
});

// Middleware for setting correct content types
app.use((req, res, next) => {
    const ext = path.extname(req.path).toLowerCase();
    switch (ext) {
        case '.html':
            res.type('text/html');
            break;
        case '.xml':
            res.type('application/xml');
            break;
        case '.php':
            res.type('application/x-httpd-php');
            break;
        case '.css':
            res.type('text/css'); 
            break;
        case '.js':
            res.type('application/javascript');
            break;
        // Add other types as needed
    }
    next();
});

//inject css
function injectCSS(req, res, next) {
    if (req.path.endsWith('.html')) {
        const filePath = path.join(__dirname, 'gen', '_xml', '_Completed', req.path);
        fs.readFile(filePath, 'utf8', (err, content) => {
            if (err) {
                console.error(`Error reading file: ${err}`);
                return next();
            }
            const fontCssLink = '<link rel="stylesheet" href="/_Resources/css/fonts.css">';
            const mainCssLink = '<link rel="stylesheet" href="/_Resources/css/digital_archive.css">';
            const modifiedContent = content.replace('</head>', `${fontCssLink}${mainCssLink}</head>`);
            console.log('CSS injection successful');
            res.send(modifiedContent);
        });
    } else {
        next();
    }
}

// Apply CSS injection middleware
app.use(injectCSS);

// Serve static files from the '_Resources' directory
app.use('/_Resources', express.static(path.join(__dirname, '_Resources')));

// Serve static files from the '_Completed' directory
app.use(express.static(path.join(__dirname, 'gen', '_xml', '_Completed')));

// Define content types and their corresponding folders
const contentTypes = ['apparatuses', 'notes', 'glosses', 'corpuses', 'witnesses'];

// Notes route handler with improved error handling and path resolution
app.get('/notes/:noteName', (req, res) => {
    const noteName = req.params.noteName.replace('.html', '');
    const filePath = path.join(__dirname, 'gen', '_xml', '_Completed', 'notes', `${noteName}.html`);
    
    // Check if file exists before sending
    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            console.error(`Note file not found: ${filePath}`);
            res.status(404).send('Note not found');
        } else {
            res.sendFile(filePath, (err) => {
                if (err) {
                    console.error(`Error sending note file ${noteName}:`, err);
                    res.status(500).send('Error occurred while serving the note');
                }
            });
        }
    });
});

// Handle requests for different content types
contentTypes.forEach(contentType => {
    app.get(`/${contentType}/:filename`, (req, res, next) => {
        const filePath = path.join(__dirname, 'gen', '_xml', '_Completed', contentType, `${req.params.filename}.html`);
        res.sendFile(filePath, (err) => {
            if (err) {
                console.error(`Error sending ${contentType} file ${req.params.filename}:`, err);
                next();
            }
        });
    });
});

// Serve the homepage for the root path
app.get('/', (req, res) => {
    const filePath = path.join(__dirname, 'gen', '_xml', '_Completed', 'webpages', 'homepage.html');
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error('Error sending homepage.html:', err);
            res.status(500).send('Error occurred while serving the file.');
        }
    });
});

// Catch-all route for other content
app.get('*', (req, res) => {
    const filePath = path.join(__dirname, 'gen', '_xml', '_Completed', req.path);
    
    // Check if the file exists
    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            console.error(`File not found: ${filePath}`);
            res.status(404).send('File not found');
        } else {
            res.sendFile(filePath, (err) => {
                if (err) {
                    console.error(`Error sending file ${filePath}:`, err);
                    res.status(500).send('Error occurred while serving the file.');
                }
            });
        }
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(`${new Date().toISOString()} - Error:`, err.stack);
    res.status(500).send('Something broke!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});