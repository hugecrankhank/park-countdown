const fs=require('node:fs');const file=process.argv[2];let html=fs.readFileSync(file,'utf8');
for(const marker of ['id="hero"','id="resCard"','id="calCard"','id="dayCard"','id="ticker"','id="map"','id="packInput"','id="tripForm"','function showTab(t)','const KEY = "parkCountdown.v1"','</body>','</head>'])if(!html.includes(marker))throw Error('Original release missing '+marker);
if(!html.includes('rel="manifest"'))html=html.replace('</head>','<link rel="manifest" href="manifest.webmanifest">\n</head>');
html=html.replace('</body>','<script src="integration.js"></script>\n</body>');fs.writeFileSync(file,html);
