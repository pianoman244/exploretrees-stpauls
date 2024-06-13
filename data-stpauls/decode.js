var polyline = require('polyline');
const fs = require('fs');
const line = fs.readFileSync('trees.line.txt');
const coords = polyline.decode(line.toString());
const jsonArray = JSON.stringify(coords, null, 2);

// Write JSON string to a file
fs.writeFile('coords.json', jsonArray, 'utf8', (err) => {
  if (err) {
    console.error('Error writing array to file:', err);
    return;
  }
  console.log('Success');
});
