const fs = require('fs');

const fileContent = fs.readFileSync('c:/Users/PROFE-JP/Desktop/PROYECTO/reporte_profe/src/app/dashboard/reportes/ReportsClient.tsx', 'utf8');
const lines = fileContent.split('\n');

lines.forEach((line, index) => {
  if (line.includes('selectedModuleFilter')) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});
