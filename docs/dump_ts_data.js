import fs from 'fs';
import path from 'path';

// Parse TS arrays using regex/js parsing or ts-node/tsx if needed
// Or let's use a quick JS regex / Function evaluator
function extractExportArray(filePath, exportName) {
  const code = fs.readFileSync(filePath, 'utf8');
  const regex = new RegExp(`export const ${exportName}[^=]*=\\s*(\\[[\\s\\S]*?\n\\];?);?`);
  const match = code.match(regex);
  if (!match) throw new Error(`Could not find ${exportName} in ${filePath}`);
  let jsonStr = match[1];
  // Remove trailing semicolons/commas before closing brackets
  jsonStr = jsonStr.replace(/;\s*$/, '');
  jsonStr = jsonStr.replace(/,\s*([\]}])/g, '$1');
  return JSON.parse(jsonStr);
}

try {
  const qDb = extractExportArray('src/data/questionsDb.ts', 'questionsDb');
  fs.writeFileSync('docs/questionsDb.json', JSON.stringify(qDb, null, 2));
  console.log(`Saved ${qDb.length} questions to questionsDb.json`);
} catch (e) {
  console.error('Error parsing questionsDb:', e);
}

try {
  const cDb = extractExportArray('src/data/casesDb.ts', 'casesDb');
  fs.writeFileSync('docs/casesDb.json', JSON.stringify(cDb, null, 2));
  console.log(`Saved ${cDb.length} cases to casesDb.json`);
} catch (e) {
  console.error('Error parsing casesDb:', e);
}

try {
  const v1 = extractExportArray('src/data/variantsData.ts', 'variant1Questions');
  fs.writeFileSync('docs/variant1Questions.json', JSON.stringify(v1, null, 2));
  console.log(`Saved ${v1.length} variant 1 questions`);
} catch (e) {
  console.error('Error parsing v1:', e);
}

try {
  const v2 = extractExportArray('src/data/variantsData.ts', 'variant2Questions');
  fs.writeFileSync('docs/variant2Questions.json', JSON.stringify(v2, null, 2));
  console.log(`Saved ${v2.length} variant 2 questions`);
} catch (e) {
  console.error('Error parsing v2:', e);
}
