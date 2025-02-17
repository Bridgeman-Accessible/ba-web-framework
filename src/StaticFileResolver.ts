import { existsSync, statSync } from 'fs';
import path from 'path';
import express, { Application } from 'express';

/**
 * A class that wraps around Express's static file serving functionality.
 * 
 * This is mostly future proofing if additional logic/functionality around serving static files becomes necessary.
 */
export class StaticFileResolver {
    /** The default folder name for the static files */
    private readonly DEFAULT_STATIC_FOLDER = 'static';

    /**
     * The path to the folder/directory that contains the static files
     * 
     * The folder should contain the following sub-folders at minimum:
     * - css
     * - js
     * - img
     */
    private staticFilesDir: string;

    /**
     * Create a new instance of the StaticFileResolver
     * 
     * @param staticFilesDir The path to the folder/directory that contains the static files. Defaults to the 'static' folder in the current working directory.
     * @throws Error if the staticFilesDir is not a valid directory
     */
    constructor(staticFilesDir: string = path.join(process.cwd(), this.DEFAULT_STATIC_FOLDER)) {
        if(!existsSync(staticFilesDir) || !statSync(staticFilesDir).isDirectory()) {
            throw new Error('The static files path must be a valid directory');
        }
        
        this.staticFilesDir = path.resolve(staticFilesDir);
    }

    /**
     * Setup the Express app to serve static files from the static directory
     * 
     * @param app The Express application to setup the static file serving on.
     */
    setup(app: Application) {
        // Serve static files from the static directory
        app.use(express.static(this.staticFilesDir));
    }
}