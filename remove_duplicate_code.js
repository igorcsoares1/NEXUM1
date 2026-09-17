const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

function findClosingBrace(str, startIdx) {
    let openBraces = 0;
    let started = false;
    for (let i = startIdx; i < str.length; i++) {
        if (str[i] === '{') {
            openBraces++;
            started = true;
        } else if (str[i] === '}') {
            openBraces--;
        }
        
        if (started && openBraces === 0) {
            return i;
        }
    }
    return -1;
}

function findClosingParen(str, startIdx) {
    let openParens = 0;
    let started = false;
    for (let i = startIdx; i < str.length; i++) {
        if (str[i] === '(') {
            openParens++;
            started = true;
        } else if (str[i] === ')') {
            openParens--;
        }
        
        if (started && openParens === 0) {
            return i;
        }
    }
    return -1;
}

const functionsToRemove = [
    'const renderDetailsModal = () =>',
    'const renderDashboard = () =>',
    'const renderFuel = () =>',
    'const renderDaily = () =>',
    'const renderContracts = () =>',
    'const renderReports = () =>',
    'const renderUsers = () =>',
    'const renderSettings = () =>'
];

for (const fn of functionsToRemove) {
    const idx = code.indexOf(fn);
    if (idx !== -1) {
        let isArrowParen = code.substring(idx + fn.length).trim().substring(0, 1) === '(';
        let endIdx = -1;
        
        // Find the "=>" and start scanning from there
        let searchStartOffset = idx + fn.length;
        
        if (isArrowParen) {
            endIdx = findClosingParen(code, searchStartOffset);
        } else {
            endIdx = findClosingBrace(code, searchStartOffset);
        }
        
        if (endIdx !== -1) {
            if (code[endIdx+1] === ';') endIdx++;
            console.log("Removing " + fn);
            code = code.substring(0, Math.max(0, idx - 1)) + "\n" + code.substring(endIdx + 1);
        }
    }
}

fs.writeFileSync('src/App.tsx', code);
