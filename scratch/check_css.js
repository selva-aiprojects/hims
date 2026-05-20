const axios = require('axios');
axios.get('http://localhost:3000/src/index.css')
  .then(res => {
    const text = res.data;
    const match = text.match(/const __vite__css = "(.*)"/);
    if (match) {
      const css = match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
      const lines = css.split('\n');
      console.log("Total CSS lines:", lines.length);
      console.log("Lines containing 'font-family':");
      lines.forEach((line, idx) => {
        if (line.includes('font-family')) {
          console.log(`${idx + 1}: ${line}`);
        }
      });
    } else {
      console.log("Vite CSS format didn't match regex.");
    }
  })
  .catch(err => {
    console.error("ERROR fetching:", err.message);
  });
