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
    content = content.replaceAll('bg-[#F8FAFC]', 'bg-[#020817]');
    content = content.replaceAll('bg-white', 'bg-[#020817]');
    content = content.replaceAll('bg-blue-50', 'bg-[#2691F0]/10');
    content = content.replaceAll('bg-blue-500/10', 'bg-[#2691F0]/10');
    content = content.replaceAll('border-blue-500/20', 'border-[#2691F0]/20');
    
    // Text
    content = content.replaceAll('text-[#041635]', 'text-white');
    content = content.replaceAll('text-slate-600', 'text-slate-400');
    content = content.replaceAll('text-slate-700', 'text-slate-300');
    content = content.replaceAll('text-slate-800', 'text-slate-200');
    content = content.replaceAll('text-slate-900', 'text-white');
    
    // Make sure we don't accidentally do bg-[#020817]/10 if there was bg-white/10
    // Actually `bg-white/10` would have become `bg-[#020817]/10`. That is unideal but dark mode nonetheless.
    // Let's restore the ones that were /something.
    content = content.replaceAll('bg-[#020817]/5', 'bg-white/5');
    content = content.replaceAll('bg-[#020817]/10', 'bg-white/10');
    content = content.replaceAll('bg-[#020817]/20', 'bg-white/20');
    
    fs.writeFileSync(file, content);
});

console.log("Improved conversion of light mode classes to dark mode completed.");
