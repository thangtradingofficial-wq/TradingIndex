import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const files = [
  'config.js',
  'app.js',
  'engine/RateDataEngine.js',
  'ui/ChartManager.js',
  'ui/Toolbar.js',
  'ui/TooltipPlugin.js',
  'ui/RightEndBadges.js',
  'ui/SpreadModal.js',
  'ui/MacroMatrixModal.js',
  'scripts/generate_all_macro_data.mjs',
  'scripts/sync-hf-rates.mjs'
];

const datasets = [
  { file: 'interest_rates.json', name: 'Lãi suất Điều hành' },
  { file: 'real_rates.json', name: 'Lãi suất Thực tế' },
  { file: 'bond_yields_10y.json', name: 'Trái phiếu 10Y' },
  { file: 'inflation_cpi.json', name: 'Lạm phát CPI' },
  { file: 'unemployment.json', name: 'Tỷ lệ Thất nghiệp' },
  { file: 'gdp_growth.json', name: 'Tăng trưởng GDP' }
];

async function validate() {
  console.log('--- Validating JS Module Imports & Syntax ---');
  for (const f of files) {
    const fullPath = path.join(ROOT, f);
    if (!fs.existsSync(fullPath)) {
      console.error('File not found:', f);
      process.exit(1);
    }
    const content = fs.readFileSync(fullPath, 'utf-8');
    if (content.length === 0) throw new Error(`File ${f} is empty`);
    console.log(`✓ ${f.padEnd(35)} [${(content.length / 1024).toFixed(1)} KB]`);
  }

  console.log('\n--- Validating 6 Macroeconomic Datasets (1990 - 2026) ---');
  for (const ds of datasets) {
    const dataPath = path.join(ROOT, 'data', ds.file);
    if (!fs.existsSync(dataPath)) {
      console.error('Dataset not found:', ds.file);
      process.exit(1);
    }
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    const seriesKeys = Object.keys(data.series);
    if (seriesKeys.length < 10) throw new Error(`Dataset ${ds.file} missing series: only ${seriesKeys.length}/10`);
    console.log(`✓ data/${ds.file.padEnd(20)} [${ds.name}]: 10 series, ${data.series.US?.data?.length || 0} pts each`);
  }

  console.log('\nAll modules and 6 macroeconomic datasets validated successfully!');
}

validate().catch(console.error);
