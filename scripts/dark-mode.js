const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else { 
            if (file.endsWith('.tsx')) results.push(file);
        }
    });
    return results;
}

const files = walk('e:\\cyvrix-main\\app\\(public)');

// Files we have already successfully dark-moded
const skipFiles = ['HomeClient.tsx', 'AboutClient.tsx', 'Navbar.tsx', 'Footer.tsx', 'Logo.tsx'];

files.forEach(file => {
    if (skipFiles.some(skip => file.includes(skip))) return;

    let content = fs.readFileSync(file, 'utf8');
    
    // Backgrounds
    content = content.replace(/(?<!\/)\bbg-white\b(?!\/)/g, 'bg-[#020817]'); // bg-white -> bg-[#020817]
    content = content.replace(/(?<!\/)\bbg-slate-50\b(?!\/)/g, 'bg-[#020817]'); 
    content = content.replace(/(?<!\/)\bbg-slate-100\b(?!\/)/g, 'bg-white/5');

    // Text
    content = content.replace(/(?<!\/)\btext-\[\#041635\]\b(?!\/)/g, 'text-white');
    content = content.replace(/(?<!\/)\btext-slate-600\b(?!\/)/g, 'text-slate-400');
    content = content.replace(/(?<!\/)\btext-slate-700\b(?!\/)/g, 'text-slate-300');
    content = content.replace(/(?<!\/)\btext-slate-800\b(?!\/)/g, 'text-slate-200');
    
    // Borders
    content = content.replace(/(?<!\/)\bborder-slate-200\b(?!\/)/g, 'border-white/10');
    content = content.replace(/(?<!\/)\bborder-slate-100\b(?!\/)/g, 'border-white/5');

    // Make inputs dark
    content = content.replace(/bg-white px-4/g, 'bg-white/5 px-4 text-white');

    fs.writeFileSync(file, content);
});

console.log("Converted light mode classes to dark mode in public app directory.");
