#!/usr/bin/env node

// Build script for Nutrix frontend optimization
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Building Nutrix for production...');

// Create public directory if it doesn't exist
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Copy frontend files to public directory
const frontendDir = path.join(__dirname, 'frontend');
const copyRecursive = (src, dest) => {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach(childItemName => {
      copyRecursive(
        path.join(src, childItemName),
        path.join(dest, childItemName)
      );
    });
  } else {
    fs.copyFileSync(src, dest);
  }
};

// Copy frontend files
if (fs.existsSync(frontendDir)) {
  copyRecursive(frontendDir, publicDir);
  console.log('Frontend files copied to public directory');
}

// Copy root files to public directory
const rootFiles = ['robots.txt', 'sitemap.xml', 'site.webmanifest', 'sw.js'];
rootFiles.forEach(file => {
  const srcPath = path.join(__dirname, file);
  const destPath = path.join(publicDir, file);
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    console.log(`Copied ${file} to public directory`);
  }
});

// Optimize HTML file
const indexPath = path.join(publicDir, 'index.html');
if (fs.existsSync(indexPath)) {
  let htmlContent = fs.readFileSync(indexPath, 'utf8');
  
  // Minify HTML (basic)
  htmlContent = htmlContent
    .replace(/\s+/g, ' ')
    .replace(/>\s+</g, '><')
    .replace(/\s+>/g, '>')
    .replace(/</g, ' <');
  
  fs.writeFileSync(indexPath, htmlContent);
  console.log('HTML file optimized');
}

// Create .vercelignore file
const vercelignorePath = path.join(__dirname, '.vercelignore');
const vercelignoreContent = `
node_modules
.git
.gitignore
README.md
.env
.env.local
.env.development
.env.test
.env.production
.nyc_output
coverage
.cache
build
dist
.DS_Store
*.log
`;
fs.writeFileSync(vercelignorePath, vercelignoreContent.trim());
console.log('.vercelignore file created');

console.log('Build completed successfully!');
console.log('Files are ready for Vercel deployment');
