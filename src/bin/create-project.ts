import fs from 'fs';
import { exec } from 'child_process';

function writePackageJson() {
    // Run `npm init` and appropriate `npm install` commands
    exec('npm init -y', (error, stdout, stderr) => { console.log(stdout); });
    exec('npm install --save express', (error, stdout, stderr) => { console.log(stdout); });
    exec('npm install --save-dev @types/express @types/node gulp gulp-typescript nodemon ts-node typescript', (error, stdout, stderr) => { console.log(stdout); });
    
    // Add build script section to package.json
    const packageJson = JSON.parse(fs.readFileSync('package.json').toString());
    if(typeof packageJson.scripts === 'undefined') {
        packageJson.scripts = {};
    }
    if(typeof packageJson.scripts.start === 'undefined') {
        packageJson.scripts.start = 'node dist/server.js';
    }
    if(typeof packageJson.scripts.build === 'undefined') {
        packageJson.scripts.dev = 'gulp';
    }

    fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
}

function createControllersDir() {
    // Create a routes folder to keep all controller files and copy in the example HomeRoutes file
    fs.mkdirSync('src/routes');
    fs.copyFileSync('examples/HomeRoutes.ts', 'src/routes/HomeRoutes.ts');
}

function createStaticFilesDir() {
    // Create a static folder to keep all static files (css, js, images, etc...) and copy in the example stylesheet
    fs.mkdirSync('static');
    
    fs.mkdirSync('static/css');
    fs.copyFileSync('exmples/styles.css', 'src/static/css/styles.css')
    
    fs.mkdirSync('static/js');
    
    fs.mkdirSync('static/img');
}

function createViewsDir() {
    fs.mkdirSync('pages');
    fs.copyFileSync('examples/base.ejs', 'src/pages/base.ejs');
}

function createSrcDir() {
    // Create a source folder to keep all source files
    fs.mkdirSync('src');
    
    // Copy the example server file to the source folder (starts the app/server)
    fs.copyFileSync('examples/server.ts', 'src/server.ts')
    
    createControllersDir();
    
    createStaticFilesDir();
    
    createViewsDir();
}

// Create a package.json file with the necessary dependencies
writePackageJson();

// Create a source folder to keep all source files in
createSrcDir();

// Copy the example gulpfile to the root of the project
fs.copyFileSync('examples/gulpfile.mjs', 'gulpfile.mjs');

// Run the build script to compile the project
exec('npm run build', (error, stdout, stderr) => { console.log(stdout); });

// Start the server
exec('npm run start', (error, stdout, stderr) => { console.log(stdout); });