// 唯讀盤點鎖檔及現有 node_modules；不安裝、不查遠端。
import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
const out = process.argv[2] || 'docs/dev-flow/s5-audit-evidence';
await mkdir(out, { recursive: true });
const lockBytes = await readFile('package-lock.json');
const lock = JSON.parse(lockBytes);
const sha = data => createHash('sha256').update(data).digest('hex');
const packages = [];
for (const [location, entry] of Object.entries(lock.packages)) {
  if (!location) continue;
  let installed = false; let installedLicense = null; const licenseFiles = [];
  try {
    const manifest = JSON.parse(await readFile(path.join(location, 'package.json'), 'utf8'));
    installed = true; installedLicense = manifest.license ?? null;
    for (const file of (await readdir(location)).filter(file => /^(licen[sc]e|copying|notice)([.-]|$)/i.test(file))) {
      try { const bytes = await readFile(path.join(location, file)); licenseFiles.push({ path: path.join(location, file), sha256: sha(bytes), bytes: bytes.length }); }
      catch (error) { if (error.code !== 'EISDIR') throw error; }
    }
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (installed && !licenseFiles.length) {
    try {
      const bytes = await readFile(path.join(location, 'README.md'));
      const text = bytes.toString('utf8');
      if (/Permission is hereby granted|Redistribution and use in source and binary forms/.test(text)) licenseFiles.push({ path: path.join(location, 'README.md'), sha256: sha(bytes), bytes: bytes.length, embedded: true });
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  packages.push({ location, version: entry.version, license: entry.license ?? null, dev: !!entry.dev, optional: !!entry.optional, installed, installedLicense, licenseFiles });
}
const counts = {};
for (const entry of packages) counts[entry.license ?? 'MISSING'] = (counts[entry.license ?? 'MISSING'] ?? 0) + 1;
const issues = packages.filter(entry => !entry.license || (entry.installed && entry.installedLicense && JSON.stringify(entry.license) !== JSON.stringify(entry.installedLicense)));
const result = { node: process.version, lockSha256: sha(lockBytes), total: packages.length, installed: packages.filter(p => p.installed).length, licenseCounts: counts, issues, packages };
await writeFile(path.join(out, 'license-inventory.json'), JSON.stringify(result, null, 2) + '\n');
const rows = packages.map(p => `| ${p.location} | ${p.version} | ${p.license} | ${p.dev ? '開發／建置' : '執行期'} | ${p.installed ? '已安裝' : '未安裝（可能為其他平台 optional）'} | ${p.licenseFiles.map(f => f.path).join('<br>') || '未取得根目錄授權檔'} |`);
await writeFile(path.join(out, 'license-inventory.md'), '# 鎖檔授權 metadata 與本機授權檔盤點\n\n未安裝的平台套件只有鎖檔 metadata；本清單不是逐檔法律審查或發布 bundle 的完整組成證明。\n\n| 路徑 | 版本 | 授權 metadata | 用途 | 本機 | 授權檔 |\n|---|---|---|---|---|---|\n' + rows.join('\n') + '\n');
console.log(JSON.stringify({ total: result.total, installed: result.installed, licenseCounts: counts, issues }, null, 2));
process.exitCode = issues.length ? 1 : 0;
