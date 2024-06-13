const fetchLines = fetch('https://pianoman244.github.io/exploretrees-stpauls/data-stpauls/' + 'coords.json')
      .then((res) => res.text())
      .then((text) => {
        const coords = JSON.parse(text)
        return coords;
});

fetchLines.then((coords) => {
	console.log(coords);
});
