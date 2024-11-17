const promptly = require('promptly');
const path = require('path');
const replace = require("replace");
const fs = require('fs');
const fsExtra = require('fs-extra');
const packageSettingsJSON = require('./packageSettings.json');

(async () => {
    console.log('\x1b[36m%s\x1b[0m', 'Welcome developer!');
    const packageName = await promptly.prompt('New Package Name: (Example: WorldProject) ');
    changePackageName(packageName);
    console.log('\x1b[36m%s\x1b[0m', 'Completed!' + ' New Package Name: ' + packageName);
})();

changePackageName = (packageName) => {
    const folders = [...packageSettingsJSON.folders.map(folder => packageSettingsJSON.packageName + "." + folder)];
    const oldFolders = [...folders]; // Keep track of old folder paths

    for (let i = 0; i < folders.length; i++) {
        const dir = fs.opendirSync(folders[i])
        while ((dirent = dir.readSync()) !== null) {
            const fullPath = path.join(folders[i], dirent.name);
            if (dirent.name == "bin" || dirent.name == "obj") {
                fsExtra.removeSync(fullPath);
            } else {
                traverseAndReplace(fullPath, packageName);
            }
        }
        dir.closeSync()
    }

    // Update files in the main directory
    const mainDir = process.cwd();
    const mainDirFiles = fs.readdirSync(mainDir);
    mainDirFiles.forEach(file => {
        if (file.indexOf("sln") > -1) {
            const fullPath = path.join(mainDir, file);
            if (isFile(fullPath)) {
                let content = fs.readFileSync(fullPath, 'utf8');
                content = content.replace(new RegExp(packageSettingsJSON.packageName, 'g'), packageName);
                fs.writeFileSync(fullPath, content, 'utf8');
            }
        }
    });

    // Rename folders
    for (let i = 0; i < folders.length; i++) {
        const oldFolderPath = folders[i];
        const newFolderPath = packageName + "." + packageSettingsJSON.folders[i];
        fs.renameSync(oldFolderPath, newFolderPath);
        // klasörün içindeki tüm dosyaları gez
        const dir = fs.opendirSync(newFolderPath)
        while ((dirent = dir.readSync()) !== null) {
            const fullPath = path.join(newFolderPath, dirent.name);
            if (dirent.name.indexOf(packageSettingsJSON.packageName + ".") > -1) {
                const newFileName = dirent.name.replace(packageSettingsJSON.packageName + ".", packageName + ".");
                fs.renameSync(fullPath, path.join(newFolderPath, newFileName));
            }
        }

    }

    // Delete old folders
    oldFolders.forEach(oldFolderPath => {
        if (fs.existsSync(oldFolderPath)) {
            console.log('Removing old folder: ' + oldFolderPath);
            fsExtra.removeSync(oldFolderPath);
        }
    });

    // sln file change name
    const slnFile = packageName + ".sln";
    fs.renameSync(packageSettingsJSON.slnFileName, slnFile);

    // update packageSettingsJSON file
    packageSettingsJSON.packageName = packageName;
    packageSettingsJSON.slnFileName = packageName + ".sln";
    fs.writeFileSync('./packageSettings.json', JSON.stringify(packageSettingsJSON), 'utf8');
}

traverseAndReplace = (dirPath, packageName) => {
    if (isFile(dirPath)) {
        let content = fs.readFileSync(dirPath, 'utf8');
        content = content.replace(new RegExp(packageSettingsJSON.packageName, 'g'), packageName);
        fs.writeFileSync(dirPath, content, 'utf8');
    } else {
        const dir = fs.opendirSync(dirPath);
        let dirent;
        while ((dirent = dir.readSync()) !== null) {
            const fullPath = path.join(dirPath, dirent.name);
            if (dirent.isDirectory()) {
                traverseAndReplace(fullPath, packageName);
            } else if (isFile(fullPath)) {
                let content = fs.readFileSync(fullPath, 'utf8');
                content = content.replace(new RegExp(packageSettingsJSON.packageName, 'g'), packageName);
                fs.writeFileSync(fullPath, content, 'utf8');
            }
        }
        dir.closeSync();
    }
}

isFile = (pathItem) => {
    return !!path.extname(pathItem);
}