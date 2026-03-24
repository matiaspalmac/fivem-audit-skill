#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');

const SKILL_NAME = 'fivem-audit';
const SKILL_DIR = path.join(os.homedir(), '.claude', 'skills', SKILL_NAME);
const PKG_ROOT = path.join(__dirname, '..');
const SOURCE_SKILL = path.join(PKG_ROOT, 'SKILL.md');
const SOURCE_CHECKS = path.join(PKG_ROOT, 'checks');

const CYAN = '\x1b[36m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

function banner() {
    console.log('');
    console.log(`${CYAN}${BOLD}  ╔══════════════════════════════════════╗${RESET}`);
    console.log(`${CYAN}${BOLD}  ║   FiveM Audit Skill - Claude Code   ║${RESET}`);
    console.log(`${CYAN}${BOLD}  ║         v3.0 by Dei                 ║${RESET}`);
    console.log(`${CYAN}${BOLD}  ╚══════════════════════════════════════╝${RESET}`);
    console.log('');
}

function copyDirRecursive(src, dest) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }

    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            copyDirRecursive(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

function install() {
    banner();

    // Check if SKILL.md exists in package
    if (!fs.existsSync(SOURCE_SKILL)) {
        console.log(`${RED}Error: SKILL.md not found in package${RESET}`);
        process.exit(1);
    }

    // Create skills directory
    const claudeDir = path.join(os.homedir(), '.claude', 'skills');
    if (!fs.existsSync(claudeDir)) {
        console.log(`${YELLOW}Creating Claude Code skills directory...${RESET}`);
        fs.mkdirSync(claudeDir, { recursive: true });
    }

    // Create skill directory
    if (!fs.existsSync(SKILL_DIR)) {
        fs.mkdirSync(SKILL_DIR, { recursive: true });
    }

    // Remove old skill.md if exists (v2 → v3 migration)
    const oldSkill = path.join(SKILL_DIR, 'skill.md');
    if (fs.existsSync(oldSkill)) {
        fs.unlinkSync(oldSkill);
        console.log(`${DIM}  Removed old skill.md (v2 migration)${RESET}`);
    }

    // Copy SKILL.md
    const dest = path.join(SKILL_DIR, 'SKILL.md');
    fs.copyFileSync(SOURCE_SKILL, dest);

    // Copy checks/ directory
    if (fs.existsSync(SOURCE_CHECKS)) {
        const destChecks = path.join(SKILL_DIR, 'checks');
        copyDirRecursive(SOURCE_CHECKS, destChecks);
    }

    const checkFiles = fs.existsSync(SOURCE_CHECKS)
        ? fs.readdirSync(SOURCE_CHECKS).filter(f => f.endsWith('.md'))
        : [];

    console.log(`${GREEN}${BOLD}Installed successfully!${RESET}`);
    console.log('');
    console.log(`  ${CYAN}Skill:${RESET}    ${SKILL_NAME}`);
    console.log(`  ${CYAN}Location:${RESET} ${SKILL_DIR}`);
    console.log(`  ${CYAN}Files:${RESET}    SKILL.md + ${checkFiles.length} check modules`);
    console.log('');

    if (checkFiles.length > 0) {
        console.log(`${BOLD}Check Modules:${RESET}`);
        for (const file of checkFiles) {
            const name = file.replace('.md', '');
            console.log(`  ${GREEN}✓${RESET} checks/${file} ${DIM}(${name})${RESET}`);
        }
        console.log('');
    }

    console.log(`${BOLD}Usage:${RESET}`);
    console.log(`  In Claude Code, navigate to a FiveM resource and type:`);
    console.log('');
    console.log(`    ${GREEN}/fivem-audit${RESET}`);
    console.log('');
    console.log(`  Or ask naturally:`);
    console.log(`    ${CYAN}"audit this FiveM resource"${RESET}`);
    console.log(`    ${CYAN}"check security of this script"${RESET}`);
    console.log(`    ${CYAN}"scan for backdoors"${RESET}`);
    console.log('');
    console.log(`${BOLD}What's new in v3.0:${RESET}`);
    console.log(`  ${GREEN}+${RESET} Optimized for Claude Opus 4.6 (effort: max)`);
    console.log(`  ${GREEN}+${RESET} Dedicated malware/backdoor detection module`);
    console.log(`  ${GREEN}+${RESET} Supply chain attack detection`);
    console.log(`  ${GREEN}+${RESET} Token grabber & credential stealer patterns`);
    console.log(`  ${GREEN}+${RESET} 16+ known malicious domains`);
    console.log(`  ${GREEN}+${RESET} Advanced obfuscation detection (hex, XOR, base64, entropy)`);
    console.log(`  ${GREEN}+${RESET} Exfiltration channel detection (Discord, Telegram, C2)`);
    console.log(`  ${GREEN}+${RESET} Expanded NUI/CEF exploitation checks`);
    console.log(`  ${GREEN}+${RESET} Modular architecture (progressive check loading)`);
    console.log('');
    console.log(`${YELLOW}Restart Claude Code for the skill to take effect.${RESET}`);
    console.log('');
}

// Handle --uninstall flag
if (process.argv.includes('--uninstall') || process.argv.includes('-u')) {
    banner();
    if (fs.existsSync(SKILL_DIR)) {
        fs.rmSync(SKILL_DIR, { recursive: true });
        console.log(`${GREEN}Uninstalled successfully!${RESET}`);
        console.log(`  Removed: ${SKILL_DIR}`);
    } else {
        console.log(`${YELLOW}Skill not found at ${SKILL_DIR}${RESET}`);
    }
    console.log('');
    process.exit(0);
}

// Handle --help flag
if (process.argv.includes('--help') || process.argv.includes('-h')) {
    banner();
    console.log(`${BOLD}Commands:${RESET}`);
    console.log(`  ${GREEN}npx fivem-audit${RESET}              Install the skill`);
    console.log(`  ${GREEN}npx fivem-audit --uninstall${RESET}  Remove the skill`);
    console.log(`  ${GREEN}npx fivem-audit --help${RESET}       Show this help`);
    console.log('');
    process.exit(0);
}

install();
