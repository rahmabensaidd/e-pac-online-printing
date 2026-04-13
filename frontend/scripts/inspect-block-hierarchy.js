const fs = require('fs');

const file = 'node_modules/@cesdk/engine/index.d.ts';
const content = fs.readFileSync(file, 'utf8');
const lines = content.split(/\r?\n/);

const patterns = [
  /getParent\(/,
  /getChildren\(/,
  /findByType\(/,
  /insertChild\(/,
  /appendChild\(/,
  /removeChild\(/,
  /setPositionX\(/,
  /setPositionY\(/,
  /setWidth\(/,
  /setHeight\(/,
  /create\(type: DesignBlockType/,
  /create\('page'\)/,
  /type DesignBlockType/,
  /class BlockAPI/
];

for (const [index, line] of lines.entries()) {
  if (patterns.some((pattern) => pattern.test(line))) {
    console.log(`${index + 1}: ${line}`);
  }
}
