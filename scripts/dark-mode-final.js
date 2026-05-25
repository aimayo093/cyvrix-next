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

// Files we have already successfully dark-moded manually
const skipFiles = ['HomeClient.tsx', 'AboutClient.tsx', 'Navbar.tsx', 'Footer.tsx', 'Logo.tsx'];

files.forEach(file => {
    if (skipFiles.some(skip => file.includes(skip))) return;

    let content = fs.readFileSync(file, 'utf8');
    
    // Gradients
    content = content.replaceAll('#EAF4FF', '#2691F0'); // Will turn radial-gradient from #EAF4FF to #2691F0, matching dark theme
    content = content.replaceAll('bg-[#2691F0]/40', 'bg-[#2691F0]/10'); // Fixes the lists in services/[slug]/page.tsx
    content = content.replaceAll('bg-[#2691F0]/50 border border-[#2691F0]/20', 'bg-white/5 border border-white/10'); // Fixes thank you
    
    // thank-you page specific fix
    content = content.replaceAll('from-[#F8FAFC] to-[#2691F0]/30', 'from-[#020817] to-[#041635]');
    content = content.replaceAll('from-[#F8FAFC] to-[#EAF4FF]/30', 'from-[#020817] to-[#041635]');
    
    fs.writeFileSync(file, content);
});

console.log("Final #EAF4FF clean up completed.");
