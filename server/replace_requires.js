const fs = require('fs');
const path = require('path');

const walk = (dir, done) => {
  let results = [];
  fs.readdir(dir, (err, list) => {
    if (err) return done(err);
    let i = 0;
    (function next() {
      let file = list[i++];
      if (!file) return done(null, results);
      file = path.resolve(dir, file);
      fs.stat(file, (err, stat) => {
        if (stat && stat.isDirectory()) {
          if (file.includes('node_modules')) return next();
          walk(file, (err, res) => {
            results = results.concat(res);
            next();
          });
        } else {
          if (file.endsWith('.js')) results.push(file);
          next();
        }
      });
    })();
  });
};

walk(__dirname, (err, results) => {
  if (err) throw err;
  let count = 0;
  results.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    if (content.includes("require('../models/Student')") || 
        content.includes("require('../../models/Student')") || 
        content.includes("require('./models/Student')")) {
      
      content = content.replace(/require\('\.\.\/models\/Admission'\)/g, "require('../models/Student')");
      content = content.replace(/require\('\.\.\/\.\.\/models\/Admission'\)/g, "require('../../models/Student')");
      content = content.replace(/require\('\.\/models\/Admission'\)/g, "require('./models/Student')");
      
      fs.writeFileSync(file, content, 'utf8');
      console.log('Updated', file);
      count++;
    }
  });
  console.log('Total files updated:', count);
});
